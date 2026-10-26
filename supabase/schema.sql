-- =====================================================================
-- Family Tree network schema (Supabase / Postgres 15+)
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Rules enforced IN THE DATABASE (not only in the app):
--  * only signed-in members of a network can read it
--  * a card can be edited/deleted only by the account that created it
--    (the person who claims a card via an invite may edit their own card, never delete it)
--  * the founder cannot edit anyone's entry; the founder can only HIDE a flagged entry (reversible)
--  * invites are single-use, expire after 14 days, and are tied to one card
-- =====================================================================

create table public.networks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  founder_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.network_members (
  network_id uuid not null references public.networks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('founder', 'member')),
  joined_at timestamptz not null default now(),
  primary key (network_id, user_id)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null, -- null = author deleted their account
  claimed_by uuid references auth.users(id) on delete set null,
  name text not null check (length(name) between 1 and 120),
  gender text not null default 'other' check (gender in ('male', 'female', 'other')),
  birth_year int check (birth_year between 1000 and 2200),
  birth_date text check (birth_date is null or birth_date ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
  death_date text check (death_date is null or death_date ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
  deceased boolean not null default false,
  residence text check (residence is null or length(residence) <= 120),
  birth_place text check (birth_place is null or length(birth_place) <= 120),
  notes text check (length(notes) <= 4000),
  photo_url text check (length(photo_url) <= 200000),
  parent_id uuid references public.people(id) on delete set null,
  parent2_id uuid references public.people(id) on delete set null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), -- bumped on every write; used to detect concurrent edits
  check (parent_id is null or parent_id <> id),
  check (parent2_id is null or (parent2_id <> id and parent2_id is distinct from parent_id)),
  unique (network_id, claimed_by)
);
create index people_network_id_idx on public.people (network_id);

create table public.marriages (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete cascade,
  person_a uuid not null references public.people(id) on delete cascade,
  person_b uuid not null references public.people(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (person_a <> person_b)
);
create unique index marriages_pair on public.marriages (least(person_a, person_b), greatest(person_a, person_b));

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  revoked boolean not null default false
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  flagged_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'hidden')),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz
);
create unique index flags_one_open on public.flags (person_id, flagged_by) where status = 'open';

-- ---------- helper functions ----------
create function public.is_member(nid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from network_members where network_id = nid and user_id = auth.uid()) $$;

create function public.is_founder(nid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from network_members where network_id = nid and user_id = auth.uid() and role = 'founder') $$;

create function public.owns_person(pid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from people where id = pid and (created_by = auth.uid() or claimed_by = auth.uid())) $$;

-- ---------- integrity triggers (everything stays inside one network) ----------
create function public.check_people_network() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is not null and not exists (select 1 from people where id = new.parent_id and network_id = new.network_id) then
    raise exception 'parent is not in this network'; end if;
  if new.parent2_id is not null and not exists (select 1 from people where id = new.parent2_id and network_id = new.network_id) then
    raise exception 'second parent is not in this network'; end if;
  return new;
end $$;
create trigger people_network before insert or update on public.people for each row execute function public.check_people_network();

-- updated_at is what lets two relatives avoid overwriting each other's edits
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger people_touch_updated_at before update on public.people for each row execute function public.touch_updated_at();

-- nobody can become their own ancestor
create function public.check_people_cycle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is null and new.parent2_id is null then
    return new;
  end if;
  -- UNION (not UNION ALL) de-duplicates, so legacy loops in the data cannot hang this
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
create trigger people_cycle before insert or update of parent_id, parent2_id on public.people for each row execute function public.check_people_cycle();

create function public.check_marriage_network() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from people where id in (new.person_a, new.person_b) and network_id = new.network_id) <> 2 then
    raise exception 'both people must be in this network'; end if;
  return new;
end $$;
create trigger marriage_network before insert on public.marriages for each row execute function public.check_marriage_network();

create function public.check_flag_network() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from people where id = new.person_id and network_id = new.network_id) then
    raise exception 'person is not in this network'; end if;
  return new;
end $$;
create trigger flag_network before insert on public.flags for each row execute function public.check_flag_network();

-- ---------- RPC functions (the only way to do privileged things) ----------
create function public.create_network(p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into networks (name, founder_id) values (p_name, auth.uid()) returning id into nid;
  insert into network_members (network_id, user_id, role) values (nid, auth.uid(), 'founder');
  return nid;
end $$;

-- Marks one card as "this is me" (only for a card you created, once per network)
create function public.claim_person(p_person uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update people set claimed_by = auth.uid()
   where id = p_person and created_by = auth.uid() and claimed_by is null and is_member(network_id);
  if not found then raise exception 'cannot claim this card'; end if;
end $$;

-- Invite link for ONE card that you created and nobody has claimed yet
create function public.create_invite(p_person uuid) returns text language plpgsql security definer set search_path = public as $$
declare p people; tok text;
begin
  select * into p from people where id = p_person;
  if not found or p.created_by is distinct from auth.uid() or p.claimed_by is not null or not is_member(p.network_id) then
    raise exception 'you can only invite for an unclaimed card you added'; end if;
  update invites set revoked = true where person_id = p_person and used_at is null and not revoked;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into invites (network_id, person_id, token, created_by) values (p.network_id, p_person, tok, auth.uid());
  return tok;
end $$;

-- Public preview so the invite page can say who invited you (before sign-in)
create function public.invite_preview(p_token text) returns table (network_name text, person_name text)
language sql stable security definer set search_path = public as $$
  select n.name, p.name from invites i join networks n on n.id = i.network_id join people p on p.id = i.person_id
   where i.token = p_token and not i.revoked and i.used_at is null and i.expires_at > now() and p.claimed_by is null
$$;

create function public.accept_invite(p_token text) returns uuid language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from invites where token = p_token for update;
  if not found or inv.revoked or inv.used_at is not null or inv.expires_at <= now() then
    raise exception 'this invite is invalid, used or expired'; end if;
  if exists (select 1 from people where network_id = inv.network_id and claimed_by = auth.uid()) then
    raise exception 'you already have a card in this tree'; end if;
  update people set claimed_by = auth.uid() where id = inv.person_id and claimed_by is null;
  if not found then raise exception 'this card was already claimed'; end if;
  insert into network_members (network_id, user_id) values (inv.network_id, auth.uid()) on conflict do nothing;
  update invites set used_by = auth.uid(), used_at = now() where id = inv.id;
  return inv.network_id;
end $$;

-- Founder decides on a flag: 'dismiss' or 'hide' (hide is reversible and never edits content)
create function public.resolve_flag(p_flag uuid, p_action text) returns void language plpgsql security definer set search_path = public as $$
declare f flags;
begin
  select * into f from flags where id = p_flag;
  if not found or not is_founder(f.network_id) then raise exception 'only the founder can resolve flags'; end if;
  if p_action = 'hide' then
    update people set hidden = true where id = f.person_id;
    update flags set status = 'hidden', resolved_by = auth.uid(), resolved_at = now() where id = p_flag;
  elsif p_action = 'dismiss' then
    update flags set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now() where id = p_flag;
  else raise exception 'unknown action'; end if;
end $$;

create function public.set_hidden(p_person uuid, p_hidden boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  update people set hidden = p_hidden where id = p_person and is_founder(network_id);
  if not found then raise exception 'only the founder can do this'; end if;
end $$;

-- Founder hands the tree to another member (the person must already be a member)
create function public.transfer_founder(p_network uuid, p_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_founder(p_network) then raise exception 'only the founder can do this'; end if;
  if p_user = auth.uid() or not exists (select 1 from network_members where network_id = p_network and user_id = p_user) then
    raise exception 'choose another member of this tree'; end if;
  update network_members set role = 'member' where network_id = p_network and user_id = auth.uid();
  update network_members set role = 'founder' where network_id = p_network and user_id = p_user;
  update networks set founder_id = p_user where id = p_network;
end $$;

-- Founder deletes the WHOLE tree (every card, marriage, invite and flag)
create function public.delete_network(p_network uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_founder(p_network) then raise exception 'only the founder can do this'; end if;
  delete from networks where id = p_network;
end $$;

-- Self-service account deletion
--  * a founder with other members must first transfer the founder role or delete the tree
--  * cards I entered that the person has claimed are handed to that person
--  * my other cards are deleted, unless other members' cards/marriages depend on them: then they are
--    anonymised ("Removed person") so nobody else's links break
--  * cards about me that others entered keep their place but lose my details
--  * my flags and invite links are deleted, then the account itself
create function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n record; anon_ids uuid[];
begin
  if me is null then raise exception 'not signed in'; end if;
  for n in select network_id from network_members where user_id = me and role = 'founder' loop
    if exists (select 1 from network_members where network_id = n.network_id and user_id <> me) then
      raise exception 'FOUNDER_MUST_TRANSFER: transfer the founder role or delete the whole tree first'; end if;
    delete from networks where id = n.network_id;
  end loop;
  update people set created_by = claimed_by where created_by = me and claimed_by is not null and claimed_by <> me;
  select coalesce(array_agg(p.id), '{}') into anon_ids from people p where p.created_by = me and (
    exists (select 1 from people c where (c.parent_id = p.id or c.parent2_id = p.id) and c.created_by is distinct from me)
    or exists (select 1 from marriages m where (m.person_a = p.id or m.person_b = p.id) and m.created_by is distinct from me));
  delete from people where created_by = me and id <> all (anon_ids);
  update people set name = 'Removed person', gender = 'other', birth_year = null, notes = null, photo_url = null, claimed_by = null, created_by = null where id = any (anon_ids);
  update people set name = 'Removed person', gender = 'other', birth_year = null, notes = null, photo_url = null, claimed_by = null where claimed_by = me;
  delete from flags where flagged_by = me;
  delete from invites where created_by = me;
  delete from auth.users where id = me;
end $$;

-- One call = one transaction: a card and its marriages are written together or not at all
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

  -- "Add parent": the new card becomes a parent of an existing person.
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

-- p_expected is the updated_at the editor loaded; a mismatch refuses the write
-- instead of silently replacing somebody else's edit.
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

-- ---------- row level security ----------
alter table public.networks enable row level security;
alter table public.network_members enable row level security;
alter table public.people enable row level security;
alter table public.marriages enable row level security;
alter table public.invites enable row level security;
alter table public.flags enable row level security;

create policy networks_read on public.networks for select to authenticated using (is_member(id));
create policy members_read on public.network_members for select to authenticated using (is_member(network_id));

create policy people_read on public.people for select to authenticated
  using (is_member(network_id) and (not hidden or created_by = auth.uid() or is_founder(network_id)));
create policy people_insert on public.people for insert to authenticated
  with check (is_member(network_id) and created_by = auth.uid());
create policy people_update on public.people for update to authenticated
  using (created_by = auth.uid() or claimed_by = auth.uid())
  with check (created_by = auth.uid() or claimed_by = auth.uid());
create policy people_delete on public.people for delete to authenticated using (created_by = auth.uid());

create policy marriages_read on public.marriages for select to authenticated using (is_member(network_id));
create policy marriages_insert on public.marriages for insert to authenticated
  with check (is_member(network_id) and created_by = auth.uid() and (owns_person(person_a) or owns_person(person_b)));
create policy marriages_delete on public.marriages for delete to authenticated
  using (created_by = auth.uid() or owns_person(person_a) or owns_person(person_b));

create policy invites_read on public.invites for select to authenticated using (created_by = auth.uid());

create policy flags_read on public.flags for select to authenticated using (flagged_by = auth.uid() or is_founder(network_id));
create policy flags_insert on public.flags for insert to authenticated with check (is_member(network_id) and flagged_by = auth.uid());

-- ---------- privileges: clients get only what they need ----------
revoke all on public.networks, public.network_members, public.people, public.marriages, public.invites, public.flags from anon, authenticated;
grant select on public.networks, public.network_members, public.people, public.marriages, public.invites, public.flags to authenticated;
grant insert (id, network_id, name, gender, birth_year, notes, photo_url, parent_id, parent2_id) on public.people to authenticated;
grant update (name, gender, birth_year, notes, photo_url, parent_id, parent2_id) on public.people to authenticated;
grant delete on public.people to authenticated;
grant insert (network_id, person_a, person_b) on public.marriages to authenticated;
grant delete on public.marriages to authenticated;
grant insert (network_id, person_id, reason) on public.flags to authenticated;

revoke all on function public.transfer_founder, public.delete_network, public.delete_my_account, public.create_network, public.claim_person, public.create_invite, public.invite_preview, public.accept_invite, public.resolve_flag, public.set_hidden, public.add_person, public.update_person, public.is_member, public.is_founder, public.owns_person from public, anon;
grant execute on function public.transfer_founder, public.delete_network, public.delete_my_account, public.is_member, public.is_founder, public.owns_person, public.create_network, public.claim_person, public.create_invite, public.accept_invite, public.resolve_flag, public.set_hidden, public.add_person, public.update_person to authenticated;
grant execute on function public.invite_preview to anon, authenticated;

-- ---------- indexes for the lookups the app does ----------
create index people_parent_idx on public.people (parent_id, parent2_id);
create index marriages_network_idx on public.marriages (network_id);
create index flags_network_status_idx on public.flags (network_id, status);
