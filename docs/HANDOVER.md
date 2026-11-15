# HANDOVER: where things stand and where to take over

Newest entry first. **Every change adds an entry here in the same commit** (see `AGENTS.md`).
Use this template:

```
## YYYY-MM-DD: <short title> (PR #n)
- What and why:
- Files:
- Tested: <gates run and results; anything not run, and why>
- Unfinished / known issues:
- Next step:
```

---

## 2026-11-15: One-step journey, paste-a-link everywhere, project doctrines
- **What and why:** the owner asked for a short, friendly journey (first principles), success
  states, no lost users and no overlap. Changes:
  - **Journey:** upload → (sign up once) → live portfolio. The "Here is what we found" review
    screen and the editor's draft banner were removed. The address is chosen automatically.
  - **Success banner** on the portfolio after publish, update or save, with Share and Undo.
  - **Owner bar** (Edit details · Upload new résumé · Share).
  - **Home and `/me`** send signed-in owners to their portfolio.
  - **Editor:** Save goes to the portfolio. The address field moved to an "Address &
    visibility" card, fixing the squashed address box. Back links on every page.
  - **Paste a link:** photo, company and school logos, project pictures, "Add a project from a
    link", automatic link labels and credential links. Server reader at `api/preview.ts`.
  - **Public pages** show the photo, logos, project pictures, the hosted project link and
    credential links.
  - **Docs:** `AGENTS.md`, `CLAUDE.md`, `docs/PRD.md`, `docs/QAP.md`, this file, and
    `docs/DOCTRINE-TEMPLATE.md`.
- **Files:**
  - pages: `src/pages/CreatePage.tsx`, `FinishPage.tsx` (also `/me`), `EditorPage.tsx`,
    `LandingPage.tsx`, the `auth/*` pages, the `portfolio/*` pages;
  - app: `src/app/PortfolioLayout.tsx`, `router.tsx`, `Layout.tsx`;
  - features: `src/features/portfolio/{api,hooks,publish}.ts`, `src/features/links/*`;
  - content: `src/content/{types,normalize,example}.ts`;
  - server: `api/*`;
  - tests: `tests/journey.test.tsx`, `links.test.ts`, `preview.test.ts`.
- **Tested:** lint, build, 56 unit and journey tests, the RLS test script, and a browser check
  at 390 px of the owner banner, owner bar, add-from-link (real GitHub link), save → portfolio
  and the address card. The full live sign-up email flow was not run, because it needs a real
  inbox.
- **Unfinished / known issues:**
  - Linked pictures are hot-linked, not copied.
  - Some sites block link reading; logos and screenshots fall back to public services.
  - No database migration in this change: new fields live inside the JSON content.
- **Next step:** the owner tests the real flow on the live site with their résumé (upload → sign
  up → live). Then consider an admin page for the upload history.

## 2026-11-15: Quieter privacy wording (PR #6)
- Removed the consent checkbox in favour of a one-line Privacy Policy notice. `/privacy`
  rewritten, with the contact civileng.portfolio@gmail.com. Uploads are still recorded.

## 2026-11-15: Private upload history (PR #5)
- `pf_resume_uploads` table and the `pf-resumes` bucket. They are insert-only, rate limited and
  kept after deletion. Anonymous uploads are linked to the account after sign-in.

## 2026-11-14: Remove and clear (PR #4)
- Remove résumé, Clear all with Undo, Delete portfolio with confirmation, and drafts cleared on
  sign-out.

## 2026-11-14: Anyone can turn a résumé into a portfolio (PR #3)
- Rule-based résumé reader (PDF/DOCX/text), `/p/<address>` per user, `/example`, the Edmund
  favicon, and the `slug` migration.

## 2026-11-14: First version (PRs #1, #2)
- Vite and React site, Supabase editor, CI, and the migrations workflow (plus a fix for the
  shared migration history with ResearchHub).
