### Task 28 — Escalation read performance and server-paged escalations tab

#### Overview

The admin Escalations endpoint loads **every** grade in the system with its full escalation graph and filters in memory, which does not survive production growth. This task pushes the candidate filter into SQL (only grades that are not finalized and have a qualifying appeal, or that already have an escalation row), adds `AsSplitQuery()` + `AsNoTracking()` to the read paths, and server-paginates the escalations tab over the narrowed set (15 default, 20 / 50 allowed) using the shared `<Pagination>` primitive. Behaviour the admin sees is unchanged except for paging (per D-0NN).

**The rules for this feature live in `DB.md` §6.3 (the escalated-cases derivation), `PRD.md` §4.8 (escalation workflow), `Tech-Backend.md` §2 (pipeline/paging), and `UI.md` §8.6 (escalations tab).** This file is only the plan — read the rules from those sections, never from this Overview.

**Depends on:** 26.1 (the `<Pagination>` component, used by 28.4) · **Blocks:** nothing

> Baseline note: record the current `EscalationService` / escalation integration test run as green **before** 28.1, since every change here must preserve behaviour and "no change" is only checkable against a recorded before.

---

#### 28.0 — Docs: Promote the read-perf and paging rules into the source-of-truth documents

Rules: none (this subtask creates the rules' home)
Not in scope: any code change.
Docs to update: DB §6.3, PRD §4.8, Tech-Backend §2, UI §8.6, new D-0NN
Verify: `node scripts/check-docs.mjs`

- [x] DB §6.3 states that the case list is built from a **filtered** grade set (not-finalized with a qualifying appeal, or with an escalation row), not from all grades.
- [x] The escalations tab's server-side pagination (15 default, 20 / 50) is written into UI §8.6 and Tech-Backend §2, with a new D-032.
- [x] The `AsSplitQuery` / `AsNoTracking` convention for these read paths is noted in Tech-Backend §2.
- Commit: `docs: filtered escalation query and server-paged escalations tab (D-032)`

---

#### 28.1 — Backend-service: add AsSplitQuery and AsNoTracking to the escalation read paths

Rules: Tech-Backend §2, DB §6.3
Not in scope: the candidate filter (28.2); pagination (28.3).
Docs to update: Tech-Backend §2
Verify: `dotnet test backend/StudentPortal.Tests --filter Escalation` and `dotnet test backend/StudentPortal.IntegrationTests --filter Escalations`

- [x] The list read (`GetAllWithEscalationDetailsAsync`) uses `AsSplitQuery()` and `AsNoTracking()` so the many `Include`s no longer build one Cartesian result set.
- [x] `AsSplitQuery()` is applied to the other multi-include escalation/grade-detail reads; `AsNoTracking()` is added only on the pure-read paths, leaving the assign/reassign mutate-then-update flow working.
- [x] All existing escalation unit and integration tests stay green (behaviour preserved).
- Commit: `perf(backend): split-query and no-tracking on escalation read paths`

---

#### 28.2 — Backend-service: filter escalation candidates in SQL instead of loading every grade

Rules: DB §6.3 (the derivation), PRD §4.8 (escalation workflow)
Not in scope: the UI; the response shape (28.3).
Docs to update: DB §6.3
Verify: `dotnet test backend/StudentPortal.Tests --filter Escalation` and `dotnet test backend/StudentPortal.IntegrationTests --filter Escalations`

- [ ] The repository loads only candidate grades: `FinalizedAt IS NULL` with a qualifying appeal (Scenario A or B), **or** a grade that has an `Escalations` row (including resolved, for history).
- [ ] The derived statuses (`NeedsAssignment` / `Assigned` / `NeedsReassignment` / `Resolved`) are identical to today for the same data.
- [ ] A new test proves a finalized grade with no open case, and a plain in-window grade, are **not** loaded.
- [ ] No partial index is added here; a `verify-then-add` note records that a partial index on open grades (`WHERE FinalizedAt IS NULL`) is only to be added if `EXPLAIN ANALYZE` on production-sized data shows it is needed.
- Commit: `perf(backend): filter escalation candidates in SQL`

---

#### 28.3 — Backend-endpoint: paginate the escalations endpoint over the filtered set

Rules: DB §6.3, Tech-Backend §2, UI §8.6
Not in scope: the frontend wiring (28.4).
Docs to update: Tech-Backend §2
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Escalations`

- [ ] `GET /escalations` accepts `page` and `pageSize` (15 default, 20 / 50 allowed, clamped) and returns `{ items, totalCount }`, where the count is the number of candidate cases.
- [ ] Ordering is stable across requests so page boundaries don't shift.
- [ ] The status is computed only for the rows on the requested page.
- [ ] An integration test asserts the count and a page slice.
- Commit: `feat(admin): server-side pagination for the escalations endpoint`

---

#### 28.4 — Frontend-page: wire the escalations tab to server-side pagination

Rules: UI §8.6 (escalations tab), Tech-Frontend §4 (axios/routing)
Not in scope: the assign/reassign modal behaviour.
Docs to update: Tech-Frontend §4
Verify: `npm run test -- integration/escalations/AdminEscalations`

Depends on: 26.1 for the `<Pagination>` component.

- [ ] `EscalationsTab` fetches a page at a time and renders `<Pagination>` (15 / 20 / 50) with the server's total.
- [ ] The control is hidden at 0 cases and shown at ≥ 1.
- [ ] An assign/reassign still updates the row in place without dropping the current page.
- Commit: `feat(admin): server-paged escalations tab`
