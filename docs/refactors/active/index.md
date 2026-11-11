# Active refactor campaigns

> Open campaigns live as individual files in this folder. Read this index first, then only the campaign file you are working on.
>
> **Resume at the first unchecked subtask** and tick it in the same commit as its work (AGENTS §4.1 applies here verbatim). A campaign file still being here does not mean nothing has been done.
>
> A campaign changes **structure only**. No behaviour changes, no new tests — the existing suites are the safety net (AGENTS §9, `Refactor` sub-tag). If you find a bug while moving code, leave it and open a box on the task that owns it.
>
> Before archiving a campaign, check: every subtask `- [x]`, the Baseline table's "After" column filled in, the named suites green, the Tech layout block refreshed with a new `verified at <sha>`. Then, in one commit: **move the whole file** to `docs/refactors/done/YYYY-MM-<slug>.md` and remove its row here.

Progress counts subtasks; a subtask counts as done only when every one of its boxes is ticked. `scripts/check-docs.mjs` recomputes these and fails the commit if a number here is stale.

| Campaign | Title | Progress | What's left | Depends on | Blocks | File |
|---|---|---|---|---|---|---|
| 02 | Backend error contract and observability | 1/6 | R02.2–R02.6; start here — 03 and 04 throw its typed exceptions | — | 03, 04 | [refactor-02-backend-error-contract.md](refactor-02-backend-error-contract.md) |
| 03 | Authentication system hardening | 0/9 | all; four subtasks write a rule into PRD/DB first | 02 | — | [refactor-03-backend-auth-hardening.md](refactor-03-backend-auth-hardening.md) |
| 04 | Endpoint authorization and data exposure | 0/8 | all; R04.1 and R04.2 close the student-email exposure | 02 | — | [refactor-04-backend-access-control.md](refactor-04-backend-access-control.md) |
| 05 | Data access: query shape, indexes and the crash order | 0/7 | all; capture the baseline plans before R05.1 | — | — | [refactor-05-backend-data-access-scale.md](refactor-05-backend-data-access-scale.md) |
| 06 | Frontend session: one source for the store and the role map | 0/5 | all; R06.2 is retired (D-039), R06.4 waits on refactor-03 R03.8 | — | — | [refactor-06-frontend-session-single-source.md](refactor-06-frontend-session-single-source.md) |
| 07 | Frontend component decomposition and placement | 0/7 | all; six oversized files and one misplaced one | — | — | [refactor-07-frontend-component-decomposition.md](refactor-07-frontend-component-decomposition.md) |
| 08 | ICollection on entity navigation collections | 0/1 | all; three declared types, no behaviour change | — | — | [refactor-08-entity-navigation-collections.md](refactor-08-entity-navigation-collections.md) |

## Suite baseline — the numbers every campaign measures against

Measured 2026-11-11, after task 22e.1 and before any campaign work:

| Suite | Result |
|---|---|
| `dotnet test backend/StudentPortal.Tests` | **173 passed**, 0 failed |
| `dotnet test backend/StudentPortal.IntegrationTests` | **190 passed**, 0 failed — 24 s |
| `npm run test` from `frontend/` | **382 passed** in 56 files |
| `npx tsc --noEmit` from `frontend/` | clean |
| `npm run build` from `frontend/` | succeeds — 629.58 kB JS (190.98 kB gzip), 12.2 s |
| `npm run lint` from `frontend/` | **2 errors, 2 warnings** — pre-existing, see refactor-07 Out of scope |

So three of the four gates are green and lint is not. A campaign is checked against these numbers, not against "green" in the abstract.

**The integration suite was red until just before these campaigns opened,** and the reason is worth keeping because it is the exact failure mode the campaigns are exposed to. `seed.sql` carried a block headed `BULK STUDENTS (100 000 rows for pagination / performance testing)` ending in `FROM generate_series(1, 100000)`. `IntegrationTestFixture.ResetAndSeedAsync` replays `seed.sql` before **every** test, so 100 000 rows were inserted 190 times per run: `AdminUserSearchTests.Search_RoleStudent_ReturnsOnlyStudents` and `Search_EmptyQuery_ReturnsPaginatedAll` both failed with `TotalCount = 100010` against an expected 10, and the suite took 3 m 12 s instead of 24 s. Task **22e.1** moved the block to `Migrations/seed-dev-volume.sql`, and `DB.md` §4 now carries the rule and the three dev companions in one table.

**Why that mattered to these campaigns.** A campaign's safety property is not "a new test went red first", it is "the existing suites never went red at all" (`TEMPLATE.md`, AGENTS §5). While two tests were already red, an agent running a backend gate could not separate its own regression from the pre-existing failure, and no honest "After" column could be written. That is why the fix landed on task 22 first rather than inside a campaign: it changes behaviour and has its own `Verify:`, so it was never campaign work.

**The standing rule this leaves.** If a gate is red when you *start* a subtask, stop and find out why before writing code — a red baseline silently voids the only guarantee a refactor campaign has. Do not record a campaign measurement taken against a red suite.

## Order of work

**02 first.** Campaigns 03 and 04 throw the typed exceptions it introduces and rely on its middleware to map them, so starting either one first means writing `catch` blocks that 02 then deletes.

After that, 03, 04 and 05 are independent of each other but all touch `backend/StudentPortal/`. Run them one at a time — two campaigns editing the same repositories will collide. 05 has no dependency on 02 and can go first if the data-access measurements are the more urgent question.

**06 and 07 are frontend-only and independent of every backend campaign**, so either can run in parallel with a backend one. They are not independent of each other in one respect: 06 converts store reads in `App.tsx`, the providers and `Navbar`, and 07 splits pages and feature components. Those file sets do not overlap today — keep it that way, and if a split would touch a file 06 owns, let 06 land first.

**08 stands alone** — one subtask, three declared types, no dependency in either direction. Take it whenever a short slot is free.

**Campaign 06 has no R06.2.** The number is retired, not pending: the subtask it held was withdrawn as wrong, because the `_retry: true` bypass in `App.tsx` it proposed to remove is a deliberate fix rather than duplication (D-039). The reason, and the only conditions under which the dedup could ever be attempted, are recorded in that campaign's Out of scope section. Do not re-add it, and do not renumber R06.3–R06.6 to close the gap — the gap is the record.

**Four subtasks are blocked on a document, not on code.** R02.4, R03.4, R03.6, R03.7, R03.8, R04.1, R04.3 and R04.5 each introduce a rule that no authoritative document states yet. Every one of them opens with a "Subtask 0 first" box: write the rule into `PRD.md` / `DB.md` / `Tech-Backend.md`, append the `docs/Decisions.md` entry, commit that alone, and only then write code (AGENTS §0, D-010).

Campaigns have their own number sequence (`refactor-01`, `refactor-02`, …), independent of task numbers. New campaigns follow [`../TEMPLATE.md`](../TEMPLATE.md).

Feature work is tracked separately in [`../../tasks/active/index.md`](../../tasks/active/index.md).
