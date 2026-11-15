# Project doctrine template (reusable on any project)

Copy this file into a new project. Then create the four files below from it, filling in the
project-specific parts marked `<…>`. This keeps every AI agent (Claude Code, Codex, Lovable,
Antigravity, Kimi, Cursor, Copilot…) and every developer working the same way, so whoever comes
next can pick up exactly where the last one stopped.

| File | Purpose |
|---|---|
| `AGENTS.md` (repository root) | The rules: what to read before a change and what to update after it. Most agents read this automatically. |
| `CLAUDE.md` (root) | One line, `@AGENTS.md`, so Claude Code loads the same rules. For Lovable, paste the rules section into Project Knowledge. For Cursor, add a `.cursor/rules` file pointing to `AGENTS.md`. |
| `docs/PRD.md` | Product requirements: purpose, users, **the one user journey**, features, data, design, privacy, out of scope. |
| `docs/QAP.md` | Quality Assurance Plan: gates (commands), test map, UX checklist, journey acceptance, security checklist, release steps. |
| `docs/HANDOVER.md` | A dated log, newest first: what changed, files, tests run, what is unfinished, the next step. |

---

## The rules (paste into AGENTS.md)

### Before any change: read, in this order
1. `docs/HANDOVER.md`: the last change and where to take over.
2. `docs/PRD.md`: the product and the journey you must not break.
3. `docs/QAP.md`: the gates and checklists you must pass.
4. The code and tests you will touch.

### While working
- **First principles:** start from the user's real goal and remove every step, screen, field
  and word that does not serve it. The fewest steps win.
- **One journey:** one main path through the product. New features join it; they do not add a
  parallel one.
- **Never lost:** every page has Back, a header, or a clear next step. No dead ends, including
  errors and empty states.
- **Always give feedback:** every action shows loading, then success or a helpful error.
- **No overlap:** one action has one control and one name. No duplicate buttons or labels on
  screen.
- **Consistency:** the same words, components and styles everywhere. One primary button per
  screen.
- **Keep the design:** no restyling unless asked. Reuse the existing tokens and components.
- **No regressions:** keep and extend tests. Never delete or skip a test to get green.
- **Phone first:** check at 390 px. No sideways scrolling; tap targets of at least 40 px.
- **Safe by default:** database access rules tested, user input cleaned, no secrets in the
  client.
- **Honest:** never mislead users. Policies match what the code does.

### After any change (in the same commit)
1. Add a dated entry at the top of `docs/HANDOVER.md`: what and why, files, tests run and their
   real results, what is unfinished, the next step.
2. Update `docs/PRD.md` if behaviour, the journey or data changed.
3. Update `docs/QAP.md` with new checks and tests.
4. Run all the gates in `docs/QAP.md` and report the true results. Anything not run is
   reported as "not run" with the reason.

A change without its hand-over entry is not finished.

---

## PRD skeleton
1. Purpose: the user's real goal in one sentence.
2. Users and context (device, time, skill).
3. **The journey:** the steps from arrival to goal, with navigation rules and success/error
   states.
4. Features, each tied to a journey step.
5. Data: tables, fields, access rules.
6. Design: the look to keep.
7. Privacy and records.
8. Out of scope.

## QAP skeleton
1. Gates: command, where it runs.
2. Test map: area → test file.
3. UX checklist: shortest path, never lost, feedback, no overlap, consistency, phone, design
   kept, accessibility.
4. Journey acceptance: numbered statements that must always be true.
5. Security checklist and known risks.
6. Release steps.

## HANDOVER entry
```
## YYYY-MM-DD: <title> (PR #n)
- What and why:
- Files:
- Tested:
- Unfinished / known issues:
- Next step:
```
