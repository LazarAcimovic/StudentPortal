### Refactor 07 — Frontend component decomposition and placement

#### Overview

`Tech-Frontend.md` §2 states the shape: "Pages hold state; presentational pieces take data via props." §1 states where each piece lives, and its "Where things go" paragraph is explicit that role-specific components belong under `features/user/components/<role>/`. Four files have outgrown both rules, and one sits in the wrong folder:

| File | Lines | Why it is on this list |
|---|---|---|
| `features/user/components/admin/EscalationsTab.tsx` | 460 | the largest file in `src/`; owns fetching, paging, the assign and reassign mutations, the status derivation and the whole table and modal markup |
| `features/user/pages/AdminDashboardPage.tsx` | 381 | a page holding four tabs of state |
| `features/user/components/professor/GradePanel.tsx` | 351 | a "component" owning draft state, five point fields and the confirm mutation |
| `components/ui/UserEditForm.tsx` | 326 | admin-only, yet filed under `components/ui/` beside `Modal`, `Navbar` and `PasswordInput` — `Tech-Frontend.md` §1 records the current placement, so the document moves with the file |
| `features/user/components/admin/UserCreateForm.tsx` | 255 | | 
| `features/user/components/admin/SubjectEditForm.tsx` | 252 | |

Total across the six: 2 025 of the 8 498 non-test lines under `frontend/src/`.

The measurable problem is not the line count on its own — it is that `components/ui/` is supposed to hold reusable primitives and holds one 326-line admin form, and that three of the six files mix a fetch, a mutation and markup in one unit, so a component test cannot render any of them without mocking the service layer. `Tech-Frontend.md` §7 draws the line this campaign restores: a co-located unit test covers "one component, hook, store, schema, service or helper per file", while a page tree with router and MSW is an integration test under `src/test/integration/`.

`EscalationsTab` is the clearest case: `features/escalations/` already owns `useEscalations` and `useEligibleProfessors` (both Pattern B hooks per `Tech-Frontend.md` §3), so the data layer it needs exists — the tab simply does not use the split.

**The target structure is defined in `Tech-Frontend.md` §1, §2 and §3.** Nothing a user can see changes: same markup, same copy, same classes, same requests. `UI.md` §7, §8 and §11 own every visual rule involved, and this campaign must not edit any of them.

**Depends on:** nothing · **Blocks:** nothing (refactor-06 touches `App.tsx`, the providers and `Navbar`; this campaign touches pages and feature components — run them in parallel, but not two writers in one file)

#### Baseline — captured before step one

| Measure | Before | After (fill in at the end) |
|---|---|---|
| `npm run test` from `frontend/` | 56 files, 382 tests passed | |
| `npx tsc --noEmit` from `frontend/` | clean | |
| `npm run build` from `frontend/` | succeeds — 268 modules, 629.58 kB JS (190.98 kB gzip), 245.50 kB CSS, 12.2s | |
| `npm run lint` from `frontend/` | **2 errors, 2 warnings** — not clean (see Out of scope) | |
| `EscalationsTab.tsx` | 460 lines | |
| `AdminDashboardPage.tsx` | 381 lines | |
| `GradePanel.tsx` | 351 lines | |
| `UserEditForm.tsx` | 326 lines, in `components/ui/` | |
| non-test lines under `frontend/src/` | 8 498 | |
| files in `components/ui/` that are not reusable primitives | 1 | |

#### Out of scope

- **Every visual rule.** No copy, class, colour, breakpoint, badge or modal behaviour changes. `UI.md` owns all of them, and `src/test/integration/responsive/` and `a11y/` are the tests that prove it.
- **Any new pattern from the "Not in use" list** in `Tech-Frontend.md` §2: no `React.memo`, `React.lazy`, `Suspense`, `forwardRef`, `useReducer`, `useLayoutEffect`, no Context, no React Query, and no custom hook that is not a data-fetching hook.
- **A component library or a `useForm` abstraction.** §2 and §5 rule both out; forms stay raw `useState` plus a Zod schema in the feature's `utils/`.
- **`SearchableCombobox`** (172 lines) — D-034 decided it is one hand-rolled primitive with inline debounce. It is the right size and in the right place.
- **Adding tests for behaviour that has none.** A `Refactor` writes no new test (AGENTS §9). Where a split leaves a new presentational component with no direct test, note it in a box and open a `Test` subtask on task 22 rather than writing one here.
- **Store reads and the role map** — refactor-06 owns both. If a file this campaign splits still contains a bare `useUserStore()`, leave it; converting it here would collide with R06.1.
- **The four pre-existing lint findings.** `npm run lint` is **already failing** before this campaign starts, and fixing it is not this campaign's job. The baseline is 2 errors and 2 warnings:

  | Finding | Location | Treatment |
  |---|---|---|
  | `'_regex' is defined but never used` | `features/auth/pages/LoginPage.test.tsx:125` | unrelated to this campaign; leave it |
  | `'_cb' is defined but never used` | `test/integration/user/AdminDashboard.dropdownSearch.test.tsx:34` | unrelated; leave it |
  | `useEffect has a missing dependency: 'doFetch'` | `components/ui/SearchableCombobox.tsx:125` | **do not "fix"** — see below |
  | `useEffect has a missing dependency: 'subjects'` | `features/user/components/professor/SubjectsList.tsx:48` | **do not "fix"** — see below |

  The two `react-hooks/exhaustive-deps` warnings are very likely **deliberate**, and adding the dependency the rule asks for is the specific bug D-033 exists to prevent: `subjects` is an array a parent produces, so listing it makes the effect run on every render. `SearchableCombobox`'s inline `useRef` + `setTimeout` debounce (D-034) has the same shape. Satisfying the linter here would reintroduce a runaway render loop.

  So this campaign's lint obligation is **"no worse than 4"**, not "clean". If a split changes either warning's location, carry the suppression with it and say so in the commit message. Cleaning up the two unused-variable errors is a separate `DevOps` or `Test` item, and deciding what to do about the two warnings — suppress with an explicit `eslint-disable-next-line` plus a D-033 comment, or change the rule config — needs its own decision, not a drive-by edit.

#### Rollback

Each subtask is one commit touching one path. A decomposition that drops a prop or an effect dependency is the realistic failure, and `Tech-Frontend.md` §2 names the specific trap (D-033): a `useEffect` must never depend on an array or object a parent produces inline, so splitting a component and passing `?? []` down is how a runaway render loop gets introduced. Depend on a primitive or a `useMemo`-stabilised value. If a suite goes red and the cause is not obvious in a few minutes, `git revert` and record what failed in the box.

---

#### R07.1 — Refactor: Move UserEditForm to the admin folder

Rules: Tech-Frontend §1 ("Where things go" — role-specific components live under `features/user/components/<role>/`)
Not in scope: any change to the form itself. This commit is a move and an import re-point, nothing else.
Docs to update: Tech-Frontend §1 (the layout block lists `UserEditForm.tsx` under `components/ui/`)
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [x] `grep -rn "UserEditForm" frontend/src` — record the hit count in the commit message.
- [x] Move `components/ui/UserEditForm.tsx` to `features/user/components/admin/UserEditForm.tsx`, beside `UserCreateForm` and `UsersTable`.
- [x] Re-point every import, including `src/test/integration/user/UserEditForm.matrix.test.tsx` and `UserEditForm.save.test.tsx`.
- [x] Export it from `features/user/index.ts` — `Tech-Frontend.md` §1 says imports go through the barrel, not deep paths.
- [x] No reference to the old path remains.
- [x] `components/ui/` holds only `Modal`, `Navbar`, `PasswordInput`, `Pagination`, `SearchableCombobox` and `ErrorBoundary` — reusable primitives, as §1 intends.
- [x] Named suites green, typecheck clean.
- Commit: `refactor(frontend): move UserEditForm into features/user/components/admin`

---

#### R07.2 — Refactor: Split EscalationsTab onto its existing hooks

Rules: Tech-Frontend §2 (pages hold state; presentational pieces take props), Tech-Frontend §3 (one data-fetching hook per fetch, in the feature's `hooks/`), D-032 (the endpoint is server-side paged), D-033
Not in scope: the four derived statuses, the paging contract, the assign and reassign request shapes, and every visual rule in `UI.md` §8.6.
Docs to update: Tech-Frontend §1 (the new file list)
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [x] Record the starting 460 lines and the final per-file counts in the commit message.
- [x] `features/escalations/hooks/useEscalations.ts` and `useEligibleProfessors.ts` already exist as Pattern B hooks. Use them; do not write a third.
- [x] Extract the presentational pieces into `features/user/components/admin/`, one per file, each taking props only: the case row, the case table, the assign/reassign modal body.
- [x] `EscalationsTab` keeps the state, the hook calls and the mutations, and drops to a composition root.
- [x] Every extracted `useEffect` depends on primitives or `useMemo`-stabilised values — never on an array a parent builds inline or with `?? []` (D-033). This is the one way this subtask can introduce a runaway loop.
- [x] `src/test/integration/escalations/AdminEscalations.test.tsx` passes unchanged. If it needs editing, behaviour moved — stop.
- [x] Named suites green, typecheck clean.
- Commit: `refactor(frontend): split EscalationsTab into presentational components`

---

#### R07.3 — Refactor: Reduce AdminDashboardPage to a tab host

Rules: Tech-Frontend §2, Tech-Frontend §1
Not in scope: which tabs exist, the tab copy, and the active-tab behaviour. `UI.md` §8 owns all of it.
Docs to update: Tech-Frontend §1
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [x] Record the starting 381 lines and the final count. (381 → 81 lines)
- [x] Each tab body becomes its own component under `features/user/components/admin/`, taking its own props. The page keeps the active-tab state and nothing else. (UsersTabPanel, SubjectsTabPanel, EnrollmentsTabPanel created; all four panels kept mounted via d-none so effects never re-run on tab switch)
- [x] Per-tab fetching moves into the owning tab component or an existing hook, so switching tabs does not re-run every tab's effects.
- [x] `src/test/integration/user/AdminDashboard.pagination.test.tsx` and `AdminDashboard.dropdownSearch.test.tsx` pass unchanged.
- [x] Named suites green, typecheck clean. (380 passed in 56 files, tsc clean)
- Commit: `refactor(frontend): reduce AdminDashboardPage to a tab host`

---

#### R07.4 — Refactor: Separate GradePanel state from presentation

Rules: Tech-Frontend §2, Tech-Frontend §5 (raw `useState` plus one Zod schema per form), PRD §3 (the five point fields and their bounds, unchanged)
Not in scope: the point-field bounds, the half-step rule, the final-grade mapping and the confirm request shape. `PRD.md` §3 owns the rules and `features/user/utils/gradeUtils.ts` already holds the helpers.
Docs to update: Tech-Frontend §1
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [x] Record the starting 351 lines and the final count. GradePanel: 351 → 331 lines; GradeFieldSet: 36 lines.
- [x] The five point inputs become one presentational field-set component taking values, errors and change handlers as props.
- [x] `GradePanel` keeps the draft state, the save-draft and confirm mutations, and the Zod validation, delegating all markup.
- [x] `gradeUtils.ts` stays the single home for the point-sum and final-grade helpers; no duplicate arithmetic lands in the new component.
- [x] `src/test/integration/grades/ProfessorDashboard.test.tsx` and `gradeUtils.test.ts` pass unchanged.
- [x] Named suites green, typecheck clean.
- Commit: `refactor(frontend): separate GradePanel state from its field markup`

---

#### R07.5 — Refactor: Deduplicate the three admin forms

Rules: Tech-Frontend §5 (the documented submit flow and the per-field `{ ok: false, fieldErrors }` result shape), D-024
Not in scope: inventing a form abstraction — `Tech-Frontend.md` §2 forbids a `useForm` hook. What is shared here is markup and the error-mapping shape, not a hook.
Docs to update: Tech-Frontend §5 if the shared shape needs stating
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [x] Measure the duplication first and put the number in the commit message: `UserCreateForm` (255), `SubjectCreateForm` (202), `SubjectEditForm` (252) and `UserEditForm` (326) repeat the same touched-state, field-error and server-error markup.
- [x] Extract the repeated markup as presentational components (a labelled field with error slot, a form-level alert), not as a hook.
- [x] Each form keeps its own `useState`, its own Zod schema in `features/user/utils/`, and the submit flow from §5 unchanged.
- [x] The per-field `409` mapping that D-024 requires stays exactly as `userService.addUser` implements it.
- [x] `UserCreateForm.test.tsx`, `SubjectCreateForm.test.tsx`, `SubjectEditForm.test.tsx` and the two `UserEditForm` integration tests pass unchanged.
- [x] Named suites green, typecheck clean.
- Commit: `refactor(frontend): extract the shared admin form field markup`

---

#### R07.6 — Refactor: Route imports through the feature barrels

Rules: Tech-Frontend §1 ("Barrels. Every feature exports its public surface via `index.ts`. Imports go through the barrel, not deep paths.")
Not in scope: creating a barrel where a feature has none, or exporting something that was private.
Docs to update: Tech-Frontend §1
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [ ] `grep -c "from '\.\./features/" frontend/src/providers/router.tsx` — 6 deep imports today, against a documented rule that there should be none.
- [ ] Sweep the whole tree, not just the router: `grep -rn "from '.*features/[a-z]*/\(pages\|components\|api\|hooks\|models\)/" frontend/src` and record the count before and after.
- [ ] Each feature's `index.ts` exports what the outside actually imports; nothing new becomes public.
- [ ] Watch for an import cycle: a barrel that re-exports a page which imports from the same barrel will build but can break test ordering. If one appears, keep the deep import and record why in this box.
- [ ] Named suites green, typecheck clean, `npm run build` succeeds.
- Commit: `refactor(frontend): import through feature barrels`

---

#### R07.7 — Docs: Refresh the frontend layout block

Rules: Tech-Frontend §1 (layout blocks are verified, not remembered — AGENTS §7)
Not in scope: code.
Docs to update: Tech-Frontend §1, Tech-Frontend §2
Verify: `node scripts/check-docs.mjs`

- [ ] Layout block regenerated from a real directory listing of `frontend/src/`.
- [ ] `verified at <sha>` updated. If refactor-06 R06.6 already refreshed it, this subtask re-verifies rather than re-writes, and says so.
- [ ] Every file this campaign created or moved appears at its real path, and no path in the block is missing from disk — `scripts/check-docs.mjs` checks exactly that.
- [ ] Any `##` section that passed ~150 lines is split (AGENTS §7).
- [ ] `node scripts/check-docs.mjs` passes.
- Commit: `docs(tech): refresh the frontend layout block after the decomposition campaign`
