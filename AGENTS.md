# Agent dispatcher — how to work in this repo

> Loaded on every chat (via `CLAUDE.md`). It tells you which documents are authoritative, which ones to read for which task, how to read long ones cheaply, and the hard rules for keeping them in sync. Keep it short.

---

## 0. Precedence — read this before anything else

Four documents are authoritative. Each **owns** a kind of truth, and a value or rule is defined in exactly one of them:

| Kind of truth | Owner |
|---|---|
| Product behaviour, rules, states, numbers, flows | `docs/PRD.md` |
| Visual rules, copy, Bootstrap classes, breakpoints | `docs/UI.md` — but only where PRD is silent |
| Schema: tables, columns, types, indexes, constraints | `docs/DB.md` |
| Code structure, libraries, patterns, test conventions | `docs/Tech.md`, `docs/Tech-Backend.md`, `docs/Tech-Frontend.md` |

**When two documents disagree, you do not choose.** Stop, append an `OPEN` entry to `docs/Decisions.md` naming both sources as `file:line`, report it to the user, and wait. Never write code that depends on an unresolved rule. Picking the document you happened to read last is the single most expensive mistake available to you.

Two consequences that follow from this and are not negotiable:

- **A task file is a plan, never a source of truth.** Its `Rules:` line may only name PRD / UI / DB / Tech sections, or `none`. If a task introduces a new product rule, its **subtask 0** writes that rule into the owning document first, in its own `docs:` commit (D-010).
- **`docs/Decisions.md` is the log of *why*, not *what*.** Every `(per D-0NN)` reference in any document must resolve to an entry there.

---

## 1. Always start here

Read `docs/Overview.md` first, every time. It is short on purpose: one paragraph on the project, three actors in one line each, a pointer map (concern → document), and the glossary.

**`docs/old/**` is not authoritative.** It is a local, git-ignored snapshot of superseded documents whose rules contradict the current ones. Never Read, Grep or Glob it unless the user names it explicitly (D-012).

---

## 2. Pick documents by sub-tag, not by habit

Your subtask's sub-tag determines the **minimum** you must read. This is a floor, not a suggestion.

| Sub-tag | Minimum reads |
|---|---|
| `Backend-service` | `Tech-Backend.md` §2–§3, §6 · + every section on the `Rules:` line |
| `Backend-endpoint` | `Tech-Backend.md` §2–§5 · + every section on the `Rules:` line |
| `Backend-migration` | `DB.md` (whole) · `Tech.md` §2 · + every section on the `Rules:` line |
| `Frontend-service` | `Tech-Frontend.md` §3–§4 · + every section on the `Rules:` line |
| `Frontend-component` | `Tech-Frontend.md` §1–§2, §5–§6 · `UI.md` (the screen's section) · + every section on the `Rules:` line |
| `Frontend-page` | `Tech-Frontend.md` §1–§5 · `UI.md` (the screen's section) · + every section on the `Rules:` line |
| `Seed` | `DB.md` §4 · `PRD.md` §7 · `Tech-Backend.md` §7 (seed-vs-in-test policy) · + `Rules:` sections |
| `UI` | `UI.md` (the screen's section) + §13 copy conventions · + `Rules:` sections |
| `Test` | `Tech-Backend.md` §7 or `Tech-Frontend.md` §7 · + every section on the `Rules:` line |
| `Refactor` | the Tech section covering the layer you are changing · + `Rules:` sections |
| `Docs`, `DevOps` | whatever the subtask names |

**Before you write a single line of code, echo the list of sections you actually loaded**, as `file §section`. One line is enough:

```
Loaded: PRD §4.8, UI §7.6, Tech-Frontend §1, Tech-Frontend §3
```

That echo is the whole point: it turns "I forgot to read PRD" from an invisible failure into a visible one. A subtask whose `Rules:` line names a section you did not load is not started correctly — go back and load it.

Deployment work reads `Tech.md` §3 plus `PRD.md` §8. A localized bug fix inside one existing file still reads the PRD section that owns the behaviour you are touching; the architecture documents are what you may skip when the pattern is already visible in the code around you.

---

## 3. How to read long documents without blowing context

`PRD.md`, `Tech.md`, `Tech-Backend.md`, `Tech-Frontend.md` and `UI.md` each carry a **Section index** listing headings only — deliberately with no line numbers (D-011). Never Read these files whole. The flow is:

1. `grep -n "^## " docs/<file>.md` — this gives you live, correct line numbers.
2. Pick the section(s) your task touches; the next heading's line number minus one is the end of yours.
3. `Read` with `offset` and `limit` for just that range.
4. Multiple non-adjacent sections → multiple targeted Reads.

Never trust a line number written inside a document; grep for the heading instead. If you ever see a stored line range anywhere, treat it as a stale hint and verify the heading before relying on it.

`DB.md` and `Decisions.md` have no section index — read them whole when you need them.

---

## 4. Tasks

- Open work lives as **one file per task** in `docs/tasks/active/`. Read `docs/tasks/active/index.md` first (one row per open task, with status and dependencies), then read only the task file you are working on. Do not load other task files — they are other people's concerns.
- **Every subtask carries a checkbox.** `- [ ]` not started, `- [x]` done. **Resume at the first unchecked subtask**, and tick it in the same commit as its work. Never assume a task is untouched because its file still exists.
- Respect `Depends on:` / `Blocks:` in `index.md`. If a task you are asked to start is blocked, say so instead of starting it.
- Completed work is archived by month in `docs/tasks/done/YYYY-MM.md`, trimmed to id + commit message. Do not load these unless the user asks about historical work.
- **Archival gate.** A task may be archived only when all three hold:
  1. Every rule stated in the task's Overview appears in PRD / UI / DB / Tech. If it only exists in the task file, promote it first.
  2. Every `tasks/active/...` pointer in `Overview.md` or any other document is repointed to the owning section.
  3. Every subtask is `- [x]`.

  Then, in one commit: append the trimmed entry to the current month's `done/YYYY-MM.md`, delete the task file, remove its row from `index.md`.

---

## 5. Refactor plans

Dedicated plans live in `docs/refactors/<name>.md`, one file per campaign. When a plan is done, move the file to `docs/refactors/done/`. Both folders may be empty between campaigns — only create a file when a plan actually exists.

---

## 6. Cross-document update protocol

Whenever you change **product behaviour, schema, or a screen — wherever that change originates** (a PRD edit, a task Overview, a bug fix, a user instruction in chat), update the owning siblings in the **same commit**:

- behaviour of services or endpoints → `Tech-Backend.md`
- frontend architecture (routing, state, forms, data hooks, file placement) → `Tech-Frontend.md`
- screens, copy, badges, modals, breakpoints → `UI.md`
- tables, columns, indexes → `DB.md`, plus the migration
- a rule that was previously undecided or decided differently → a new `docs/Decisions.md` entry

A frontend feature usually touches both `UI.md` and `Tech-Frontend.md`; include both. The trigger is the change, not the file you started in — "I only edited a task file" is not an exemption.

---

## 7. Keeping documents honest

- **No stored line numbers.** Section indexes list headings only. If you add a section, add its heading row to the index in the same commit.
- **Section size cap.** No `##` section exceeds ~150 lines. If yours would, split the section — or the file — in the same commit.
- **Layout blocks are verified, not remembered.** `Tech-Frontend.md` §1 and `Tech-Backend.md` §1 describe the real tree and carry a `verified at <sha>` marker. Before creating a file at a path a document names, confirm the parent directory exists (Glob or `ls`). If the document is wrong, fix it in the same commit as your change.
- **One definition per value.** A number, status string, breakpoint or class name is defined in exactly one document; everywhere else points at it. Two definitions is a bug even when they currently agree.

---

## 8. Do not invent

- Do not invent product requirements that are not in `PRD.md`.
- Do not introduce architectural patterns that do not match `Tech*.md`.
- Do not create tables, columns or indexes that do not match `DB.md`.
- Do not add UI copy, components, colours or breakpoints that do not match `UI.md`.
- If a requirement is ambiguous or two documents contradict each other, **stop and follow §0** — an `OPEN` entry in `Decisions.md` plus a report, not a guess and not a silent choice.

---

## 9. TDD discipline

Every implementation subtask follows red-green-refactor-verify:

1. **Red** — write a failing test for the behaviour this subtask adds. Run it; confirm it fails for the right reason.
2. **Green** — write the minimum code that makes it pass. Nothing more.
3. **Refactor** — clean up without changing behaviour. Keep tests green.
4. **Verify** — run the full suite for the touched layer. All green before committing.

Backend conventions: `Tech-Backend.md` §7. Frontend conventions: `Tech-Frontend.md` §7. Load the relevant one before writing tests.

Each subtask body carries a mandatory `Rules:` line naming the PRD / UI / DB / Tech sections it implements, or `Rules: none` for purely technical work. **Load every section it names before writing the Red step** — the subtask bullets become the test cases, and the referenced sections tell you *why* each bullet is a rule.

**Sub-tags.** Pick the one that matches the *subject* of the change. Bare `Backend` and `Frontend` are not valid.

| Sub-tag | The change is in… | Test type |
|---|---|---|
| `Backend-service` | a class under `Services/` or `Repositories/` | Unit tests, mocked dependencies |
| `Backend-endpoint` | a Controller, route, DTO or validator — the HTTP surface | Integration tests, real HTTP + real DB |
| `Backend-migration` | the schema: an EF migration and its entity/mapping changes | Integration test asserting the schema after migrate |
| `Frontend-service` | a function under a feature's `api/` folder | Unit tests with MSW, no React |
| `Frontend-component` | one presentational component that takes props and renders | Unit tests, RTL, co-located, mocked deps |
| `Frontend-page` | a page, or a section that owns state, fetches, or mutations | Integration tests, RTL + router + MSW |
| `Seed` | `seed.sql` | Integration test against the real DB |
| `UI` | `UI.md` only — no code changes | None required |
| `Test` | tests only (coverage backfill, e2e, hardening) | the task body says which |
| `Refactor` | behaviour-preserving restructuring | **No new test.** Existing suites must stay green, and you must say which you ran |
| `Docs` | documentation only | Exempt |
| `DevOps` | CI, hooks, scripts, local tooling | Exempt |

There is no `DB` sub-tag. Schema work is `Backend-migration`, seed work is `Seed`, and a documentation-only schema edit is `Docs`.

Use `Test:` only for test-only work — never as a duplicate of the implementation subtask that already produces the test in its Red step.

**Every subtask body also carries:**

```
Rules:          <PRD §x / UI §x / DB §x / Tech-Backend §x / none>
Not in scope:   <what this subtask must not touch>
Docs to update: <PRD §x / UI §x / DB §x / none>
Verify:         <the exact command that must pass>
```

`Not in scope` is what keeps a subtask from growing. `Verify` is what stops you inventing your own definition of done.

---

## 10. Mechanical check

`node scripts/check-docs.mjs` validates what prose cannot: section indexes matching real headings, `§` references pointing at sections that exist, `(per D-0NN)` references resolving in `Decisions.md`, `Rules:` lines not naming task files, `index.md` rows matching real files, and documented paths existing on disk.

It runs from the pre-commit hook (`.githooks/pre-commit`, enabled with `git config core.hooksPath .githooks`). Run it yourself before you commit documentation. If it fails, fix the documents — do not bypass the hook.
