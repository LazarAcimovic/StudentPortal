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
| 05 | Data access: query shape, indexes and the crash order | 3/7 | R05.4–R05.7 remain | — | — | [refactor-05-backend-data-access-scale.md](refactor-05-backend-data-access-scale.md) |
| 07 | Frontend component decomposition and placement | 4/7 | R07.5–R07.7 remain | — | — | [refactor-07-frontend-component-decomposition.md](refactor-07-frontend-component-decomposition.md) |
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

**02, 03 and 06 are archived.** Their changes are live; 04 and 05 may start any time.

04 and 05 are independent of each other but both touch `backend/StudentPortal/`. Run them one at a time — two campaigns editing the same repositories will collide.

**07 is frontend-only and independent of every backend campaign**, so it can run in parallel with a backend one.

**08 stands alone** — one subtask, three declared types, no dependency in either direction. Take it whenever a short slot is free.

**Two subtasks are blocked on a document, not on code.** R04.1, R04.3 and R04.5 each introduce a rule that no authoritative document states yet. Each opens with a "Subtask 0 first" box: write the rule into `PRD.md` / `DB.md` / `Tech-Backend.md`, append the `docs/Decisions.md` entry, commit that alone, and only then write code (AGENTS §0, D-010).

Campaigns have their own number sequence (`refactor-01`, `refactor-02`, …), independent of task numbers. New campaigns follow [`../TEMPLATE.md`](../TEMPLATE.md).

Feature work is tracked separately in [`../../tasks/active/index.md`](../../tasks/active/index.md).
