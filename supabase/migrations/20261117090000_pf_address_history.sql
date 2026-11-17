-- CivilEng Portfolio: addresses can change without breaking shared links
--
--   * pf_slug_history remembers every address a portfolio used before. Old
--     links are sent on to the current address (pf_current_slug), so an
--     address that follows the owner's name can change safely.
--   * An old address is forgotten as soon as another portfolio takes it, and
--     when its owner deletes their portfolio (the address becomes free).
--   * One-off fix: portfolios whose address was made from a street address
--     ("3453-caribou-crescent", from a résumé reader bug fixed on 2026-11-16)
--     move to an address made from their name, when that address is free.
--
-- Adds a table, functions and triggers; drops nothing. pf_ prefix only.

create table public.pf_slug_history (
  slug text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  moved_at timestamptz not null default now()
);
comment on table public.pf_slug_history is 'Previous portfolio addresses, so old links still reach the portfolio';

-- No direct access for anyone: only the functions below read or write it.
alter table public.pf_slug_history enable row level security;
revoke all on public.pf_slug_history from anon, authenticated;

-- Keeps the history in step with pf_profiles.
create function public.pf_track_slug() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.pf_slug_history where user_id = old.user_id;
    return old;
  end if;
  -- A live portfolio always wins its address.
  if new.slug is not null then
    delete from public.pf_slug_history where slug = new.slug;
  end if;
  if tg_op = 'UPDATE' and old.slug is not null and old.slug is distinct from new.slug then
    insert into public.pf_slug_history (slug, user_id) values (old.slug, old.user_id)
      on conflict (slug) do update set user_id = excluded.user_id, moved_at = now();
  end if;
  return new;
end $$;

create trigger pf_profiles_track_slug
  after insert or update of slug or delete on public.pf_profiles
  for each row execute function public.pf_track_slug();

-- Where a portfolio that used to live at old_slug lives now. Only published
-- portfolios are found, so hidden ones stay hidden.
create function public.pf_current_slug(old_slug text) returns text
  language sql stable security definer set search_path = '' as $$
  select p.slug
    from public.pf_slug_history h
    join public.pf_profiles p on p.user_id = h.user_id
   where h.slug = lower(old_slug) and p.published and p.slug is not null
$$;
revoke all on function public.pf_current_slug(text) from public;
grant execute on function public.pf_current_slug(text) to anon, authenticated;

-- One-off fix for addresses made from a street address.
-- If two portfolios want the same address, the first (by owner id) gets it; the other keeps its own.
with wanted as (
  select p.user_id,
         trim(both '-' from left(trim(both '-' from regexp_replace(lower(p.content->>'name'), '[^a-z0-9]+', '-', 'g')), 40)) as wanted
    from public.pf_profiles p
   where p.slug ~ '^[0-9]+[a-z]?-.*(street|st|road|rd|avenue|ave|crescent|cres|drive|dr|lane|ln|boulevard|blvd|court|ct|way|place|pl|close|terrace|highway|hwy)(-|$)'
), candidates as (
  select distinct on (wanted) user_id, wanted from wanted order by wanted, user_id
)
update public.pf_profiles p
   set slug = c.wanted
  from candidates c
 where p.user_id = c.user_id
   and c.wanted ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
   and c.wanted !~ '--'
   and c.wanted !~ '^[0-9]+[a-z]?-'
   and not exists (select 1 from public.pf_profiles o where o.slug = c.wanted);
