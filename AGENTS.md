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
| Backend architecture (`Backend-service`, `Backend-endpoint`, `Backend-migration`) | `docs/Tech.md` §2 (and §1 if adding a package) |
| Frontend architecture (`Frontend-service`, `Frontend-component`, `Frontend-page`) | `docs/Tech.md` §3 |
| UI (`UI`) — screens, copy, modals, forms, responsiveness | `docs/UI.md` |
| Database (`DB`, `Seed`) — tables, columns, migrations, seeds, indexes | `docs/DB.md` |
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

- Open work lives as **one file per task** in `docs/tasks/active/`. Start by reading `docs/tasks/active/index.md` (one row per open task), then read only the specific task file you are working on (e.g. `docs/tasks/active/task-23-escalation.md`). Do not load other task files — they are other teammates' concerns.
- Completed work is archived by month in `docs/tasks/done/YYYY-MM.md`, trimmed to id + commit message. Do not load these unless the user asks about historical work.
- When a task is fully complete:
  1. Append a trimmed entry (parent task line + nested subtasks as id + commit message, following the existing format) to the current month's `docs/tasks/done/YYYY-MM.md`. Create the file if the month has none yet.
  2. Delete the task file from `docs/tasks/active/`.
  3. Remove its row from `docs/tasks/active/index.md`.
  All three happen in the same commit.

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

---

## 9. TDD discipline

Every implementation subtask follows red-green-refactor:

1. **Red** — write a failing test for the behavior the subtask is adding. Confirm it fails for the right reason.
2. **Green** — write the minimum code that makes the test pass. Nothing more.
3. **Refactor** — clean up without changing behavior. Keep tests green.
4. **Verify** — run the full test suite for the touched layer. All green before committing.

Backend testing conventions live in `docs/Tech.md` §2 Testing subsection. Frontend testing conventions live in `docs/Tech.md` §3 Testing subsection. Load them when writing tests.

Each subtask body carries a mandatory `Rules:` line naming the PRD/UI/DB section(s) the subtask implements (e.g. `Rules: PRD §6 (security — opaque error, soft-delete rejection)`), or `Rules: none` for purely technical subtasks. Before writing the Red step, load every section the `Rules:` line names. The subtask bullets become the test cases; the referenced sections tell you WHY each bullet is a rule.

**Sub-tag → test type (choose the matching tag; `Backend` or `Frontend` alone are not valid):**

| Sub-tag | Test type | Where to look in Tech.md |
|---|---|---|
| `Backend-service` | Unit tests (mocked dependencies) | §2 Testing — "Unit tests" |
| `Backend-endpoint` | Integration tests (real HTTP + real DB) | §2 Testing — "Integration tests" |
| `Backend-migration` | Integration tests (schema assertion after migrate) | §2 Testing — "Integration tests" |
| `Frontend-service` | Unit tests (MSW, no React) | §3 Testing — "Unit tests" |
| `Frontend-component` | Unit tests (RTL, co-located, mocked deps) | §3 Testing — "Unit tests" |
| `Frontend-page` | Integration tests (RTL + router + MSW) | §3 Testing — "Integration tests" |
| `DB`, `Seed` | Integration tests (real DB) | §2 Testing — "Integration tests" |
| `UI` | None required (visual-rules doc, no code) | n/a |
| `Test` | Writes tests only (any kind) | task body says which |
| `Docs`, `DevOps` | Exempt from TDD | n/a |

Exceptions: `Docs:` and `DevOps:` subtasks skip TDD. Use `Test:` subtasks only for test-only work (coverage backfill, e2e, hardening) — never duplicate a `Test:` subtask next to the implementation subtask that is already producing the test under the Red step.
