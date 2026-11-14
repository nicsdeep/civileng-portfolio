-- CivilEng Portfolio: the portfolio document
--
-- Shares the Supabase project with CivilEng ResearchHub. Every portfolio
-- object is prefixed "pf_"; ResearchHub's "rh_" objects are not touched.
-- Both apps share Supabase Auth (auth.users), so one account works on both.
--
-- Security model:
--   * One row per user, holding their whole portfolio as JSON.
--   * Signed-in users can create, read, change and delete only their own row.
--   * Anyone, including anonymous visitors, can read rows marked published,
--     because those are public web pages. Unpublished rows stay private.
--   * The public site only shows the row of the user set in
--     VITE_PORTFOLIO_OWNER_ID, so other accounts cannot take it over.
--
-- Creates objects only; drops nothing. Applied automatically by
-- .github/workflows/supabase-migrations.yml when merged to main.

-- Keeps updated_at current on every update.
create or replace function public.pf_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.pf_profiles (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  published   boolean not null default false,
  -- The portfolio document (see src/content/types.ts). Kept small: about 200 kB at most.
  content     jsonb not null default '{}'::jsonb
              check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 200000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.pf_profiles is 'CivilEng Portfolio: one portfolio document per user; published rows are public';

create trigger pf_profiles_updated_at
  before update on public.pf_profiles
  for each row execute function public.pf_set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges: only what the app needs
-- ---------------------------------------------------------------------------
-- Supabase grants new public tables to anon by default; take that away first.
revoke all on public.pf_profiles from public, anon, authenticated;
revoke execute on function public.pf_set_updated_at() from public, anon, authenticated;
grant select on public.pf_profiles to anon;
grant select, insert, update, delete on public.pf_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- (select auth.uid()) is evaluated once per query, which keeps policies fast.
-- ---------------------------------------------------------------------------
alter table public.pf_profiles enable row level security;

-- One select policy per role (Supabase's linter flags overlapping ones).
create policy "Visitors read published portfolios"
  on public.pf_profiles for select to anon
  using (published);
create policy "Users read published portfolios and their own"
  on public.pf_profiles for select to authenticated
  using (published or (select auth.uid()) = user_id);
create policy "Users create their own portfolio"
  on public.pf_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own portfolio"
  on public.pf_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own portfolio"
  on public.pf_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);
