### Task 26 — Pagination across the dashboards

#### Overview

Every list on the three dashboards gets a Bootstrap pagination control (per `getbootstrap.com/docs/4.0/components/pagination/`), a "Total: N" count, and a page-size selector. Student and professor list sections page **in the browser** (the data already arrives in one call); the admin tables and the professor **students** list page **on the server**, which also reshapes the professor dashboard so its main call stops returning students inline and a new per-subject endpoint serves them. A section shows its control whenever it has at least one item and hides it only at zero (per D-0NN).

**The rules for this feature live in `UI.md` §6, §7, §8, §11 and §13, in `PRD.md` §5.4 / §5.5, in `DB.md` §6, and in `Tech-Backend.md` §2 / `Tech-Frontend.md` §3–§4.** This file is only the plan for getting there — read the rules from those sections, never from this Overview.

**Depends on:** nothing · **Blocks:** 28 (28.4 reuses the `<Pagination>` component from 26.1)

---

#### 26.0 — Docs: Promote the pagination rules into the source-of-truth documents

Rules: none (this subtask creates the rules' home)
Not in scope: any code change; the escalations tab, which task 28 owns.
Docs to update: PRD §5.4, PRD §5.5, UI §6, UI §7, UI §8, UI §11, UI §13, DB §6, Tech-Backend §2, Tech-Frontend §3, new D-0NN
Verify: `node scripts/check-docs.mjs`

- [x] Per-page defaults and selector options are written down: student/professor = 5 default (options 5 / 20 / 50), admin = 15 default (options 15 / 20 / 50).
- [x] The "show the control when ≥ 1 item, hide only at 0 items" rule is stated once, and each section (UI §6, §7, §8) points at it.
- [x] The "Total: N" label and the page-size selector copy are in UI §13.
- [x] Which sections page client-side vs server-side is recorded (student subjects + professor subjects/appeals/assigned-cases = client; admin users/subjects/enrollments + professor students = server), with a new D-0NN capturing the "per-user payload size, not table size" reasoning.
- [x] The professor-dashboard reshape (main call drops students; new `GET /professor/subjects/{subjectId}/students` serves them paged) is written into PRD §5.4, DB §6 and Tech-Backend §2, consistent with D-028.
- Commit: `docs: pagination rules, page sizes, and the professor-students reshape (D-0NN)`

---

#### 26.1 — Frontend-component: reusable `<Pagination>` primitive

Rules: UI §11 (reusable primitives — the new Pagination spec), UI §13 (the "Total: N" copy and selector labels)
Not in scope: wiring it into any page; server-side fetching.
Docs to update: UI §11
Verify: `npm run test -- Pagination`

- [x] A presentational `<Pagination>` takes `page`, `pageSize`, `totalItems`, `pageSizeOptions`, `onPageChange`, `onPageSizeChange` and renders Bootstrap's pagination markup plus a "Total: N" label and a page-size `<select>`.
- [x] It renders whenever `totalItems >= 1`, even when everything fits on one page; the parent decides not to render it at `0`.
- [x] Prev/next disable correctly at the first/last page; the active page is marked.
- [x] Co-located unit tests (RTL) cover page change, size change, and the single-page case.
- Commit: `feat(ui): reusable Pagination primitive with total count and page-size selector`

---

#### 26.2 — Frontend-component: client-side paging for the student My Subjects table

Rules: UI §6.4 (My Subjects table), PRD §5.5 (student dashboard inventory), UI §13
Not in scope: the stats cards (single values, no list); any backend change.
Docs to update: none
Verify: `npm run test -- integration/responsive/studentSubjects`

- [ ] `SubjectsCard` slices the already-loaded subjects to the current page (5 per page default) and renders `<Pagination>` below the table.
- [ ] The control is absent when the student has 0 subjects and present with ≥ 1.
- [ ] Changing the page size (5 / 20 / 50) re-pages without a refetch and resets to page 1.
- Commit: `feat(student): client-side pagination on the My Subjects table`

---

#### 26.3 — Frontend-component: client-side paging for the professor subjects, appeals, and assigned-cases sections

Rules: UI §7.1 (subjects column), UI §7.4 (appeals section), UI §7.6 (assigned cases section), PRD §5.4, UI §13
Not in scope: the students list (26.4/26.5, server-side); the grading panel.
Docs to update: none
Verify: `npm run test -- integration/grades/ProfessorDashboard`

- [ ] `SubjectsList`, `AppealsSection` and `AssignedCasesSection` each page their own list client-side (5 per page default) with a `<Pagination>` control.
- [ ] Each control appears only when that section has ≥ 1 item, independently of the others (per D-0NN).
- [ ] Selecting a subject still works when the subject sits on a later page.
- Commit: `feat(professor): client-side pagination on subjects, appeals, and assigned cases`

---

#### 26.4 — Backend-endpoint: paged professor-students endpoint and dashboard reshape

Rules: PRD §5.4 (professor dashboard inventory), D-028 (which subjects appear), DB §6, Tech-Backend §2
Not in scope: the appeals/assigned-cases payload, which stays inline.
Docs to update: PRD §5.4, DB §6, Tech-Backend §1, Tech-Backend §2
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Dashboards`

- [ ] New `GET /professor/subjects/{subjectId}/students?page=&pageSize=` returns `{ items, totalCount }`, students ordered by last name then first name, scoped to the signed-in professor's subject (403 otherwise).
- [ ] `GET /professor/me/dashboard` no longer returns students inline; it still returns subjects (with their student counts), appeals and assigned cases.
- [ ] An integration test proves page 1 and page 2 of a subject with > pageSize students, and that a professor cannot read another professor's subject's students.
- [ ] The empty-subject case (no enrolled students) returns `totalCount = 0`, consistent with D-028.
- Commit: `feat(professor): paged students endpoint and slimmer dashboard payload`

---

#### 26.5 — Frontend-page: wire the professor dashboard to the paged students endpoint

Rules: UI §7.1, UI §7.2 (grading panel), Tech-Frontend §3 (data hooks), Tech-Frontend §4 (axios/routing)
Not in scope: the backend contract (26.4); the client-side sections (26.3).
Docs to update: Tech-Frontend §3
Verify: `npm run test -- integration/grades/ProfessorDashboard`

- [ ] Clicking a subject fetches page 1 of its students from the new endpoint; `<Pagination>` (5 / 20 / 50) drives further pages.
- [ ] The control appears only when the selected subject has ≥ 1 student.
- [ ] `GradePanel` still opens for a student selected from any page (its enrollment id comes from the paged row).
- [ ] A loading state shows while a page is fetching; an abort cancels an in-flight page when the subject changes.
- Commit: `feat(professor): server-paged students list on the dashboard`

---

#### 26.6 — Backend-endpoint: server-side paging for the admin users, subjects, and enrollments lists

Rules: UI §8.2 (users tab), UI §8.4 (subjects tab), UI §8.5 (enrollments tab), Tech-Backend §2
Not in scope: the escalations tab (task 28); any change to create/edit/delete.
Docs to update: Tech-Backend §1, Tech-Backend §2, UI §8
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter "AdminUserCrud"`

- [ ] `GET /users`, `GET /subjects`, `GET /enrollments` accept `page` and `pageSize` and return `{ items, totalCount }` (15 default, 20 / 50 allowed; out-of-range values clamped).
- [ ] Ordering is stable (so page boundaries don't shift between requests).
- [ ] A shared paging shape/helper is used by all three, not copy-pasted per controller (Tech-Backend §2).
- [ ] Integration tests assert the count and the page slice for each of the three.
- Commit: `feat(admin): server-side pagination for users, subjects, and enrollments`

---

#### 26.7 — Frontend-page: wire the admin tables to server-side pagination

Rules: UI §8.2, UI §8.4, UI §8.5, Tech-Frontend §4
Not in scope: the escalations tab (task 28).
Docs to update: Tech-Frontend §4
Verify: `npm run test -- integration/user`

- [ ] `AdminDashboardPage` tracks page + pageSize per tab and refetches on change; each table renders `<Pagination>` (15 / 20 / 50).
- [ ] The control is hidden when a tab has 0 rows, shown at ≥ 1.
- [ ] Creating or deleting a row updates the current page's count/total sensibly (refetch the current page).
- [ ] The derived lists that feed the create forms (professors from users, students from users) still work with paging in place.
- Commit: `feat(admin): wire users, subjects, and enrollments tables to server pagination`
