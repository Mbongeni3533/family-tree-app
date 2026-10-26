-- =====================================================================
-- Migration 005 — place of birth
--
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Existing databases only; schema.sql already contains it.
--
-- Adds people.birth_place and re-creates the two write functions so they
-- carry it. Every earlier signature is dropped first, so this file can be
-- run more than once without "function already exists".
-- =====================================================================

alter table public.people add column if not exists birth_place text;

alter table public.people drop constraint if exists people_birth_place_length;
alter table public.people add constraint people_birth_place_length
  check (birth_place is null or length(birth_place) <= 120);

drop function if exists public.add_person(uuid, uuid, text, text, int, text, text, uuid, uuid, uuid[], boolean);
drop function if exists public.add_person(uuid, uuid, text, text, int, text, text, uuid, uuid, uuid[], boolean, text, text, boolean, text, uuid);
drop function if exists public.add_person(uuid, uuid, text, text, int, text, text, uuid, uuid, uuid[], boolean, text, text, boolean, text, uuid, text);

drop function if exists public.update_person(uuid, timestamptz, text, text, int, text, text, uuid, uuid, uuid[]);
drop function if exists public.update_person(uuid, timestamptz, text, text, int, text, text, uuid, uuid, uuid[], text, text, boolean, text);
drop function if exists public.update_person(uuid, timestamptz, text, text, int, text, text, uuid, uuid, uuid[], text, text, boolean, text, text);

create function public.add_person(
  p_network uuid, p_id uuid, p_name text, p_gender text, p_birth_year int,
  p_notes text, p_photo text, p_parent uuid, p_parent2 uuid, p_spouses uuid[], p_claim boolean,
  p_birth_date text default null, p_death_date text default null,
  p_deceased boolean default false, p_residence text default null,
  p_as_parent_of uuid default null, p_birth_place text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s uuid;
  link_id uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not is_member(p_network) then raise exception 'you are not a member of this tree'; end if;

  insert into people (id, network_id, name, gender, birth_year, birth_date, death_date, deceased,
                      residence, birth_place, notes, photo_url, parent_id, parent2_id)
  values (p_id, p_network, p_name, p_gender, p_birth_year, p_birth_date, p_death_date,
          coalesce(p_deceased, false), p_residence, p_birth_place, p_notes, p_photo, p_parent, p_parent2);

  foreach s in array array_remove(coalesce(p_spouses, '{}'::uuid[]), null) loop
    if s <> p_id and exists (select 1 from people where id = s and network_id = p_network) then
      insert into marriages (network_id, person_a, person_b)
      values (p_network, least(p_id, s), greatest(p_id, s))
      on conflict do nothing;
    end if;
  end loop;

  if p_claim then
    update people set claimed_by = me
     where id = p_id and created_by = me and claimed_by is null;
    if not found then raise exception 'this card cannot be claimed'; end if;
  end if;

  if p_as_parent_of is not null then
    select id into link_id from people
     where id = p_as_parent_of and network_id = p_network
       and (created_by = me or claimed_by = me);
    if link_id is null then
      raise exception 'you can only add a parent to a card you entered or claimed';
    end if;
    update people
       set parent_id = coalesce(parent_id, p_id),
           parent2_id = case when parent_id is not null and parent2_id is null then p_id else parent2_id end
     where id = link_id;
    if exists (
      select 1 from people
       where id = link_id and parent_id is distinct from p_id and parent2_id is distinct from p_id
    ) then
      raise exception 'that card already has two parents';
    end if;
  end if;

  return p_id;
end $$;

create function public.update_person(
  p_id uuid, p_expected timestamptz,
  p_name text, p_gender text, p_birth_year int, p_notes text, p_photo text,
  p_parent uuid, p_parent2 uuid, p_spouses uuid[],
  p_birth_date text default null, p_death_date text default null,
  p_deceased boolean default false, p_residence text default null,
  p_birth_place text default null
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  nid uuid;
  ts timestamptz;
  s uuid;
  wanted uuid[] := array_remove(coalesce(p_spouses, '{}'::uuid[]), null);
begin
  if me is null then raise exception 'not signed in'; end if;

  select network_id into nid from people where id = p_id;
  if nid is null then raise exception 'that card no longer exists'; end if;
  if not exists (select 1 from people where id = p_id and (created_by = me or claimed_by = me)) then
    raise exception 'you can only edit a card you entered or claimed';
  end if;

  update people
     set name = p_name, gender = p_gender, birth_year = p_birth_year,
         birth_date = p_birth_date, death_date = p_death_date,
         deceased = coalesce(p_deceased, false), residence = p_residence, birth_place = p_birth_place,
         notes = p_notes, photo_url = p_photo, parent_id = p_parent, parent2_id = p_parent2
   where id = p_id and updated_at = p_expected
   returning updated_at into ts;

  if ts is null then
    raise exception 'CONFLICT: someone else changed this card while you were editing. Reload the tree and try again.';
  end if;

  delete from marriages
   where (person_a = p_id or person_b = p_id)
     and (case when person_a = p_id then person_b else person_a end) <> all (wanted);

  foreach s in array wanted loop
    if s <> p_id and exists (select 1 from people where id = s and network_id = nid) then
      insert into marriages (network_id, person_a, person_b)
      values (nid, least(p_id, s), greatest(p_id, s))
      on conflict do nothing;
    end if;
  end loop;

  return ts;
end $$;

revoke all on function public.add_person, public.update_person from public, anon;
grant execute on function public.add_person, public.update_person to authenticated;
