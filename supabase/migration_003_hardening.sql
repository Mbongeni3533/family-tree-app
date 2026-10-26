-- =====================================================================
-- Hardening migration — run once on a database that already ran schema.sql
--
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Fresh installs do NOT need this file: schema.sql already contains it.
--
-- What it changes:
--   1. people.updated_at, so two relatives editing the same card cannot
--      silently overwrite each other (the app sends the value it loaded).
--   2. Foreign keys to auth.users get explicit ON DELETE behaviour, so
--      deleting an account never fails with a bare FK error.
--   3. Either spouse can remove a marriage (before: only whoever created it).
--   4. Parent links can no longer form a loop.
--   5. add_person / update_person: one call = one transaction, so a card and
--      its marriages are written together or not at all.
--   6. Indexes for the lookups the app actually does.
-- =====================================================================

-- 1. optimistic concurrency -------------------------------------------------
alter table public.people add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists people_touch_updated_at on public.people;
create trigger people_touch_updated_at
  before update on public.people
  for each row execute function public.touch_updated_at();

-- 2. account deletion behaviour --------------------------------------------
-- A card about a deleted account simply becomes unclaimed again.
alter table public.people drop constraint if exists people_claimed_by_fkey;
alter table public.people add constraint people_claimed_by_fkey
  foreign key (claimed_by) references auth.users(id) on delete set null;

-- Invites and flags belong to the account that made them; they go with it.
alter table public.invites drop constraint if exists invites_created_by_fkey;
alter table public.invites add constraint invites_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.flags drop constraint if exists flags_flagged_by_fkey;
alter table public.flags add constraint flags_flagged_by_fkey
  foreign key (flagged_by) references auth.users(id) on delete cascade;

-- A tree must never be left without a founder, so this stays restrictive:
-- delete_my_account() transfers the role or deletes the tree first.
alter table public.networks drop constraint if exists networks_founder_id_fkey;
alter table public.networks add constraint networks_founder_id_fkey
  foreign key (founder_id) references auth.users(id) on delete restrict;

-- 3. either spouse can end a marriage --------------------------------------
drop policy if exists marriages_delete on public.marriages;
create policy marriages_delete on public.marriages for delete to authenticated
  using (created_by = auth.uid() or public.owns_person(person_a) or public.owns_person(person_b));

-- 4. no ancestor loops ------------------------------------------------------
create or replace function public.check_people_cycle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is null and new.parent2_id is null then
    return new;
  end if;
  -- UNION (not UNION ALL) de-duplicates, so legacy loops in the data cannot hang this.
  if exists (
    with recursive ancestors(id) as (
      select x from unnest(array[new.parent_id, new.parent2_id]) as x where x is not null
      union
      select y
        from ancestors a
        join public.people p on p.id = a.id
        cross join lateral unnest(array[p.parent_id, p.parent2_id]) as y
       where y is not null
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'a person cannot be their own ancestor';
  end if;
  return new;
end $$;

drop trigger if exists people_cycle on public.people;
create trigger people_cycle
  before insert or update of parent_id, parent2_id on public.people
  for each row execute function public.check_people_cycle();

-- 5. atomic writes ----------------------------------------------------------
create or replace function public.add_person(
  p_network uuid, p_id uuid, p_name text, p_gender text, p_birth_year int,
  p_notes text, p_photo text, p_parent uuid, p_parent2 uuid, p_spouses uuid[], p_claim boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not is_member(p_network) then raise exception 'you are not a member of this tree'; end if;

  insert into people (id, network_id, name, gender, birth_year, notes, photo_url, parent_id, parent2_id)
  values (p_id, p_network, p_name, p_gender, p_birth_year, p_notes, p_photo, p_parent, p_parent2);

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

  return p_id;
end $$;

-- p_expected is the updated_at the editor loaded; a mismatch means somebody
-- else saved in between and the write is refused instead of losing their edit.
create or replace function public.update_person(
  p_id uuid, p_expected timestamptz,
  p_name text, p_gender text, p_birth_year int, p_notes text, p_photo text,
  p_parent uuid, p_parent2 uuid, p_spouses uuid[]
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
     set name = p_name, gender = p_gender, birth_year = p_birth_year, notes = p_notes,
         photo_url = p_photo, parent_id = p_parent, parent2_id = p_parent2
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

-- 6. invite guard: created_by can be null once an account is deleted --------
create or replace function public.create_invite(p_person uuid) returns text language plpgsql security definer set search_path = public as $$
declare
  p people;
  tok text;
begin
  select * into p from people where id = p_person;
  if not found or p.created_by is distinct from auth.uid() or p.claimed_by is not null or not is_member(p.network_id) then
    raise exception 'you can only invite for an unclaimed card you added';
  end if;
  update invites set revoked = true where person_id = p_person and used_at is null and not revoked;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into invites (network_id, person_id, token, created_by) values (p.network_id, p_person, tok, auth.uid());
  return tok;
end $$;

-- 7. indexes ----------------------------------------------------------------
create index if not exists people_network_id_idx on public.people (network_id);
create index if not exists people_parent_idx on public.people (parent_id, parent2_id);
create index if not exists marriages_network_idx on public.marriages (network_id);
create index if not exists flags_network_status_idx on public.flags (network_id, status);

-- 8. privileges for the new write path --------------------------------------
revoke all on function public.add_person, public.update_person from public, anon;
grant execute on function public.add_person, public.update_person to authenticated;
