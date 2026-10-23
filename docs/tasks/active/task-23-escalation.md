### Task 23 — Escalation workflow for unresolved appeals

#### Overview

When a professor fails to resolve an appeal within the allowed timeframe, the case is escalated to the administrator. Two scenarios trigger escalation:

- **Scenario A** — Professor accepts an appeal but does not re-enter exam points and re-confirm within **7 days of accepting** (`appeal.ReviewedAt + 7 days < now`).
- **Scenario B** — Student submits a second appeal (after the first went overdue) and the professor again fails to accept or deny within the applicable 7-day window, leaving two overdue Pending appeals in the DB.

In both cases the grade **must not auto-finalize** due to professor inaction. Escalation is the only resolution path. The administrator assigns an **eligible professor** — one who teaches another subject with the same `SubjectCode` as the escalated subject, excluding the original professor — who then resolves the case through the normal grading / appeal flow. If the assigned professor also fails to act within **7 days of their assignment**, the case surfaces again for the administrator to re-assign to someone else. Full assignment history is kept.

Key invariants:
- Maximum 2 appeals per grade remains enforced.
- The overdue-restriction on `AcceptAsync` / `DenyAsync` is lifted **only for the assigned professor** (they must be able to act on already-overdue appeals in Scenario B).
- **Read** actions on an escalated grade: allowed for both the original professor and the assigned professor.
- **Write** actions on an escalated grade (accept, deny, reconfirm exam): once `grade.AssignedProfessorId` is set, **only** the currently assigned professor may perform them; the original professor receives `403` and action buttons are hidden on the UI.

---

#### 23.1 — DB: Add `SubjectCode` to `Subject`

Rules: Task 23 Overview (SubjectCode defines eligible professors), DB.md §2 Subjects.

Add `SubjectCode VARCHAR(50) NOT NULL DEFAULT ''` to the `Subjects` table. `SubjectCode` groups subjects that represent the same course taught by different professors and is used to determine which professors are eligible for assignment.

-  generate migration — `dotnet ef migrations add AddSubjectCode` from `backend/StudentPortal/`. Review the generated files, then run `dotnet ef database update`.
- Commit: `feat(db): migration for SubjectCode on Subject`

**After completing this subtask, explain:**
- What `SubjectCode` represents and how it enables the professor-eligibility lookup.
- The overall Task 23 workflow from end to end (escalation triggers → admin assigns → professor resolves → grade finalizes → escalation closes; and the re-assignment path when the assigned professor also fails).

---

#### 23.2 — DB: `AssignedProfessorId` on `Grade` + `Escalations` + `EscalationAssignments` tables

Rules: Task 23 Overview (escalation data model, 1:1 Grades/Escalations, 1:N Escalations/EscalationAssignments), DB.md §2 Grades.

**1.** Add nullable `AssignedProfessorId UUID` (FK → `Users`) to `Grades`. Always holds the **currently active** assigned professor. `NULL` on most grades; updated on every (re-)assignment and remains set until the grade is resolved.

**2.** Create `Escalations` table (one row per escalated grade — 1:1 with `Grades`):

| Column | Type | Constraints |
|---|---|---|
| `Id` | UUID | PK |
| `GradeId` | UUID | FK → Grades, UNIQUE |
| `Reason` | VARCHAR | NOT NULL — `'AcceptedUnresolved'` \| `'ChainExhausted'` |
| `ResolvedAt` | TIMESTAMP | NULL — stamped when grade finalizes |

**3.** Create `EscalationAssignments` table (one row per assignment attempt — 1:N with `Escalations`):

| Column | Type | Constraints |
|---|---|---|
| `Id` | UUID | PK |
| `EscalationId` | UUID | FK → Escalations |
| `AssignedProfessorId` | UUID | FK → Users |
| `AssignedByAdminId` | UUID | FK → Users |
| `AssignedAt` | TIMESTAMP | NOT NULL |
| `SupersededAt` | TIMESTAMP | NULL — stamped when this assignment is replaced by a new one |

The **currently active** assignment for an escalation is the row where `SupersededAt IS NULL`. On re-assignment the old row gets `SupersededAt = now`, a new row is inserted, and `Grade.AssignedProfessorId` is updated to match.

-  generate migration — `dotnet ef migrations add AddEscalationWorkflow`. Review, then run `dotnet ef database update`.
- Commit: `feat(db): migration for Grade.AssignedProfessorId, Escalations, and EscalationAssignments`

**After completing this subtask, explain:**
- Why `Grade.AssignedProfessorId` holds only the current assignment (ownership checks need a single value without joining).
- Why `Escalations` and `EscalationAssignments` are separate tables (`Escalations` is the case; `EscalationAssignments` is the history of who was assigned).
- The 1:1 relationship between `Grades` and `Escalations`, and the 1:N between `Escalations` and `EscalationAssignments`.

---

#### 23.3 — Backend-service: Entities, enums, and repositories

Rules: Task 23 Overview (data-layer shape — Escalation and EscalationAssignment entities, EscalationReason enum, repositories).

Add:
- `EscalationReason` enum (`AcceptedUnresolved`, `ChainExhausted`) in `Models/Enums/`.
- `Escalation` entity with navigation properties to `Grade` and `ICollection<EscalationAssignment> Assignments`.
- `EscalationAssignment` entity with navigation properties to `Escalation`, `AssignedProfessor` (User), `AssignedByAdmin` (User).
- `IEscalationRepository` with: `GetByGradeIdAsync(Guid)`, `AddAsync(Escalation)`, `UpdateAsync(Escalation)`.
- `IEscalationAssignmentRepository` with: `GetActiveByEscalationIdAsync(Guid)`, `GetAllByEscalationIdAsync(Guid)`, `AddAsync(EscalationAssignment)`, `UpdateAsync(EscalationAssignment)`.
- `EscalationRepository` and `EscalationAssignmentRepository` implementations.
- Register both `DbSet`s in `ApplicationDbContext` with EF mappings and FK constraints. Register both repository interfaces in `Program.cs`.
- Commit: `feat(backend): Escalation and EscalationAssignment entities and repositories`

**After completing this subtask, explain:**
- The entity graph and how navigation properties connect `Escalation` → `EscalationAssignment` → `User`.
- What "active assignment" means in code (`SupersededAt == null`).

---

#### 23.4 — Backend-endpoint: `SubjectCode` on Subject entity + admin CRUD

Rules: Task 23 Overview (SubjectCode is required for eligibility lookup), PRD §5.3 (admin Subjects tab).

- Add `SubjectCode string` property to the `Subject` entity. Update EF mapping.
- Add `SubjectCode` (required, 1–20 chars) to `SubjectCreateDto` and `SubjectUpdateDto`.
- Update `SubjectCreateDtoValidator` and `SubjectUpdateDtoValidator` to enforce 1–20 chars, non-empty.
- Update `SubjectService` create and update methods to persist `SubjectCode`.
- Update `SubjectController` response DTOs to include `SubjectCode`.
- Commit: `feat(backend): add SubjectCode to Subject entity and admin CRUD`

**After completing this subtask, explain:**
- Why `SubjectCode` is required (without it the eligibility query cannot run).
- How an admin sets it (covered in frontend subtask 23.13).

---

#### 23.5 — Backend-service: Ownership check updates in `GradeService` and `AppealService`

Rules: Task 23 Overview (assigned professor becomes the write-authority during an open escalation; overdue-restriction lift for assigned professor), PRD §6 (service-level ownership is the authoritative security layer).

Replace the single `subject.ProfessorId == callerId` ownership guard with a two-tier check:

**Read actions** (`GetByEnrollmentAsync`, `GetByGradeAsync`): allow if `subject.ProfessorId == callerId` **OR** `grade.AssignedProfessorId == callerId`.

**Write actions** (`ReconfirmExamAsync`, `AcceptAsync`, `DenyAsync`, `UndoDenyAsync`):
- `grade.AssignedProfessorId == null` → allow only `subject.ProfessorId == callerId`.
- `grade.AssignedProfessorId != null` → allow only `grade.AssignedProfessorId == callerId`; original professor receives `403`.

**Overdue restriction lift**: in `AcceptAsync` and `DenyAsync`, skip the `appeal.SubmittedAt.AddDays(7) < now` overdue guard when `grade.AssignedProfessorId == callerId`.

- Commit: `feat(backend): two-tier ownership checks for escalated grades`

**After completing this subtask, explain:**
- The read vs write distinction and the rationale.
- Why the overdue restriction is lifted only for the assigned professor.
- Why the backend check is the authoritative security layer even if the frontend hides buttons.

---

#### 23.6 — Backend-service: `IEscalationService` + `EscalationService`

Rules: Task 23 Overview (full escalation state machine — Scenario A/B detection, four statuses, assign/reassign/auto-close semantics, eligible-professor rule).

`EscalationService` in `Services/`, registered via `IEscalationService`:

**`GetAllCasesAsync(DateTime now)`** — returns `EscalatedCaseDto[]` covering:
- Grades with no `Escalation` record that match Scenario A or B detection conditions (status = `NeedsAssignment`).
- Grades with an `Escalation` record where `ResolvedAt == null` and the active assignment's `AssignedAt + 7 days >= now` (status = `Assigned`).
- Grades with an `Escalation` record where `ResolvedAt == null` and the active assignment's `AssignedAt + 7 days < now` (status = `NeedsReassignment`).
- Grades with an `Escalation` record where `ResolvedAt != null` (status = `Resolved` — kept for history).

Detection conditions:
- **Scenario A**: `grade.FinalizedAt == null` AND any appeal has `Status == Accepted` AND `appeal.ReviewedAt!.Value.AddDays(7) < now`.
- **Scenario B**: `grade.FinalizedAt == null` AND 2+ appeals all satisfy `Status == Pending && SubmittedAt.AddDays(7) < now`.

`EscalatedCaseDto` fields: `gradeId`, `enrollmentId`, `subjectName`, `subjectCode`, `studentFirstName`, `studentLastName`, `originalProfessorFirstName`, `originalProfessorLastName`, `finalGrade`, `reason`, `escalationStatus`, `escalatedSince`, `resolvedAt?`, `appeals[]`, `assignmentHistory[]` (from `EscalationAssignments`, ordered by `AssignedAt` — each entry carries `assignedProfessorName`, `assignedByAdminName`, `assignedAt`, `supersededAt?`).

**`GetEligibleProfessorsAsync(string subjectCode, Guid excludeProfessorId)`** — professors (not soft-deleted) who teach at least one `Subject` with `SubjectCode == subjectCode` and `ProfessorId != excludeProfessorId`.

**`AssignProfessorAsync(Guid gradeId, Guid assignedProfessorId, Guid adminId, DateTime now)`** — first assignment: validates grade exists and is not finalized, professor is eligible, no open `Escalation` record exists. Creates `Escalation` row + first `EscalationAssignment` row. Sets `grade.AssignedProfessorId`.

**`ReassignProfessorAsync(Guid gradeId, Guid newProfessorId, Guid adminId, DateTime now)`** — re-assignment: finds open `Escalation`, validates active assignment's `AssignedAt + 7 days < now` (otherwise reject — reassignment not yet due), new professor is eligible. Sets active assignment's `SupersededAt = now`. Inserts new `EscalationAssignment` row. Updates `grade.AssignedProfessorId`.

**`CloseIfEscalatedAsync(Guid gradeId, DateTime now)`** — finds open `Escalation` for the grade; if found sets `ResolvedAt = now`.

- Commit: `feat(backend): EscalationService with detection, assignment, reassignment, and auto-close`

**After completing this subtask, explain:**
- The four escalation statuses and how each is derived.
- Step by step: first assignment vs re-assignment (what rows change in each case).
- How `CloseIfEscalatedAsync` hooks into grade finalization.

---

#### 23.7 — Backend-endpoint: `EscalationController` + auto-close hooks

Rules: Task 23 Overview (admin-only endpoints, auto-close triggered by grade finalization paths), PRD §6 (role-based authorization — admin only).

**`EscalationController`** `[Authorize(Roles = "Admin")]`, route `api/Escalation`:

- `GET /` → `GetAllCasesAsync` → `200 EscalatedCaseDto[]`.
- `GET /eligible-professors?subjectCode={code}&excludeProfessorId={id}` → `GetEligibleProfessorsAsync` → `200 UserDto[]`.
- `POST /assign` body `{ gradeId, assignedProfessorId }` → `AssignProfessorAsync` → `200 EscalatedCaseDto`. `400` if grade not found or already has an open escalation. `422` if professor not eligible.
- `POST /reassign` body `{ gradeId, newProfessorId }` → `ReassignProfessorAsync` → `200 EscalatedCaseDto`. `400` if no open escalation or reassignment not yet due. `422` if professor not eligible.

**Auto-close hooks**: inject `IEscalationService` into `GradeService` and `AppealService`. Call `CloseIfEscalatedAsync` inside:
- `GradeService.ReconfirmExamAsync` — after `FinalizedAt` is set (Scenario A resolution path).
- `AppealService.DenyAsync` — after `grade.FinalizedAt` is set (Scenario B deny-path).
- Scenario B accept-path: `AcceptAsync` does not finalize; `ReconfirmExamAsync` does → already covered above.

- Commit: `feat(backend): EscalationController with assign/reassign endpoints and auto-close hooks`

**After completing this subtask, explain:**
- Each endpoint and its role.
- Why `POST /reassign` is a separate endpoint from `POST /assign`.
- The two finalization paths and why auto-close hooks into those specific methods.

---

#### 23.8 — Backend-endpoint: Student dashboard — `"Under admin review"` status

Rules: Task 23 Overview ("Under admin review" status is shown when the grade is escalated and not finalized), PRD §5.5 (student dashboard — status column semantics).

Update `StudentDashboardService.BuildSubjectRow` and `SubjectRowDto`:

- Add `bool IsEscalated` to `SubjectRowDto`.
- Before the existing "accepted appeal awaiting reconfirm" and "overdue appeals" branches, check:
  - Scenario A active: `FinalizedAt == null` AND accepted appeal with `ReviewedAt + 7 days < now` → `Status = "Under admin review"`, `IsEscalated = true`, no buttons.
  - Scenario B active: `FinalizedAt == null` AND 2+ overdue Pending appeals → `Status = "Under admin review"`, `IsEscalated = true`, no buttons.

- Commit: `feat(backend): student dashboard escalation status`

**After completing this subtask, explain:**
- Where the new branches sit in the `BuildSubjectRow` decision chain.
- Why they must be evaluated before the generic accepted-appeal and overdue branches.

---

#### 23.9 — Backend-endpoint: Professor dashboard — `assignedCases` section

Rules: Task 23 Overview (assigned professor sees the escalated grades they must resolve), PRD §5.4 (professor dashboard structure).

Add `assignedCases: AssignedCaseDto[]` to the professor dashboard response. Entry appears for every grade where `grade.AssignedProfessorId == callerProfId` and `grade.FinalizedAt == null`.

`AssignedCaseDto`: `enrollmentId`, `gradeId`, `subjectName`, `studentFirstName`, `studentLastName`, `midterm1Points`, `midterm2Points`, `attendancePoints`, `practicalPoints`, `examPoints`, `finalGrade`, `reason`, `appeals: AppealDto[]`.

- Commit: `feat(backend): professor dashboard assigned cases section`

**After completing this subtask, explain:**
- How assigned cases are queried.
- What data the professor needs per scenario (Scenario A: grade fields + accepted appeal; Scenario B: both overdue appeal texts).

---

#### 23.10 — Frontend-component: Student dashboard `"Under admin review"` badge

Rules: Task 23 Overview (status badge, no action buttons while escalated), UI.md §6 (student dashboard patterns), PRD §5.5 (student dashboard).

When `status === "Under admin review"`, render a distinct badge (purple — not used by existing badges) with no action buttons. Stacked-card variant below `sm` shows the same badge.

- Commit: `feat(frontend): student dashboard under-admin-review status badge`

**After completing this subtask, explain:**
- Where in the status-rendering branch the new case is handled.
- The badge colour choice relative to existing badges.

---

#### 23.11 — Frontend-component: Professor dashboard `"Assigned Cases"` section

Rules: Task 23 Overview (resolve-modal UX for Scenario A/B), UI.md §7 (professor dashboard patterns), PRD §5.4 (professor dashboard).

Add **Assigned Cases** section below the Appeals section, using `assignedCases` from the dashboard payload.

Each row: subject name, student name, final grade, reason label (`"Accepted appeal — awaiting re-grade"` / `"Two overdue appeals — awaiting review"`), **Resolve** button.

**Resolve modal** (reusable `Modal`, blurred backdrop):
- Appeal history list (status, submitted date, text).
- **Scenario A panel**: collapsed midterms/attendance/practical summary + editable exam input + **Confirm** → `POST /api/Grade/reconfirm-exam`. On success: close modal, remove row.
- **Scenario B panel**: two overdue appeal texts (oldest first) + **Accept** / **Deny** on the latest appeal → existing endpoints. Deny shows the confirm sub-step. On success: close modal, remove row.

Responsive: collapses to stacked cards below `sm`.

- Commit: `feat(frontend): professor dashboard assigned cases section with resolve modal`

**After completing this subtask, explain:**
- How the modal selects Scenario A vs B from the `reason` field.
- How section data is sourced (from dashboard payload, no extra fetch).
- The responsive collapse behaviour.

---

#### 23.12 — Frontend-page: Admin dashboard `"Escalations"` tab

Rules: Task 23 Overview (four escalation statuses with per-status actions, assign/reassign modal, assignment history), UI.md §8 (admin dashboard patterns), PRD §5.3 (admin dashboard).

Add **Escalations** tab to `AdminDashboardPage` alongside Users, Subjects, Enrollments.

Table columns: **Subject**, **Student**, **Original Professor**, **Grade**, **Reason**, **Escalated Since**, **Status**, **Action**.

Row rendering by `escalationStatus`:
- `NeedsAssignment` — `"Needs assignment"` badge; **Assign professor** button.
- `Assigned` — `"Assigned"` badge; no action button.
- `NeedsReassignment` — `"Needs reassignment"` badge (amber); **Reassign professor** button.
- `Resolved` — entire row greyed; `"Resolved"` badge + resolved date; no action button.

**Assign / Reassign modal** (shared layout, blurred backdrop):
- Case detail: subject, student, current grade, reason description, full appeal history.
- **Assignment history** list (from `assignmentHistory[]` in the DTO): chronological table showing professor name, assigned by, assigned at, outcome (`"Superseded"` + date or `"Active"` or `"Resolved"`).
- **Eligible professors** list — fetched once on modal open via `GET /api/Escalation/eligible-professors?subjectCode={code}&excludeProfessorId={id}`. The backend scopes the result to professors who teach the same `SubjectCode`, so the list is naturally small. Render as a selectable list (radio-style). If empty: `"No eligible professors available"` + disabled Confirm.
- **Confirm** → `POST /api/Escalation/assign` (first assignment) or `POST /api/Escalation/reassign` (re-assignment). On success: update row in-place, close modal.

Responsive: collapses to stacked cards below `md` (same as other admin tabs). Assign button full-width in card.

- Commit: `feat(frontend): admin escalations tab with assign/reassign modal and assignment history`

**After completing this subtask, explain:**
- How the four status states drive row rendering and which action button each shows.
- How the assignment history list is rendered inside the modal.
- The eligible-professor dropdown and the empty-list case.
- The responsive collapse behaviour.

---

#### 23.13 — Frontend-component: `SubjectCode` field in admin subject forms

Rules: Task 23 Overview (SubjectCode required so eligibility lookup can run), PRD §5.3 (admin dashboard — Subjects tab), UI.md §8 (admin dashboard).

Add `SubjectCode` text input (required, Zod: non-empty, ≤ 20 chars, label `"Subject Code"`) to subject **Create** and **Edit** forms, directly below Subject Name.

- Commit: `feat(frontend): SubjectCode field in admin subject create and edit forms`

**After completing this subtask, explain:**
- Where the field sits in the form layout.
- Why it is required and what format is expected (e.g. `"MATH-101"`).

---

#### 23.14 — Seed: Explicit Scenario A and Scenario B escalation rows

Rules: Task 23 Overview (Scenarios A and B definitions, SubjectCode must be shared across at least two subjects), PRD §7 (data seeding scope).

Update `seed.sql`:

1. Set `SubjectCode` on **all** seeded subjects. At minimum two subjects must share a code so an eligible professor exists for the escalated cases.

2. **Scenario A** — one enrollment + grade with an accepted appeal whose `ReviewedAt = NOW() - INTERVAL '10 days'` (past the 7-day reconfirm window). `FinalizedAt = NULL`. Subject shares a `SubjectCode` with a subject taught by a different professor.

3. **Scenario B** — one enrollment + grade with two Pending appeals: `SubmittedAt = NOW() - INTERVAL '17 days'` (first) and `NOW() - INTERVAL '10 days'` (second). Both overdue. `FinalizedAt = NULL`. Subject shares a `SubjectCode` with another professor's subject.

Document both in seed comments (`-- Scenario A ...`, `-- Scenario B ...`).

- Commit: `feat(db): seed Scenario A and B escalation cases with backdated timestamps`

**After completing this subtask, explain:**
- Which seeded students, professors, and subjects were used for each scenario.
- How to verify: log in as admin, open Escalations tab, confirm both rows appear with status `"Needs assignment"`.

