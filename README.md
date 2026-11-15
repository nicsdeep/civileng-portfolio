# CivilEng Portfolio

> **Agents and developers: read [`AGENTS.md`](AGENTS.md) first.** Then read
> [`docs/HANDOVER.md`](docs/HANDOVER.md), [`docs/PRD.md`](docs/PRD.md) and
> [`docs/QAP.md`](docs/QAP.md) before any change, and update them after it.

Turn a résumé into a portfolio website. Part of CivilEng, alongside
[ResearchHub](https://civileng-researchhub.vercel.app).
Live at <https://civileng-portfolio.vercel.app>.

## How it works

Upload a résumé (PDF, Word or text) → sign up once if needed → the portfolio is live at
`/p/<address>`, with a success banner and a share link. Owners update it from the owner bar
(Edit details · Upload new résumé). Pictures, logos and projects are added by pasting links.
The full journey and rules are in [`docs/PRD.md`](docs/PRD.md).

## Stack

Vite, React 19, TypeScript, Tailwind 4, React Router 7, TanStack Query, Supabase (auth + Postgres), pdf.js and
fflate (loaded only on the Create page), deployed on Vercel.

## Data

`public.pf_profiles`: one row per user with the portfolio as JSON (`src/content/types.ts`), a unique `slug` and
`published`. Row Level Security: owners read and write only their own row; visitors read only the public columns
of published rows. All stored content goes through `normalizeCv` before it is shown (only `http(s)` and `mailto`
links survive).

## Upload history

Every upload (with or without an account) is saved in `public.pf_resume_uploads`: name, email, **phone**,
location, everything parsed, the extracted text, and the original file in the private Storage bucket
`pf-resumes`. Nobody can read these through the app (insert-only); open them in the Supabase dashboard:
Table editor → `pf_resume_uploads`, and Storage → `pf-resumes`. Anonymous uploads are linked to the account
when the person signs in on the same device. Records stay after a portfolio or account is deleted (see
`/privacy`); delete them by hand on request. Abuse limits: 10 uploads per hour per network address (stored only
as a hash), 300 per hour in total, files up to 10 MB as PDF/DOCX/TXT only.

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
