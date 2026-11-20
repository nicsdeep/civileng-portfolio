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

## 2026-11-20: Guest publishing for 7 days (no sign-up, no email)
- **What and why:** the owner asked that, for 7 days, people publish without any sign-up, sign-in
  or password, and do not see that step; after 7 days sign-in returns.
  - `src/features/auth/guest.ts`: `GUEST_UNTIL = 2026-11-27T05:30Z`, `guestMode()`,
    `isGuest()`, `startGuestSession()` (Supabase anonymous sign-in).
  - Create page: no account → guest session → publish straight away. `RequireAuth` (editor,
    /me, /finish) starts a guest session instead of sending people to sign in.
  - Header and phone tabs hide Sign in and Account during the window (Account stays for
    email accounts).
  - Account page for guests: "Keep your portfolio": add an email (`updateUser`) to use it on
    other devices. Shown when Account is visible (after the window, or by direct link).
  - `enable_anonymous_sign_ins = true` in this repo's `supabase/config.toml` **and in
    ResearchHub's** (shared project: otherwise either app's config push would switch it off).
    ResearchHub only gives signed-in users a private reading list, so guests reach nothing of
    anyone else's there. Anonymous sign-ins are limited to 30 per hour per IP.
  - If anonymous sign-in fails (e.g. switched off), the old email step is used, so nothing
    breaks.
- **Files:** `src/features/auth/{guest,RequireAuth}.ts(x)`, `src/pages/CreatePage.tsx`,
  `src/app/Layout.tsx`, `src/pages/auth/AccountPage.tsx`, `supabase/config.toml`, tests
  `guest.test.ts`, `journey.test.tsx` (guest sessions mocked), docs.
- **Tested:** lint clean; 78 tests (3 runs); build; RLS unchanged (guests are the
  `authenticated` role, like any user).
- **Unfinished / known issues:** a guest who clears their browser or changes device before adding
  an email cannot edit their portfolio any more (it stays live). The owner chose not to show
  account prompts during the window.
- **Next step:** after 2026-11-27 05:30 UTC sign-in returns on its own. Then decide whether to
  switch anonymous sign-ins off in both `config.toml` files (existing guests keep their
  sessions either way) and whether to remind guests to add an email.

## 2026-11-20: Passwordless sign-in and a Research section
- **What and why:** the owner asked to "remove completely the option to ask for password" and
  had nowhere to put research ("Finish").
  - **Passwordless:** one email sign-in page (`SignInPage`, also served at `/sign-up` and
    `/forgot-password`, keeping `?next=`). `signInWithOtp` sends a link that signs in, creates the
    account the first time and returns to `next` (`/finish` publishes). Sign-up, forgot-password
    and change-password screens and `passwordProblem` removed; Create now goes to
    `/sign-in?next=/finish`. Same approach as ResearchHub (shared Supabase Auth).
  - **Research section:** `Research` type (title, kind, year, summary, aim, objectives, method,
    significance, keywords, links) in the JSON content, cleaned in `normalizeCv`, a *Research*
    tab in the editor (generic section editor) and a public `/research` page and tab (book icon)
    shown when there is research. The example portfolio has a made-up item.
  - **Owner data:** `20261120100000_pf_owner_research_section.sql` moves the owner's proposal from
    Projects (added by PR #11) into Research with its parts as separate fields, and adds his
    University of Leeds degree, which PR #11 skipped (it matched schools on their first word).
- **Files:** `src/pages/auth/{SignInPage,AccountPage,AuthLayout}.tsx` (SignUp and ForgotPassword
  pages removed), `src/app/router.tsx`, `src/features/auth/{AuthProvider,validation}.ts`,
  `src/lib/supabase.ts`, `src/pages/CreatePage.tsx`, `src/content/{types,cv,normalize,example}.ts`,
  `src/features/editor/form.ts`, `src/pages/portfolio/ResearchPage.tsx`, `src/app/PortfolioLayout.tsx`,
  `src/components/icons.tsx`, the migration, tests (`normalize`, `form`, `validation`, `journey`),
  `docs/PRD.md`, `docs/QAP.md`.
- **Tested:** lint clean; 75 tests; build; RLS locally (21 expected errors); both owner migrations
  in sequence on a seeded moved-address row (research moved with 4 objectives and 7 stages, other
  projects kept, all four degrees present, re-run harmless); browser at 390 px on
  `/example/research` and `/sign-up?next=/finish` (no password fields, no sideways scrolling).
  The real email link was not followed (needs an inbox).
- **Unfinished / known issues:** Supabase's built-in email sender is rate-limited (a few emails per
  hour), so every new sign-in now depends on it; a custom SMTP sender is advisable before a live
  demo. The link must be opened in the same browser (a code-entry option would remove that).
  "Add research from a document" (upload) is not built yet.
- **Next step:** after merge, check the migration log and that the live sign-in sends a link;
  the owner signs in at /me and decides whether to make the portfolio public.

## 2026-11-20: Owner's research proposal and résumé details added to his portfolio
- **What and why:** the owner asked (in the ResearchHub session, "Add direct I have no time") for
  his research proposal and résumé to be put on his portfolio for him, because the editor has no
  place for research. A one-off, data-only migration does it; no app code changed.
  - Finds the owner's row by its first address `3453-caribou-crescent` (current slug, or
    `pf_slug_history` after the 2026-11-17 move). Does nothing if not found (CI, fresh databases).
  - Adds the proposal "Integrated Artificial Intelligence and Digital Twin Modeling for Resilient
    and Optimized Infrastructure Planning in the Arctic Region" as the first, featured project
    (replacing an earlier copy with the same title, so a re-run is harmless).
  - Adds résumé education, certifications/memberships, experience and skills only where nothing
    similar exists. Nothing is deleted; street address, phone and P.Eng licence number are not
    added; `published` and `slug` are unchanged.
  - The owner accepted that the proposal text is stored in this public repository.
- **Files:** `supabase/migrations/20261120090000_pf_owner_research.sql`, this file.
- **Tested:** locally on PostgreSQL 16 with all migrations: no owner row → notice only; seeded row
  (moved address) → research first and featured, existing project kept, only missing items added;
  re-run adds nothing new. RLS suite: 21 expected errors, unchanged.
- **Unfinished / known issues:** a proper Research section (editor + public tab + "Add research
  from a document") and passwordless sign-in were also requested and are still to do; the owner's
  answers to those questions are pending in the portfolio session.
- **Next step:** confirm the migration ran on the live project (workflow log shows "Owner
  portfolio updated: …"), then the owner signs in at /me to see it.

## 2026-11-17: Addresses follow the name; old links keep working
- **What and why:** the owner asked that addresses adjust on their own instead of being fixed by
  hand (an address had come out as `3453-caribou-crescent`).
  - **Automatic addresses follow the name** (`isAutoAddress`, `addressFollowsName` in
    `publish.ts`): an address made from the name (or from a street address) moves when the name
    changes, in the editor and on re-upload. A typed address never moves. The editor shows
    "it becomes /p/… when you save".
  - **Old links keep working:** new table `pf_slug_history` + trigger record previous addresses;
    `pf_current_slug()` finds where a published portfolio lives now. The app redirects
    (`PortfolioLayout`), and `api/portfolio-page.ts` answers old addresses with a 308 redirect so
    link previews follow too. Old addresses are forgotten when re-taken or on delete.
  - **One-off fix in the migration:** portfolios whose address looks like a street address move to
    an address made from their name, when free (the old address then redirects).
- **Files:** `supabase/migrations/20261117090000_pf_address_history.sql`,
  `supabase/tests/rls_test.sql` (steps 20–24; expected ERROR count now 21), `.github/workflows/ci.yml`,
  `src/features/portfolio/{publish,api,hooks}.ts`, `src/app/PortfolioLayout.tsx`,
  `src/pages/EditorPage.tsx`, `api/portfolio-page.ts`, `vercel.json` (section passed to the
  function), tests `import.test.ts`, `journey.test.tsx`, docs.
- **Tested:** lint clean; 73 tests; build; RLS locally (21 expected errors, all CI greps pass); the
  one-off fix run against seeded rows (`3453-caribou-crescent` → `nicholas-kioko`,
  `12-main-st` → `amy-lee`, `jane-doe` untouched, old addresses recorded).
- **Unfinished / known issues:** none. (If two street-address portfolios want the same name
  address, the first gets it and the other keeps its address.)
- **Next step:** after merge, check the live migration ran and that the owner's portfolio moved.

## 2026-11-16: Street address no longer taken as the name
- **What and why:** an owner's portfolio address came out as `/p/3453-caribou-crescent`: the
  résumé started with a street address, which the reader took for the name (and so the
  address). `isStreetAddress` (a house number then a street word, or a P.O. box) now keeps
  those lines out of the name and headline. Postcodes ("00100, Nairobi") and headlines
  ("5 years in design") are unaffected. Existing portfolios keep their address; owners change it
  in Edit → *Address & visibility*.
- Also done since the last entry (in the ResearchHub repository): the portfolio sign-in redirect
  `https://civileng-portfolio.vercel.app/**` is listed in ResearchHub's `supabase/config.toml`,
  and its migrations workflow now adds placeholders for this app's migrations (as ours does), so
  neither app's deploy removes the other's settings. That owner to-do is closed.
- **Files:** `src/features/import/parse.ts`, `tests/import.test.ts`, `docs/PRD.md`.
- **Tested:** lint clean, 69 tests passed, build, RLS unchanged (no database change).
- **Unfinished / known issues:** none new.
- **Next step:** owner to-dos still open: reset the old database password; test a real sign-up.

## 2026-11-15: LinkedIn import, person-only shared portfolios, bottom tabs, compact projects
- **What and why:** the owner asked for portfolios from a LinkedIn link (alone or with a résumé,
  with no contradictions), shared links that show only the person (no platform branding),
  phone-first bottom navigation, compact project details, and no developer things like APIs.
  - **LinkedIn:** a link field on Create. With a résumé, the résumé wins and the link only fills
    gaps (`mergeProfiles`). Alone, "Build from LinkedIn only" uses the public profile preview.
    LinkedIn "Save to PDF" files now read well (main/sidebar columns, Top Skills, Honors-Awards,
    Company/Role/duration layout, "Page x of y" footers, school/degree order).
  - **Shared portfolios stand alone:** `/p/:slug` and `/example` moved outside the site layout.
    Own header (initials/photo + name), own footer (name + email), section tabs at the bottom on
    phones. Tab title and favicon become the person's (`usePersonHead`).
  - **Link previews per person:** `api/portfolio-page.ts` serves `/p/*` (via `vercel.json`) with
    the person's title, description, og/twitter tags, photo and initials icon. It falls back to
    the plain page on any problem.
  - **Site bottom tabs** on phones replace the Menu button.
  - **Compact project cards** (two columns from 640 px, smaller titles, 14 px text, Read more).
  - **No developer links:** `isTechnicalLink` drops API/endpoint/Swagger/GraphQL/webhook links
    when reading and on display.
  - **Bug fixed:** after deleting a portfolio, the editor's "no portfolio" guard could redirect
    first and swallow the "Your portfolio was deleted" notice. The outer editor now owns a
    `deleted` flag. A journey test caught this once the tests used the app's data router.
  - **Privacy Policy** now also names profile links (LinkedIn) among what is recorded.
- **Files:** `src/features/import/{linkedin,parse,extract,history}.ts`, `src/content/normalize.ts`,
  `src/components/{BottomNav,icons,ui}.tsx`, `src/app/{router,Layout,PortfolioLayout}.tsx`,
  `src/lib/usePageTitle.ts`, `src/pages/{CreatePage,EditorPage,PrivacyPage}.tsx`,
  `src/pages/portfolio/*`, `api/portfolio-page.ts`, `api/_lib/portfolio-head.ts`, `vercel.json`,
  `supabase/migrations/20261115120000_pf_uploads_from_links.sql` (allows `source = 'link'`),
  `supabase/tests/rls_test.sql` (17b), `.github/workflows/ci.yml`, tests
  `linkedin.test.ts`, `portfolio-head.test.ts`, `journey.test.tsx` (now uses a data router,
  async timeout 4 s for busy machines).
- **Tested:** see the PR for gate results (lint, 67 unit/journey tests, build, RLS). Browser check
  at 390 px and 1280 px on `/example`, `/example/projects`, `/create` and an unknown address: no
  sideways scrolling, no platform name on shared pages, tabs shown only on phones.
- **Unfinished / known issues:** LinkedIn-only portfolios are thin (LinkedIn shares little); the
  PDF route is the full one. Preview deployments behind Vercel protection may fall back to the
  plain page for link previews; production is unaffected.
- **Next step:** after merge, open a real `/p/<address>` link in a WhatsApp/LinkedIn preview
  checker and confirm the person's name and photo show. Owner to-dos still open: add
  `https://civileng-portfolio.vercel.app/**` to ResearchHub's Supabase redirect URLs, reset the
  old database password, and test a real sign-up.

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
