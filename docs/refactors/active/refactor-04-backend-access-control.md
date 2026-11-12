### Refactor 04 — Endpoint authorization and data exposure

#### Overview

`PRD.md` §6 states that admin-only endpoints enforce the Admin role, that professor and student endpoints add a service-level ownership check, and that "Hiding buttons in the UI is a convenience — the service-level check is the authoritative layer". `Tech-Backend.md` §3 enumerates that layering controller by controller. Two controllers were never brought into it:

| Endpoint | Attribute today | What any logged-in student can read |
|---|---|---|
| `GET /api/Subject/{subjectId}/students` | `[Authorize]` | every enrolled student mapped to `UserDto` — **full name, email address, index number** |
| `GET /api/Enrollment` | `[Authorize]` | every enrollment in the system, paged, with student names and subject names |
| `GET /api/Enrollment/{id}` | `[Authorize]` | any single enrollment by id |
| `GET /api/Subject` | `[Authorize]` | every subject with its professor name |
| `GET /api/Subject/{id}` | `[Authorize]` | any subject by id |
| `GET /api/Subject/professor/{professorId}` | `[Authorize]` | any professor subject list by id — **to be deleted, not gated** (dead from the SPA; see R04.1) |

`Tech-Backend.md` §3 does not mention `SubjectController` or `EnrollmentController` at all, so the gap is a documentation silence as well as a code one. The first row is the one that matters: `SubjectRepository.GetStudentsBySubjectIdAsync` projects `e.Student` into a full `User` entity and `SubjectService` maps it to `UserDto`, which carries `Email`. A student who knows any subject id — and their own dashboard hands them several — can enumerate their cohort email addresses. `DB.md` §6.4 documents the professor-facing version of this list as returning `Id, FirstName, LastName` only, through a paged, ownership-checked endpoint. The unowned one next to it returns more fields to more people.

Three further exposures:

- **Duplicate email is only checked on create.** `UserService.AddUserAsync` checks the store and throws `EmailAlreadyExistsException` for a `409`, exactly as D-024 requires. `AdminUpdateUserAsync` and `UpdateProfileAsync` both assign `user.Email = dto.Email` with no check, so the `UQ Users_Email` index raises a `DbUpdateException` that the generic catch turns into `500` with the Postgres constraint text — breaking the same promise D-024 was written to fix, on a path D-024 never named.
- **Three delete endpoints hard-delete.** `UserRepository.DeleteUserAsync`, `SubjectRepository.DeleteSubjectAsync` and `EnrollmentRepository.DeleteEnrollmentAsync` all call `Remove`, although all three entities carry `IsDeleted` and the whole read side filters on it. Worse, `DELETE /api/Enrollment/{id}` exists at all: D-027 decided enrollments are create-only with no delete, and `Grades.EnrollmentId` cascades — so one admin click destroys a finalised grade and its appeal history.
- **Six request DTOs have no validator.** `Tech-Backend.md` §5 says one `AbstractValidator<T>` per DTO and names the appeal text bound explicitly ("Appeal DTO: text length ≤ 1000"). `SubmitAppealDto`, `SaveGradeDraftDto`, `ReconfirmExamDto`, `StudentConfirmGradeDto`, `AssignProfessorDto` and `ReassignProfessorDto` have none, so an over-long appeal text or a null one reaches Postgres and returns `500` from the `varchar(1000) NOT NULL` column instead of `400`.

**The target structure is defined in `Tech-Backend.md` §3 and §5.** Most subtasks here change the HTTP surface — a status code, or who may call an endpoint — so they carry `Backend-endpoint` or `Backend-service`, not `Refactor`, and each one that introduces a rule the documents do not yet state writes it into `PRD.md` or `Tech-Backend.md` first (AGENTS §0, D-010).

**Depends on:** refactor-02 (the typed exceptions these subtasks throw) · **Blocks:** nothing

#### Baseline — captured before step one

| Measure | Before | After (fill in at the end) |
|---|---|---|
| `dotnet test backend/StudentPortal.Tests` | 173 passed, 0 failed | |
| `dotnet test backend/StudentPortal.IntegrationTests` | 190 passed, 0 failed — 24 s (green since task 22e.1; see the index) | |
| endpoints reachable by any authenticated role regardless of need | 6 | |
| endpoints returning `Email` to a non-admin, non-self caller | 1 | |
| write paths assigning `Email` with no uniqueness check | 2 | |
| repository methods hard-deleting a soft-deletable entity | 3 | |
| request-bound DTOs with no `AbstractValidator<T>` | 6 | |

#### Out of scope

- **The grading, appeal and escalation authorization**, which `RoleMatrixTests`, `EscalationAccessTests` and `EscalationAuthorityTests` already cover and which matches `Tech-Backend.md` §3 layer 2 and 2b as written. Do not touch it.
- **Whether a student should see a subject list at all.** Reducing `GET /api/Subject` to Admin-only would break the admin Subjects tab and possibly the student dashboard; the decision of who needs each read belongs in `PRD.md` §6 and is made in R04.1 subtask 0, not inferred from the code.
- **Adding an edit endpoint for enrollments.** D-027 says create-only; this campaign removes a delete that contradicts it, and adds nothing.
- `AdminUserDto` carrying `IsDeleted` — D-035 settled that deliberately, after two failed attempts in both directions. Leave it alone.

#### Rollback

Each subtask is one commit touching one path. R04.4 deletes an endpoint; if anything in the SPA still calls it the e2e suite is what will say so, which is why that subtask runs the e2e suite rather than only the backend gate.

---

#### R04.1 — Backend-endpoint: Give every subject and enrollment read an owner

Rules: PRD §6 (admin-only endpoints enforce the Admin role; professor and student endpoints add an ownership check), Tech-Backend §3
Not in scope: changing any response shape (R04.2), or the already-correct `GET /professor/subjects/{subjectId}/students` (D-031).
Docs to update: PRD §6 and Tech-Backend §3 (both are silent on `SubjectController` and `EnrollmentController`), plus a new `docs/Decisions.md` entry (next free id) recording who may read each of the six endpoints and why.
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter RoleMatrix`

- [x] **Subtask 0 first:** decide the matrix and write it into `PRD.md` §6 and `Tech-Backend.md` §3, with the Decisions entry, in its own `docs:` commit. Work from the call sites: `grep -rn "API_ROUTES.SUBJECT\|API_ROUTES.ENROLLMENT" frontend/src` shows which role actually needs each read.
- [x] The matrix must state explicitly that `GET /api/Subject/professor/{professorId}` was **removed**, not gated, so a later reader does not restore it as an ungated route or wonder which role it belonged to. An endpoint absent from the matrix reads as an oversight; an endpoint recorded as deleted reads as a decision.
- [x] `GET /api/Enrollment` and `GET /api/Enrollment/{id}` become `[Authorize(Roles = "Admin")]` — the admin Enrollments tab is their only caller.
- [x] `GET /api/Subject/{subjectId}/students` becomes Admin-only, or is deleted in favour of the paged professor endpoint if nothing calls it. Prefer deletion: `DB.md` §6.4 already defines the supported shape.
- [x] **`GET /api/Subject/professor/{professorId}` is DELETED, not gated.** The route has no caller: there is no `API_ROUTES` entry for it, `grep -rn` across `frontend/src` returns nothing, and no integration or e2e test exercises it. Gating a dead route keeps the maintenance cost without the benefit.

  Delete exactly these three, and nothing else:

  | Delete | Location |
  |---|---|
  | `SubjectController.GetSubjectsByProfessorId` | `backend/StudentPortal/Controllers/SubjectController.cs:64-81` |
  | `ISubjectService.GetSubjectsByProfessorIdAsync` | `backend/StudentPortal/Interfaces/ISubjectService.cs:14` |
  | `SubjectService.GetSubjectsByProfessorIdAsync` | `backend/StudentPortal/Services/SubjectService.cs:85` |

  **Keep — do not touch:**

  | Keep | Location | Why |
  |---|---|---|
  | `ISubjectRepository.GetSubjectsByProfessorIdAsync` | `backend/StudentPortal/Interfaces/ISubjectRepository.cs:13` | used by `ProfessorDashboardService.cs:40` |
  | `SubjectRepository.GetSubjectsByProfessorIdAsync` | `backend/StudentPortal/Repositories/SubjectRepository.cs:58` | same — it is how D-028 makes a student-less subject appear on the dashboard |
  | `ProfessorDashboardServiceTests.cs:51` | that test stubs the **repository** method | stays as it is |

  The service and the repository methods share a name. The service one goes, the repository one stays — deleting the repository method breaks the professor dashboard. **refactor-05 R05.4 also names `GetSubjectsByProfessorIdAsync`, for an `AsNoTracking()` addition: that is the repository method, the one kept here.** The two campaigns do not conflict.
- [x] Extend `RoleMatrixTests` with one case per endpoint per role, asserting `403` for the roles the new matrix excludes, and `404`/`405` for the deleted route.
- [x] No e2e run is needed for this deletion, unlike R04.4 — the route has no frontend caller, so nothing crosses the stack (AGENTS §9.1).
- [x] Named suite green.
- Commit: `fix(backend): role-gate the subject and enrollment read endpoints`

---

#### R04.2 — Backend-service: Stop returning email addresses in list payloads

Rules: DB §6.4 and DB §6.5 (the documented projections select `Id`, `FirstName`, `LastName` and, for students, `IndexNumber` — nothing more), D-035
Not in scope: `UserDto` itself, which `Me` and the profile endpoints legitimately return to the user who owns it.
Docs to update: Tech-Backend §2 (name the DTO each list endpoint returns)
Verify: `dotnet test backend/StudentPortal.Tests --filter SubjectService`

- [x] Any list endpoint that survives R04.1 returns `UserSearchResultDto` (`Id`, `FirstName`, `LastName`, `IndexNumber`) rather than `UserDto`.
- [x] `SubjectRepository.GetStudentsBySubjectIdAsync` projects in SQL to those columns instead of materialising `User` entities — today it loads whole rows, `UserPassword` hash included, into application memory on every call.
- [x] A security test asserts no list response body contains an `email` key, in the shape of the existing `Me_ReturnsCurrentUserShape_WithoutIsDeleted` test that D-035 describes.
- [x] Named suite green.
- Commit: `fix(backend): project list endpoints to the documented columns`

---

#### R04.3 — Backend-service: Duplicate email on the two update paths

Rules: PRD §6 (duplicate email is `409`, never a generic 500), D-024, Tech-Backend §5
Not in scope: the create path, which already behaves. The non-admin email-change prohibition stays exactly as it is.
Docs to update: PRD §6 and Tech-Backend §5 (extend the duplicate-email rule from create to both update paths)
Verify: `dotnet test backend/StudentPortal.Tests --filter UserService`

- [x] **Subtask 0 first:** D-024 covers create only. Extend the rule in `PRD.md` §6 and `Tech-Backend.md` §5 to `PUT /api/User/{id}` and `PUT /api/Account/profile`, in its own `docs:` commit.
- [x] `AdminUpdateUserAsync` and `UpdateProfileAsync` look the email up before assigning and throw `ConflictException` when it belongs to a different user id.
- [x] Also catch `DbUpdateException` on the unique-index violation and translate it to the same `409`. The check-then-write is a race; the index is the real guarantee, and both paths must produce the same response.
- [x] Unit tests: updating to an email owned by someone else gives `409`; updating to your own current email is a no-op success.
- [x] An integration test drives the race from two concurrent requests and asserts one `200` and one `409`, never a `500`.
- Commit: `fix(backend): report a duplicate email as 409 on both update paths`

---

#### R04.4 — Backend-endpoint: Delete the enrollment delete endpoint

Rules: PRD §6 ("Enrollments cannot be edited or deleted"), D-027
Not in scope: the create path and its three validation rules, which D-027 fixes and which work.
Docs to update: Tech-Backend §3, UI §8.5 if it still describes a delete control
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Enrollment`

- [ ] Record the blast radius in the commit message: `Grades.EnrollmentId` is `CASCADE` (DB §3), so `DELETE /api/Enrollment/{id}` destroys the grade, its drafts, its appeals and its escalation history for that enrollment — with no soft-delete and no audit row.
- [ ] Remove `DELETE /api/Enrollment/{id}` from `EnrollmentController`, and `DeleteEnrollmentAsync` from `IEnrollmentService` and `IEnrollmentRepository`.
- [ ] `grep -rn "ENROLLMENT" frontend/src --include=*.ts --include=*.tsx` first: D-027 says the SPA delete was a local-only stub, so nothing should call it. If something does, stop and report rather than breaking the SPA.
- [ ] An integration test asserts `DELETE /api/Enrollment/{id}` now returns `405`.
- [ ] Named suite green, plus `npm run e2e` from `e2e/` — removing a route is the cross-stack case in AGENTS §9.1.
- Commit: `fix(backend): remove the enrollment delete endpoint per D-027`

---

#### R04.5 — Backend-service: Make the remaining deletes soft

Rules: PRD §2 and the Overview glossary (soft-delete is the `IsDeleted` flag), DB §2.1, DB §2.2, DB §3
Not in scope: enrollments, handled in R04.4. No change to how the read side filters — it already filters on `IsDeleted`.
Docs to update: Tech-Backend §3, DB §2.1, DB §2.2 (state that `DELETE` sets the flag and never removes the row), plus a new `docs/Decisions.md` entry (next free id).
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter AdminUserCrud`

- [ ] **Subtask 0 first:** no document states what `DELETE /api/User/{id}` or `DELETE /api/Subject/{id}` do. Write it, with the Decisions entry, in its own `docs:` commit.
- [ ] `UserRepository.DeleteUserAsync` sets `IsDeleted = true` instead of `Remove`. Today a hard delete also cascades the user `RefreshTokens` and is blocked outright by the `RESTRICT` relationships in `DB.md` §3 as soon as the user owns a subject or an enrollment — so the endpoint currently either fails with a leaked FK message or quietly destroys history.
- [ ] `SubjectRepository.DeleteSubjectAsync` does the same. A subject with enrollments cannot be hard-deleted at all under `DB.md` §3, so this is also a bug fix for an endpoint that returns `500` today.
- [ ] `DeleteUserAsync` revokes the user refresh rows (shared with refactor-03 R03.7 — do it in one place, not both; whichever campaign lands first owns it and the other tick its box as already done).
- [ ] Integration tests: deleting a user with enrollments succeeds and the row survives with `IsDeleted = true`; the user can no longer log in; the admin list still shows them as Inactive (D-035).
- Commit: `fix(backend): soft-delete users and subjects instead of removing rows`

---

#### R04.6 — Backend-endpoint: The six missing validators

Rules: Tech-Backend §5 (one `AbstractValidator<T>` per DTO; appeal text ≤ 1000), DB §2.6 (`Appeals.Text` is `varchar(1000) NOT NULL`), PRD §4
Not in scope: changing any bound. Every number comes from `Tech-Backend.md` §5, `DB.md` §2.6 or `PRD.md` §3 — if one is missing there, that is a stop-and-report, not a guess.
Docs to update: Tech-Backend §5 (list the six DTOs explicitly)
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter AppealSubmit`

- [ ] `SubmitAppealDtoValidator`: `EnrollmentId` not empty; `Text` not empty, trimmed, `MaximumLength(1000)` — the bound `Tech-Backend.md` §5 already states and the column already enforces with a `500`.
- [ ] `SaveGradeDraftDtoValidator`: the same per-field ranges and half-step rule as `ConfirmGradeDtoValidator`, but each field nullable (`DB.md` §2.5 allows NULL until the professor fills it).
- [ ] `ReconfirmExamDtoValidator`: `EnrollmentId` not empty, `ExamPoints` 0–30 in steps of 0.5.
- [ ] `StudentConfirmGradeDtoValidator`: `EnrollmentId` not empty.
- [ ] `AssignProfessorDtoValidator` and `ReassignProfessorDtoValidator`: both GUIDs not empty — `EscalationController` currently hand-checks `Guid.Empty` in one action and not the others.
- [ ] One integration test per validator asserting `400` with a `ValidationProblemDetails` body, replacing the `500` these inputs produce today.
- [ ] Named suite green.
- Commit: `feat(backend): validators for the six unvalidated request DTOs`

---

#### R04.7 — Refactor: Retire the unused authorization policies

Rules: Tech-Backend §2 (request pipeline and DI), Tech-Backend §3
Not in scope: changing any effective permission. This is dead-config removal only, which is why it is `Refactor` and not `Backend-endpoint`.
Docs to update: Tech-Backend §2 if it documents the policies
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [ ] `Program.cs` registers `AdminOnly`, `ProfessorOnly` and `StudentOnly` policies; `grep -rn "AdminOnly\|ProfessorOnly\|StudentOnly" backend/StudentPortal --include=*.cs` shows zero uses outside the registration. Record the count in the commit message.
- [ ] Either delete the three registrations, or adopt them across the controllers — one or the other, not a mix. `Tech-Backend.md` §3 describes `[Authorize(Roles = …)]` attributes, so deletion is the change that matches the document.
- [ ] `DB.md` §6.4 says the professor students endpoint "is gated `ProfessorOnly`", naming a policy it does not use. Fix that sentence in the same commit.
- [ ] Named suites green — no test should change, which is the proof the config was dead.
- Commit: `refactor(backend): remove the three unused authorization policies`

---

#### R04.8 — Docs: Write the finished authorization matrix down

Rules: Tech-Backend §3, PRD §6
Not in scope: code.
Docs to update: Tech-Backend §3, PRD §6, DB §6.4
Verify: `node scripts/check-docs.mjs`

- [ ] `Tech-Backend.md` §3 layer 1 lists **every** controller, including `SubjectController` and `EnrollmentController`, which it omits today.
- [ ] Each row names the attribute and, where one exists, the service-level ownership check.
- [ ] `PRD.md` §6 carries the role rule for every endpoint group, so a future agent does not have to read the attributes to find out who may call what.
- [ ] Any section that exceeded ~150 lines is split rather than grown (AGENTS §7).
- [ ] `node scripts/check-docs.mjs` passes.
- Commit: `docs: complete the endpoint authorization matrix`
