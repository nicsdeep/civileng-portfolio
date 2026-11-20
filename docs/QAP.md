# QAP: Quality Assurance Plan, CivilEng Portfolio

Every change must pass this plan before it is merged. Read it before changing anything, and
update it whenever you add behaviour (see `AGENTS.md`).

## 1. Gates (run all of them, and report the real results)

| Gate | Command | Where |
|---|---|---|
| Lint | `npm run lint` | local and CI |
| Types and build | `npm run build` (runs `tsc -b`) | local, CI and Vercel |
| Unit and journey tests | `npm test` | local and CI |
| Database security (RLS) | `PGHOST=localhost PGUSER=postgres supabase/tests/run-rls-tests.sh` | CI `database-security` job; the expected ERROR count is in `.github/workflows/ci.yml` |
| Browser check | open the changed pages at 390 px and at 1280 px | local, before the PR |
| Live check | after merging: the site serves the new build, and the migrations workflow is green | production |

A gate that cannot be run is reported as **not run**, with the reason. It is never reported as
passed.

## 2. Test map

| Area | Tests |
|---|---|
| Journey: upload → email sign-in (`/sign-in?next=/finish`) → `/finish` → live; signed-in upload → live with a free address; owner re-upload keeps media and offers Undo; save → portfolio; `?tab=`; delete; scratch | `tests/journey.test.tsx` |
| Résumé reading (PDF layout, DOCX, text, dates, phone) | `tests/import.test.ts` |
| Upload records sent to the database (exact payload, claim token hash) | `tests/history.test.ts` |
| Paste a link → picture, project, label; fallbacks | `tests/links.test.ts` |
| Link preview server: HTML parsing, blocked addresses (SSRF) | `tests/preview.test.ts` |
| LinkedIn: profile link → portfolio, résumé + link merge (résumé wins), LinkedIn PDF layout | `tests/linkedin.test.ts`, `tests/journey.test.tsx` |
| Shared link previews: person-only title, tags and icon; escaping; unsafe photos dropped | `tests/portfolio-head.test.ts` |
| Content cleaning (URLs, limits) | `tests/normalize.test.ts` |
| Editor form conversions | `tests/form.test.ts` |
| Sign-in redirects (passwordless; no password fields anywhere) | `tests/validation.test.ts`, `tests/journey.test.tsx` |
| Research section: cleaning, method-stage parsing, editor round trip | `tests/normalize.test.ts`, `tests/form.test.ts` |
| RLS: profiles, addresses, upload history (write-only, rate limit, retention, claiming), address history (old links follow; hidden, re-taken and deleted ones do not; no direct reads) | `supabase/tests/rls_test.sql` |
| Automatic addresses: which are automatic, when they follow the name | `tests/import.test.ts`, `tests/journey.test.tsx` |

New behaviour needs a test in the matching file, or a new file listed here.

## 3. UX acceptance checklist (every change to a screen)

- [ ] **Shortest path.** Could this be done with fewer screens, fields or taps? If yes, do that.
- [ ] **Never lost.** The page has a Back link, the header, or a clear next step. Error, empty
      and not-found states included.
- [ ] **Feedback.** Every action shows a loading state, then success or a helpful error.
- [ ] **No overlap.** No two visible controls share a label or do the same thing. One primary
      (orange) button per screen.
- [ ] **Consistency.** Same wording as elsewhere (Save, Share link, Edit details, Upload new
      résumé, Back), same components and styles.
- [ ] **Phone.** At 390 px there is no sideways scrolling and nothing overlaps or is cut off.
      Tap targets are at least 40 px.
- [ ] **Design kept.** Only existing tokens, utilities and components; no new colours or fonts
      unless asked.
- [ ] **Shared portfolio is the person only.** `/p/<address>` and `/example` show no platform
      name, logo, header, footer or menu; the tab title and icon are the person's.
- [ ] **Bottom tabs on phones.** The tab bar does not cover content (pages pad the bottom).
- [ ] **User-friendly, not developer-friendly.** No API/endpoint links or technical wording on
      public pages.
- [ ] **Keyboard and screen readers.** Labels on inputs, roles on status messages, visible focus.

## 4. Journey acceptance (must always hold)

1. A new visitor with a PDF reaches a live portfolio with: upload → create account → (confirm
   email) → live. No other screens.
2. A signed-in user with a résumé reaches their live portfolio in one upload.
3. Opening the site or `/me` while signed in shows your own portfolio, with the owner bar.
4. Saving in the editor returns to the portfolio with "Changes saved."
5. Uploading a new résumé keeps the address and the pictures and links added by hand, and Undo
   restores the previous version.
6. Pasting a project link shows a preview card before anything is added. Pasting a website into
   a logo field shows the logo at once.
7. A résumé plus a LinkedIn link builds one portfolio; nothing in the résumé is replaced.
8. Deleting a portfolio lands on Create with "Your portfolio was deleted."
9. Changing the name moves an automatic address (never a typed one), and the old link still
   opens the portfolio.

## 5. Security checklist

- [ ] New tables: RLS on, explicit grants, `pf_` prefix, tests in `rls_test.sql`.
- [ ] Anything a user types or pastes passes `normalizeCv`/`safeUrl` before display. Images must
      be https.
- [ ] Server functions that fetch URLs use `assertPublicUrl` (public IPs only, re-checked on every
      redirect), timeouts and size limits.
- [ ] No secrets in the browser bundle (only `VITE_` public values).
- [ ] The Privacy Policy still matches what the code stores.

**Known risks:**
- DNS rebinding between the address check and the request in `/api/preview`. Low impact: the
  response returns only page metadata.
- Pictures are hot-linked from other sites and may disappear. `WebImage` hides broken ones.

## 6. Release

Branch → PR → CI green → merge to `main` → Vercel deploys and the migrations workflow runs →
check the live site → add a hand-over entry.
