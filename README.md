# CivilEng Portfolio

Turn a résumé into a portfolio website. Part of CivilEng, alongside
[ResearchHub](https://civileng-researchhub.vercel.app).
Live at <https://civileng-portfolio.vercel.app>.

## How it works

1. **Create** (`/create`): upload a PDF or Word (.docx) résumé, paste its text, or start from scratch.
   The file is read **in the browser** by rules in `src/features/import/` (no AI, no upload): text and layout come
   from `extract.ts` (pdf.js for PDF, the document XML for .docx), and `parse.ts` finds the sections.
2. **Edit** (`/editor`): sign in with a CivilEng account (shared with ResearchHub), check every section, choose a
   public address. The unsaved draft waits in the browser's local storage while the visitor signs in, and is
   removed once saved.
3. **Publish**: the portfolio is public at `/p/<address>`. `/example` shows a made-up person.

Phone numbers are never copied from a résumé onto the public page; people can add one in the editor if they want.

## Stack

Vite, React 19, TypeScript, Tailwind 4, React Router 7, TanStack Query, Supabase (auth + Postgres), pdf.js and
fflate (loaded only on the Create page), deployed on Vercel.

## Data

`public.pf_profiles`: one row per user with the portfolio as JSON (`src/content/types.ts`), a unique `slug` and
`published`. Row Level Security: owners read and write only their own row; visitors read only the public columns
of published rows. All stored content goes through `normalizeCv` before it is shown (only `http(s)` and `mailto`
links survive).

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
