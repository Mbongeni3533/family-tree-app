-- Only needed if you already ran the earlier schema.sql. Fresh installs: ignore this file.
alter table public.people alter column created_by drop not null;
alter table public.people drop constraint people_created_by_fkey, add constraint people_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.marriages alter column created_by drop not null;
alter table public.marriages drop constraint marriages_created_by_fkey, add constraint marriages_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.invites drop constraint invites_used_by_fkey, add constraint invites_used_by_fkey foreign key (used_by) references auth.users(id) on delete set null;
alter table public.flags drop constraint flags_resolved_by_fkey, add constraint flags_resolved_by_fkey foreign key (resolved_by) references auth.users(id) on delete set null;
-- then run the three functions transfer_founder, delete_network, delete_my_account (and their revoke/grant lines) from schema.sql
