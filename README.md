# CivilEng Portfolio

Digital CV portfolio for Nicholas Kinyae Kioko, part of CivilEng alongside
[ResearchHub](https://civileng-researchhub.vercel.app).
Live at <https://civileng-portfolio.vercel.app>.

- **Public pages:** home, experience & education, projects, skills & certifications, contact. Includes "Print / save as PDF".
- **Editor** at `/editor`: sign in with your CivilEng account (the same as ResearchHub), edit every section, publish.

## Stack

Vite, React 19, TypeScript, Tailwind 4, React Router 7, TanStack Query, Supabase (auth + Postgres), deployed on Vercel.

## How content works

- `src/content/cv.ts` holds the CV bundled with the site. The site shows it until a portfolio is published, and falls back to it if the database cannot be reached.
- Saving in `/editor` writes one row to `public.pf_profiles` (the whole CV as JSON).
- The public site shows the **published** row of the user set in `VITE_PORTFOLIO_OWNER_ID`. Nobody else's row can appear there.
- All stored content goes through `normalizeCv` before it is shown. It drops unknown fields and keeps only `http(s)` and `mailto` links.

## First-time setup after merging

1. When this reaches `main`, the **Supabase migrations** workflow creates `pf_profiles` and adds this site's URL to the shared auth redirect list. Check the run under Actions.
2. Sign in at `/sign-in` (or create an account), open `/editor` and copy the user ID shown there.
3. In Vercel → Settings → Environment Variables, add `VITE_PORTFOLIO_OWNER_ID=<that id>` for Production and Preview, then redeploy.
4. In `/editor`, tick **Published** and press **Save**.

## Local development

```bash
npm install
cp .env.example .env.local   # optional; public values only
npm run dev                  # http://localhost:5173
npm run lint && npm test && npm run build
```

Row Level Security tests (need a local PostgreSQL): `PGHOST=localhost PGUSER=postgres supabase/tests/run-rls-tests.sh`.

## Shared Supabase project: rules

- Portfolio objects use the `pf_` prefix. ResearchHub's `rh_` tables are never touched.
- Every table has RLS enabled. Access for `anon` and `public` is revoked explicitly, and only the operations the app needs are granted.
- Both repositories push to one migration history. The migrations workflow adds placeholder files for versions applied by the other app, so `db push` does not refuse to run.
- Auth settings are project-wide. `supabase/config.toml` keeps ResearchHub's values and only adds this site's URL to `additional_redirect_urls`. Make the same addition in ResearchHub's `config.toml`, or its next config push will remove it.

## Secrets

Never commit secrets. GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN` (required) and `SUPABASE_DB_PASSWORD` (optional).
The browser only uses public values: the Supabase URL, the publishable key and the owner ID.
