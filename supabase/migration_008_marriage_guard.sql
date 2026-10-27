-- =====================================================================
-- Migration 008 — make the marriage network check authoritative
--
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Existing databases only; schema.sql already contains it.
--
-- The old trigger refused a marriage whenever the row's network_id did not
-- match both people, which produced "both people must be in this network" for
-- things the caller could not control. It now reads the network from the two
-- people, stores that, and only complains when the people genuinely differ.
-- =====================================================================

create or replace function public.check_marriage_network() returns trigger language plpgsql security definer set search_path = public as $$
declare
  net_a uuid;
  net_b uuid;
begin
  select network_id into net_a from people where id = new.person_a;
  select network_id into net_b from people where id = new.person_b;

  if net_a is null or net_b is null then
    raise exception 'one of those two people no longer exists — refresh the tree and try again';
  end if;

  if net_a <> net_b then
    raise exception 'those two people are in different family trees';
  end if;

  -- trust the people, not whatever network the caller passed
  new.network_id := net_a;
  return new;
end $$;

drop trigger if exists marriage_network on public.marriages;
create trigger marriage_network before insert on public.marriages
  for each row execute function public.check_marriage_network();
