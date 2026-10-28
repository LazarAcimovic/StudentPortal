### Task 23 — Escalation workflow for unresolved appeals

#### Overview

Deliver the escalation workflow: when a professor leaves an appeal unresolved, the case goes to an admin who assigns it to another eligible professor.

**The rules for this feature live in `PRD.md` §4.8** (triggers, eligibility, the four case statuses, assignment and reassignment, write authority), with the schema in `DB.md` §2.2 / §2.4 / §2.8 / §2.9 and the screens in `UI.md` §6.4 / §7.6 / §8.4 / §8.6. This file is only the plan for getting there — read the rules from those sections, never from this Overview (AGENTS §0, D-010).

> **Reconciled against the code on 2026-10-23.** The backend is complete and the professor/student UI has landed; the **admin Escalations tab (23.12), the SubjectCode form field (23.13), the seed update (23.14) and all tests (23.15) are outstanding**. Two files carrying 23.9 / 23.11 refinements are still uncommitted in the working tree.
>
> **23.13 is a live bug, not just a gap:** the API requires `SubjectCode` (non-empty) but no admin form sends it, so creating or editing a subject from the UI fails with `400`. Do 23.13 first.

**Depends on:** nothing · **Blocks:** task 22 (22a.10 covers the escalation integration tests)

---

#### 23.0 — Docs: Promote the escalation rules into the source-of-truth documents

Rules: none (this subtask *creates* the rules' home)
Not in scope: any code change.
Docs to update: PRD §2.1, §2.2, §4.5, §4.6, §4.7, §4.8, §5.3, §5.4, §5.5, §6, §7 · DB §1, §2.2, §2.4, §2.6, §2.8, §2.9, §3, §4, §5, §6.2, §6.3 · UI §1, §2.5, §6.3, §6.4, §7.1, §7.3, §7.6, §8.1, §8.4, §8.6, §12.2 · Tech-Backend §1, §2, §3 · Decisions D-014, D-015, D-016, D-017, D-018, D-021, D-022
Verify: `node scripts/check-docs.mjs`

- [x] Every rule that previously existed only in this task file is now written into PRD / DB / UI / Tech.
- [x] `Overview.md` glossary entries for Escalation, Eligible professor and Assigned professor point at PRD §4.8, not at this file.
- Commit: `docs: consistency pass — precedence, decision log, Tech split, escalation rules`

---

#### 23.1 — Backend-migration: `SubjectCode` on `Subjects`

Rules: DB §2.2 (SubjectCode column and contract), PRD §4.8 (eligibility depends on it)
Not in scope: DTOs, validators, UI — those are 23.4 and 23.13.
Docs to update: DB §2.2, DB §5
Verify: `dotnet ef migrations list` shows `AddSubjectCode`; `dotnet test backend/StudentPortal.IntegrationTests --filter Schema`

- [x] Column `SubjectCode varchar(50) NOT NULL DEFAULT ''` added to `Subjects`.
- [x] Migration `AddSubjectCode` generated and reviewed.
- Commit: `feat(db): migration for SubjectCode on Subject`

---

#### 23.2 — Backend-migration: `AssignedProfessorId` on `Grades` + `Escalations` + `EscalationAssignments`

Rules: DB §2.4, §2.8, §2.9 (columns, keys, FK delete behaviour), PRD §4.8 (what the two tables mean)
Not in scope: service logic (23.6), endpoints (23.7).
Docs to update: DB §2.4, §2.8, §2.9, §3, §5
Verify: `dotnet ef migrations list` shows `AddEscalationWorkflow`

- [x] Nullable `AssignedProfessorId uuid` on `Grades`, FK → `Users` with `SET NULL`, indexed.
- [x] `Escalations` table: `Id`, `GradeId` (unique FK), `Reason varchar(32)`, `ResolvedAt`.
- [x] `EscalationAssignments` table: `Id`, `EscalationId`, `AssignedProfessorId`, `AssignedByAdminId`, `AssignedAt`, `SupersededAt`.
- Commit: `feat(db): migration for Grade.AssignedProfessorId, Escalations, and EscalationAssignments`

---

#### 23.3 — Backend-service: Entities, enum, and repositories

Rules: DB §2.8, §2.9 · Tech-Backend §1 (the DbContext is `StudentPortalApiContext`), §2 (DI registration order)
Not in scope: business logic — that is 23.6.
Docs to update: Tech-Backend §2 (DI list)
Verify: `dotnet test backend/StudentPortal.Tests`

- [x] `EscalationReason` enum (`AcceptedUnresolved`, `ChainExhausted`) in `Models/Enums/`.
- [x] `Escalation` entity with navigation to `Grade` and `ICollection<EscalationAssignment> Assignments`.
- [x] `EscalationAssignment` entity with navigation to `Escalation`, `AssignedProfessor`, `AssignedByAdmin`.
- [x] `IEscalationRepository`: `GetByGradeIdAsync`, `AddAsync`, `UpdateAsync`.
- [x] `IEscalationAssignmentRepository`: `GetActiveByEscalationIdAsync`, `GetAllByEscalationIdAsync`, `AddAsync`, `UpdateAsync`.
- [x] Both `DbSet`s registered in **`StudentPortalApiContext`** with EF mappings and FK constraints; both repositories registered in `Program.cs`.
- Commit: `feat(backend): Escalation and EscalationAssignment entities and repositories`

---

#### 23.4 — Backend-endpoint: `SubjectCode` in the subject API

Rules: DB §2.2 (1–20 is the contract, per D-015), PRD §5.3 (admin Subjects tab), Tech-Backend §5 (validator conventions)
Not in scope: the admin form field (23.13).
Docs to update: Tech-Backend §5
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Subject`

- [x] `SubjectCode` on the `Subject` entity with its EF mapping.
- [x] `SubjectCode` on `SubjectCreateDto`, `SubjectUpdateDto`, `SubjectDto`.
- [x] Both validators enforce non-empty, max 20 characters.
- [x] `SubjectService` persists it; the controller returns it.
- Commit: `feat(backend): add SubjectCode to Subject entity and admin CRUD`

---

#### 23.5 — Backend-service: Two-tier ownership checks

Rules: PRD §4.8 (write authority moves to the assignee; overdue lift), PRD §6 (service layer is authoritative), Tech-Backend §3 (the two-tier table)
Not in scope: hiding buttons in the UI — 23.11 and UI §7.3.
Docs to update: Tech-Backend §3
Verify: `dotnet test backend/StudentPortal.Tests --filter "AppealService|GradeService"`

- [x] Reads allow `subject.ProfessorId == callerId` **or** `grade.AssignedProfessorId == callerId`.
- [x] Writes allow only `subject.ProfessorId` when `AssignedProfessorId` is null, and only `AssignedProfessorId` when it is set; the original professor gets `403`.
- [x] The overdue guard in `AcceptAsync` / `DenyAsync` is skipped only for the assigned professor.
- Commit: `feat(backend): two-tier ownership checks for escalated grades`

---

#### 23.6 — Backend-service: `IEscalationService` + `EscalationService`

Rules: PRD §4.8 (triggers, four statuses, assignment and reassignment rules, eligibility), DB §6.3 (how each status is derived), Tech-Backend §3 (service surface), Tech-Backend §6 (**inject `TimeProvider`; no `DateTime now` parameters**)
Not in scope: HTTP surface (23.7).
Docs to update: Tech-Backend §3
Verify: `dotnet test backend/StudentPortal.Tests --filter Escalation`

- [x] `GetAllCasesAsync` returns `EscalatedCaseDto[]` across `NeedsAssignment`, `Assigned`, `NeedsReassignment`, `Resolved`.
- [x] Scenario A detection: `FinalizedAt == null` and an `Accepted` appeal with `ReviewedAt + 7d < now`.
- [x] Scenario B detection: `FinalizedAt == null` and 2+ appeals with `Status == Pending && SubmittedAt + 7d < now`.
- [x] `GetEligibleProfessorsAsync(subjectCode, excludeProfessorId)` per DB §6.3.
- [x] `AssignProfessorAsync` creates the `Escalation` + first assignment and sets `Grade.AssignedProfessorId`.
- [x] `ReassignProfessorAsync` rejects before the 7-day deadline, otherwise supersedes and re-points.
- [x] `CloseIfEscalatedAsync` stamps `ResolvedAt`.
- [ ] **Time comes from an injected `TimeProvider`, not a `DateTime now` parameter** (Tech-Backend §6). The current signatures take `DateTime now`; align them with the rest of the services. Covered by task 22's 22a.2 refactor — do it there or here, not twice.
- Commit: `feat(backend): EscalationService with detection, assignment, reassignment, and auto-close`

---

#### 23.7 — Backend-endpoint: `EscalationController` + auto-close hooks

Rules: PRD §4.8 (resolution paths), PRD §6 (admin-only), Tech-Backend §3
Not in scope: the admin UI (23.12).
Docs to update: Tech-Backend §3
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Escalation`

- [x] `[Authorize(Roles = "Admin")]` on `api/Escalation`.
- [x] `GET /` → cases; `GET /eligible-professors?subjectCode=&excludeProfessorId=` → users.
- [x] `POST /assign` and `POST /reassign` → `200 EscalatedCaseDto`; `400` for a missing grade / no open escalation / reassignment not yet due; `422` for an ineligible professor.
- [x] `CloseIfEscalatedAsync` called from `GradeService.ReconfirmExamAsync` and `AppealService.DenyAsync` — the only two finalization paths.
- Commit: `feat(backend): EscalationController with assign/reassign endpoints and auto-close hooks`

---

#### 23.8 — Backend-service: Student dashboard "Under admin review"

Rules: PRD §4.8, PRD §5.5 (status column), DB §6.1 (branch ordering)
Not in scope: the badge itself (23.10).
Docs to update: DB §6.1
Verify: `dotnet test backend/StudentPortal.Tests --filter StudentDashboard`

- [x] `bool IsEscalated` on `SubjectRowDto`.
- [x] Both scenario branches sit **before** the generic accepted-appeal and overdue branches, and set `Status = "Under admin review"` with no action buttons.
- Commit: `feat(backend): student dashboard escalation status`

---

#### 23.9 — Backend-service: Professor dashboard `assignedCases`

Rules: PRD §4.8, PRD §5.4 (professor dashboard sections), Tech-Frontend §1.1 (payload contract)
Not in scope: rendering (23.11).
Docs to update: Tech-Frontend §1.1
Verify: `dotnet test backend/StudentPortal.Tests --filter ProfessorDashboard`

- [x] `assignedCases: AssignedCaseDto[]` on the professor dashboard response, one entry per grade where `AssignedProfessorId == caller` and `FinalizedAt == null`.
- [x] `AssignedCaseDto` carries the five point fields, final grade, reason and the appeal list, so the resolve modal needs no second request.
- Commit: `feat(backend): professor dashboard assigned cases section`

---

#### 23.10 — Frontend-component: Student dashboard "Under admin review" badge

Rules: UI §2.5 (badge markup), UI §6.4 (status row), PRD §5.5
Not in scope: changing the status string — the backend owns it.
Docs to update: none
Verify: `npm run test -- StudentDashboard`

- [x] `status === "Under admin review"` renders the purple badge from UI §2.5, no action buttons.
- [x] The stacked-card variant below `sm` shows the same badge.
- Commit: `feat(frontend): student dashboard under-admin-review status badge`

---

#### 23.11 — Frontend-page: Professor dashboard "Assigned Cases" section

Rules: UI §7.6 (section, resolve modal, both scenario panels), UI §7.3 (read-only banners), PRD §4.8, Tech-Frontend §1.1 (read from the dashboard payload, no extra fetch)
Not in scope: new endpoints — it reuses `reconfirm-exam`, `accept`, `deny`.
Docs to update: none
Verify: `npm run test -- ProfessorDashboard`

- [x] Section hidden entirely when `assignedCases` is empty.
- [x] Row shows subject, student, grade, reason label, `[Resolve]`.
- [x] Scenario A panel: collapsed summary + editable exam + Confirm → `POST /api/Grade/reconfirm-exam`.
- [x] Scenario B panel: both overdue texts + Accept / Deny on the latest appeal, with the deny confirmation sub-step.
- [x] Collapses to stacked cards below `sm`.
- [ ] Split into one component per file with the reason-label map in the constants folder — **done as 23.16**, tick both in the same commit.
- Commit: `feat(frontend): professor dashboard assigned cases section with resolve modal`

---

#### 23.12 — Frontend-page: Admin dashboard "Escalations" tab

Depends on: 23.14 for meaningful manual verification. Until the seed sets subject codes, every subject shares the empty code `''`, so `GetProfessorsBySubjectCodeAsync` matches **every** other professor and the eligible list is noise rather than empty. Build and unit-test this subtask in order; do not trust a manual click-through of assign / reassign until 23.14 has landed.

Rules: UI §8.6 (columns, per-status badges and actions, assign/reassign modal, assignment history, empty eligible list), UI §8.1 (four tabs), PRD §4.8, PRD §5.3, Tech-Frontend §3 (**the eligible-professor fetch on modal open is Pattern B**)
Not in scope: backend changes — every endpoint already exists (23.7).
Docs to update: Tech-Frontend §1 (add the new service / hook / models to the layout block)
Verify: `npm run test -- Escalations`

- [x] `features/escalations/api/escalationService.ts` — `getCases`, `getEligibleProfessors`, `assign`, `reassign`; each takes an optional `AbortSignal` and re-throws as `Error` (Tech-Frontend §3).
- [x] `features/escalations/models/escalation.ts` — `EscalatedCase`, `AssignmentHistoryEntry`, `EscalationStatus`.
- [x] `features/escalations/hooks/useEscalations.ts` — Pattern A, loads the case list when the tab mounts.
- [x] `features/escalations/hooks/useEligibleProfessors.ts` — Pattern B, caller owns the `AbortController`, triggered on modal open.
- [x] Fourth pill tab in `AdminDashboardPage`, content unmounted when inactive.
- [x] Table with the eight columns from UI §8.6 and the four per-status rows.
- [x] Assign / reassign modal: case detail, appeal history, assignment history (hidden when empty), radio-style eligible list, "No eligible professors available" + disabled Confirm when empty.
- [x] Confirm posts to `/assign` or `/reassign`, updates the row in place, closes the modal.
- [x] Collapses to stacked cards below `md`.
- Commit: `feat(frontend): admin escalations tab with assign/reassign modal and assignment history`

---

#### 23.13 — Frontend-component: `SubjectCode` field in the admin subject forms

Rules: UI §8.4 (field, label, help text, position), DB §2.2 (1–20 characters, per D-015), PRD §5.3
Not in scope: the backend, which already requires and returns the field (23.4).
Docs to update: none
Verify: `npm run test -- Subject`; then create and edit a subject in the running app and confirm no `400`

- [x] `SubjectCode` text input in `SubjectCreateForm` and `SubjectEditForm`, directly below Subject Name, label "Subject Code", with the help text from UI §8.4.
- [x] Zod: required, 1–20 characters. Field error shown only after `touched` (UI §2.3).
- [x] The create and update payloads both send `subjectCode`.
- [x] The Subjects table shows a Subject Code column.
- Commit: `fix(frontend): send SubjectCode from admin subject create and edit forms`

---

#### 23.14 — Seed: `SubjectCode` on every seeded subject

Rules: PRD §7 (seeding scope and the no-time-sensitive-rows rule, per D-022), DB §4 (seed shape and GUID prefixes), PRD §4.8 (eligibility needs a shared code)
Not in scope: **seeding escalated cases.** Backdated rows in `seed.sql` would leak into every integration test (D-022). Scenario A and B states are created by the test helpers in Tech-Backend §7 and, for manual checks, by the test-mode clock.
Docs to update: DB §4
Verify: `psql -f backend/StudentPortal/Migrations/seed.sql` twice in a row, then `dotnet test backend/StudentPortal.IntegrationTests`

- [x] Every seeded subject gets a `SubjectCode`.
- [x] At least two subjects taught by **different** professors share one code, so an eligible professor exists.
- [x] The `DELETE` block covers `EscalationAssignments` and `Escalations`, children first.
- [x] No seeded appeal or grade carries a backdated `SubmittedAt` / `ReviewedAt` / `ConfirmedAt`.
- Commit: `feat(db): seed SubjectCode across subjects with shared codes for escalation`

---

#### 23.15 — Test: Escalation coverage, unit and integration

Rules: PRD §4.8 (every rule below), PRD §4.7 + DB §6.2 (ECTS while escalated, per D-021), Tech-Backend §7 (fixture, backdating helpers, FakeTimeProvider, three-point boundary testing)
Not in scope: frontend tests for 23.12 — they ship with that subtask.
Docs to update: none
Verify: `dotnet test backend/StudentPortal.Tests --filter Escalation` and `dotnet test backend/StudentPortal.IntegrationTests --filter Escalation`

This subtask exists because 23.1–23.11 shipped without tests, against AGENTS §9. It is a coverage backfill, so it is tagged `Test`; future subtasks write their tests in the Red step instead.

- [ ] `StudentPortal.Tests/Services/EscalationServiceTests.cs`: Scenario A and B detection at the 7-day boundary (before / at / after), the four status derivations, eligibility excluding the original professor and soft-deleted users, reassignment rejected before the deadline, `CloseIfEscalatedAsync` idempotent.
- [ ] `StudentPortal.IntegrationTests/Tests/Escalations/`: admin-only access (401 anonymous, 403 for professor and student), assign happy path, `422` for an ineligible professor, `400` for a double assign, reassign before and after the deadline.
- [ ] Authority matrix: original professor `403` on write once assigned, assigned professor `200`, both `200` on read.
- [ ] Assigned professor can accept or deny an **already overdue** appeal; the original professor still cannot.
- [ ] Auto-close: reconfirm-exam and deny both stamp `ResolvedAt`.
- [ ] An escalated grade contributes no ECTS; once resolved, the grade finalizes and its ECTS counts (D-007, D-021).
- [ ] One overdue appeal alone does **not** escalate; two do.
- Commit: `test(backend): escalation service unit tests and endpoint integration tests`

---

#### 23.16 — Refactor: Split `AssignedCasesSection` into one component per file

Rules: Tech-Frontend §1 (one component per file under `components/<role>/`; constants live in the feature's `constants/` folder), Tech-Frontend §2 (function components, props down)
Not in scope: **any behaviour change.** No new props, no new states, no copy edits, no styling changes. If you find a bug while splitting, leave it and add a box to the subtask that owns it.
Docs to update: Tech-Frontend §1 (list the new files in the layout block and refresh the `verified at <sha>` marker)
Verify: `npm run test -- ProfessorDashboard` and `npm run test -- integration/grades` — both must stay green, and say so in the commit. `npx tsc --noEmit` clean.

Completes the open box in 23.11. `AssignedCasesSection.tsx` is 426 lines holding six components and an inline label map, which is the "everything in one file" shape Tech-Frontend §1 does not allow. Tagged `Refactor`, so **no new test is required** (AGENTS §9) — the existing suites are the safety net.

- [ ] `REASON_LABEL` moved into `features/user/constants/professor/constants.ts`, next to `APPEAL_STATUS_BADGE`, and imported by both consumers instead of being defined inline.
- [ ] `AppealHistory`, `ScenarioAPanel`, `ScenarioBPanel`, `ResolveModal` and `AssignedCaseItem` each move to their own file under `features/user/components/professor/`.
- [ ] `AssignedCasesSection.tsx` keeps only the section itself and its props type, and imports the five pieces.
- [ ] Shared prop types move to `features/user/models/professor/`, not duplicated per file.
- [ ] No file left over ~150 lines.
- [ ] Both named suites green, `tsc --noEmit` clean, and the last box of 23.11 ticked in the same commit.
- Commit: `refactor(professor): split AssignedCasesSection into one component per file`
