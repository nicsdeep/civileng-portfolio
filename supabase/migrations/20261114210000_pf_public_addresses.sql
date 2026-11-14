-- CivilEng Portfolio: a public address for every portfolio
--
-- Anyone with an account can create a portfolio (by uploading a résumé or
-- from scratch) and publish it at /p/<slug>. Changes:
--   * slug: the chosen public address; unique, lowercase letters, digits and
--     single hyphens, 3–40 characters. Required before publishing.
--   * Anonymous visitors may only read the public columns of published
--     portfolios: they can no longer see which account owns one (user_id).
--
-- Adds a column and constraints only; drops nothing.

alter table public.pf_profiles
  add column slug text unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' and slug !~ '--');

alter table public.pf_profiles
  add constraint pf_profiles_published_needs_slug check (not published or slug is not null);

comment on column public.pf_profiles.slug is 'Public address of the portfolio: /p/<slug>';

-- Column-level read access for visitors (Row Level Security still limits
-- them to published rows).
revoke select on public.pf_profiles from anon;
grant select (slug, published, content, updated_at) on public.pf_profiles to anon;
