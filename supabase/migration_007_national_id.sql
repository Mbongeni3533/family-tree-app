-- =====================================================================
-- Migration 007 — National ID accounts
--
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Existing databases only; schema.sql already contains all of this.
--
-- Supabase Auth still issues the session; the national ID is mapped to a
-- derived, non-deliverable address (<country>.<id>@nid.familytree.local) and
-- the PIN is the password. profiles keeps the identity people actually see.
-- =====================================================================

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country text not null check (country ~ '^[A-Z]{2}$'),
  national_id text not null check (national_id ~ '^[A-Za-z0-9]{5,24}$'),
  full_name text not null check (length(full_name) between 1 and 120),
  invited_by_name text check (invited_by_name is null or length(invited_by_name) between 1 and 120),
  email text check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  created_at timestamptz not null default now(),
  unique (country, national_id)
);

alter table public.profiles enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (user_id = auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create or replace function public.save_profile(
  p_country text, p_national_id text, p_full_name text,
  p_invited_by text default null, p_email text default null
) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into profiles (user_id, country, national_id, full_name, invited_by_name, email)
  values (me, upper(p_country), p_national_id, p_full_name, p_invited_by, p_email)
  on conflict (user_id) do update
    set country = excluded.country,
        national_id = excluded.national_id,
        full_name = excluded.full_name,
        -- the inviter is recorded once and never silently replaced
        invited_by_name = coalesce(profiles.invited_by_name, excluded.invited_by_name),
        email = coalesce(excluded.email, profiles.email);
end $$;

revoke all on function public.save_profile from public, anon;
grant execute on function public.save_profile to authenticated;
