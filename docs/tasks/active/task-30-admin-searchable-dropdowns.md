### Task 30 — Admin dropdowns: server-side search and pagination

#### Overview

The admin create/edit forms populate their professor, student and subject dropdowns by fetching page 1 at size 50 of `getAllUsers` / `getAllSubjects` and filtering by role in the browser. That both **misses** any record past the first 50 and does not scale to thousands of rows. This task replaces those dropdowns with **hand-rolled, Bootstrap-styled searchable comboboxes** backed by **server-side search endpoints** (filtering, deterministic sort, and pagination executed in SQL, never in memory). Role and soft-delete filters are enforced on the server; the dropdowns fetch only what the current search needs, appending pages on scroll.

Decisions (confirmed with the user): combobox is **hand-rolled, no new dependency**; endpoints **extend the existing `UserController` / `SubjectController`**; students are searched by **`IndexNumber` and name**, professors by name, subjects by `SubjectName` (and `SubjectCode` where it fits).

**The rules for this feature live in `UI.md` §8.4 / §8.5 and §11, `Tech-Backend.md` §2 / §5 / §7, `Tech-Frontend.md` §2 / §3, and `DB.md` §6.** This file is only the plan — read the rules from those sections, never from this Overview.

**Depends on:** nothing · **Blocks:** nothing

---

#### 30.0 — Docs: Promote the searchable-dropdown rules into the source-of-truth documents

Rules: none (this subtask creates the rules' home)
Not in scope: any code change.
Docs to update: UI §8.4, UI §8.5, UI §11, Tech-Backend §2, Tech-Frontend §2, DB §6, new D-0NN
Verify: `node scripts/check-docs.mjs`

- [x] UI §8.4 / §8.5 state the professor, student and subject dropdowns are searchable comboboxes (debounced search, infinite scroll, 15 per page), not pre-filled native selects.
- [x] The per-entity search + filter rules are written down: subjects by `SubjectName` (+ `SubjectCode`), professors by name with `UserRole = Professor`, students by `IndexNumber` + name with `UserRole = Student`, all excluding `IsDeleted`.
- [x] Default page size 15, max 50, validated server-side; `ILIKE` substring search; no index added without measurement (pg_trgm/GIN only if `EXPLAIN` justifies). Captured in a new D-034.
- [x] UI §11 describes the new combobox primitive.
- Commit: `docs: admin searchable-dropdown rules and search contract (D-034)`

---

#### 30.1 — Backend-endpoint: user search endpoint (professors and students)

Rules: Tech-Backend §2 (pipeline), Tech-Backend §5 (validation), DB §6
Not in scope: the subject search (30.2); the frontend (30.3, 30.4).
Docs to update: Tech-Backend §2, DB §6
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter User`

- [x] `GET /users/search?role=&query=&page=&pageSize=` filters by `UserRole` and `IsDeleted = false`, returns `{ items, totalCount }` with a lightweight DTO (id + display fields only).
- [x] `role=Professor` searches `FirstName`/`LastName`; `role=Student` searches `IndexNumber` + `FirstName`/`LastName`; search is case-insensitive (`ILIKE`), applied only when `query` is non-empty.
- [x] Filtering, sorting and paging are translated to SQL (`Skip`/`Take`, `AsNoTracking`), never done in memory; sort is deterministic with `Id` as tie-breaker; `pageSize` defaults to 15 and is clamped to a max of 50.
- [x] Integration tests: role filter, soft-delete exclusion, name/index search, empty query returns a page of all, pagination boundaries, deterministic order.
- Commit: `feat(admin): server-side user search endpoint with role and soft-delete filters`

---

#### 30.2 — Backend-endpoint: subject search endpoint

Rules: Tech-Backend §2, Tech-Backend §5, DB §6
Not in scope: the user search (30.1); the frontend.
Docs to update: Tech-Backend §2, DB §6
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Subject`

- [x] `GET /subjects/search?query=&page=&pageSize=` searches `SubjectName` (and `SubjectCode` where it fits the UX), excludes `IsDeleted`, returns `{ items, totalCount }` with a lightweight DTO.
- [x] Same SQL-side filtering/sort/paging rules as 30.1 (`ILIKE`, `AsNoTracking`, `Id` tie-breaker, 15 default / 50 max, validated).
- [x] Integration tests: name search, (code search if implemented), soft-delete exclusion, pagination, deterministic order, empty results.
- Commit: `feat(admin): server-side subject search endpoint`

---

#### 30.3 — Frontend-component: hand-rolled searchable combobox primitive

Rules: UI §11 (reusable primitives), Tech-Frontend §2 (React patterns)
Not in scope: wiring into the admin forms (30.4); the endpoints.
Docs to update: UI §11
Verify: `npm run test -- SearchableSelect`

- [x] A Bootstrap-styled combobox: text input + scrollable results list, ~300 ms debounce before each request, 15 per page, appends the next page on scroll to the bottom.
- [x] Query change resets pagination and results; duplicate records are prevented when appending; loading, empty-result and error states are shown.
- [ ] Stale responses cannot overwrite newer ones (abort or sequence-guard in-flight requests).
- [ ] A **selected value stays displayed even when it is not in the current result page** (the component holds the chosen label/id independently of the search list).
- [ ] Co-located unit tests cover debounce, append-without-duplicates, query-change cancellation, and the preserved-selection case.
- Commit: `feat(ui): searchable combobox with debounced server search and infinite scroll`

---

#### 30.4 — Frontend-page: wire the admin dropdowns to the comboboxes

Rules: UI §8.4 (subjects tab), UI §8.5 (enrollments tab), Tech-Frontend §3 (data hooks), Tech-Frontend §4 (axios/routing)
Not in scope: the combobox internals (30.3); other admin tables (task 26 owns their pagination).
Docs to update: Tech-Frontend §3
Verify: `npm run test -- integration/user`

- [x] The professor dropdown (Subject create/edit) and the student + subject dropdowns (Enrollment create) use the combobox against the new search endpoints.
- [x] The admin page no longer prefetches users/subjects for the forms (`getAllUsers(1,50)` / `getAllSubjects(1,50)` form prefetch is removed).
- [x] Editing a subject still shows its currently-assigned professor even if that professor is not in the first search page.
- [x] Creating a subject/enrollment with a searched-and-selected value still submits the correct id.
- Commit: `feat(admin): searchable comboboxes for professor, student, and subject selection`

---

#### 30.5 — Test: end-to-end verification that no dropdown fetches the whole collection

Rules: Tech-Backend §7, Tech-Frontend §7
Not in scope: Playwright e2e (task 22d).
Docs to update: none
Verify: `npm run test -- integration/user` and `dotnet test backend/StudentPortal.IntegrationTests --filter "User|Subject"`

- [x] A frontend test asserts the admin page load triggers no full-collection fetch for the form dropdowns.
- [x] Changing the query while a previous request is in flight yields the correct (newest) results, no duplicates.
- [x] Backend tests confirm role + soft-delete filtering and deterministic pagination for both search endpoints (cross-check with 30.1 / 30.2 coverage, no duplication — satisfied by `AdminUserSearchTests` / `AdminSubjectSearchTests`; no new backend test added).
- Commit: `test(admin): verify searchable dropdowns never fetch entire collections`
