# Product Requirements — StudentPortal

> This document is the **source of truth for product behaviour**. It intentionally does not describe code, tables, API shapes, or libraries — those live in `Tech.md`, `DB.md`, and `UI.md`.

---

## 1. One-line summary

StudentPortal is an internal web app for a university faculty where **Admins** manage users / subjects / enrollments, **Professors** enter grades for the students enrolled in their subjects, and **Students** see their grades and can either accept them or appeal within a bounded window.

---

## 2. Actors and what each one can do

### 2.1 Admin
- Log in / log out.
- Manage users: create (student, professor, or admin), edit (first name, last name, email, role, soft-delete flag), delete.
- Manage subjects: create (name, ECTS defaults to 6, assigned professor), edit, delete.
- Manage enrollments: create (student + subject pair), delete.
- No access to the grading flow.

### 2.2 Professor
- Log in / log out.
- See a list of their own subjects (subjects where `ProfessorId == self`).
- For each subject, see the students enrolled in it.
- For each enrolled student, enter 5 point fields toward one final grade (see §3).
- Save a draft of a grade so values persist across sessions before confirming.
- Confirm the grade (triggers the student-side 7-day window).
- Review appeals for grades on their own subjects: accept or deny.
- Undo a deny within 24 hours of denying.
- Cannot act on another professor's subjects or students.
- Cannot accept or deny an **overdue** appeal (see §4.4).

### 2.3 Student
- Log in / log out.
- See their own dashboard: personal info, study statistics, per-subject rows with final grade / status / professor / action buttons.
- During the 7-day appeal window after a professor confirms: either click **Write appeal** or click **Confirm grade** (meaning "I agree, lock it in now").
- Submit **one** appeal per grade confirmation cycle. If a prof misses the 7-day review deadline on that appeal, the student can submit **one more** appeal (see §4.4).
- Cannot see any other student's data.

---

## 3. The grading model

### 3.1 Point fields
A grade for a student in a subject is built from exactly **five point fields**, each a decimal with step **0.5**:

| Field | Max | Notes |
|---|---|---|
| First midterm points | 30 | 0 is a valid value (student scored nothing). |
| Second midterm points | 30 | 0 is valid. |
| Lecture attendance points | 5 | 0 is valid. |
| Practical class participation points | 5 | 0 is valid. |
| Exam points | 30 | 0 is valid. |

**Sum range:** 0.0 to 100.0.

### 3.2 Final grade mapping
The sum of the 5 fields maps to the Serbian 5–10 scale:

| Sum | Final grade |
|---|---|
| 0 – 50 | **5** (fail) |
| 51 – 60 | **6** |
| 61 – 70 | **7** |
| 71 – 80 | **8** |
| 81 – 90 | **9** |
| 91 – 100 | **10** |

The final grade is a snapshot: computed and stored the moment the professor clicks **Confirm**, and overwritten only if the professor accepts an appeal and re-confirms the exam points.

### 3.3 Draft lifecycle
- Professor fills any subset of the 5 fields → clicks **Save draft** → values persist.
- Opening the student again later reloads the draft and the professor can continue editing.
- The **Confirm** button is only visible once **all 5** fields have been filled in the draft (final grade is calculable).
- Clicking **Confirm** writes the Grade, computes and stores the final grade, deletes the draft, and starts the student-facing 7-day window.
- After confirmation, all 5 fields are read-only (unless an appeal is accepted — see §4.3).

### 3.4 No comment field
The old per-grade comment is **removed** from the entire flow. No comment is stored, shown, or editable anywhere.

---

## 4. The appeal flow

### 4.1 Student's choices during the 7-day window
From the moment the professor confirms a grade, the student has **7 calendar days** to either:

- **Confirm grade** — accepts the grade immediately. Grade becomes "truly final" the moment they click. No further appeals possible. ECTS counts right away.
- **Write appeal** — opens a modal with a text area (max 1000 characters) and a blurred backdrop over the rest of the page. Submitting creates one Pending appeal attached to the grade.

If the student does **neither** for the full 7 days: on day 8 the grade is treated as "truly final" automatically (same effect as if they had clicked Confirm grade).

While the grade is in the 7-day window and the student has not yet acted, the status column shows **"Awaiting confirmation"**.

### 4.2 Professor's review
When any appeal exists on a professor's subject, their dashboard shows an **Appeals** section with one row per pending or overdue appeal. The professor clicks **View appeal** → modal opens showing:

- All prior overdue appeals (if any) for the same grade, each prefixed with `[OVERDUE]`, greyed, read-only, no action buttons.
- The current Pending appeal text, in normal text, with **Accept** and **Deny** buttons.

### 4.3 Accept
- Professor clicks **Accept** on the Pending appeal.
- The appeal row's status becomes `Accepted`; `ReviewedAt` is stored.
- The exam field on the grade becomes editable again. The other four fields are shown as a one-line collapsed read-only summary ("Midterms: 50/60 • Attendance: 5/5 • Practical: 4/5").
- Professor enters a new exam value → the final grade recomputes live → clicks **Confirm** again.
- The new grade is now truly final immediately (no new 7-day window — the student already had their one appeal).

### 4.4 Deny
- Professor clicks **Deny** on the Pending appeal.
- The appeal row's status becomes `Denied`; `ReviewedAt` is stored.
- The grade is immediately treated as truly final: ECTS counts, the student's buttons disappear, the status column shows the final `Passed` / `Failed` label plus a red **Appeal denied** badge.
- For **24 hours** after denial, the professor's dashboard shows an **Undo deny** button next to that appeal with a countdown. Clicking Undo returns the appeal to `Pending` and resumes the student's 7-day window from where it was paused when the appeal was first submitted (see §4.6 for the pause math).

### 4.5 Overdue (professor forgets)
- A Pending appeal that has not been accepted or denied within **7 days of its submission** is treated as `Overdue`.
- Overdue is **computed on read** — no background job flips rows.
- The grade does not finalize while an Overdue appeal exists.
- The student's dashboard shows **Write appeal** again, with a fresh 7-day window starting from the moment the appeal went overdue.
- The student can submit one more appeal; the first overdue one stays in the DB as audit.
- A professor **cannot** accept or deny an overdue appeal (the Accept/Deny buttons are not rendered for overdue entries in the View appeal modal).

### 4.6 7-day student-window pause math
The 7-day window pauses while an appeal is Pending. Formally:
```
daysConsumed  = daysBetween(ConfirmedAt, EarliestAppealSubmittedAt)   // first appeal only
windowDeadline = reviewMoment + (7 - daysConsumed) days
```
where `reviewMoment` is `Appeal.ReviewedAt` (for accept/deny followed by undo scenarios) or the overdue moment. In the common case of no appeal at all, deadline is simply `ConfirmedAt + 7 days`.

### 4.7 Earned ECTS rule
A grade contributes its subject's ECTS to **Earned ECTS** only when the grade is **truly final** AND the final grade is ≥ 6. A grade becomes truly final in exactly these cases:
1. The student clicks **Confirm grade**.
2. 7 days pass with no student action and no pending appeal.
3. The professor denies the appeal AND the 24-hour undo window has elapsed.
4. The professor accepts the appeal and re-confirms the exam points.

---

## 5. Screen inventory

### 5.1 Public home screen (`/`)
- Hero section with title and tagline.
- **One** login call-to-action — the Navbar `Login` link only. The centre-of-page "Prijavi se" button is removed.
- Feature cards below (as they are today, translated to English).

### 5.2 Login screen (`/login`)
- Email + password form, both required, email format validated, password shown as masked by default.
- Submit → on success, the server sets auth cookies and the SPA redirects to the role's dashboard.
- Serbian localized strings are replaced with English.

### 5.3 Admin dashboard (`/admin-dashboard`)
Three tabs: **Users**, **Subjects**, **Enrollments**.

- Users tab: table with ID, First Name, Last Name, Email, Role, Status (Active/Inactive from `IsDeleted`), Edit button. Above: **Create New User** button.
- Create / Edit user modal: first name, last name, email, role, index number (students only), **password with show/hide toggle** (create only — Edit has no password field).
- Subjects tab: table with name, ECTS, professor, Edit button + Create button.
- Enrollments tab: table with student, subject, Delete button + Create button.
- Responsiveness: at <768 px (`md` breakpoint) each table becomes a vertical stack of scrollable cards.

### 5.4 Professor dashboard (`/professor-dashboard`)
Three columns on desktop:
1. **My Subjects** — selectable list.
2. **Students in <subject>** — selectable list of students enrolled in the selected subject.
3. **Grade for <student>** — the grading UI (see §3.3 and §5.6 below).

Below those columns, an **Appeals** section listing every Pending or Overdue appeal across all the professor's subjects. Each row has a **View appeal** button opening the appeal modal (see §4.2).

Responsiveness: at <576 px (`sm` breakpoint) the three columns stack vertically and the Appeals list becomes stacked cards.

### 5.5 Student dashboard (`/student-dashboard`)
- **My Information**: name, email, index number.
- **Study Statistics**: four stat tiles — Average Grade (one decimal place, mean of all confirmed-passed grades, failures excluded), Passed Exams (count), Non-passed Exams (count of failures AND un-graded enrollments), Earned ECTS (sum from truly-final passed grades per §4.7).
- **My Subjects**: table — Subject name, Professor name, Final grade (or `—` if not graded yet), Status (`Passed` / `Failed` / `Not graded` / `Awaiting confirmation` / `Appeal pending`, plus a secondary `Appeal denied` badge if applicable), Action column (either **Write appeal** button, **Confirm grade** button, both, or nothing — see §4.1).
- Responsiveness: at <576 px (`sm`) the subjects table becomes stacked cards.
- The old **Students** link and page are removed. The dashboard is the only student view.

### 5.6 Grading UI inside professor dashboard
When the professor selects a student:
- If no grade exists yet and no draft exists: 5 empty number inputs (step 0.5, min 0, respective maxes).
- If a draft exists: the 5 inputs are pre-filled with the draft values.
- If a grade is confirmed and no appeal is accepted: the 5 inputs are shown read-only.
- If an appeal is accepted and awaiting re-confirm: a 1-line summary of midterms/attendance/practical, plus an editable exam input, plus the live final grade number.
- The **Confirm grade** button appears only when all 5 inputs have a numeric value.
- The **Save draft** button is visible whenever at least one of the inputs has been edited and no final grade is confirmed yet. Clicking it POSTs the current values to the drafts table.

### 5.7 Navbar
- Brand: "Student Portal" linking to `/`.
- When logged out: `Login` link only.
- When logged in: `Dashboard` link (routes to role-specific dashboard), greeting with first name, `Logout` button.
- The current active route is visually highlighted (Bootstrap `.active` class on the `.nav-link`).
- No "Students" link.

### 5.8 Reusable Modal
A single generic Modal component is used for: appeal submission, view appeal, admin confirmations (delete user etc.), and the deny-confirmation step. Appeal and view-appeal modals have a blurred backdrop (`backdrop-filter: blur`).

---

## 6. Security requirements (basic / junior scope)

- All non-auth endpoints require authentication.
- Admin-only endpoints enforce the Admin role via a controller/action attribute.
- Professor-only endpoints enforce the Professor role plus a service-level ownership check (professor can only touch grades, drafts, and appeals on their own subjects).
- Student-only endpoints enforce the Student role plus a service-level ownership check (student can only touch their own enrollments, grades, and appeals).
- Mass-assignment is impossible: incoming DTOs for self-service flows do not expose role, soft-delete flag, or password-hash fields.
- Access token lives in an **httpOnly, Secure, SameSite=Strict** cookie set by the server. The SPA never reads a token in JS.
- Refresh token lives in a separate httpOnly cookie; on each refresh the server rotates it (new value, old row revoked) and detects re-use (if a previously-rotated refresh token is presented, revoke the entire chain for that user).
- Access token lifetime: 15 minutes. Refresh token lifetime: 7 days.
- JWT signing key is loaded from an environment variable (dotnet user-secrets locally, `.env` on Render). It is **not** stored in `appsettings.json`. The app fails fast on missing config.
- DB password is also loaded from `.env` on Render.
- CORS is restricted to an allow-list of origins (localhost for now).
- No CSRF middleware — reliance on `SameSite=Strict` for same-site cookie posting.
- No rate limiting, no account lockout — explicitly out of scope.
- Password hashing stays as PBKDF2-SHA512 at 100 000 iterations (current implementation). A README note calls out that this is below OWASP 2023 guidance and is acceptable for a learning project.
- Input validation on all auth, admin, grade entry, and appeal DTOs uses FluentValidation (automatic 400 responses on invalid payloads).

---

## 7. Data seeding

A re-runnable `seed.sql` populates the database with:
- **1 Admin + 4 Professors + 10 Students = 15 Users anchor**.
- ~15 Subjects, each 6 ECTS (default), spread across the 4 professors.
- ~30 Enrollments covering realistic student-subject pairs.
- ~20 Grades across mixed states:
  - several truly-final (student confirmed, 7-day lapse, or deny past undo window),
  - a few inside the 7-day window with no student action yet,
  - at least one with a Pending appeal,
  - at least one with an Accepted appeal awaiting re-confirm,
  - at least one with a Denied appeal (inside 24h undo),
  - at least one Overdue scenario (first appeal overdue, second pending),
- ~3 GradeDrafts for grades not yet confirmed.
- All seeded users share the plaintext password `Password123!`.

The old seed (from the pre-5-field schema) is replaced wholesale.

---

## 8. Deployment target
Production target is Render. Both backend and frontend. CORS allow-list and all secrets (JWT key, DB password) are supplied via Render environment variables; nothing production-sensitive goes into `appsettings.json`. For now, local development is the only supported mode and prod URLs are left as placeholders.

---

## 9. Implementation task list (in order)

> Rule: **every subtask below gets its own local commit**. Commit message is written in the subtask. Nothing is pushed to GitHub — the human runs `git push` themselves when they want to.
>
> When a subtask requires the human to do something outside the agent's reach (install a tool, run a migration, set an env var, open a page in the browser), it will say so explicitly in a **You:** callout.

---

### Task 0 — Redo the Serbian → English UI translation

- **0.1** Translate every Serbian string in `frontend/src/pages/`, `frontend/src/components/`, and anywhere else to English, matching the pre-reset content exactly (no new copy introduced here).
  - Commit: `chore(i18n): translate frontend UI strings from Serbian to English`

---

### Task 1 — Documentation baseline

- **1.1** Create `docs/PRD.md`, `docs/Tech.md`, `docs/DB.md`, `docs/UI.md`, and `AGENTS.md` (this task).
  - Commit: `docs: add PRD, Tech, DB, UI, and AGENTS source-of-truth files`

---

### Task 2 — Secrets removal and `.env` for production

- **2.1** Add `appsettings.Local.json`, `.env`, `.env.local`, `.env.*.local` to `.gitignore`.
  - Commit: `chore(gitignore): exclude local env and appsettings files`
- **2.2** Remove `JwtConfig:Key` and the DB password from `appsettings.json`. Keep only the Issuer, Audience, token lifetimes, and empty connection string shell.
  - Commit: `security(backend): remove JWT key and DB password from appsettings`
- **2.3** Add a `UserSecretsId` to `StudentPortal.csproj`. **You:** run `dotnet user-secrets init` (idempotent), then `dotnet user-secrets set "JwtConfig:Key" "$(openssl rand -base64 64)"` and `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=StudentPortal;Username=postgres;Password=postgres"`.
  - Commit: `chore(backend): enable user-secrets for local dev`
- **2.4** In `Program.cs`, add fail-fast reads for `JwtConfig:Key`, `JwtConfig:Issuer`, `JwtConfig:Audience`, and `ConnectionStrings:DefaultConnection`; reject keys shorter than 32 bytes.
  - Commit: `security(backend): fail fast on missing or weak JWT / DB config`
- **2.5** Create `.env.example` in repo root listing the production env var names (`JwtConfig__Key`, `ConnectionStrings__DefaultConnection`, `Cors__Origins__0`, `Cors__Origins__1`) with placeholder values.
  - Commit: `docs: add .env.example for Render deployment`

---

### Task 3 — Backend security hardening (basic rules)

- **3.1** Lock down CORS: replace `AllowAnyOrigin` + `AllowAnyMethod` + `AllowAnyHeader` with an allow-list driven by `Cors:Origins` from config.
  - Commit: `security(backend): replace open CORS with configured allow-list`
- **3.2** Harden JWT validation parameters: pin `ValidAlgorithms = HmacSha512`, tighten `ClockSkew` to 30 s, set `RequireHttpsMetadata` to `!IsDevelopment`.
  - Commit: `security(backend): pin JWT algorithm and tighten clock skew`
- **3.3** Rewrite JWT `Sub` claim to be the user's GUID; add `ClaimTypes.NameIdentifier` for the same value; add a separate `email` claim.
  - Commit: `security(backend): use user id as JWT subject claim`
- **3.4** Reject soft-deleted users at login; return a single opaque error ("Invalid email or password") for every login failure mode.
  - Commit: `security(backend): reject soft-deleted users at login and unify error messages`
- **3.5** Add `[Authorize]` class-level on every controller except `AccountController`'s login/refresh. Add `[Authorize(Roles = "Admin")]` on admin-only actions. Add `[Authorize(Roles = "Professor")]` on grading actions. Register role policies in `Program.cs`.
  - Commit: `security(backend): add role-based authorization to all controllers`

---

### Task 4 — Mass-assignment fix (DTO split + mapping)

- **4.1** Split `UserCreateDto` into `RegisterStudentDto` (no role, no soft-delete) and `AdminCreateUserDto` (role allowed). Split `UserUpdateDto` into `UpdateProfileDto` (first + last name only) and `AdminUpdateUserDto` (role + email + soft-delete). Delete the old DTOs.
  - Commit: `security(backend): split user DTOs by actor to prevent mass-assignment`
- **4.2** Update `MappingProfile` to ignore protected fields (`Id`, `PasswordHash`, `UserRole`, `IsDeleted`, `CreatedAt`) on self-service maps.
  - Commit: `refactor(backend): tighten AutoMapper profile for user DTOs`
- **4.3** In `UserRepository`, add `GetUserByIdForUpdateAsync` returning a tracked entity. In `UserService.UpdateUserAsync`, copy only whitelisted fields instead of `_mapper.Map(dto, entity)` on the whole entity.
  - Commit: `security(backend): copy only whitelisted fields when updating users`
- **4.4** In `UserController`, split the single `UpdateUser` endpoint into `PutProfile` (self-service, `[Authorize]`) and `PutAdminUpdate` (`[Authorize(Roles="Admin")]`). Take `id` from the route; ignore any `Id` in the body.
  - Commit: `security(backend): separate self-service and admin user update endpoints`
- **4.5** Remove `IsDeleted` from `UserDto` and `LoginResponseDto` (internal state leak).
  - Commit: `security(backend): stop leaking IsDeleted in response DTOs`

---

### Task 5 — FluentValidation

- **5.1** Add the `FluentValidation.AspNetCore` NuGet package. Register `AddFluentValidationAutoValidation()` in `Program.cs`.
  - Commit: `chore(backend): add FluentValidation.AspNetCore package`
- **5.2** Create `Validators/` folder. Write `LoginRequestDtoValidator`, `RegisterStudentDtoValidator`, `AdminCreateUserDtoValidator`, `UpdateProfileDtoValidator`, `AdminUpdateUserDtoValidator`.
  - Commit: `feat(backend): add FluentValidation validators for user and auth DTOs`
- **5.3** Write `SubjectCreateDtoValidator`, `SubjectUpdateDtoValidator`, `EnrollmentCreateDtoValidator`.
  - Commit: `feat(backend): add FluentValidation validators for subject and enrollment DTOs`

---

### Task 6 — Httponly cookie auth + refresh tokens

- **6.1** Add `RefreshToken` entity (`Id, UserId, TokenHash, ExpiresUtc, RevokedUtc?, ReplacedByTokenId?, CreatedUtc, CreatedByIp?`), its EF mapping in the DbContext, and `IRefreshTokenRepository` + `RefreshTokenRepository` (`FindByHashAsync`, `AddAsync`, `RevokeAsync`, `RevokeAllForUserAsync`).
  - Commit: `feat(backend): add RefreshToken entity and repository`
- **6.2** Create `ITokenService` + `TokenService` (`GenerateAccessToken(User)`, `GenerateRefreshTokenRaw()`, `HashRefreshToken(string)`); move JWT emission out of `JwtService`.
  - Commit: `refactor(backend): extract token generation into TokenService`
- **6.3** Rename `JwtService` → `AuthService`, `IJwtService` → `IAuthService`. `AuthService` orchestrates: user lookup, password verify, access + refresh token issue, refresh-token row insert.
  - Commit: `refactor(backend): rename JwtService to AuthService`
- **6.4** Rewrite `AccountController`: `POST /Login` sets `sp_access` + `sp_refresh` cookies and returns public user profile in body (no token in body); add `POST /Refresh` (reads `sp_refresh`, rotates, re-sets cookies, 204); add `POST /Logout` (revokes row, clears cookies, 204); add `GET /Me` (returns profile). Fix the stale `namespace WebApiDemo.Controllers` typo.
  - Commit: `feat(backend): cookie-based login, refresh, logout, and me endpoints`
- **6.5** In `AddJwtBearer` configure `OnMessageReceived` to pull the JWT from the `sp_access` cookie instead of the `Authorization` header.
  - Commit: `security(backend): read access token from httpOnly cookie`
- **6.6** Delete the duplicate `POST /api/User/Login` action from `UserController`. Remove `AddScoped<JwtService>` (keep only `IAuthService`).
  - Commit: `refactor(backend): remove duplicate login endpoint and stale DI`
- **6.7** Switch cookie `SameSite` to `Strict`. Update CORS: add `.AllowCredentials()` and ensure allow-list has no wildcard.
  - Commit: `security(backend): set SameSite=Strict on auth cookies and allow credentials`
- **6.8** **You:** generate the EF migration — `dotnet ef migrations add AddRefreshToken` from `backend/StudentPortal/`. Review the generated files and the auto-generated snapshot; they'll be committed in the next subtask.
- **6.9** Commit the generated migration files + snapshot.
  - Commit: `feat(db): migration for RefreshToken table`

---

### Task 7 — Grade schema redesign (5 fields + drafts + appeals + lockout)

- **7.1** Add new columns to `Grade`: `Midterm1Points DECIMAL(4,1)`, `Midterm2Points DECIMAL(4,1)`, `AttendancePoints DECIMAL(3,1)`, `PracticalPoints DECIMAL(3,1)`, `ExamPoints DECIMAL(4,1)`, `FinalGrade INT`, `ConfirmedAt DATETIME NULL`, `StudentConfirmedAt DATETIME NULL`, `FinalizedAt DATETIME NULL`. Remove the old `StudentGrade`, `Comment`, `IsConfirmed`. Update the EF mapping and the check constraint to `FinalGrade BETWEEN 5 AND 10`. Change the `Enrollment → Grades` relationship from 1:N to 1:1 (make `EnrollmentId` the unique key).
  - Commit: `feat(db): reshape Grade entity for 5-field grading system`
- **7.2** Add `GradeDraft` entity (`Id, EnrollmentId UNIQUE, Midterm1Points, Midterm2Points, AttendancePoints, PracticalPoints, ExamPoints, LastEditedAt`) + DbSet + mapping + repository.
  - Commit: `feat(db): add GradeDraft entity and repository`
- **7.3** Add `Appeal` entity (`Id, GradeId, Text, SubmittedAt, Status, ReviewedAt?`) with `Status` enum (`Pending, Accepted, Denied, Overdue`). `GradeId` is a plain FK (not unique) so multiple appeals per grade are possible. Add DbSet + mapping + repository.
  - Commit: `feat(db): add Appeal entity and repository`
- **7.4** **You:** generate the migration — `dotnet ef migrations add GradeRedesign`. Review it (verify the old grade data is dropped cleanly). Then **you** run `dotnet ef database update`.
- **7.5** Commit the generated migration files.
  - Commit: `feat(db): migration for Grade/Draft/Appeal schema`

---

### Task 8 — Grading service and endpoints

- **8.1** `IGradeDraftService` + `GradeDraftService`: `GetDraftAsync(enrollmentId, callerProfId)`, `SaveDraftAsync(enrollmentId, callerProfId, 5 fields)`. All methods verify ownership (subject's professor == caller).
  - Commit: `feat(backend): grade draft service with ownership checks`
- **8.2** `GradeDraftController` with `GET /api/GradeDraft/{enrollmentId}` and `PUT /api/GradeDraft/{enrollmentId}`.
  - Commit: `feat(backend): grade draft API endpoints`
- **8.3** Rewrite `IGradeService` + `GradeService`: `GetByEnrollmentAsync`, `ConfirmGradeAsync` (reads draft → validates all 5 filled → computes final → inserts Grade → deletes draft), `ReconfirmExamAsync` (used after an accepted appeal — only exam points changeable).
  - Commit: `feat(backend): grade confirmation service with final grade computation`
- **8.4** Rewrite `GradeController`: `POST /api/Grade/confirm` (prof confirms new grade), `POST /api/Grade/reconfirm-exam` (prof re-confirms after accept), `POST /api/Grade/student-confirm` (student clicks Confirm). All actions `[Authorize(Roles = "...")]` + ownership check in service.
  - Commit: `feat(backend): grade confirmation API endpoints`
- **8.5** `IAppealService` + `AppealService`: `SubmitAsync` (student, enforces 7-day window + at most one Pending), `GetPendingForProfessorAsync`, `GetByGradeAsync` (returns full history incl. overdue), `AcceptAsync`, `DenyAsync`, `UndoDenyAsync` (only within 24h of ReviewedAt). Overdue is computed on read, never stored.
  - Commit: `feat(backend): appeal service with pause/overdue/undo logic`
- **8.6** `AppealController`: `POST /api/Appeal` (student), `GET /api/Appeal/pending` (professor, filtered by their subjects), `GET /api/Appeal/by-grade/{gradeId}`, `POST /api/Appeal/{id}/accept`, `POST /api/Appeal/{id}/deny`, `POST /api/Appeal/{id}/undo-deny`.
  - Commit: `feat(backend): appeal API endpoints`

---

### Task 9 — Subject ECTS and student dashboard endpoint

- **9.1** Add `EctsPoints INT NOT NULL DEFAULT 6` to the Subject entity (it is called `ECTS` currently — keep that column name or rename to `EctsPoints`; pick one and be consistent). **You:** generate migration — `dotnet ef migrations add SubjectEctsDefault`. Then `dotnet ef database update`.
  - Commit: `feat(db): migration for Subject ECTS default`
- **9.2** Add `GET /api/Student/me/dashboard` returning: student profile, study stats (average grade one-decimal, passed count, non-passed count, earned ECTS), list of subjects with per-subject fields (`subjectName, professorName, finalGrade?, status, appealStatus?, canWriteAppeal, canConfirmGrade, confirmationDeadline?, pendingAppealId?`).
  - Commit: `feat(backend): student dashboard aggregate endpoint`
- **9.3** Add `GET /api/Professor/me/dashboard` returning: list of subjects, each with its enrolled students and their current grade / draft / appeal state. Plus a separate `appeals: [...]` section with Pending + Overdue appeals across all the professor's subjects.
  - Commit: `feat(backend): professor dashboard aggregate endpoint`

---

### Task 10 — Seed rewrite

- **10.1** Rewrite `backend/StudentPortal/Migrations/seed.sql` for the new schema: 15 Users (1 admin / 4 professors / 10 students), ~15 Subjects (ECTS 6), ~30 Enrollments, ~20 Grades across every state (confirmed-final / inside window / pending appeal / accepted-awaiting-reconfirm / denied-inside-undo / overdue + follow-up), ~3 Drafts. Shared plaintext password `Password123!`, hashed with the existing PBKDF2 handler.
  - Commit: `feat(db): rewrite seed.sql for 5-field grading schema`
- **10.2** **You:** run `psql -U postgres -d StudentPortal -f backend/StudentPortal/Migrations/seed.sql` to populate the local DB.

---

### Task 11 — Frontend architecture foundation

- **11.1** Install new dev dependencies: `zod`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`, `react-toastify`, `babel-plugin-react-compiler`.
  - Commit: `chore(frontend): add zod, vitest, msw, react-toastify, react-compiler`
- **11.2** Create `src/config/constants.ts` with `APP_ROUTES` and `API_ROUTES` enums. Replace route string literals across the codebase.
  - Commit: `refactor(frontend): centralize routes in APP_ROUTES and API_ROUTES`
- **11.3** Create `src/lib/navigation.ts` (navigation singleton), `src/lib/auth.ts` (`clearAuthSession`, `withAuthRedirect`, `getRedirectTarget`).
  - Commit: `feat(frontend): add navigation singleton and auth lib helpers`
- **11.4** Create `src/shared/api/axiosClient.ts` (singleton with `withCredentials: true`, response interceptor for silent 401 refresh with `_retry` + a serialized `refreshPromise`, force-logout on 403 or refresh failure) + `src/shared/api/index.ts` barrel. Delete `src/services/api/apiClient.ts`.
  - Commit: `feat(frontend): axios singleton with silent refresh and cookie auth`
- **11.5** Create `src/providers/router.tsx` with `createBrowserRouter` + `src/providers/authGuard.tsx`. Replace `src/routes/index.tsx` and `src/components/common/ProtectedRoute.tsx`. Wire `<RouterProvider router={router}/>` in `main.tsx`.
  - Commit: `refactor(frontend): adopt createBrowserRouter and AuthGuard provider`
- **11.6** Create `src/components/shared/RoleGate.tsx` for role-restricted children.
  - Commit: `feat(frontend): add RoleGate component`
- **11.7** Create `src/components/ui/Modal.tsx` (reusable modal built on Bootstrap `.modal` classes, backdrop blur via inline style, controlled by `open` + `onClose`).
  - Commit: `feat(frontend): reusable Modal component`
- **11.8** Create `src/test/setup.ts` and `src/test/server.ts` (MSW 2 server with `onUnhandledRequest: 'error'`, handlers that emit `Set-Cookie` headers for `sp_access` / `sp_refresh`). Update `vite.config.ts` to enable React Compiler via `babel-plugin-react-compiler` and point Vitest at `src/test/setup.ts`.
  - Commit: `chore(frontend): wire Vitest, MSW, and React Compiler`
- **11.9** Add `.env.development` (`VITE_API_BASE_URL=/api`) and `.env.production` (placeholder). Add `server.proxy['/api']` in `vite.config.ts` → `https://localhost:7253`.
  - Commit: `chore(frontend): add env-driven API base URL and dev proxy`
- **11.10** Create `src/features/auth/`, `src/features/user/`, `src/features/subjects/`, `src/features/grades/`, `src/features/appeals/`, each with `api/ components/ models/ pages/ utils/ index.ts` subfolders (hooks subfolder only in features that need data-fetching custom hooks).
  - Commit: `refactor(frontend): add feature-sliced folder scaffolding`

---

### Task 12 — User store rewrite (no JWT in JS)

- **12.1** Create `src/store/user/useUserStore.ts` with `currentUser: User | null`, `isHydrating: boolean`, `setCurrentUser`, `clearCurrentUser`, `setHydrating`. Export `USER_ROLES` const-object + `UserRole` type. Delete `src/store/authStore.ts` and `src/models/Enums.ts`.
  - Commit: `refactor(frontend): replace authStore with useUserStore (no JS-visible token)`

---

### Task 13 — App.tsx bootstrap

- **13.1** Rewrite `src/App.tsx` with three bootstrap `useEffect`s: (1) register navigate singleton, (2) `GET /api/Account/Me` to hydrate `currentUser` (on 401 leave null — public pages still work), (3) session-mismatch effect (when `currentUser` goes null while on a protected route, navigate to login). No `exp` auto-logout timer (server owns the clock).
  - Commit: `feat(frontend): three bootstrap useEffects for session hydration`

---

### Task 14 — Login page

- **14.1** Create `src/features/auth/utils/loginSchema.ts` with Zod schema and types.
  - Commit: `feat(auth): login schema and types`
- **14.2** Create `src/features/auth/api/authService.ts` with `login(dto, signal)`, `logout(signal)`, `me(signal)`.
  - Commit: `feat(auth): auth service calls`
- **14.3** Rewrite `src/features/auth/pages/LoginPage.tsx` using manual `useState`, Zod `safeParse`, show errors only on `touched[field]`, submit, set user via store, navigate to role dashboard. Use existing Bootstrap classes. Keep `console.log` out of production.
  - Commit: `feat(auth): login page with Zod validation`
- **14.4** Delete the old `src/pages/login/LoginPage.tsx`.
  - Commit: `chore(frontend): remove old LoginPage location`

---

### Task 15 — Home page cleanup

- **15.1** Edit `src/pages/HomePage.tsx`: remove the centre-page "Prijavi se / Login" button; keep only hero copy + three feature cards. Translate any remaining Serbian strings.
  - Commit: `refactor(home): remove duplicate login button and finish English copy`

---

### Task 16 — Navbar + active-link highlight

- **16.1** Edit `src/components/ui/Navbar.tsx`: remove the "Students" link; replace `<Link>` with `<NavLink>` to get `.active` styling on the current route; translate Serbian strings; wire logout through the new user store and `/api/Account/Logout`.
  - Commit: `refactor(navbar): remove Students link, highlight active route, English copy`

---

### Task 17 — Student dashboard

- **17.1** Create data-fetching custom hook `src/features/user/hooks/useStudentDashboard.ts` using the auto-fetch + AbortController pattern.
  - Commit: `feat(student): useStudentDashboard data hook`
- **17.2** Rewrite `src/pages/dashboard/StudentDashboardPage.tsx`: My Information card, Study Statistics (Average Grade with one decimal, Passed Exams, Non-passed Exams, Earned ECTS), Subjects table (Subject, Professor, Final grade, Status, Action). Remove the "Show all grades" button entirely. Delete the old inline fetching from authStore.
  - Commit: `feat(student): dashboard with stats and per-subject action buttons`
- **17.3** Add the **Write appeal** button next to each subject's final grade when `canWriteAppeal` is true; opens the reusable Modal with a textarea (max 1000 chars) and blurred backdrop. Submit calls `appealService.submit()` and refreshes the dashboard.
  - Commit: `feat(student): write appeal modal`
- **17.4** Add the **Confirm grade** button when `canConfirmGrade` is true; posts to `POST /api/Grade/student-confirm` and refreshes.
  - Commit: `feat(student): student-side confirm grade button`
- **17.5** Delete `src/pages/students/StudentsPage.tsx` and its route.
  - Commit: `chore(student): remove Students page`

---

### Task 18 — Professor dashboard (grading UI)

- **18.1** Create data-fetching custom hook `src/features/grades/hooks/useProfessorDashboard.ts`.
  - Commit: `feat(professor): useProfessorDashboard data hook`
- **18.2** Rewrite `ProfessorDashboardPage.tsx` layout: three columns (My Subjects, Students in <subject>, Grade for <student>) plus an Appeals section below.
  - Commit: `feat(professor): three-column dashboard layout`
- **18.3** Grading panel for selected student: 5 number inputs (step 0.5, correct maxes), live-computed sum + final grade preview, **Save draft** button, **Confirm** button (only visible when all 5 filled). Draft loads from `GET /api/GradeDraft/{enrollmentId}` on student select.
  - Commit: `feat(professor): 5-field grading panel with draft support`
- **18.4** Read-only variant: when a grade is confirmed, the panel shows the 5 values as disabled inputs plus the final grade.
  - Commit: `feat(professor): read-only confirmed grade display`
- **18.5** Accepted-appeal variant: collapsed summary line for midterms/attendance/practical, editable exam input, Confirm re-enabled.
  - Commit: `feat(professor): accepted-appeal re-grade exam UI`
- **18.6** Appeals section: list of Pending + Overdue appeal rows with **View appeal** button; opens the reusable Modal showing overdue history (`[OVERDUE] text`, grey) + current Pending text + Accept / Deny buttons. Deny shows a confirm sub-step.
  - Commit: `feat(professor): appeals list with view/accept/deny modal`
- **18.7** Deny undo: inside the Accept/Deny modal post-deny (and in the appeals list row), show a 24h countdown and an **Undo** button that posts to `POST /api/Appeal/{id}/undo-deny`.
  - Commit: `feat(professor): 24h deny-undo button`

---

### Task 19 — Admin dashboard polish

- **19.1** Add show/hide password toggle (inline SVG eye icon) to `UserCreateForm.tsx` only. Edit form has no password field.
  - Commit: `feat(admin): show/hide password toggle on user create`

---

### Task 20 — Responsiveness

- **20.1** Add a reusable `ResponsiveTable` or table-to-cards CSS utility. For each admin table (Users, Subjects, Enrollments): hide the `<table>` below `md`, show a stack of card rows with the same data (one card per row, scrollable page).
  - Commit: `feat(responsive): admin tables collapse to cards below md breakpoint`
- **20.2** For the student dashboard subjects table and the professor dashboard students / appeals lists: hide the table below `sm`, show stacked cards.
  - Commit: `feat(responsive): student/professor views collapse to cards below sm`
- **20.3** QA pass at 320 px, 375 px, 414 px, 576 px, 768 px, 992 px. Fix any overflow / cramped layout. **You:** manually eyeball at each breakpoint in Chrome devtools and screenshot anything that still looks wrong.
  - Commit: `fix(responsive): QA fixes at 320–992px breakpoints`

---

### Task 21 — Toast integration

- **21.1** Mount `<ToastContainer>` from `react-toastify` in `App.tsx`. Import the CSS in `main.tsx`.
  - Commit: `chore(frontend): mount react-toastify ToastContainer`
- **21.2** Fire a toast on login error, logout, appeal submit success, appeal submit error, confirm grade success, deny undo success.
  - Commit: `feat(frontend): user-facing toasts for key actions`

---

### Task 22 — Tests

- **22.1** Backend xUnit tests for `AuthService` (login happy / wrong password / soft-deleted / unknown-email latency), `AppealService` (submit inside window / outside window / overdue / pause math / undo), `GradeService` (confirm → final grade computation / reconfirm after accept).
  - Commit: `test(backend): unit tests for auth, appeal, and grade services`
- **22.2** Frontend Vitest + MSW tests for `axiosClient` (silent refresh happy/failure), `LoginPage` (validation gates submit), `authGuard`, `App.tsx` bootstrap effects.
  - Commit: `test(frontend): axios interceptor, login, authGuard, bootstrap tests`

---

### Task 23 — README update

- **23.1** Update root `README.md` with: project description, local setup (`dotnet user-secrets` steps, `psql seed.sql`, `npm install`, dev proxy), tech stack, and deployment notes for Render (env vars list, cookie `Secure` requirement, HTTPS redirect).
  - Commit: `docs: update README with setup and deploy notes`

---

## 10. Out of scope (so there is no ambiguity)

- Rate limiting on `/Login`.
- Account lockout on failed logins.
- CSRF double-submit cookie (SameSite=Strict is the mitigation).
- Password hash upgrade (PBKDF2 stays).
- Email change / password reset flows.
- Email notifications of any kind.
- WebSocket / real-time updates (deny-undo countdown is client-side `setInterval`).
- Multi-language UI (English only).
- Pagination (seed is tiny).
- Audit log tables.
- GDPR / data export.
- Open-registration flow for students (admin creates every user for v1).
