# Agent dispatcher — how to work in this repo

> This file is loaded on every chat (via `CLAUDE.md`). It tells you which docs to read for which task, how to read big docs cheaply, and the hard rules for keeping docs in sync. Keep it short.

---

## 1. Always start here

Before anything else, read `docs/Overview.md`. It is short on purpose: one paragraph on the project, three actors in one line each, a pointer map (concern → doc), and the glossary. This replaces the old "read every doc" rule.

---

## 2. Pick docs by concern, not by habit

Decide what KIND of change your task is, then load only the matching doc(s). Common concerns:

| Concern | Load |
|---|---|
| Product rules, flows, edge cases | `docs/PRD.md` (by section — see §3 below) |
| Backend architecture (services, controllers, EF, DI, auth) | `docs/Tech.md` §2 (and §1 if adding a package) |
| Frontend architecture (routing, state store, folder layout, forms, testing) | `docs/Tech.md` §3 |
| UI (screens, copy, modals, forms, responsiveness) | `docs/UI.md` |
| Database (tables, columns, migrations, seeds, indexes) | `docs/DB.md` |
| Deployment | `docs/Tech.md` §5 + `docs/PRD.md` §8 |

Rules of thumb:

- A **frontend feature** typically needs `UI.md` + `Tech.md` §3; a product-rule change on top of that also needs `PRD.md`.
- A **backend feature** typically needs `Tech.md` §2 + `DB.md` (if touching tables) + the relevant PRD section for the rule.
- A **localized bug fix** inside an existing file usually needs only the surrounding code plus the relevant PRD section. Skip the architecture docs when the pattern is already visible in the code around you.
- **Tests, docs, config-only edits** usually need no architecture docs. Use the task description and the surrounding code.

---

## 3. How to read PRD.md / Tech.md / UI.md without blowing context

These files have a Table of Contents at the top listing section line ranges. **Never Read them whole.** The flow is:

1. Read lines 1–40 of the file to see its TOC.
2. Pick the section(s) your task touches.
3. Call Read again with `offset` and `limit` to load only those lines.
4. If you need multiple non-adjacent sections, do multiple targeted Reads.

`DB.md` is small (~290 lines) and has no TOC — read it whole when you need it.

---

## 4. Tasks

- Open work lives in `docs/tasks/active.md`. Read this when starting an implementation task.
- Completed work is archived by month in `docs/tasks/done/YYYY-MM.md`, trimmed to id + commit message. Do not load these unless the user asks about historical work.
- When a task is fully complete, move its entry (parent task + nested subtasks) from `active.md` to the current month's done file, trimming to id + commit message following the existing format.

---

## 5. Refactor plans

Dedicated plans live in `docs/refactors/<name>.md`, one file per refactor campaign. When a plan is done, move the file to `docs/refactors/done/`. The folder may be empty between campaigns — only create a file there when a refactor plan actually exists.

---

## 6. Cross-doc update protocol

The four source-of-truth docs can drift. When you change a product rule in PRD, update sibling docs in the **same commit**:

- A PRD rule change that affects **backend behavior, services, or endpoints** → also update `Tech.md` §2.
- A PRD rule change that affects **frontend architecture** (routing, state, forms, data hooks) → also update `Tech.md` §3.
- A PRD rule change that affects **screens, copy, or modals** → also update `UI.md`.
- A PRD rule change that affects **tables or columns** → also update `DB.md` and plan the migration.

A frontend feature often touches both `UI.md` and `Tech.md` §3 at once; include both.

---

## 7. Keeping TOCs honest

`PRD.md`, `Tech.md`, and `UI.md` each carry a line-range TOC at the top. **If your edit changes line counts in one of those files, update that file's TOC in the same commit.** Mechanical: locate each `## N.` heading, record its new line number, update the ranges. If your edit is confined to one section and doesn't add or remove lines (e.g. a typo fix), no TOC update is needed.

---

## 8. Do not invent

- Do not invent product requirements that are not in `PRD.md`.
- Do not introduce architectural patterns that don't match `Tech.md`.
- Do not create tables, columns, or indexes that don't match `DB.md`.
- Do not add UI copy, components, or breakpoints that don't match `UI.md`.
- If a requirement is ambiguous or contradictory, document the ambiguity in your reply rather than invent a rule.
