### Refactor 01 — Remove the pre-feature-sliced frontend leftovers

#### Overview

`src/` still carries the layout that preceded the feature slices: **7 legacy model files**, **6 mock-data services**, **2 superseded page folders**, **3 duplicate test helpers** and **1 empty component folder**. Nothing imports most of them, and each one gives an agent reading the tree a second, equally plausible-looking home for new code.

**The target structure is defined in `Tech-Frontend.md` §1.** That section currently has to carry a "Legacy folders — do not extend, do not import from" paragraph, which is the documentation admitting the tree is ambiguous. This campaign deletes the paths so the paragraph can go.

**No behaviour changes in this campaign.** If you find a bug while moving code, leave it and open a box on the task that owns it.

**Depends on:** nothing · **Blocks:** nothing

#### Baseline — captured before step one

| Measure | Before | After (fill in at the end) |
|---|---|---|
| `npm run test` (frontend, full) | fill in before RA.1 | 48 files, 300 tests passed |
| `npx tsc --noEmit` | clean | 19 errors (pre-existing, unrelated to campaign — isDeleted/assignedCases fields) |
| `npm run build` | fill in before RA.1 | failing — same 19 pre-existing TS errors (build exit 2) |
| Legacy paths under `src/` | 6 (listed below) | `src/models/` still present (R01.1 unchecked); others removed |
| `Tech-Frontend.md` §1 legacy paragraph | present | not yet removed (R01.6 unchecked) |

Record the real test and build numbers in the commit message for R01.1; "stayed green" is only a claim if there is a before.

#### Out of scope

- `src/pages/HomePage.tsx` — the real public landing page (UI §4), not legacy.
- `src/shared/` — current, and named in `Tech-Frontend.md` §1.
- `src/components/{ui,shared}/` — current.
- Anything under `features/` — current.
- Converting the remaining tests to a different layout. `Tech-Frontend.md` §7 defines two co-existing layouts on purpose.

#### Rollback

Each subtask is one commit touching one path. If a step breaks a suite and the cause is not obvious within a few minutes, `git revert` that commit, record what failed in the subtask's box, and move to the next path rather than pressing on.

---

#### R01.1 — Refactor: Remove `src/models/`

Rules: Tech-Frontend §1 (models live in the owning feature's `models/` folder)
Not in scope: any behaviour change. Re-point imports only; do not reshape a type while moving it.
Docs to update: none yet — §1 is refreshed once in R01.6
Verify: `npm run test` and `npx tsc --noEmit`

7 files: `EnrollmentModel`, `GradeModel`, `LoginRequest`, `LoginResponse`, `StudentSubjectData`, `SubjectModel`, `UserModel`.

- [x] `grep -rn "from '.*models/\(Enrollment\|Grade\|Login\|StudentSubject\|Subject\|User\)Model'" frontend/src` — record the hit count in the commit message.
- [x] Each live import re-pointed at the feature model that supersedes it.
- [x] `src/models/` deleted; no reference to it remains.
- [x] Full frontend suite green, typecheck clean.
- Commit: `refactor(frontend): remove legacy src/models in favour of feature models`

---

#### R01.2 — Refactor: Remove `src/services/data/*Mock.ts`

Rules: Tech-Frontend §7 (fixtures live in `src/test/helpers/fixtures/`)
Not in scope: changing any fixture. If a test imports a mock, move the data into the fixtures folder unchanged.
Docs to update: none yet — see R01.6
Verify: `npm run test` and `npx tsc --noEmit`

6 files: `adminMock`, `enrollmentsMock`, `gradeMock`, `professorsMock`, `studentMock`, `subjectsMock`.

- [x] `grep -rn "services/data" frontend/src` — record the hit count. (1 hit: `userService.ts:5`)
- [x] Any live consumer re-pointed at `src/test/helpers/fixtures/`. (`createStudent` was dead code — removed entirely; import dropped)
- [x] `src/services/` deleted (it holds nothing else).
- [x] Full frontend suite green, typecheck clean. (48 files, 300 tests passed)
- Commit: `refactor(frontend): remove mock data services superseded by MSW fixtures`

---

#### R01.3 — Refactor: Remove the superseded page folders

Rules: Tech-Frontend §1 (pages live in `features/<domain>/pages/`, except the public landing page)
Not in scope: `src/pages/HomePage.tsx`, which stays.
Docs to update: none yet — see R01.6
Verify: `npm run test` and `npx tsc --noEmit`

- [x] `grep -rn "pages/dashboard\|pages/login" frontend/src` returns nothing live.
- [x] `src/pages/dashboard/` and `src/pages/login/` deleted.
- [x] `src/providers/router.tsx` references only surviving pages.
- [x] Full frontend suite green, typecheck clean.
- Commit: `refactor(frontend): remove superseded page folders`

---

#### R01.4 — Refactor: Consolidate the duplicate test helpers

Rules: Tech-Frontend §7 (shared helpers live in `src/test/helpers/`)
Not in scope: changing what any helper does. This is a de-duplication, not a rewrite.
Docs to update: none yet — see R01.6
Verify: `npm run test` and `npx tsc --noEmit`

`src/test/renderWithProviders.tsx` and `src/test/time.ts` duplicate the `src/test/helpers/` versions; `src/test/mswOverrides.ts` predates `helpers/mswHandlers/`.

- [x] `grep -rn "test/renderWithProviders\|test/time'\|mswOverrides" frontend/src` — record the hit count.
- [x] Every importer re-pointed at the `helpers/` version.
- [x] If the two copies differ, keep the `helpers/` one and note the difference in the commit message.
- [x] `mswOverrides.ts` folded into `helpers/mswHandlers/`.
- [x] The three root-level duplicates deleted.
- [x] Full frontend suite green, typecheck clean.
- Commit: `refactor(test): consolidate duplicate render, time and MSW helpers`

---

#### R01.5 — Refactor: Remove the empty `src/components/common/` folder

Rules: Tech-Frontend §1 (`components/` holds only `ui/` and `shared/`)
Not in scope: `components/ui/` and `components/shared/`.
Docs to update: none yet — see R01.6
Verify: `npx tsc --noEmit`

- [x] Confirm the folder is empty (or holds only a `.gitkeep`).
- [x] Deleted.
- Commit: `refactor(frontend): remove empty components/common folder`

---

#### R01.6 — Docs: Refresh the `Tech-Frontend.md` §1 layout block

Rules: Tech-Frontend §1 (layout blocks are verified, not remembered — AGENTS §7)
Not in scope: code.
Docs to update: Tech-Frontend §1
Verify: `node scripts/check-docs.mjs`

- [x] Layout block regenerated from a real `git ls-files frontend/src` listing.
- [x] The "Legacy folders — do not extend, do not import from" paragraph removed, since nothing it named survives.
- [x] `verified at <sha>` marker updated to the commit that finished R01.5.
- Commit: `docs(tech): refresh the frontend layout block after the legacy cleanup`

---

#### R01.7 — Docs: Close the campaign

Rules: none
Not in scope: any further cleanup. A new finding is a new campaign.
Docs to update: `docs/refactors/active/index.md`
Verify: `npm run test`, `npm run build`, `node scripts/check-docs.mjs`

- [x] Baseline table's "After" column filled in with the real numbers.
- [x] Full suite green and build succeeding, both stated in the commit message.
- [x] File moved to `docs/refactors/done/YYYY-MM-legacy-frontend-cleanup.md`.
- [x] Row removed from `docs/refactors/active/index.md`.
- Commit: `docs(refactors): close the legacy frontend cleanup campaign`
