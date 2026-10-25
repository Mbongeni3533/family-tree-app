create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.trees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  founder_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tree_members (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  birth_year integer,
  gender text,
  notes text,
  parent_id uuid,
  spouse_id uuid,
  photo_url text,
  is_claimed boolean not null default false,
  is_removed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.flags (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  target_member_id uuid not null references public.tree_members(id) on delete cascade,
  flagged_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists tree_members_tree_id_idx on public.tree_members(tree_id);
create index if not exists invite_links_tree_id_idx on public.invite_links(tree_id);
create index if not exists flags_tree_id_idx on public.flags(tree_id);

alter table public.profiles enable row level security;
alter table public.trees enable row level security;
alter table public.tree_members enable row level security;
alter table public.invite_links enable row level security;
alter table public.flags enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view trees they can access" on public.trees for select using (true);
create policy "Founders can create trees" on public.trees for insert with check (auth.uid() = founder_id);

create policy "Users can view tree members in their tree" on public.tree_members for select using (true);
create policy "Users can insert members if signed in" on public.tree_members for insert with check (auth.uid() is not null);
create policy "Users can update members they created" on public.tree_members for update using (auth.uid() = creator_id);

create policy "Users can view invite links in their tree" on public.invite_links for select using (true);
create policy "Founders can create invite links" on public.invite_links for insert with check (auth.uid() = created_by);

create policy "Users can view flags in their tree" on public.flags for select using (true);
create policy "Signed-in users can flag members" on public.flags for insert with check (auth.uid() = flagged_by);
