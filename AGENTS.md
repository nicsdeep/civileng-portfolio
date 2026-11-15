# AGENTS.md: rules for every agent and developer

This file is for **any** AI agent or person changing this project: Claude Code, Codex,
Lovable, Antigravity, Kimi, Cursor, Copilot and others. Follow it on every change, however small.

## 1. Before you change anything: read, in this order

1. `docs/HANDOVER.md`: what changed last, what is in progress, and where to take over.
2. `docs/PRD.md`: what the product is, who it is for, and the user journey you must not break.
3. `docs/QAP.md`: the quality gates and checklists every change must pass.
4. The code you are about to touch, and its tests.

Do not start from memory or from an old summary. The docs are the source of truth. If the code
and the docs disagree, say so in your hand-over and fix whichever is wrong.

## 2. While you work: the doctrine

- **First principles.** Start from what the user is trying to get done, then remove every step,
  screen, field and word that does not serve it. The fewest steps to the goal win.
- **One journey.** There is one main path through the product (`docs/PRD.md` § Journey). New
  features join that path. They do not open a second, parallel one.
- **Never lost.** Every page has a visible way back or onward: a Back link, the header, or a
  clear next button. There are no dead ends, including error, empty and not-found pages.
- **Always tell people what happened.** Every action ends in a visible result: a success message,
  an error that says what to do, or a loading state. Nothing happens silently.
- **No overlap.** One action has one button and one name. Never show two controls with the same
  label on screen, or two places that do the same thing in different words.
- **Consistency.** Same words, same button styles (`btn-primary` for the one main action on a
  screen, `btn-secondary` next to it, `btn-quiet` for minor ones), same layout patterns.
- **Keep the design.** Do not restyle or "refresh" the look unless asked. Reuse the tokens and
  utilities in `src/styles/index.css` and the components in `src/components`.
- **No regressions.** Existing behaviour keeps working unless the PRD says it changes. Keep or
  extend tests; never delete a test to make a change pass.
- **Phone first.** Most people use a phone. Check 390 px wide: no sideways scrolling, and tap
  targets of at least 40 px.
- **Safe by default.** Database rules (Row Level Security) are tested. User-pasted links are
  cleaned before display. Secrets never go in code or in the browser.
- **Honest.** Do not mislead users about what happens to their data. Keep the Privacy Policy
  true to what the code does.

## 3. After you change something: update the docs, in the same commit

1. `docs/HANDOVER.md`: add a dated entry at the top. Say what changed and why, the files
   touched, how it was tested, what is unfinished, and the exact next step.
2. `docs/PRD.md`: update it if behaviour, the journey, data or rules changed.
3. `docs/QAP.md`: add or update checks and tests for anything new.
4. Run every quality gate in `docs/QAP.md` § Gates and report the real results. If one fails,
   say so. Do not claim it passed.

A change without its hand-over entry is not finished.

## 4. Project facts (quick reference)

- Stack: Vite, React 19, TypeScript, Tailwind 4, React Router 7, TanStack Query, Supabase,
  Vercel (site plus `/api` functions).
- Live site: https://civileng-portfolio.vercel.app. The `main` branch deploys automatically.
- Database changes go only through `supabase/migrations/*.sql`, applied by
  `.github/workflows/supabase-migrations.yml` when merged. The Supabase project is shared with
  CivilEng ResearchHub: use the `pf_` prefix and never touch `rh_` objects.
- Work on a branch and open a pull request. CI (lint, tests, build, RLS tests) must be green
  before merging.
