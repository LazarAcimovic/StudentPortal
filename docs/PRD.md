# Product Requirements — StudentPortal

> This document is the **source of truth for product behaviour**. It intentionally does not describe code, tables, API shapes, or libraries — those live in `Tech.md`, `DB.md`, and `UI.md`.

---

## 1. One-line summary

StudentPortal is an internal web app for a university faculty where **Admins** manage users / subjects / enrollments, **Professors** enter grades for the students enrolled in their subjects, and **Students** see their grades and can either accept them or appeal within a bounded window.

---

## 2. Actors and what each one can do

**No public self-registration.** An Admin creates every user account (students, professors, and other admins). Any authenticated user can edit their own name and change their own password on `/profile` (see §5.9 and §5.10); Admin additionally can edit own `Email` on `/profile`.

### 2.1 Admin
- Log in / log out.
- Manage users: create (student, professor, or admin), edit any user **except himself** (first name, last name, email, index number when target is a student, role, soft-delete flag), soft-delete via the `IsDeleted` checkbox.
- Admin's own row in the Users table has **no** Edit button — he uses `/profile` for his own fields and `/profile/change-password` for his own password.
- When editing a target that is another Admin, the `UserRole` dropdown and `IsDeleted` checkbox are **hidden** (admins cannot demote or soft-delete each other).
- When editing a target that is a Professor, the `IndexNumber` field is hidden (professors do not have an index number).
- Manage subjects: create (name, ECTS defaults to 6, assigned professor), edit, delete.
- Manage enrollments: create (student + subject pair), delete.
- Edit **own** `FirstName`, `LastName`, `Email`, and password (via `/profile` and `/profile/change-password`). Cannot change own `UserRole` or `IsDeleted`.
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
- Edit **own** `FirstName`, `LastName`, and password (via `/profile` and `/profile/change-password`). Cannot change own `Email`, `UserRole`, or `IsDeleted` — those are admin-only.

### 2.3 Student
- Log in / log out.
- See their own dashboard: personal info, study statistics, per-subject rows with final grade / status / professor / action buttons.
- During the 7-day appeal window after a professor confirms: either click **Write appeal** or click **Confirm grade** (meaning "I agree, lock it in now").
- Submit **one** appeal per grade confirmation cycle. If a prof misses the 7-day review deadline on that appeal, the student can submit **one more** appeal (see §4.4).
- Cannot see any other student's data.
- Edit **own** `FirstName`, `LastName`, and password (via `/profile` and `/profile/change-password`). Cannot change own `Email`, `IndexNumber`, `UserRole`, or `IsDeleted` — those are admin-only.

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

**Once the student submits an appeal, both buttons disappear and the 7-day action window no longer applies.** The grade is held open by the Pending appeal; the only path forward is the professor's review (accept / deny) or the appeal going Overdue (§4.5), which starts a brand-new 7-day action window.

While the grade is in the initial 7-day window and the student has not yet acted, the status column shows **"Awaiting confirmation"**.

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
- For **24 hours** after denial, the professor's dashboard shows an **Undo deny** button next to that appeal with a countdown. Clicking Undo returns the appeal to `Pending` and un-finalizes the grade (`FinalizedAt` back to NULL). The student's view flips back to "Appeal pending" (no buttons — see §4.1). The professor's own 7-day review clock does **not** reset on undo; it still counts from the appeal's original `SubmittedAt`, so if the undo happens after day 7 of the appeal's life the appeal immediately reads as Overdue on the next request (§4.5).

### 4.5 Overdue (professor forgets)
- A Pending appeal that has not been accepted or denied within **7 days of its submission** is treated as `Overdue`.
- Overdue is **computed on read** — no background job flips rows.
- The grade does not finalize while an Overdue appeal exists.
- The student's dashboard shows **Write appeal** again, with a fresh 7-day window starting from the moment the appeal went overdue.
- The student can submit one more appeal; the first overdue one stays in the DB as audit.
- A professor **cannot** accept or deny an overdue appeal (the Accept/Deny buttons are not rendered for overdue entries in the View appeal modal).

### 4.6 Student's 7-day action window — when it applies

There is one rule, no pause / resume math:

- **Fresh grade:** the window is 7 calendar days from `Grade.ConfirmedAt`.
- **After an appeal went Overdue (§4.5):** a brand-new 7-day window from the overdue moment; the student can submit one more appeal.

The window is **only active when the grade has no Pending or Accepted-awaiting-reconfirm appeal**. The moment the student submits an appeal, the window stops applying — the grade is held open by the appeal itself until the professor reviews it or the appeal goes Overdue.

What ends the window:

| Trigger | Effect |
|---|---|
| Student clicks **Confirm grade** | Grade is immediately truly final (§4.7). ECTS counts. |
| Student clicks **Write appeal** (fresh or post-overdue) | Grade stays open until the professor accepts, denies, or the new appeal goes Overdue. The window becomes irrelevant for the duration of the Pending appeal. |
| Window silently expires (7 days of silence on the initial window) | Grade is auto-finalized on day 8, same effect as if the student had clicked Confirm grade (per Q28). |
| Post-overdue window silently expires | Grade stays open — no auto-finalize. A grade with an overdue chain is only closed by a professor's accept/deny on a subsequent student appeal (per Q53). |

What the student sees during each state:

| Grade state | Student dashboard status | Action buttons |
|---|---|---|
| Fresh confirm, window live | 🟡 Awaiting confirmation | **Write appeal** + **Confirm grade** |
| Pending appeal (initial or post-overdue) | 🔵 Appeal pending | *(none)* |
| Appeal denied, grade truly final | 🟢 Passed / 🔴 Failed + 🔴 Appeal denied badge | *(none)* |
| Appeal accepted, prof hasn't re-confirmed yet | 🔵 Appeal pending | *(none)* |
| Overdue chain, window live | 🟡 Awaiting confirmation | **Write appeal** (fresh window) |
| Truly final (any route) | 🟢 Passed / 🔴 Failed | *(none)* |

### 4.7 Earned ECTS rule
A grade contributes its subject's ECTS to **Earned ECTS** only when the grade is **truly final** AND the final grade is ≥ 6. A grade becomes truly final in exactly these cases:
1. The student clicks **Confirm grade**.
2. 7 days pass with no student action on the **initial** window (no pending appeal has ever been submitted). This path does not apply to the post-overdue window — see §4.6.
3. The professor denies the appeal (ECTS counts from the deny moment; the 24-hour undo window flicks it off if used — see §4.4).
4. The professor accepts the appeal and re-confirms the exam points.

---

## 5. Screen inventory

### 5.1 Public home screen (`/`)
- Hero section with title and tagline.
- **One** login call-to-action — the Navbar `Login` link only. The centre-of-page "Prijavi se" button is removed.
- Feature cards below (as they are today, translated to English).

### 5.2 Login screen (`/login`)
- Email + password form, both required, email format validated, password shown as masked by default, with an show/hide eye icon. Click on that eye icon shows/hide the currently entered password
- Submit → on success, the server sets auth cookies and the SPA redirects to the role's dashboard.
- Serbian localized strings are replaced with English.

### 5.3 Admin dashboard (`/admin-dashboard`)
Three tabs: **Users**, **Subjects**, **Enrollments**.

- Users tab: table with ID, First Name, Last Name, Email, Role, Status (Active/Inactive from `IsDeleted`), Edit button. Above: **Create New User** button.
- **Admin's own row has no Edit button rendered.** He uses `/profile` for self-service edits.
- **Create User modal** uses `<UserCreateForm>`: first name, last name, email, role (dropdown), index number (shown only when role=Student), password with show/hide toggle.
- **Edit User modal** uses the reusable `<UserEditForm>` with `scope='admin'`. Rendered fields depend on the target's role (see field matrix in §5.9 and the component spec in `UI.md` §9.6): Email is always editable; IndexNumber shows only if target is Student; UserRole dropdown and IsDeleted checkbox are hidden when target is another Admin.
- Subjects tab: table with name, ECTS, professor, Edit button + Create button.
- Enrollments tab: table with student, subject, Delete button + Create button.
- Responsiveness: at <768 px (`md` breakpoint) each table becomes a vertical stack of scrollable cards.

### 5.4 Professor dashboard (`/professor-dashboard`)
Three columns on desktop:
1. **My Subjects** — selectable list.
2. **Students in <subject>** — selectable list of students enrolled in the selected subject.
3. **Grade for <student>** — the grading UI (see §3.3 and §5.6 below).

Below those columns, an **Appeals** section listing every Pending or Overdue appeal across all the professor's subjects. Each row has a **View appeal** button opening the appeal modal (see §4.2).

The Appeals section is **vertically scrollable** when the list gets long — the section wraps its table in a container with a fixed `max-height` (desktop target: ~360 px, roughly 6 rows) and `overflow-y: auto`, so a professor with many open appeals sees a scrollbar inside the section rather than the appeals pushing the rest of the page off-screen. The section header stays sticky at the top of the scroll area so the column labels remain visible while scrolling. On mobile (where the table collapses to stacked cards, see below) the same fixed-height + overflow-y rule applies — the whole card stack scrolls inside its container.

Responsiveness: at <576 px (`sm` breakpoint) the three columns stack vertically and the Appeals list becomes stacked cards.

### 5.5 Student dashboard (`/student-dashboard`)
- **My Information**: name, email, index number.
- **Study Statistics**: four stat tiles — Average Grade (two decimal place, mean of all confirmed-passed grades, failures excluded), Passed Exams (count), Non-passed Exams (count of failures AND un-graded enrollments), Earned ECTS (sum from truly-final passed grades per §4.7).
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
A single generic Modal component is used for: appeal submission, view appeal, admin confirmations (delete user etc.), the deny-confirmation step, and the self-service Edit profile modal (see §5.9). Appeal and view-appeal modals have a blurred backdrop (`backdrop-filter: blur`).

### 5.9 My Profile page (`/profile`)
Accessible to **any authenticated user** (Student, Professor, Admin) — role-agnostic route behind `<AuthGuard>`. The page shows:

- Page heading `<h1>My Profile</h1>` and the owner's full name.
- A read-only **"Your Info"** card listing: First Name, Last Name, Email, IndexNumber (Student only), Role, Member since (CreatedAt).
- Two buttons below the card:
  - **[Edit profile]** — primary. Opens the reusable `<Modal>` (§5.8) containing `<UserEditForm scope='self'>`. On save, the modal closes and the Your Info card refreshes.
  - **[Change password]** — outline-primary. Navigates to `/profile/change-password` (§5.10).

**Edit profile modal field visibility — reusable `<UserEditForm>` matrix:**

| Field | Self + Student/Professor | Self + Admin | Admin → Student | Admin → Professor | Admin → Admin |
|---|---|---|---|---|---|
| FirstName | ✓ editable | ✓ editable | ✓ editable | ✓ editable | ✓ editable |
| LastName | ✓ editable | ✓ editable | ✓ editable | ✓ editable | ✓ editable |
| Email | *hidden* | ✓ editable | ✓ editable | ✓ editable | ✓ editable |
| IndexNumber | *hidden* | *hidden* | ✓ editable | *hidden* | *hidden* |
| UserRole | *hidden* | *hidden* | ✓ dropdown | ✓ dropdown | *hidden* |
| IsDeleted | *hidden* | *hidden* | ✓ checkbox | ✓ checkbox | *hidden* |

**Save semantics (self scope):** clicking **Save Changes** inside the modal calls `PUT /api/Account/profile` with only the fields the form rendered. All DTO fields are optional; **missing fields are preserved from the stored row** (not nulled out). Empty-string values fail validation (FirstName and LastName must be non-empty). Server guard: if the caller is **not** Admin and `Email` is present and differs from the stored row → `403 Forbidden`.

**Save semantics (admin scope):** `Save Changes` calls `PUT /api/User/{id}` with the fields the form rendered. Admin cannot soft-delete himself or demote himself; the backend returns `403` even if the UI is bypassed.

### 5.10 Change password page (`/profile/change-password`)
Accessible to **any authenticated user** behind `<AuthGuard>`. Separate URL (not a modal) because it is a security-sensitive flow with its own success path (sign-out-everywhere + redirect to login).

- Page heading `<h1>Change Password</h1>` and a brief hint ("You will be signed out of all sessions after a successful change.").
- Form with three password fields, each paired with a show/hide eye icon toggle:
  - **Current password** — required.
  - **New password** — required, 12–128 characters.
  - **Confirm new password** — required, must equal New password.
- Buttons: **[Change password]** (primary submit) + **[Cancel]** (link back to `/profile`).

**Submit flow:**
1. SPA calls `POST /api/Account/change-password` with `ChangePasswordDto { CurrentPassword, NewPassword }`.
2. Backend verifies CurrentPassword against the stored hash. If wrong → `400` with a field error.
3. Backend writes the new hash (same PBKDF2 handler) and calls `RefreshTokenRepository.RevokeAllForUserAsync(callerId)` → **every refresh row for the user is revoked**, including the one the current browser is using.
4. Backend clears `sp_access` and `sp_refresh` cookies in the response.
5. SPA receives `204`, calls `clearAuthSession({ redirectToLogin: true })`, and shows a success toast on the login page: *"Password changed — please sign in with your new password."*

---

## 6. Security requirements (basic / junior scope)

- **No public self-registration.** The user base is managed entirely by Admins. There is no `/register` endpoint, no `RegisterStudentDto`, no public sign-up form.
- All non-auth endpoints require authentication.
- Admin-only endpoints enforce the Admin role via a controller/action attribute.
- Professor-only endpoints enforce the Professor role plus a service-level ownership check (professor can only touch grades, drafts, and appeals on their own subjects).
- Student-only endpoints enforce the Student role plus a service-level ownership check (student can only touch their own enrollments, grades, and appeals).
- Self-service profile edit (`PUT /api/Account/profile`) is role-agnostic authenticated. Server guard: non-Admin callers cannot change their own `Email`; attempting to send a different Email returns `403`.
- Password change (`POST /api/Account/change-password`) requires the correct current password. On success, every refresh row for the user is revoked (sign-out-everywhere, including the current session), the SPA is redirected to `/login`, and the user re-authenticates with the new password.
- Admin cannot soft-delete himself or demote himself; backend returns `403` even if the frontend UI is bypassed.
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
  - Commit: ` (i18n): translate frontend UI strings from Serbian to English`

---

### Task 1 — Documentation baseline

- **1.1** Create `docs/PRD.md`, `docs/Tech.md`, `docs/DB.md`, `docs/UI.md`, and `AGENTS.md` (this task).
  - Commit: `docs: add PRD, Tech, DB, UI, and AGENTS source-of-truth files`

---

### Task 2 — Secrets removal and `.env` for production

- **2.1** Add `appsettings.Local.json`, `.env`, `.env.local`, `.env.*.local` to `.gitignore`.
  - Commit: ` (gitignore): exclude local env and appsettings files`
- **2.2** Remove `JwtConfig:Key` and the DB password from `appsettings.json`. Keep only the Issuer, Audience, token lifetimes, and empty connection string shell.
  - Commit: `security(backend): remove JWT key and DB password from appsettings`
- **2.3** Add a `UserSecretsId` to `StudentPortal.csproj`. **You:** run `dotnet user-secrets init` (idempotent), then `dotnet user-secrets set "JwtConfig:Key" "$(openssl rand -base64 64)"` and `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=StudentPortal;Username=postgres;Password=postgres"`.
  - Commit: ` (backend): enable user-secrets for local dev`
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

- **4.1** Replace the legacy `UserCreateDto` with `AdminCreateUserDto` (admin-only; role allowed; no `IsDeleted` from client). Replace the legacy `UserUpdateDto` with two DTOs: `UpdateProfileDto` (self-service — `FirstName?`, `LastName?`, `Email?`, all optional, missing fields preserved on write) and `AdminUpdateUserDto` (admin-only — `FirstName`, `LastName`, `Email`, `IndexNumber?`, `UserRole`, `IsDeleted`). Add `ChangePasswordDto` (`CurrentPassword`, `NewPassword`). Delete the old `UserCreateDto` and `UserUpdateDto`. **No `RegisterStudentDto`** — there is no public self-registration.
  - Commit: `security(backend): add admin, profile, and change-password DTOs and remove legacy user DTOs`
- **4.2** Update `MappingProfile` to ignore protected fields (`Id`, `PasswordHash`, `UserRole`, `IsDeleted`, `CreatedAt`) on self-service maps.
  - Commit: `refactor(backend): tighten AutoMapper profile for user DTOs`
- **4.3** In `UserRepository`, add `GetUserByIdForUpdateAsync` returning a tracked entity. In `UserService`, implement `UpdateProfileAsync(callerId, UpdateProfileDto)` (copies only `FirstName`/`LastName`/`Email` into the row; preserves missing fields; if `callerRole != Admin` and `dto.Email` differs from stored row → throw `ForbiddenAccessException`) and `AdminUpdateUserAsync(targetId, callerId, AdminUpdateUserDto)` (service-level guards: cannot soft-delete self, cannot demote self, cannot change role of another admin). Both bypass `_mapper.Map(dto, entity)` on the whole entity.
  - Commit: `security(backend): copy only whitelisted fields when updating users and add admin self-guards`
- **4.4** In `UserController`, delete the generic `UpdateUser` action. Add `PUT /api/Account/profile` (self-service — reads caller id from the JWT; `[Authorize]`) and `PUT /api/User/{id}` (admin — `[Authorize(Roles="Admin")]`). Take `id` from the route; ignore any `Id` in the body.
  - Commit: `security(backend): separate self-service and admin user update endpoints`
- **4.5** Remove `IsDeleted` from `UserDto` and `LoginResponseDto` (internal state leak).
  - Commit: `security(backend): stop leaking IsDeleted in response DTOs`
- **4.6** Add `POST /api/Account/change-password` action on `AccountController` (`[Authorize]`). `UserService.ChangePasswordAsync(callerId, ChangePasswordDto)` verifies the current password with `PasswordHashHandler.VerifyPassword`, re-hashes the new password, writes the row, then calls `IRefreshTokenRepository.RevokeAllForUserAsync(callerId)`. Controller clears `sp_access` and `sp_refresh` cookies in the response, returns `204`.
  - Commit: `feat(backend): add change-password endpoint with sign-out-everywhere`

---

### Task 5 — FluentValidation

- **5.1** Add the `FluentValidation.AspNetCore` NuGet package. Register `AddFluentValidationAutoValidation()` in `Program.cs`.
  - Commit: `chore(backend): add FluentValidation.AspNetCore package`
- **5.2** Create `Validators/` folder. Write `LoginRequestDtoValidator`, `AdminCreateUserDtoValidator`, `UpdateProfileDtoValidator`, `AdminUpdateUserDtoValidator`, `ChangePasswordDtoValidator`. `UpdateProfileDtoValidator` must allow every field to be absent but, when present, enforce the same per-field constraints (FirstName/LastName 1–50 chars non-empty; Email format and 1–100 chars). `ChangePasswordDtoValidator` enforces `NewPassword` 12–128 chars; `CurrentPassword` non-empty.
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
- **8.5** `IAppealService` + `AppealService`: `SubmitAsync` (student, enforces the §4.6 action window + at most one Pending per cycle), `GetPendingForProfessorAsync`, `GetByGradeAsync` (returns full history incl. overdue), `AcceptAsync`, `DenyAsync`, `UndoDenyAsync` (only within 24h of ReviewedAt; does **not** reset the appeal's own 7-day review clock — overdue is still computed from original `SubmittedAt`). Overdue is computed on read, never stored.
  - Commit: `feat(backend): appeal service with overdue and undo-deny logic`
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
  - Commit: ` (frontend): add zod, vitest, msw, react-toastify, react-compiler`
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
  - Commit: ` (frontend): wire Vitest, MSW, and React Compiler`
- **11.9** Add `.env.development` (`VITE_API_BASE_URL=/api`) and `.env.production` (placeholder). Add `server.proxy['/api']` in `vite.config.ts` → `https://localhost:7253`.
  - Commit: ` (frontend): add env-driven API base URL and dev proxy`
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
  - Commit: ` (frontend): remove old LoginPage location`

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
  - Commit: ` (student): remove Students page`

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

- **19.1** Add show/hide password toggle (inline SVG eye icon) to `UserCreateForm.tsx` only. Edit form has no password field (admins never see or set another user's password; the owner changes their own password via `/profile/change-password`).
  - Commit: `feat(admin): show/hide password toggle on user create`
- **19.2** Refactor the admin Users table's Edit flow to use the reusable `<UserEditForm scope='admin'>` opened inside the shared `<Modal>`. Field visibility follows the §5.9 matrix (IndexNumber only for Student target; UserRole and IsDeleted hidden when target is Admin). **Admin's own row renders no Edit button**.
  - Commit: `feat(admin): reuse UserEditForm with role-driven field matrix`

---

### Task 19B — My Profile page and Change Password page

- **19B.1** Build the reusable `<UserEditForm>` component in `src/components/shared/UserEditForm.tsx` taking props `{ scope: 'self' | 'admin', user, callerRole, onSaved }`. Internally computes field visibility per the §5.9 matrix, renders Bootstrap `.form-control` / `.form-check` / `<select>` inputs, uses Zod `safeParse` for client-side validation, and dispatches to `PUT /api/Account/profile` (self scope) or `PUT /api/User/{id}` (admin scope).
  - Commit: `feat(user): reusable UserEditForm with per-scope field matrix`
- **19B.2** Add `src/features/user/api/profileService.ts` with `getMe(signal)`, `updateProfile(dto, signal)`, `changePassword(dto, signal)`. Add Zod schemas in `src/features/user/utils/profileSchemas.ts`.
  - Commit: `feat(user): profile and change-password service and schemas`
- **19B.3** Add `src/features/user/pages/MyProfilePage.tsx` at route `/profile` (behind `<AuthGuard>`): read-only "Your Info" card + `[Edit profile]` button (opens Modal with `<UserEditForm scope='self'>`) + `[Change password]` link to `/profile/change-password`.
  - Commit: `feat(user): My Profile page with edit modal and change-password link`
- **19B.4** Add `src/features/user/pages/ChangePasswordPage.tsx` at route `/profile/change-password` (behind `<AuthGuard>`): three password inputs with show/hide toggle, submit → `profileService.changePassword`, on success → `clearAuthSession({ redirectToLogin: true })` plus a success toast fired via `toast.success("Password changed — please sign in with your new password")` on the login page.
  - Commit: `feat(user): change-password page with sign-out-everywhere flow`
- **19B.5** Add a "My Profile" entry to the Navbar greeting dropdown (clicking the greeting opens a small menu: `My Profile`, `Logout`).
  - Commit: `feat(navbar): add My Profile dropdown entry`

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
- **21.2** Fire a toast on login error, logout, appeal submit success, appeal submit error, confirm grade success, deny undo success, profile save success, password change success (on redirected `/login`).
  - Commit: `feat(frontend): user-facing toasts for key actions`

---

### Task 22 — Tests

# Task: Create a Comprehensive Unit Test Suite Based on the PRD

Your task is to create a concise, maintainable, and reliable **unit test suite only** for this project. All tests must be derived from the Product Requirements Document (PRD), not from the existing implementation's behavior.

Follow the testing best practices described in this article:

https://milanjovanovic.tech/blog/unit-testing-best-practices-dotnet

## 1. Analyze the Requirements First

1. Locate and read the PRD and any relevant supporting documentation.
2. Extract all functional requirements, business rules, validation rules, authorization rules, and state transitions that can be tested at the unit level.
3. Treat the PRD as the single source of truth for expected behavior.
4. Do not infer expected behavior from the existing implementation. The implementation may contain bugs or contradict the PRD.
5. If a requirement is ambiguous, incomplete, or contradictory, document the ambiguity instead of inventing a rule.
6. Identify requirements that cannot be adequately verified through unit tests alone and document them as testing limitations. Do not create other types of tests to cover them.

Create a concise requirements traceability matrix mapping each relevant PRD requirement to its planned unit test scenarios.

## 2. Inspect the Existing Project

After identifying the expected behavior from the PRD, inspect the codebase to understand the project structure and determine how to test the requirements.

* Identify the existing test projects, testing frameworks, libraries, dependencies, and conventions.
* Identify the application's services, domain logic, validators, and other components containing business logic.
* Determine which methods and components are suitable for isolated unit testing.
* Reuse the existing testing infrastructure where appropriate.
* Avoid testing trivial DTOs, simple property assignments, framework behavior, or third-party library functionality.

Inspecting the implementation is necessary to determine how to exercise the application, but it must not influence the expected outcomes defined by the PRD.

## 3. Scope Restriction: Unit Tests Only

**Create unit tests exclusively. Do not create integration tests, API tests, or end-to-end tests.**

* Test individual methods, classes, and units of business logic in isolation.
* Use mocks, stubs, or substitutes for external dependencies, such as repositories, services, or other collaborators, where appropriate.
* Do not connect to a database, start the application or HTTP server, or depend on external services.
* Do not test EF Core, ASP.NET Core middleware, authentication infrastructure, or third-party framework behavior directly.
* Test application-level authorization and business rules when they can be verified by invoking the relevant unit in isolation.
* Do not mock the business logic that the test is intended to verify.
* If a requirement requires integration or end-to-end testing to be verified properly, document it as a limitation instead of creating that type of test.

## 4. Design Test Scenarios

For each applicable business rule and functional requirement, consider the following scenarios:

* **Happy paths:** valid operations that should succeed.
* **Unhappy paths:** invalid operations, rejected operations, exceptions, and business rule violations.
* **Edge cases:** boundary values, empty collections, missing or null data where applicable, duplicate operations, and state-transition boundaries.
* **Authorization and ownership:** attempts to access or modify resources belonging to another user, insufficient permissions, and invalid caller identities where applicable to the unit under test.
* **Time-dependent behavior:** deadlines, expiration windows, and exact boundary conditions.
* **Data and state integrity:** correct state transitions, calculated values, and returned results.

For time-dependent logic, test the exact boundary conditions, such as immediately before a deadline, exactly at the deadline, and immediately after it, wherever relevant to the PRD.

Do not create redundant tests merely to increase the test count. Prioritize meaningful scenarios that verify distinct behaviors.

Use parameterized tests when multiple input values exercise the same logical behavior and can share a clear, concise test structure.

## 5. Follow Unit Testing Best Practices

Apply the principles described in the referenced article:

* Structure tests using Arrange, Act, Assert (AAA).
* Use descriptive test names following a consistent convention, such as `MethodName_Scenario_ExpectedResult`.
* Keep tests concise, readable, isolated, deterministic, repeatable, and self-validating.
* Verify one logical behavior per test.
* Test observable behavior rather than implementation details or internal call sequences.
* Mock or substitute external dependencies only when appropriate.
* Avoid excessive mocking, brittle assertions, unnecessary abstractions, and duplicated setup.
* Use test data builders or focused helper methods when they improve readability and reduce duplication.
* Avoid tests that depend on execution order, real-time delays, shared mutable state, production data, or external services.
* Use controlled time or an appropriate time abstraction for time-dependent tests wherever possible.
* Use clear, domain-specific assertions and meaningful failure messages.
* Follow existing project conventions unless they conflict with these principles.

Do not aim for 100% code coverage at the expense of meaningful tests. Prioritize business rule coverage and the ability of tests to detect incorrect behavior.

## 6. Implement the Unit Tests

Implement the unit test suite based on the requirements traceability matrix and the approved test strategy.

* Use the testing framework and libraries appropriate for the project's existing .NET version and architecture.
* Prefer existing dependencies and conventions over introducing unnecessary new libraries.
* Add tests to the appropriate existing test project, or create a dedicated unit test project if necessary.
* Keep production code unchanged during test implementation.
* Do not change production code, business rules, the PRD, or existing assertions merely to make tests pass.
* Do not weaken assertions, skip failing tests, or change expected results to match the current implementation.
* Do not create integration, API, or E2E tests under any circumstances as part of this task.

If the current architecture makes a unit difficult to test, document the issue and suggest a possible improvement, but do not refactor production code without my approval.

## 7. Execute and Evaluate the Tests

Run the unit test suite and report the actual results.

For every failing test, provide:

1. The fully qualified test name.
2. The related application method or component, where identifiable.
3. The PRD requirement that the test verifies.
4. The expected result according to the PRD.
5. The actual result and the relevant failure message or stack trace.
6. The likely root cause, clearly distinguishing confirmed findings from hypotheses.
7. A concrete, ordered remediation plan explaining how you propose to fix the problem.
8. The files and methods you expect to modify during the proposed fix.

Distinguish between:

* An application implementation defect.
* A defect in the test itself.
* An environment, configuration, or dependency problem.
* An ambiguous or conflicting requirement.

A failing test does not automatically mean that the application code is wrong. Investigate the evidence before drawing a conclusion.

Do not claim that a test passed unless you actually executed it and observed the result. If a test cannot run, report it as blocked and explain why.

## 8. Stop Before Fixing Production Code

If any tests fail, **do not modify production code to fix them yet**.

First, present the test results, identify the affected application methods, explain the discrepancies against the PRD, and provide a concrete, step-by-step remediation plan.

Wait for my explicit approval before implementing any production-code fixes.

If you discover a defect in a test itself, explain the problem and the proposed correction. Do not alter a test's expected behavior merely to match the current implementation.

After I approve a remediation plan, apply only the approved production-code changes, rerun the relevant unit tests, and report the final results.

## 9. Final Report

Provide a concise report containing:

* The test project and framework used.
* The number of unit tests added.
* The actual number of passing, failing, and blocked tests.
* The PRD requirements covered and any uncovered requirements.
* The happy-path, unhappy-path, and edge-case scenarios covered.
* Any discrepancies between the PRD and the current implementation.
* The names of failing tests and their associated application methods.
* The proposed remediation steps for each confirmed or suspected implementation defect.
* Any requirements that could not be fully verified through unit testing.
* Any environment limitations or unresolved ambiguities.

Do not report code coverage unless you actually measured it. If measured, report it as supplementary information rather than the primary measure of test quality.

## 10. Execution Order

Follow this order strictly:

1. Read and analyze the PRD.
2. Create the requirements traceability matrix.
3. Inspect the codebase and existing test infrastructure.
4. Present the proposed unit test strategy and identify ambiguities.
5. Implement the unit tests without changing production code.
6. Run the unit tests.
7. Report the results, identify failing application methods, and propose a remediation plan.
8. Stop and wait for my explicit approval before fixing production code.

**Start with steps 1–4. Do not modify any files until you have presented the initial analysis and proposed test plan for my review.**


---

### Task 22a — Backend integration tests (Testcontainers + WebApplicationFactory)

# Task: Create a High-Quality Integration Test Suite for the Backend

Your task is to create a reliable, maintainable **integration test suite only** for the backend. Follow the best practices described in this article:

https://milanjovanovic.tech/blog/testcontainers-best-practices-dotnet-integration-testing

## 0. Non-negotiable rule — PRD is the source of truth

**All tests MUST be derived from the PRD, Tech.md, DB.md, and UI.md — never from the current implementation's behaviour.**

* The implementation may contain bugs or contradict the PRD. Tests exist to catch exactly that.
* If a test's expected outcome and the implementation disagree, the **test wins** by default; the discrepancy is reported as a suspected production defect per §10.
* Do not weaken an assertion, skip a test, or change an expected result to match what the code currently does.
* If a PRD requirement is ambiguous, incomplete, or contradictory, document the ambiguity in the strategy phase (§11 step 4) and stop for direction. Do not invent a rule.
* Inspecting the implementation is allowed only to understand *how to invoke* each unit (routes, DTOs, DbContext shape), never to decide *what the expected behaviour is*.

## 1. Analyze the Requirements First

1. Read the PRD (§2 actors, §3 grading model, §4 appeal flow, §5 screens, §6 security, §7 seeding), `docs/Tech.md`, and `docs/DB.md`.
2. Extract every functional requirement, business rule, authorization rule, state transition, and time-dependent rule that can be verified **end-to-end through the HTTP layer** against a real Postgres database.
3. Produce a concise requirements traceability matrix mapping each covered PRD rule to its planned integration test(s). Present it in the strategy phase for review before implementation.

## 2. Scope: Integration Tests Only

**Integration tests exclusively. No unit tests, no E2E/browser tests, no load tests.** Each test:

* Boots the real API in-process via `WebApplicationFactory<Program>`.
* Hits a real Postgres instance managed by Testcontainers.
* Exercises the real auth stack (cookies, JWT, FluentValidation pipeline, EF Core, migrations).

Covered areas (all four, plus any other backend behaviour verifiable at this layer):

* **Auth and user flows** — Login, Refresh (rotation + re-use detection), Logout, Me, Change password + sign-out-everywhere (every refresh row revoked, old `sp_refresh` cookie no longer refreshes), Profile self update (`PUT /api/Account/profile` — missing fields preserved, non-admin cannot change Email → 403), Admin user CRUD (`PUT /api/User/{id}` — cannot soft-delete self, cannot demote self, cannot change role of another admin → 403), role-based 401/403 matrix, cookie semantics on login response (httpOnly, SameSite=Strict, Secure when applicable), `IsDeleted` not leaked in any response DTO, soft-deleted users rejected at login with the generic error.
* **Grading flow** — Draft `GET`/`PUT` with ownership guard, Confirm (writes Grade, computes `FinalGrade`, deletes Draft, requires all 5 fields filled → 400 otherwise), Reconfirm exam after accepted appeal (only exam editable; other 4 fields frozen), Student-confirm, cross-professor ownership (prof A cannot touch prof B's draft/grade → 403), cross-student ownership (student X cannot read student Y's grade → 403), **final-grade mapping across every bucket boundary** (0, 50, 51, 60, 61, 70, 71, 80, 81, 90, 91, 100), point-field validation (0.5 step, respective maxes, negatives rejected, over-max rejected).
* **Appeals flow** — Submit (one Pending per cycle; refused outside the §4.6 action window), Accept, Deny, Undo-deny inside 24h, Undo-deny refused at/after 24h, Overdue computed on read at the exact 7-day boundary, post-overdue second-appeal window grants a fresh 7 days from the overdue moment, overdue appeal cannot be Accepted or Denied, undo-past-day-7 edge case (deny day 3, undo day 8 → appeal immediately reads Overdue; the review clock is NOT reset per §4.4), post-overdue window silent expiry does NOT auto-finalize the grade (per §4.6 Q53), initial window silent expiry DOES auto-finalize on day 8 (per §4.6 Q28).
* **Dashboards and aggregates** — `GET /api/Student/me/dashboard` and `GET /api/Professor/me/dashboard`: payload shape, Average Grade (two decimals, failures excluded), Passed Exams count, Non-passed count (failures + un-graded enrollments), Earned ECTS per §4.7 (truly-final AND final grade ≥ 6), per-subject status + action-button flags (`canWriteAppeal`, `canConfirmGrade`, `confirmationDeadline`, `pendingAppealId`), professor's Appeals section lists Pending + Overdue across all their subjects and nothing else.

Any additional PRD rule testable at this layer (e.g. mass-assignment resistance on `PUT /api/User/{id}` ignoring body `Id`, FluentValidation 400 shapes on malformed DTOs) must also be covered.

## 3. Project Layout

Create a **new** test project `backend/StudentPortal.IntegrationTests/StudentPortal.IntegrationTests.csproj`, sibling of Task 22's unit test project — never mixed into the same `.csproj`, so unit tests stay fast and Docker-free. The project:

* Targets the same TFM as `backend/StudentPortal/StudentPortal.csproj`.
* References `StudentPortal.csproj`.
* Uses xUnit as the runner.
* Ships with these NuGet packages (pin exact versions, no floating ranges):
  * `Microsoft.AspNetCore.Mvc.Testing` — `WebApplicationFactory<Program>`.
  * `Testcontainers.PostgreSql` — image pinned to `postgres:17` (never `latest` — see the article's cautionary tale).
  * `Respawn` — row cleanup between tests.
  * `Microsoft.Extensions.TimeProvider.Testing` — `FakeTimeProvider`.
  * `FluentAssertions` — expressive, domain-oriented assertions.
  * `xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`, `coverlet.collector`.

Expose `Program` so `WebApplicationFactory<Program>` compiles: add `public partial class Program { }` at the end of `backend/StudentPortal/Program.cs`.

## 4. Fixture and Database Reset Strategy

* **One Postgres container for the whole suite** via an xUnit **collection fixture** (`[CollectionDefinition("Integration")]` + `[Collection("Integration")]` on every test class).
* `IntegrationTestFixture : IAsyncLifetime`:
  * `InitializeAsync` — start `PostgreSqlContainer` (image `postgres:17`), build `WebApplicationFactory` with `ConfigureWebHost(b => b.UseSetting("ConnectionStrings:DefaultConnection", _container.GetConnectionString()))`, apply EF Core migrations against the container (`dbContext.Database.MigrateAsync()`), construct a `Respawner` targeting the test DB.
  * `DisposeAsync` — dispose factory, stop + remove container.
* **Reset between EVERY test** via `ResetAndSeedAsync()`:
  1. `await _respawner.ResetAsync(_connectionString)` — truncates every table.
  2. Execute `backend/StudentPortal/Migrations/seed.sql` against the container (read file at fixture init, replay per test). Full re-seed every test — strongest isolation, as decided.
  Call from the base class's `IAsyncLifetime.InitializeAsync` so every `[Fact]`/`[Theory]` starts from the full seeded baseline.
* **No hardcoded connection strings or ports.** Only route the container's dynamic connection string through `UseSetting`. Do not manually remove or re-register production services.
* All infrastructure code lives in the fixture, base class, and helpers — never in test bodies.

## 4a. Seed vs in-test data — policy

`seed.sql` is kept as PRD §7 defines it (1 admin + 4 professors + 10 students + ~15 subjects + ~30 enrollments + ~20 grades + ~3 drafts). It is **not** extended to accommodate test scenarios. Instead tests follow a strict two-layer model.

### Layer 1 — baseline seed (shared, stable, boring)

What tests MAY depend on from `seed.sql`:

* The **auth cast** — seeded users (admin, professors, students) are the authentication fixtures. Tests sign in as them to get an authenticated `HttpClient`.
* The **shape** — that enrollments, subjects, and users exist in realistic quantities.

What tests MUST NOT depend on from `seed.sql`:

* Any seeded **Grade**, **GradeDraft**, or **Appeal** row.
* The specific state of any seeded grade ("the overdue appeal", "the pending appeal", "the Denied-inside-undo appeal").
* Any specific `Id` of a seeded Grade / Draft / Appeal row.
* Any seeded timestamp.

If a test asserts on a seeded scenario row, the test is wrong — rewrite it per Layer 2. This rule exists so that evolving the demo seed (PRD §7) never breaks the test suite.

### Layer 2 — per-test state, in order of preference

For every scenario a test needs that is not covered by the auth cast:

1. **Via the API first** (Milan's "Sender" pattern). The test calls real endpoints as an authenticated user to put the system into the state it wants. Exercises more of the stack. Example — a test needing an appeal in Pending state calls `PUT /api/GradeDraft/...` → `POST /api/Grade/confirm` → `POST /api/Appeal` as the appropriate seeded users. Prefer this whenever an endpoint exists for the setup action.
2. **Via DbContext builders** (the §6.2 helpers — `SeedAppealAtAsync`, `SeedGradeConfirmedAtAsync`, `SeedDeniedAppealAtAsync`, and any further helpers added as needed). Used for state the API cannot produce — chiefly backdated timestamps and other pathological rows. These helpers write directly through the fixture's DbContext.

Base-class helpers for setup actions are allowed and encouraged (e.g. `CreatePendingAppealAsync(studentClient, enrollmentId)`), so tests read as business rules rather than database tours.

### Hard rules

* **No time-sensitive row ever lives in `seed.sql`.** Timestamps that drive overdue, 24h undo, or auto-finalize behaviour belong in-test, controlled by `FakeTimeProvider` or by DbContext builders.
* **No test asserts on a seeded Grade / Draft / Appeal.** Only on rows the test itself created.
* **If a test genuinely cannot be written** with the auth cast + in-test setup, the agent stops and reports the gap in the §11 strategy phase (step 4). The agent proposes an in-test helper first. Only if that is infeasible does the agent propose a minimal `seed.sql` extension — and the extension requires explicit approval before being made.

## 5. Authentication in Tests

Tests authenticate exactly like a real client — real `POST /api/Account/Login` through the real pipeline.

* `IntegrationTestBase` exposes:
  * `Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password = "Password123!")` — builds an `HttpClient` from the factory with `HandleCookies = true`, posts to `/api/Account/Login`, asserts `200`, returns the client. The server-set `sp_access` and `sp_refresh` cookies travel on every subsequent request automatically.
  * `HttpClient CreateAnonymousClient()` — for 401 tests.
  * `AssertSetCookie(response, "sp_access")` / `AssertSetCookie(response, "sp_refresh")` — asserts presence, httpOnly, SameSite=Strict.
  * `SeedUsers` constants sourced from `seed.sql` (`SeedUsers.Admin`, `SeedUsers.ProfessorA`, `SeedUsers.Student1`, …; shared password `Password123!`).
* **Do not** install a test `AuthenticationHandler`.
* **Do not** mint JWTs by hand. The real cookie/JWT pipeline is part of the behaviour under test.

## 6. Time Control

Time-sensitive behaviour is tested with **both** mechanisms:

### 6.1 TimeProvider injection (the ONLY pre-approved production code change in this task)

Inject `System.TimeProvider` (.NET 8) into every service that reads "now":

* `AppealService` — `SubmittedAt`, overdue computation (now − SubmittedAt ≥ 7d), undo-deny deadline (now − ReviewedAt < 24h), post-overdue window start.
* `GradeService` — `ConfirmedAt`, `StudentConfirmedAt`, `FinalizedAt`, day-8 auto-finalize on read.
* `GradeDraftService` — `LastEditedAt`.
* Any other service reading `DateTime.UtcNow`.

Register `TimeProvider.System` in `Program.cs`. In the fixture, override with `FakeTimeProvider`:

```
_factory = _factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
    s.Replace(ServiceDescriptor.Singleton<TimeProvider>(FakeTime))));
```

Advance with `FakeTime.Advance(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)))` to hit boundaries exactly.

### 6.2 Backdated seed helpers

For broader state scenarios where you want pre-existing overdue chains or near-expiry grades without reconfiguring the clock, add helpers on the base class that write rows with explicit timestamps via the DbContext:

* `SeedAppealAtAsync(gradeId, submittedAt, status)`
* `SeedGradeConfirmedAtAsync(enrollmentId, confirmedAt)`
* `SeedDeniedAppealAtAsync(gradeId, submittedAt, reviewedAt)`

### 6.3 Required boundary coverage

Every time-dependent rule MUST be tested at **three** points — immediately before, exactly at, and immediately after the deadline:

| Boundary | Before | At | After |
|---|---|---|---|
| Student initial 7-day window | 6d 23h 59m — buttons shown | 7d 00m 00s — auto-finalize threshold | 7d 00m 01s — grade truly final per §4.7 |
| Student post-overdue 7-day window | 6d 23h 59m — Write appeal shown | 7d 00m 00s — window closes | 7d 00m 01s — grade stays open (no auto-finalize per §4.6 Q53) |
| Professor 7-day review window | 6d 23h 59m — Pending, Accept/Deny allowed | 7d 00m 00s — reads Overdue on next request | 7d 00m 01s — Accept/Deny refused |
| 24h deny-undo window | 23h 59m — Undo allowed | 24h 00m 00s — Undo refused | 24h 00m 01s — Undo refused |
| Undo-after-day-7 edge | — | Deny day 3, Undo day 8 → appeal immediately reads Overdue (clock not reset per §4.4) | — |

## 7. Test Design Rules

For each endpoint and business rule, cover:

* **Happy paths** — valid caller, valid payload, correct response code, correct response body, correct DB state change.
* **Unhappy paths** —
  * `400` on FluentValidation failures (empty FirstName, Email format, over-max fields, point-field over-max or negative, point-field not aligned to 0.5 step, 1000-char appeal text + 1, new password < 12 or > 128 chars).
  * `401` on missing or expired cookies, after `change-password` and `logout` when the old cookie is replayed, after refresh-token re-use.
  * `403` on wrong role, cross-professor ownership, cross-student ownership, non-admin trying to change own `Email`, admin trying to soft-delete self, admin trying to demote self, admin trying to change role of another admin.
  * `400` on change-password with wrong current password (field error per PRD §5.10).
  * `404` on unknown ids.
  * Business-rule violations — second appeal while one is Pending; Accept/Deny on an overdue appeal; Confirm with fewer than 5 fields.
* **Edge cases** —
  * Final-grade mapping at every bucket edge as parameterized `[Theory]`.
  * Point-field 0.0 valid, exact max valid, max + 0.5 rejected, negative rejected, 0.3 (not step-aligned) rejected.
  * Student with zero enrollments — dashboard returns empty subjects list and sensible stats.
  * Professor with zero subjects — dashboard returns empty lists.
  * Profile `PUT` with only `FirstName` → `LastName` and `Email` preserved from stored row.
  * Mass assignment: `PUT /api/User/{id}` with a different `Id` in the body — route id wins.
  * `IsDeleted` absent from every `UserDto` and `LoginResponseDto` payload.
  * Change-password: after success, hitting `POST /api/Account/Refresh` with the pre-change `sp_refresh` cookie returns `401`.
  * Refresh-token re-use detection: present an already-rotated refresh token → the entire chain for that user is revoked; subsequent `Refresh` with the newest cookie also fails.
  * `GradeDraft` unique per enrollment: second `PUT` for same enrollment updates in place, no duplicate row.
  * Appeal `Text` max length 1000 accepted, 1001 rejected.
* **Data integrity** —
  * After Confirm: `Grade` row exists with correct `FinalGrade`, `Draft` row deleted, `ConfirmedAt` populated, `StudentConfirmedAt` and `FinalizedAt` NULL.
  * After Accept + Reconfirm: the four non-exam fields on the Grade are unchanged; only `ExamPoints` and `FinalGrade` moved.
  * After Deny + Undo within 24h: `FinalizedAt` back to NULL, appeal `Status` back to `Pending`.
  * After change-password: zero un-revoked `RefreshToken` rows for the user.

**One logical behaviour per test.** Descriptive names (`MethodName_Scenario_ExpectedResult` or `When_X_Then_Y`). Parameterized `[Theory]` + `[InlineData]` for mapping buckets and validation ranges. FluentAssertions throughout.

## 8. Anti-Patterns to Avoid

* Hardcoded connection strings or ports.
* Unpinned image tags (never `postgres:latest`).
* Shared container with no reset between tests.
* Mocking the database or using EF InMemory — tests must hit real Postgres.
* Sharing one test database across runs (fixture spins up a dedicated container).
* Removing or re-registering individual production services in DI; only override via `UseSetting` and the `TimeProvider` swap.
* Infrastructure code inside test bodies (startup, cleanup, auth plumbing all belong in fixture/base/helpers).
* Minting JWTs by hand or installing a test AuthenticationHandler.
* Fragile wall-clock sleeps (`Thread.Sleep`, `await Task.Delay`) for time-dependent tests — use `FakeTimeProvider.Advance`.
* Over-asserting (snapshotting the entire response body when only two fields matter).
* **Writing a test against what the code does rather than what the PRD says.** This is the biggest anti-pattern for this task — see §0.

## 9. Subtasks (each gets its own local commit)

- **22a.1** Scaffold the project.
  - Create `backend/StudentPortal.IntegrationTests/StudentPortal.IntegrationTests.csproj` with the package set from §3.
  - Reference `StudentPortal.csproj`.
  - Add `public partial class Program { }` at the end of `backend/StudentPortal/Program.cs`.
  - Add the project to the solution file.
  - Commit: `test(backend): scaffold StudentPortal.IntegrationTests project`

- **22a.2** Introduce `TimeProvider` injection in production code (the ONLY pre-approved production change in this task).
  - Replace `DateTime.UtcNow` reads in `AppealService`, `GradeService`, `GradeDraftService`, and any other service reading "now" with injected `TimeProvider.GetUtcNow()`.
  - Register `TimeProvider.System` as the singleton default in `Program.cs`.
  - Verify no behaviour change by running Task 22's unit tests (if present) — all must still pass.
  - Commit: `refactor(backend): inject TimeProvider for testable time-sensitive logic`

- **22a.3** Build the fixture + base class.
  - `IntegrationTestFixture : IAsyncLifetime` — Postgres Testcontainer (`postgres:17`), WebApplicationFactory, EF migrate, Respawner, cached `seed.sql` contents.
  - `[CollectionDefinition("Integration")]` with `ICollectionFixture<IntegrationTestFixture>`.
  - `IntegrationTestBase` — per-test `ResetAndSeedAsync` in `InitializeAsync`, `CreateAuthenticatedClientAsync`, `CreateAnonymousClient`, cookie assertion helpers, `SeedUsers` constants, backdated-seed helpers.
  - Smoke test: a single `[Fact]` that logs in as the seeded admin and hits `/api/Account/Me` — proves the whole fixture plumbing works end-to-end.
  - Commit: `test(backend): add Testcontainers fixture, Respawn reset, and auth helpers`

- **22a.4** Auth + user flow tests.
  - Login happy path, Login with wrong password → 401 + generic error, Login as soft-deleted user → 401 + generic error, Login response sets both cookies with correct flags.
  - Refresh rotates (new cookies issued, old refresh row revoked).
  - Refresh re-use detection — replay of a rotated refresh token revokes the entire chain.
  - Logout clears both cookies, revokes the refresh row.
  - Me returns the current user shape; `IsDeleted` absent.
  - Change password — correct current → 204 + every refresh row for the user revoked + old `sp_refresh` cookie returns 401 on next Refresh. Wrong current → 400 field error.
  - Profile self update — only `FirstName` in payload → `LastName` and `Email` preserved. Non-admin sending a different `Email` → 403. Student sending `IndexNumber` → ignored or 403 per PRD §2.3.
  - Admin user CRUD — admin updates another student (all fields), admin updates another admin (`UserRole` and `IsDeleted` from body ignored or 403 per PRD §2.1), admin tries to soft-delete self → 403, admin tries to demote self → 403, admin tries to change role of another admin → 403.
  - Mass-assignment: `PUT /api/User/{id}` with a different `Id` in the body → route id wins.
  - 401/403 matrix across every protected endpoint.
  - Commit: `test(backend): integration tests for auth and user flows`

- **22a.5** Grading flow tests.
  - Draft `GET` happy path, Draft `PUT` creates new row, Draft `PUT` on same enrollment updates in place (no duplicate), Draft ownership — professor B gets 403 on professor A's enrollment.
  - Confirm requires all 5 fields → 400 if any missing, happy path writes Grade + computes FinalGrade + deletes Draft + sets ConfirmedAt + leaves FinalizedAt NULL.
  - Reconfirm exam after accepted appeal — only `ExamPoints` moves; the other four fields are frozen.
  - Student-confirm sets `StudentConfirmedAt` and `FinalizedAt`; student cannot confirm another student's grade → 403.
  - Cross-student 403 on GETs; cross-professor 403 on PUTs.
  - Final-grade mapping `[Theory]` at every bucket boundary: 0, 50 → 5; 51, 60 → 6; 61, 70 → 7; 71, 80 → 8; 81, 90 → 9; 91, 100 → 10.
  - Point-field validation `[Theory]`: 0.0 valid, exact max valid, max + 0.5 rejected, negative rejected, 0.3 (not step-aligned) rejected.
  - Commit: `test(backend): integration tests for grading flow`

- **22a.6** Appeals flow tests with `FakeTimeProvider`.
  - Submit happy path during the §4.6 window; submit outside the window → refused; submit while a Pending appeal exists → refused (one-pending-per-cycle).
  - Accept inside the professor's 7-day review window; Accept at 7d 00m 00s → refused (overdue); Accept at 7d 00m 01s → refused.
  - Deny inside window; Deny on overdue → refused.
  - Undo-deny at 23h 59m → appeal flips to Pending, `FinalizedAt` back to NULL; Undo at 24h 00m 00s → refused; Undo at 24h 00m 01s → refused.
  - Overdue computed on read exactly at the 7-day boundary (before: Pending; at and after: Overdue).
  - Post-overdue second-appeal window: student gets a fresh 7 days from the overdue moment; silent expiry does NOT auto-finalize the grade.
  - Initial-window silent expiry: on day 8 the grade is treated as truly final (dashboard flips, ECTS counts).
  - Undo-past-day-7 edge case: deny day 3, undo day 8 → appeal immediately reads Overdue, review clock NOT reset.
  - Commit: `test(backend): integration tests for appeals flow with time-boundary coverage`

- **22a.7** Dashboard aggregate tests.
  - Student dashboard — payload shape, Earned ECTS per §4.7 (only truly-final AND final ≥ 6), Average Grade (two decimals, failures excluded), Passed Exams count, Non-passed count (failures + un-graded), per-subject status and action-button flags across every §4.6 state (Awaiting confirmation / Appeal pending / Passed / Failed / Appeal denied / Overdue chain / Truly final).
  - Professor dashboard — list of subjects with enrolled students and their current grade/draft/appeal state; Appeals section lists Pending + Overdue across all their subjects and nothing else.
  - Empty-state: student with zero enrollments; professor with zero subjects.
  - Commit: `test(backend): integration tests for student and professor dashboards`

- **22a.8** README for the integration test project.
  - `backend/StudentPortal.IntegrationTests/README.md` covering: Docker Desktop requirement, `dotnet test backend/StudentPortal.IntegrationTests` command, approximate first-run time (image pull), the TimeProvider override pattern for new tests, the fixture/base-class contract.
  - Commit: `docs(tests): README for integration test project`

- **22a.9** Run the full suite and deliver the final report (no commit — this is the handoff step).
  - Execute `dotnet test backend/StudentPortal.IntegrationTests --logger "trx;LogFileName=integration-tests.trx"` from the repo root against a clean checkout.
  - **Actually run it** — do not claim a pass that was not observed. If a test cannot run (environment, Docker missing, container boot failure), report it as **blocked** with the reason.
  - Produce a full report in chat containing:
    1. **Summary line** — `Total: N | Passed: X | Failed: Y | Blocked: Z | Duration: T`.
    2. **Passed tests** — count per area (Auth, Grading, Appeals, Dashboards), not the full list unless Y + Z > 0.
    3. **Failed tests** — for each failure:
       - Fully qualified test name.
       - PRD section + rule the test verifies (e.g. "PRD §4.5 — overdue appeal non-reviewable").
       - Expected result per the PRD.
       - Actual result + failure message / stack-trace excerpt.
       - Classification: **production defect** (code violates PRD), **test defect** (test is wrong), **environment problem**, or **ambiguous requirement**.
       - Likely root cause (hypothesis vs confirmed).
       - **Proposed fix** — concrete, ordered steps naming the files + methods expected to change. For production defects, the fix proposal lives here; **no production code is modified yet** (§0 + §10 rule).
    4. **Blocked tests** — name + reason.
    5. **PRD requirements covered vs uncovered** — short list of any PRD rule the suite could not verify at integration level, with the reason.
    6. **Discrepancies between PRD and current implementation** — short list, each pointing at the failing test(s) that exposed it.
  - After delivering the report, **stop and wait for explicit approval** before touching any production code outside the pre-approved `TimeProvider` injection (22a.2). On approval, apply only the approved fixes, rerun the affected tests, and append a short follow-up report with the new numbers.

## 10. Reporting and Stop-Before-Fixing-Production Rule

After the suite is implemented and executed, report:

* Framework, package versions, test count.
* Pass / fail / blocked counts (actually measured — do not claim a pass you did not observe).
* PRD requirement(s) each failing test maps to.
* Whether a failure indicates a production defect, a test defect, an environment problem, or an ambiguous requirement.
* A concrete, ordered remediation plan.

**Do not modify production code to make a test pass, with one exception:** the `TimeProvider` injection subtask (22a.2) is the only pre-approved production-code change. Any other production fix requires explicit approval first. See §0 — the test wins over the implementation by default.

## 11. Execution Order

1. Read PRD, Tech.md, DB.md.
2. Build the requirements traceability matrix.
3. Inspect existing backend services, DTOs, controllers, DbContext, and `seed.sql` (to learn how to invoke the system — not to decide expected behaviour, which comes from the PRD per §0).
4. Present the strategy, the traceability matrix, and any ambiguities for review.
5. Implement subtasks 22a.1 → 22a.8 in order, each in its own commit.
6. Run the full suite and deliver the final report per subtask 22a.9.
7. If any tests failed: stop, wait for approval, then apply only the approved fixes and append the follow-up report.

**Start with steps 1–4. Do not modify any files until you have presented the strategy and matrix for my review.**


---

### Task 22b — Frontend unit tests (Vitest + React Testing Library + MSW)

# Task: Create a High-Quality Unit Test Suite for the Frontend

Your task is to create a reliable, maintainable **unit test suite only** for the frontend SPA. Follow the testing best practices described in:

https://milanjovanovic.tech/blog/unit-testing-best-practices-dotnet

(The article is .NET-flavoured; apply the underlying principles — AAA, descriptive naming, one logical behaviour per test, test observable behaviour not implementation details, controlled time — to Vitest + React Testing Library.)

## 0. Non-negotiable rule — PRD is the source of truth

**All tests MUST be derived from the PRD, Tech.md, DB.md, and UI.md — never from the current implementation's behaviour.**

* The implementation may contain bugs or contradict the PRD. Tests exist to catch exactly that.
* If a test's expected outcome and the implementation disagree, the **test wins** by default; the discrepancy is reported as a suspected production defect per §10.
* Do not weaken an assertion, skip a test, or change an expected result to match what the code currently does.
* If a PRD requirement is ambiguous, incomplete, or contradictory, document the ambiguity in the strategy phase (§11 step 4) and stop for direction. Do not invent a rule.
* Inspecting the implementation is allowed only to understand *how to invoke* each unit (component props, hook signatures, route names, service shapes), never to decide *what the expected behaviour is*.

## 1. Analyze the Requirements First

1. Read the PRD (§2 actors, §3 grading model, §4 appeal flow, §5 screens, §6 security), `docs/Tech.md`, and `docs/UI.md`.
2. Extract every rule verifiable at the unit level in the browser SPA: Zod validation rules, UI state transitions, button visibility rules, field-visibility matrices, access control via `RoleGate`/`AuthGuard`, derived display values (status badges, action-button flags, countdowns), store transitions, interceptor behaviour (silent refresh, force-logout), service-layer request shapes and response handling.
3. Produce a concise requirements traceability matrix mapping each covered PRD rule to its planned unit test(s). Present it in the strategy phase for review before implementation.

## 2. Scope: Unit Tests Only

**Unit tests exclusively. No end-to-end or browser-driver tests, no visual-regression tests, no backend integration tests (those live in Task 22a).** Each test:

* Exercises one component, hook, store, schema, service module, or lib helper in isolation.
* Runs under `vitest` with the `jsdom` environment already configured in Task 11.8.
* Mocks or stubs out any dependency that is not the unit under test — see §5 for the strict mocking policy.
* Does not spawn a dev server, hit a real backend, open a real browser tab, or read production state.

Priority order for what to cover (per the Q&A plan):

1. **Business rules** — the §3 point-field constraints and final-grade mapping as surfaced by the UI, §4 action-button visibility rules (`canWriteAppeal`, `canConfirmGrade`, `confirmationDeadline`, `pendingAppealId`), status badges, the "all 5 fields filled → Confirm visible" rule, draft lifecycle.
2. **Access control** — `AuthGuard` redirect behaviour, `RoleGate` child rendering, `UserEditForm` field-visibility matrix (§5.9), admin's own row having no Edit button, admin cannot self-demote or self-delete through the UI, non-admin cannot edit own Email, student cannot see other students' data (route guard).
3. **API integration** — `axiosClient` interceptor (silent 401 refresh with `_retry` + serialized `refreshPromise`, force-logout on 403 or refresh failure), service modules call the correct `API_ROUTES` entries with correct DTO shapes, MSW handlers emit `Set-Cookie` headers for `sp_access`/`sp_refresh` and are consumed invisibly by the SPA (no JS-visible token).
4. **User flows** — LoginPage end-to-end-within-page (fill → submit → success → redirect; fill → submit → 401 → error toast), ChangePasswordPage sign-out-everywhere flow, Write appeal submission flow, Confirm grade button flow, 5-field grading panel full submission, Appeal view/accept/deny/undo flow.

Covered areas, by layer:

* **Zod schemas** — `loginSchema`, `profileSchemas` (self and admin shapes), `changePasswordSchema`, grading panel schema, appeal text max 1000 chars.
* **Lib helpers** — `navigation.ts` singleton (`register`, `navigate` before/after register), `auth.ts` (`clearAuthSession` clears store + navigates, `withAuthRedirect` + `getRedirectTarget` roundtrip).
* **Store** — `useUserStore` transitions (`setCurrentUser`, `clearCurrentUser`, `setHydrating`), `USER_ROLES` constant integrity.
* **Axios client** — single-flight silent refresh (two concurrent 401s trigger one refresh call), successful refresh retries the original request once, failed refresh calls `clearAuthSession`, 403 calls `clearAuthSession`, non-401/403 errors are re-thrown unchanged, no `Authorization` header is attached (cookies only).
* **Service modules** — `authService` (login/logout/me), `profileService` (getMe/updateProfile/changePassword), `appealService` (submit/accept/deny/undoDeny/viewByGrade), `gradeService` (confirm/reconfirmExam/studentConfirm), `gradeDraftService` (get/save), `dashboardService` (student + professor). Each verified against MSW handlers.
* **Custom hooks** — `useStudentDashboard` and `useProfessorDashboard` auto-fetch + AbortController cancellation (unmount mid-fetch does not call `setState` on an unmounted component; a new call aborts the previous request; aborted responses do NOT flip the loading state — per the 0cb10dd behaviour already landed).
* **Presentational components** — `Modal` (open/close, backdrop blur, Escape to close), `RoleGate` (allowed/denied), `Navbar` (logged-out shows Login only, logged-in shows Dashboard + greeting + Logout, `NavLink` active class on current route, "Students" link absent, My Profile entry in greeting dropdown per §19B.5), responsive table-to-cards utility behaviour at breakpoint, `UserCreateForm` (password show/hide toggle, IndexNumber shown only when role=Student), `UserEditForm` field-visibility matrix for every combination in §5.9.
* **Page-level components** — `LoginPage`, `MyProfilePage`, `ChangePasswordPage`, `AdminDashboardPage` (three tabs, no Edit on admin's own row, modals), `StudentDashboardPage` (stats, subjects table, Write appeal, Confirm grade), `ProfessorDashboardPage` (three columns, grading panel in each state, Appeals section Pending + Overdue filtering, View appeal modal, 24h deny-undo countdown).

**Out of scope for 22b:**

* The real `createBrowserRouter` wiring end-to-end (framework behaviour — unit-test the guard's redirect decision instead against a mocked navigator).
* MSW handler definitions themselves (test the service layer that consumes them, not MSW).
* Backend behaviour — covered by Task 22a.
* Visual-regression, accessibility-audit, and snapshot tests.

## 3. Testing Stack (reuse Task 11 install — add no new runtime deps)

Already present after Task 11.1 and 11.8:

* `vitest` + `jsdom` — runner and DOM env.
* `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` — rendering, interactions, and semantic assertions.
* `msw` (v2) — request mocking, handlers in `src/test/server.ts`.
* `src/test/setup.ts` — wires jest-dom matchers and the MSW server lifecycle (`beforeAll(server.listen)`, `afterEach(server.resetHandlers)`, `afterAll(server.close)`).

**Do not add** `@testing-library/jest-axe`, `vitest-canvas-mock`, Playwright, Cypress, or any snapshot library. Snapshot tests are banned (brittle, re-pass trivially on refactor). Prefer explicit role/name queries from `@testing-library/react`.

## 4. Project Layout — Co-Located

Each test lives next to the source file it covers:

```
src/features/auth/pages/LoginPage.tsx
src/features/auth/pages/LoginPage.test.tsx
src/features/auth/utils/loginSchema.ts
src/features/auth/utils/loginSchema.test.ts
src/lib/navigation.ts
src/lib/navigation.test.ts
src/store/user/useUserStore.ts
src/store/user/useUserStore.test.ts
src/shared/api/axiosClient.ts
src/shared/api/axiosClient.test.ts
src/components/ui/Modal.tsx
src/components/ui/Modal.test.tsx
```

Shared test helpers (render wrappers, test-user factories, time-advance utilities, MSW override helpers) live under `src/test/`:

* `src/test/renderWithProviders.tsx` — renders a component wrapped in `MemoryRouter` + a reset `useUserStore` snapshot.
* `src/test/factories.ts` — `makeStudent({...overrides})`, `makeProfessor(...)`, `makeAdmin(...)`, `makeSubject(...)`, `makeGrade(...)`, `makeAppeal(...)`, `makeStudentDashboardPayload(...)`, `makeProfessorDashboardPayload(...)`.
* `src/test/time.ts` — thin wrappers around `vi.useFakeTimers()` / `vi.setSystemTime()` / `vi.advanceTimersByTime()`.
* `src/test/mswOverrides.ts` — per-test handler overrides via `server.use(http.get(...))`.

Vitest is configured (Task 11.8) to pick up `**/*.test.{ts,tsx}`. Do not change the glob.

## 5. Mocking Strategy (per Q&A)

Strict per-layer rules:

### 5.1 Service modules → MSW end-to-end

Tests for `authService`, `profileService`, `appealService`, `gradeService`, `gradeDraftService`, `dashboardService` run through the **real `axiosClient`** against **MSW handlers**. This verifies:

* The service hits the correct `API_ROUTES` entry.
* The service sends the DTO shape the backend expects.
* The service surfaces errors (401/403/400/404) in whatever shape the UI consumes.
* The silent-refresh interceptor fires on 401 and the service's retried call then succeeds.

Each service test file sets per-test handler overrides with `server.use(...)` and relies on the global `server.resetHandlers()` wired in `setup.ts`.

### 5.2 Component / page tests → `vi.mock()` for the service module

Component and page tests `vi.mock(<serviceModulePath>, () => ({ ... }))` so each render exercises only the UI/state and the mock service verifies the exact call made. This keeps UI tests fast, deterministic, and immune to accidental MSW interactions.

* The mock returns a resolved/rejected promise per scenario (happy, 400 validation, 401, 403, server error).
* The test asserts both the UI reaction (toast fired, button disabled during pending, navigation dispatched) AND that the service was called with the correct DTO.
* Toasts are asserted by mocking `react-toastify`'s `toast.success`/`toast.error` and spying on the calls, not by scraping the DOM for toast text (less brittle to library markup changes).

### 5.3 Store, lib, Zod → no mocking

Pure-logic layers test themselves — no mocks. For Zod schemas, assert both `safeParse(...).success` and the `error.format()` field keys on failures.

### 5.4 Axios interceptor → MSW with handler sequencing

The interceptor's single-flight silent-refresh test uses MSW handlers that count calls and respond `401` on the first call to a protected route, then succeed after refresh. Two concurrent protected calls must produce exactly one `/api/Account/Refresh` call (serialized `refreshPromise`), each original call retried once, each returning `200`.

### 5.5 Never do this

* Never mock `axios` directly in a component test — go through `vi.mock()` on the service.
* Never mock the Zustand store internals; use its real `setState`/`getState` and reset between tests.
* Never mock `window.location` to assert redirects — the `navigate` singleton is the UI contract; spy on it.
* Never snapshot test rendered output.
* Never assert on exact rendered class names — assert on role/name queries and `jest-dom` matchers (`.active` on `NavLink` is the one exception, since it is the PRD-stated behaviour).

## 6. Time Control (per Q&A — combination A+B)

Time-sensitive UI gets **both** treatments:

### 6.1 Backend-authoritative display tests (treatment A)

For state the backend derives (`canWriteAppeal`, `canConfirmGrade`, status label, `confirmationDeadline`), the test feeds the component a mocked dashboard payload for each §4.6 state and asserts the exact rendered badge + button set. Time is irrelevant — the backend already computed it. Covers every row of the §4.6 table:

| Grade state | Expected badge | Expected buttons |
|---|---|---|
| Awaiting confirmation (fresh) | Awaiting confirmation | Write appeal + Confirm grade |
| Pending appeal | Appeal pending | *(none)* |
| Appeal denied | Passed / Failed + Appeal denied | *(none)* |
| Appeal accepted, awaiting re-confirm | Appeal pending | *(none)* |
| Overdue chain window live | Awaiting confirmation | Write appeal |
| Truly final | Passed / Failed | *(none)* |

### 6.2 Client-side countdown tests (treatment B — `vi.useFakeTimers()`)

For client-side wall-clock behaviour (the §4.4 24-hour deny-undo countdown, surfaced per-row with a client `setInterval` per §10 out-of-scope note), test boundary conditions exactly:

| Boundary | Before | At | After |
|---|---|---|---|
| 24h deny-undo countdown (prof row) | 23h 59m 59s advanced — Undo button visible + countdown reads > 0 | 24h 00m 00s advanced — Undo button hidden | 24h 00m 01s advanced — Undo button hidden |
| 7-day initial window UI copy (student) | 6d 23h — Write appeal + Confirm grade shown | 7d 00m 00s — backend-flipped payload → status becomes Truly final; test the component reacts correctly to the new payload | 7d 00m 01s — same |
| 7-day post-overdue window UI copy (student) | 6d 23h — Write appeal shown | 7d 00m 00s — same payload-flip rule | 7d 00m 01s — same |

Boundary setup uses:

```ts
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
// render with a reviewedAt 23h 59m 59s in the past
vi.advanceTimersByTime(1000); // crosses the 24h boundary
```

`vi.useRealTimers()` in `afterEach`.

### 6.3 No wall-clock sleeps

No `setTimeout(resolve, ...)` or `await new Promise(r => setTimeout(r, N))` for time-sensitive tests. Any such usage fails code review.

## 7. Test Design Rules

For every unit, cover:

* **Happy paths** — valid caller, valid inputs, expected UI render / state transition / service call shape.
* **Unhappy paths** —
  * Validation errors surfaced in the correct field (Zod `safeParse` failure path renders the error only on `touched[field]` per Task 14.3).
  * 401 handled by the interceptor → silent refresh → retry → success (axios test).
  * 401 handled by the interceptor → refresh fails → `clearAuthSession` + navigate to `/login` (axios test).
  * 403 forwarded to `clearAuthSession` (axios test).
  * `UserEditForm` scope='self' trying to render Email as a non-Admin → field is hidden; attempting to patch an `email` key must not be in the request body (asserted via the mocked service call).
  * `UserEditForm` scope='admin' editing another Admin → UserRole dropdown and IsDeleted checkbox are not in the DOM.
  * Admin's own row in the Users table → no Edit button rendered.
  * `RoleGate` with mismatched role → children not rendered, fallback (if any) rendered.
  * Grading panel: Confirm button hidden when any of the 5 fields empty; Save draft only visible when at least one field edited and no final grade confirmed.
  * Appeal modal: Accept/Deny buttons absent for Overdue entries.
  * ChangePasswordPage: new ≠ confirm → inline error, submit disabled; wrong current password response (`400`) → inline field error, no sign-out.
* **Edge cases** —
  * Zod point-field validation `test.each`: 0.0 valid; exact max valid; max + 0.5 rejected; negative rejected; 0.3 (not step-aligned) rejected; respective maxes (30 / 30 / 5 / 5 / 30).
  * Final-grade mapping `test.each` at every bucket boundary (0, 50 → 5; 51, 60 → 6; 61, 70 → 7; 71, 80 → 8; 81, 90 → 9; 91, 100 → 10) — the backend owns the authoritative mapping (22a); this covers the client-side preview displayed in the grading panel.
  * Appeal text 1000 chars accepted, 1001 rejected (Zod).
  * New password 11 chars rejected, 12 accepted, 128 accepted, 129 rejected.
  * `useStudentDashboard` unmounted mid-fetch → no `setState` after unmount (asserted via a React console-error spy and absence of a state transition).
  * Hook called with a new key while a previous request is in flight → the previous `AbortController` is aborted and only the latest response is applied.
  * Student dashboard with zero enrollments → stats show 0 / 0 / 0 / 0 and empty subjects list rendered as an empty-state copy, not a crash.
  * Professor dashboard with zero subjects → three columns render empty states, Appeals section renders empty state, no crash.
  * `Modal` Escape key closes it; backdrop click closes it; `open={false}` renders nothing.
  * `Navbar` on `/admin-dashboard` → the Dashboard `NavLink` has `.active`; on `/` → nothing has `.active`.
* **Authorization and ownership (UI layer)** —
  * `AuthGuard` with `currentUser=null` and `isHydrating=false` → navigates to `/login` with `redirect` param set to the attempted route; with `isHydrating=true` → renders a loader, does not navigate.
  * `RoleGate requiredRole="Admin"` with Student user → children not rendered.
  * Admin UI cannot soft-delete self: the row for the admin's own id must have no Edit button rendered **and** the Users table must not expose any UI path to toggle `IsDeleted` on self. (Backend 403 is covered by 22a; this is the client-side gate.)

**One logical behaviour per test.** Descriptive names (`loginSchema_rejectsMissingEmail`, `AxiosClient_silentlyRefreshesOn401_andRetriesOriginalRequest`, `StudentDashboard_rendersWriteAppealButton_whenCanWriteAppealTrue`). Parameterized `it.each` / `test.each` for mapping buckets and validation ranges. `@testing-library/jest-dom` matchers throughout (`.toBeInTheDocument()`, `.toBeDisabled()`, `.toHaveAccessibleName()`).

Do not aim for 100% coverage. Prioritize the four areas in §2 (business rules, access control, API integration, user flows) and the ability of tests to detect incorrect behaviour.

## 8. Anti-Patterns to Avoid

* Snapshot tests (banned — see §3).
* Querying by `data-testid` when a semantic role query (`getByRole('button', { name: /confirm grade/i })`) would work. `data-testid` is permitted only for elements that genuinely have no accessible name (last resort).
* Asserting on exact class names, inline styles, or markup structure (except `.active` on `NavLink`, which is the PRD-stated contract).
* Mocking `axios` directly inside a component test instead of mocking the service module.
* Mocking the Zustand store internals; use its real API and reset between tests via a helper.
* Reaching into component internals (e.g. `instance.state`, `wrapper.find('ComponentName').props()`).
* `act()` warnings suppressed with `// eslint-disable` instead of resolving the async flow.
* Shared mutable state across tests (every test file starts from a reset store and reset MSW handlers; `beforeEach(() => useUserStore.setState(...initial))`).
* Testing the mock (e.g. asserting the MSW handler received a request without asserting what the service returned).
* Writing a test that re-passes trivially after any refactor (if a test survives changing the component's entire output, it tested nothing).
* Fragile wall-clock sleeps (`setTimeout`, `Promise(r => setTimeout(r, N))`) for time-dependent tests — use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`.
* **Writing a test against what the code does rather than what the PRD says.** This is the biggest anti-pattern for this task — see §0.

## 9. Subtasks (each gets its own local commit)

- **22b.1** Scaffold test helpers and smoke test.
  - Create `src/test/renderWithProviders.tsx`, `src/test/factories.ts`, `src/test/time.ts`, `src/test/mswOverrides.ts`.
  - Verify `src/test/setup.ts` from Task 11.8 wires jest-dom matchers and MSW lifecycle; add any missing pieces (e.g. `expect.extend(matchers)` from `@testing-library/jest-dom/vitest`).
  - Add a single smoke test (`src/test/smoke.test.tsx`) that renders a trivial component through `renderWithProviders` and asserts a `jest-dom` matcher works — proves the plumbing is live.
  - Commit: `test(frontend): scaffold Vitest helpers, factories, and smoke test`

- **22b.2** Lib, store, and axios interceptor tests (cross-cutting).
  - `src/lib/navigation.test.ts` — register/navigate ordering; navigate before register documented (per Tech.md if the spec is explicit, else flag the ambiguity in the strategy phase).
  - `src/lib/auth.test.ts` — `clearAuthSession` clears the store and (when `redirectToLogin: true`) navigates to `/login`; `withAuthRedirect` builds `/login?redirect=<encoded>`; `getRedirectTarget` round-trips and defaults to the role dashboard.
  - `src/store/user/useUserStore.test.ts` — `setCurrentUser`, `clearCurrentUser`, `setHydrating` transitions; `USER_ROLES` has exactly the three keys (`Admin`, `Professor`, `Student`).
  - `src/shared/api/axiosClient.test.ts` — single-flight silent refresh on 401, retry success, retry failure → `clearAuthSession`; 403 → `clearAuthSession`; non-401/403 errors re-thrown unchanged; cookies-only (no `Authorization` header set).
  - Commit: `test(frontend): lib helpers, user store, and axios interceptor`

- **22b.3** Auth feature tests.
  - `src/features/auth/utils/loginSchema.test.ts` — happy path; missing email; malformed email; missing password; empty password.
  - `src/features/auth/api/authService.test.ts` (MSW) — `login` posts the right DTO and surfaces 200 / 401; `logout` posts and surfaces 204; `me` returns the current user shape without a JS-visible token.
  - `src/features/auth/pages/LoginPage.test.tsx` (`vi.mock(authService)`) — happy submit → sets store + navigates to role dashboard; wrong credentials → toast + inline error, store untouched; error only shown on `touched[field]`; password show/hide toggle flips the input `type`.
  - Commit: `test(frontend): auth schemas, service, and LoginPage`

- **22b.4** User / profile feature tests.
  - `src/features/user/utils/profileSchemas.test.ts` — self scope allows absent fields, rejects empty FirstName/LastName when present; admin scope requires all core fields; `changePasswordSchema` enforces 12–128 and `confirm === new`.
  - `src/features/user/api/profileService.test.ts` (MSW) — `getMe`, `updateProfile` self + admin paths, `changePassword` on correct + wrong current password.
  - `src/components/shared/UserEditForm.test.tsx` (`vi.mock(profileService)`) — field-visibility matrix across all five rows of the §5.9 table; self-scope Student submission does NOT include `Email` in the request body; admin-scope admin-target submission does NOT include `UserRole` or `IsDeleted`; Save Changes disabled while dirty-check fails.
  - `src/features/user/pages/MyProfilePage.test.tsx` — read-only Your Info card renders stored fields; Edit profile opens the Modal with the right scope; Change password link navigates to `/profile/change-password`.
  - `src/features/user/pages/ChangePasswordPage.test.tsx` — new ≠ confirm → inline error, submit disabled; happy path → service called, `clearAuthSession({ redirectToLogin: true })` fired, success toast dispatched; wrong current password → 400 → inline field error, no sign-out.
  - Commit: `test(frontend): user/profile schemas, service, UserEditForm, MyProfile, ChangePassword`

- **22b.5** Admin dashboard tests.
  - `src/components/admin/UserCreateForm.test.tsx` — IndexNumber field appears only when role=Student; password show/hide toggle; submit calls service with correct DTO.
  - `src/pages/admin/AdminUsersTab.test.tsx` — admin's own row has no Edit button; Edit on another admin opens UserEditForm with scope='admin' and UserRole/IsDeleted hidden; Edit on a student opens with IndexNumber visible.
  - `src/pages/admin/AdminSubjectsTab.test.tsx` — Create defaults ECTS to 6; Edit button opens the modal with the row's values; Delete prompts via the shared Modal.
  - `src/pages/admin/AdminEnrollmentsTab.test.tsx` — Create picks student + subject; Delete prompts; no edit flow (PRD §5.3 lists Delete + Create only).
  - Commit: `test(frontend): admin dashboard forms, user matrix, and tab actions`

- **22b.6** Student dashboard tests.
  - `src/features/user/hooks/useStudentDashboard.test.ts` — auto-fetch on mount; AbortController aborts on unmount; refetch cancels in-flight request; the skip-loading-on-abort rule (commit 0cb10dd) is asserted by verifying the loading state does NOT flip for aborted responses.
  - `src/pages/dashboard/StudentDashboardPage.test.tsx` (`vi.mock(dashboardService)`) — My Information card renders name/email/index; Study Statistics tiles compute from the mocked payload (Average Grade two decimals, failures excluded; Passed count; Non-passed = failures + un-graded; Earned ECTS from truly-final passed grades); Subjects table renders every §4.6 state with the expected badge + action buttons.
  - `src/features/appeals/components/WriteAppealModal.test.tsx` — opens with blurred backdrop; textarea max 1000 chars enforced via Zod; submit calls `appealService.submit` with the right DTO; success closes the modal and refetches the dashboard.
  - `src/features/grades/components/ConfirmGradeButton.test.tsx` — click calls `gradeService.studentConfirm` with enrollmentId; disabled while pending.
  - Commit: `test(frontend): student dashboard hook, page, write-appeal modal, confirm-grade button`

- **22b.7** Professor dashboard — grading tests.
  - `src/features/grades/hooks/useProfessorDashboard.test.ts` — auto-fetch + AbortController + refetch cancellation parity with the student hook.
  - `src/pages/dashboard/ProfessorDashboardPage.test.tsx` (`vi.mock(dashboardService)`) — three columns render; selecting a subject populates column 2; selecting a student populates column 3.
  - `src/features/grades/components/GradingPanel.test.tsx` — empty state (no grade, no draft) renders 5 empty inputs; draft state pre-fills; **Confirm** button hidden until all 5 inputs have a numeric value; **Save draft** visible once any input is edited and no final grade is confirmed; read-only variant renders disabled inputs; accepted-appeal variant renders the one-line summary + editable exam input + live final grade.
  - `src/features/grades/components/GradingPanel.schema.test.ts` — point-field validation `test.each`: 0.0 valid, exact max valid (30 / 30 / 5 / 5 / 30), max + 0.5 rejected, negative rejected, 0.3 rejected.
  - `src/features/grades/components/FinalGradeMapping.test.ts` — pure mapping `test.each` across every bucket boundary (0, 50 → 5; 51, 60 → 6; 61, 70 → 7; 71, 80 → 8; 81, 90 → 9; 91, 100 → 10) for the client-side live preview.
  - Commit: `test(frontend): professor dashboard grading panel, mapping, and draft lifecycle`

- **22b.8** Professor dashboard — appeals tests (with `vi.useFakeTimers`).
  - `src/features/appeals/components/AppealsList.test.tsx` — renders Pending + Overdue rows across all the professor's subjects; empty state when none; View appeal opens the modal.
  - `src/features/appeals/components/ViewAppealModal.test.tsx` — overdue history rows rendered with `[OVERDUE]` prefix, greyed, no Accept/Deny buttons; current Pending text rendered normally; Accept + Deny buttons present for Pending; Accept calls `appealService.accept`; Deny shows a confirm sub-step before calling `appealService.deny`.
  - `src/features/appeals/components/DenyUndoCountdown.test.tsx` (`vi.useFakeTimers`) — at `now = reviewedAt + 23h 59m 59s`, Undo button visible with a positive countdown; advance 1s → `now = reviewedAt + 24h 00m 00s` → Undo button hidden; advance another 1s → still hidden. Undo click calls `appealService.undoDeny`.
  - Commit: `test(frontend): professor appeals list, view-appeal modal, 24h deny-undo countdown`

- **22b.9** Shared UI component tests.
  - `src/components/ui/Modal.test.tsx` — `open={false}` renders nothing; `open={true}` renders children + backdrop; Escape key calls `onClose`; backdrop click calls `onClose`; content click does not.
  - `src/components/shared/RoleGate.test.tsx` — allowed role renders children; mismatched role renders fallback (or null); no `currentUser` renders fallback.
  - `src/providers/authGuard.test.tsx` — `currentUser=null, isHydrating=false` navigates to `/login?redirect=<attempted>`; `isHydrating=true` renders a loader, no navigation; authenticated path renders children.
  - `src/components/ui/Navbar.test.tsx` — logged-out shows Login link only; logged-in shows Dashboard + greeting + Logout + My Profile dropdown entry (§19B.5); current route gets `.active` class; `Students` link is absent; Logout calls `authService.logout` then `clearAuthSession`.
  - `src/components/shared/ResponsiveTable.test.tsx` — above breakpoint renders `<table>`; below breakpoint renders stacked cards with the same cell data (uses a controlled `matchMedia` mock, no real viewport resize).
  - Commit: `test(frontend): shared Modal, RoleGate, AuthGuard, Navbar, and responsive table`

- **22b.10** Run the full suite, generate the report, and commit the docs.
  - Add `frontend/TESTING.md` covering: how to run (`npm test -- --run` from `frontend/`), the co-located convention, the service-vs-component mocking split (§5), the fake-timers pattern (§6), the PRD-is-source-of-truth rule (§0), and how to add a new test.
  - Run `npm test -- --run` (one-shot CI mode, no watch) from `frontend/`. Capture the full result.
  - Produce the §10 report: total test count, passed, failed; for each failed test the PRD rule it covers, the actual vs expected, the suspected root cause (test defect vs implementation defect vs ambiguous requirement), and a concrete proposed fix (file + method + change). **Do NOT apply any production-code fixes without explicit human approval.**
  - Commit: `test(frontend): run suite, add TESTING.md, and report results`

**You:** no manual steps required for 22b — the entire suite runs under Vitest in Node + jsdom with MSW; no Docker, no browser, no backend process.

## 10. Reporting and Stop-Before-Fixing-Production Rule

After the suite is implemented and executed, report:

* Framework, package versions already in `package.json`, final test count by subtask.
* Pass / fail / skipped counts, **actually measured** (do not claim a pass you did not observe; if a test could not run, report it as blocked and explain why).
* For every failing test:
  1. Fully qualified test name (file path + test description).
  2. The component / hook / service / schema under test.
  3. The PRD rule the test verifies (section reference).
  4. The expected result per the PRD.
  5. The actual result and the relevant failure message / stack trace.
  6. The likely root cause, distinguishing confirmed from hypothesized.
  7. A concrete, ordered remediation plan (files + methods + proposed change).
* Any PRD requirements that could not be verified via unit tests at all (document as a limitation; do not create E2E tests to cover them — those are out of scope).
* Any ambiguities in the PRD you had to flag during §1.

**Do not modify production code to make a test pass. There is no pre-approved production-code change for 22b (unlike 22a's TimeProvider injection).** Present the failures and the remediation plan, then wait for explicit approval before applying any fix. If you discover a defect in a test itself, explain the problem and the proposed correction; do not alter a test's expected behaviour merely to match the current implementation.

After approval, apply only the approved production-code changes, rerun the affected tests, and report the final results.

## 11. Execution Order

1. Read PRD, Tech.md, UI.md.
2. Build the requirements traceability matrix (PRD rule → planned test).
3. Inspect existing frontend components, services, schemas, store, lib helpers, and `src/test/` scaffolding (to learn how to invoke each unit — not to decide expected behaviour, which comes from the PRD per §0).
4. Present the strategy, the traceability matrix, and any ambiguities for review.
5. Implement subtasks 22b.1 → 22b.10 in order, each in its own commit.
6. Run `npm test -- --run` from `frontend/` and report real results per §10.
7. If anything fails: stop, report per §10, wait for approval before any production fix.

**Start with steps 1–4. Do not modify any files until you have presented the strategy and matrix for my review.**


---

### Task 22c — Frontend integration tests (Vitest + React Testing Library + MSW)

# Task: Create a High-Quality Integration Test Suite for the Frontend

Your task is to create a reliable, maintainable **frontend integration test suite only** for the SPA. The suite exercises real routes, real stores, the real `axiosClient` (including the silent-refresh interceptor), and the real component tree, with MSW 2 as the HTTP boundary.

Follow the testing best practices described in these references:

- https://testing-library.com/docs/guiding-principles/
- https://kentcdodds.com/blog/write-tests
- https://mswjs.io/docs/best-practices
- https://milanjovanovic.tech/blog/unit-testing-best-practices-dotnet (universal AAA / naming / isolation / determinism principles)

## 0. Non-negotiable rule — PRD is the source of truth

**All tests MUST be derived from the PRD, Tech.md, DB.md, and UI.md — never from the current implementation's behaviour.**

* The implementation may contain bugs or contradict the PRD. Tests exist to catch exactly that.
* If a test's expected outcome and the implementation disagree, the **test wins** by default; the discrepancy is reported as a suspected production defect per §10.
* Do not weaken an assertion, skip a test, or change an expected result to match what the code currently does.
* If a PRD requirement is ambiguous, incomplete, or contradictory, document the ambiguity in the strategy phase (§11 step 4) and stop for direction. Do not invent a rule.
* Inspecting the implementation is allowed only to understand *how to invoke* each unit (route names, component props, store shapes, API URLs), never to decide *what the expected behaviour is*.

## 1. Analyze the Requirements First

1. Read the PRD (§2 actors, §3 grading model, §4 appeal flow, §5 screens — especially §5.2 Login, §5.3 Admin dashboard, §5.4 Professor dashboard, §5.5 Student dashboard, §5.6 Grading UI, §5.7 Navbar, §5.8 Modal, §5.9 My Profile, §5.10 Change password), `docs/Tech.md`, `docs/DB.md`, and `docs/UI.md`.
2. Extract every UI-visible functional requirement, business rule derived from server state, authorization-driven visibility rule, state transition, and time-dependent client behaviour that can be verified **through the mounted component tree** against mocked HTTP responses.
3. Produce a concise requirements traceability matrix mapping each covered PRD rule to its planned integration test(s). Present it in the strategy phase for review before implementation.

## 2. Scope: Component-Level Integration Tests Only

**Component-level integration tests exclusively. No pure unit tests of trivial helpers, no backend tests, no real-browser E2E (Playwright/Cypress), no visual-regression snapshots.** Each test:

* Mounts a real route (or a route subtree) via `createMemoryRouter` + `<RouterProvider>`, so React Router, `<AuthGuard>`, and `<RoleGate>` are all live.
* Uses the **real** Zustand `useUserStore`, the **real** `axiosClient` (including the silent-refresh interceptor and `withCredentials` wiring), and the real feature services.
* Uses **MSW 2 as the HTTP boundary** (default). Mocking the store or `axiosClient` at a higher boundary is permitted **only** for pure-UI tests where HTTP is not the point (e.g. `<Modal>` open/close, `<UserEditForm>` client-side Zod validation with no network call) — the test file must say so in a header comment.
* Interacts via `@testing-library/user-event` v14+ (`userEvent.setup()` per test). No fireEvent for user interactions.
* Asserts observable UI behaviour (what the user sees and can do), **not** implementation details (component state, callback invocation counts, store internals, specific CSS class names unless the PRD/UI.md names them).

Covered areas (all four, plus the two cross-cutting concerns listed in §2.5):

### 2.1 Auth and user flows

* `LoginPage` (§5.2): email + password required, email format, masked by default, show/hide eye toggle flips the input `type`, submit happy path routes to the role dashboard, 401 on bad credentials shows an error toast, 401 on soft-deleted login shows the same generic error, Serbian strings absent.
* `App` bootstrap (Task 13): on mount `GET /api/Account/Me` is called; 200 hydrates `currentUser`; 401 leaves it `null` and public routes still render; session-mismatch (currentUser goes `null` on a protected route) navigates to `/login`.
* `<AuthGuard>` and `<RoleGate>`: unauthenticated access to a protected route redirects to `/login` with a return target captured; wrong role redirects or renders a `403` fallback as spec'd in UI.md.
* **Silent 401 refresh** (`axiosClient` interceptor): a protected GET returns 401 → the client silently POSTs `/api/Account/Refresh` → retries the original request with `_retry` set → surfaces the eventual 200 to the component as if nothing happened. If `Refresh` fails, the user is force-logged-out (`clearAuthSession`), redirected to `/login`.
* **Refresh serialization**: two concurrent 401s share a single in-flight refresh promise; MSW asserts `/api/Account/Refresh` is called exactly once.
* `MyProfilePage` (§5.9): "Your Info" card renders role-appropriate fields; `[Edit profile]` opens the Modal with `<UserEditForm scope='self'>`; non-admin cannot see or submit `Email`; admin can.
* `<UserEditForm scope='self'|'admin'>` field-visibility matrix per §5.9, including: Student self → no Email, no IndexNumber; Admin self → Email editable, no IndexNumber, no UserRole, no IsDeleted; Admin → Student → all admin fields incl. IndexNumber; Admin → Professor → no IndexNumber; Admin → Admin → no UserRole, no IsDeleted.
* `UserEditForm` save semantics: self-scope sends only the fields the form rendered; admin-scope sends the admin DTO; a 403 (non-admin trying to change Email, admin trying to soft-delete self, admin trying to demote self) surfaces as a toast and leaves the Modal open.
* `ChangePasswordPage` (§5.10): three password inputs with show/hide eye icons, `New password` 12–128 enforced client-side, `Confirm new password` must equal `New password`; wrong current password surfaces the server's field error; successful 204 → `clearAuthSession({ redirectToLogin: true })` → `/login` renders a success toast.
* Admin dashboard Users tab (§5.3): own row has no Edit button; `Create User modal` uses `<UserCreateForm>` with show/hide password toggle and IndexNumber shown only when role=Student; `Edit User modal` uses `<UserEditForm scope='admin'>` and respects the matrix.
* Navbar (§5.7, Task 16): logged-out shows only `Login`; logged-in shows `Dashboard`, greeting with first name, Logout, and `My Profile` dropdown entry (Task 19B.5); current route gets `.active`; no `Students` link anywhere.

### 2.2 Grading UI

* `ProfessorDashboardPage` three columns (§5.4): subjects list → selecting a subject loads students; selecting a student loads the grading panel.
* 5-field grading panel (§5.6, Task 18.3): 5 number inputs with step `0.5` and the respective maxes; live-computed sum and final-grade preview update on every change; **Save draft** visible once any field is edited and no final grade is confirmed; **Confirm** visible only when all 5 fields have a numeric value; Save draft POSTs the current values; Confirm calls `/api/Grade/confirm` and the UI flips to the confirmed read-only view on 200.
* Draft load on student select: pre-fills the 5 inputs from `GET /api/GradeDraft/{enrollmentId}`.
* Read-only variant after Confirm (§5.6, Task 18.4): 5 inputs disabled and the final grade shown.
* Accepted-appeal re-grade variant (§5.6, Task 18.5): collapsed one-line summary of midterms/attendance/practical, editable exam input, Confirm available.
* Appeals section (§5.4 + Task 18.6): one row per Pending or Overdue appeal; `View appeal` opens a Modal showing `[OVERDUE]` history prefixed, greyed, read-only, no action buttons; current Pending text normal with Accept and Deny buttons; Accept/Deny not rendered for an Overdue entry.
* Deny confirm sub-step (Task 18.6): a confirm step inside the Modal must be clicked before the Deny POST fires.
* Deny undo (Task 18.7): post-deny the row shows `Undo` plus a 24h countdown; clicking Undo POSTs `/api/Appeal/{id}/undo-deny` and the appeal row flips back to Pending.
* The 24h countdown is a client-side `setInterval`: after exactly 24h of advanced time the Undo button disappears.
* Appeals section is **vertically scrollable** at the ~360 px max-height (§5.4) with sticky header; a container with ≥ 7 appeals renders a scrollbar inside the section.

### 2.3 Appeals from the student side

* `StudentDashboardPage` subjects table (§5.5, Task 17.2): columns Subject / Professor / Final grade (or `—`) / Status / Action.
* **Status column across every §4.6 state**: Fresh confirm with window live → 🟡 Awaiting confirmation; Pending appeal → 🔵 Appeal pending; Appeal denied truly final → 🟢/🔴 + 🔴 Appeal denied badge; Appeal accepted awaiting re-confirm → 🔵 Appeal pending; Overdue chain with window live → 🟡 Awaiting confirmation; Truly final → 🟢/🔴.
* **Action column across the same states**: Fresh window → Write appeal + Confirm grade; Pending or Accepted-awaiting-reconfirm → none; Appeal denied → none; Overdue chain with window live → Write appeal only; Truly final → none.
* `canWriteAppeal` and `canConfirmGrade` flags from the dashboard API drive the buttons exactly; the frontend never computes them from timestamps.
* Write-appeal Modal (§5.8, Task 17.3): blurred backdrop, textarea with 1000-char hard cap, Submit calls `/api/Appeal`, success refreshes the dashboard and closes the Modal; 1001 characters cannot be typed (or submit is disabled).
* Confirm-grade button (Task 17.4): POSTs `/api/Grade/student-confirm` and refreshes.
* The old `Students` link and page are absent (Task 17.5).

### 2.4 Dashboards and aggregates (UI binding only)

* `StudentDashboardPage` (§5.5): My Information card renders first/last name, email, index number; Study Statistics tiles bind to the payload — Average Grade with **two decimals**, Passed Exams count, Non-passed Exams count (failures + un-graded), Earned ECTS (sum). Zero-enrollment payload → tiles still render with zeros and the subjects table shows a friendly empty state.
* `ProfessorDashboardPage` (§5.4): My Subjects list binds to subjects; Students-in-subject list binds to the selected subject's enrolled students; Appeals section lists Pending + Overdue across every subject the professor owns and nothing else. Zero-subject payload → three empty columns + empty Appeals section.
* The dashboard components do not compute statistics themselves — they display what the API returns. A regression test: a payload with a known Average Grade of `8.37` renders exactly `8.37`, not `8.4` or `8`.

### 2.5 Cross-cutting

* **Responsive collapse** (Task 20, §5.3 / §5.5 / §5.4): assert the table-to-cards switch at the correct breakpoint — below `md` (768 px) for admin tables, below `sm` (576 px) for student subjects table and professor students / appeals lists. Use `matchMedia` mocking per §6.2 to exercise both branches. Verify that the collapsed-cards state carries the **same data** as the table state (one card per row, every column represented).
* **Accessibility**:
  * Every interactive element has an accessible name — button `name`, input `labelText`, link `name` queries succeed.
  * The reusable `<Modal>` (§5.8) traps focus when open, restores focus to the trigger on close, and `aria-modal="true"` + `role="dialog"` are present.
  * Password show/hide eye toggles have a reachable `aria-label` and the current state is announced (e.g., `aria-pressed` or label text swap).
  * The `.active` nav link has `aria-current="page"` per Navbar (§5.7).
  * The modal backdrop blur is purely decorative (`aria-hidden="true"`); it must not steal focus.
  * Form validation errors have an `aria-describedby` or `role="alert"` association with the input they describe.

## 3. Project Layout

The frontend already has Vitest, MSW 2, React Testing Library, `user-event`, and `jest-dom` wired up in Task 11.8. Build on that infrastructure — do not introduce new testing frameworks.

* Integration tests live under `frontend/src/test/integration/`, split by feature area:
  * `frontend/src/test/integration/auth/` — login, bootstrap hydration, silent refresh, change password.
  * `frontend/src/test/integration/user/` — profile, UserEditForm matrix, admin user CRUD UI.
  * `frontend/src/test/integration/grades/` — professor grading panel, draft load/save, confirm, accepted-appeal re-grade.
  * `frontend/src/test/integration/appeals/` — appeals section, view-appeal modal, student write-appeal, deny undo.
  * `frontend/src/test/integration/dashboards/` — student and professor dashboard UI binding and empty states.
  * `frontend/src/test/integration/components/` — focused tests on `<Modal>`, `<RoleGate>`, `<UserEditForm>`, responsive table util.
  * `frontend/src/test/integration/responsive/` — breakpoint collapse assertions.
  * `frontend/src/test/integration/a11y/` — focus trap, aria-current, aria-modal, aria-label on eye toggles, form error association.
* Shared helpers live under `frontend/src/test/helpers/`:
  * `renderWithProviders.tsx` — mounts a route tree with `createMemoryRouter` + `<RouterProvider>`, wraps the real `useUserStore`, mounts `<ToastContainer>`, returns `{ user, router, store }`.
  * `authenticatedRender.tsx` — primes `useUserStore` with a seeded user (Student / Professor / Admin) and marks hydration complete, so `<AuthGuard>` lets the test through.
  * `mswHandlers/` — handler builders per feature area; a `buildHandlers(overrides)` factory that composes a default happy-path set with per-test overrides.
  * `fixtures/` — typed response fixtures (`StudentDashboardFixture`, `ProfessorDashboardFixture`, `AppealFixture`, `UserFixture`), including backdated-deadline fixtures (near-expiry `confirmationDeadline`, recent `ReviewedAt` for undo-countdown tests).
  * `time.ts` — thin wrappers around `vi.useFakeTimers()` / `vi.setSystemTime()` / `vi.advanceTimersByTimeAsync()`, so time control is uniform across the suite.
  * `matchMedia.ts` — `mockMatchMedia(width: number)` installs a `window.matchMedia` stub so Bootstrap breakpoint queries resolve deterministically.
* **No new runtime dependencies in `package.json`.** Only dev dependencies if any one of the above helpers genuinely needs an additional package (justify in the subtask's commit message).

## 4. Fixture and Reset Strategy

* **MSW server lives for the whole test file** via `beforeAll(() => server.listen())` / `afterAll(() => server.close())`. Already wired in `src/test/setup.ts` (Task 11.8); do not duplicate.
* `afterEach(() => server.resetHandlers())` — per-test handler overrides never leak.
* Reset the Zustand store between tests via `useUserStore.setState(initialState, true)` in `afterEach`. The reset helper lives in `renderWithProviders`.
* Clear `document.body` is handled by RTL's auto-cleanup; do not call `cleanup()` manually.
* `onUnhandledRequest: 'error'` is already set in the MSW server config — a test that forgets to stub an endpoint fails loudly, as intended.
* The MSW `Set-Cookie` headers for `sp_access` / `sp_refresh` (Task 11.8) are the only auth plumbing — tests never read cookies directly. The test instead verifies behaviour: a 401 → refresh → retry sequence succeeds, or a `change-password` success triggers the redirect.

## 5. Authentication State in Tests

Tests do not sign in through the Login page unless the test is specifically about the Login page. The default:

* `authenticatedRender({ as: 'student' | 'professor' | 'admin' | 'student-no-enrollments' })` primes `useUserStore.currentUser` with a seeded fixture user, sets `isHydrating = false`, and installs matching MSW handlers (so `GET /api/Account/Me` returns the same user, and the role-scoped endpoints return seeded payloads).
* `renderAnonymously(route)` leaves the store empty and `GET /api/Account/Me` returns 401 — for AuthGuard redirect tests and public-page tests.
* **Never** touch `document.cookie` or set `Authorization` headers in tests. The silent-refresh test asserts behaviour (one `/Refresh` call, retry succeeds), not cookies.

## 6. Time and Media Control

### 6.1 Vitest fake timers for client-side time logic

Use `vi.useFakeTimers({ shouldAdvanceTime: false })` + `vi.setSystemTime(iso)` to pin "now", then `await vi.advanceTimersByTimeAsync(ms)` to cross boundaries. Required boundary coverage:

| Boundary | Before | At | After |
|---|---|---|---|
| 24h deny-undo countdown | 23h 59m 59s — Undo button visible, countdown shows 00:00:01 | 24h 00m 00s — Undo button disappears | 24h 00m 01s — Undo still absent |
| Appeal-window button visibility (driven by `canWriteAppeal` / `canConfirmGrade` flags from API — client never recomputes) | API flag `true` → both buttons visible | flag flips to `false` on next refresh → buttons gone | — |
| ChangePasswordPage success → redirect | 203 ms after the 204 response the toast is on screen on `/login` | the toast respects the react-toastify dismiss time | — |

### 6.2 `matchMedia` mocking for responsive assertions

Install a `matchMedia` stub that returns `matches: true` for queries up to the given viewport width and `matches: false` otherwise, via `mockMatchMedia(width)`. Required coverage (one test per breakpoint boundary per table):

| Table | Breakpoint | Below shows | At / above shows |
|---|---|---|---|
| Admin Users / Subjects / Enrollments | `md` (768 px) | stacked cards | `<table>` |
| Student subjects | `sm` (576 px) | stacked cards | `<table>` |
| Professor students / appeals | `sm` (576 px) | stacked cards | `<table>` |

Target widths: 575 px (below `sm`), 576 px (at `sm`), 767 px (below `md`), 768 px (at `md`). Verify that the collapsed cards contain the **same data cells** as the table.

### 6.3 Backdated API-response fixtures

For state that the client renders from server-provided timestamps (deny-undo `ReviewedAt`, dashboard `confirmationDeadline`), expose fixture builders that produce rows at an exact offset from the pinned clock:

* `fixtures.gradeWithDeadlineInSeconds(60)` — Awaiting confirmation, 1 min to go.
* `fixtures.appealDeniedSecondsAgo(60)` — Denied 1 min ago, Undo should be visible with ~23h 59m remaining.
* `fixtures.appealDeniedSecondsAgo(24 * 3600)` — Denied exactly 24h ago, Undo gone.

## 7. Test Design Rules

For every PRD rule in §2, cover:

* **Happy paths** — valid user flow, correct final UI state, correct toast, correct navigation target.
* **Unhappy paths** —
  * Client-side Zod validation errors (empty FirstName, bad email format, mismatched Confirm password, `New password` below 12 chars or above 128).
  * Server 400 with field errors → the field error renders inline, Modal / page stays open, no toast swallowed.
  * Server 401 on a protected route → silent refresh success keeps the user in place; silent refresh failure → force logout → `/login`.
  * Server 403 → toast + stays on page (profile Email change for non-admin, admin self-soft-delete, admin self-demote).
  * Server 404 → appropriate empty / not-found state as per UI.md.
  * Network error (MSW `HttpResponse.error()`) → user-visible error toast, no crash.
* **Edge cases** —
  * Empty collections: student with zero enrollments, professor with zero subjects, zero appeals, zero drafts — the UI renders empty-state copy, not a broken table.
  * Payload shape: Average Grade `8.37` renders exactly `8.37`; Final grade `null` renders `—`; `IsDeleted` absent from every response (regression guard — the fixture must not include it).
  * **1000-character appeal text accepted; 1001 characters cannot be submitted** — either the textarea's `maxLength` enforces it or the submit button disables.
  * The deny-undo countdown's final tick: at `vi.advanceTimersByTimeAsync(24 * 3600 * 1000 - 1)` → Undo visible; at `+1 ms` → gone.
  * Admin's own row has no Edit button; non-admin viewing `/admin-dashboard` is redirected or 403'd by RoleGate.
  * `<UserEditForm scope='self'>` with the Email field hidden: forging a payload with `Email` set via DOM manipulation is impossible — the form never renders the input, so no `Email` can ever be submitted.
  * Modal backdrop click: dismisses the Modal; Modal `Escape` key dismisses; focus returns to the opener.
  * Toast on login error has `role="alert"` and is announced to screen readers.
* **Authorization / visibility** —
  * `<RoleGate>` denies a Student from `/admin-dashboard` and a Professor from `/student-dashboard`; the redirect target matches UI.md.
  * The My Profile matrix is correct in every one of the five combinations in §5.9.
* **Time boundaries** — the three-point (before / at / after) rule from §6.1.
* **Responsive** — the breakpoint tests in §6.2.
* **A11y** — the focus-trap, aria-current, aria-modal, aria-label, form-error-association tests in §2.5.

**One logical behaviour per test.** Descriptive names following `describe('<Feature>', () => it('when X then Y', ...))`. Parameterized tests via `it.each([...])` for matrix / boundary coverage. Prefer `screen.findByRole` / `getByRole` over `getByTestId`; use `data-testid` only when the PRD / UI.md names no accessible name.

## 8. Anti-Patterns to Avoid

* `fireEvent` for user interactions — use `userEvent.setup()`.
* `waitFor(() => expect(mock).toHaveBeenCalled())` — assert UI state, not call counts.
* `screen.getByTestId` as a first resort — accessible queries first (`getByRole`, `getByLabelText`, `getByText`).
* Snapshot tests of entire component trees — fragile, hide intent.
* Mocking `axiosClient`, `useUserStore`, or feature services as the default — MSW is the boundary. Higher-boundary mocks only for the pure-UI tests listed in §2.
* Real `setTimeout` / `setInterval` waits for time-dependent UI — use `vi.useFakeTimers()`.
* Hardcoded wall-clock delays (`await new Promise(r => setTimeout(r, 500))`).
* Minting cookies by hand or stubbing `document.cookie` — the real pipeline covers it.
* Testing Serbian strings — the project is English-only after Task 0; a stray Serbian word is a regression and should surface via copy assertions where the PRD names the exact English copy (and only there).
* **Writing a test against what the component does rather than what the PRD says.** This is the biggest anti-pattern for this task — see §0.

## 9. Subtasks (each gets its own local commit)

- **22c.1** Scaffold the integration test tree + shared helpers.
  - Create `frontend/src/test/integration/` with the subfolders listed in §3.
  - Create `frontend/src/test/helpers/renderWithProviders.tsx`, `authenticatedRender.tsx`, `fixtures/`, `mswHandlers/`, `time.ts`, `matchMedia.ts`.
  - Extend the MSW handler set in `frontend/src/test/server.ts` with the per-feature default happy-path handlers.
  - Add a smoke test: `renderWithProviders` mounts the home page and `getByRole('heading', { name: /Student Portal/i })` passes.
  - Commit: `test(frontend): scaffold integration test tree and shared render/MSW helpers`

- **22c.2** Auth and user flow tests.
  - `LoginPage`: validation, show/hide, happy-path redirect per role, 401 toast, soft-deleted login generic error.
  - `App` bootstrap: `Me` 200 hydrate, `Me` 401 leaves `currentUser` null, session-mismatch redirect.
  - `<AuthGuard>` / `<RoleGate>`: redirects, return-target preservation, wrong-role denial.
  - `axiosClient` silent refresh: 401 → `/Refresh` → retry succeeds; `Refresh` failure → force logout.
  - Refresh serialization: two concurrent 401s share one in-flight `/Refresh`.
  - `MyProfilePage`: info card renders, `[Edit profile]` opens Modal.
  - `<UserEditForm scope='self'|'admin'>` matrix: five parameterized cases per §5.9.
  - `UserEditForm` save semantics: self-scope payload omits hidden fields; admin-scope payload includes admin fields; 403 toast surfaces for non-admin trying to change Email, admin self-soft-delete, admin self-demote.
  - `ChangePasswordPage`: validation, show/hide, wrong-current 400 field error, success 204 → `clearAuthSession` → `/login` + toast.
  - Admin Users tab: own row no Edit button, Create modal with role=Student exposes IndexNumber, Edit modal matrix.
  - Navbar: logged-out shows only Login, logged-in shows Dashboard + greeting + My Profile dropdown + Logout, `.active` + `aria-current="page"` on current route, no Students link.
  - Commit: `test(frontend): integration tests for auth and user flows`

- **22c.3** Grading UI tests.
  - `ProfessorDashboardPage` three-column flow: subject select → students load → student select → grading panel loads.
  - 5-field grading panel: input `step=0.5` and maxes, live sum + final-grade preview, Save draft visibility, Confirm visibility only when all 5 filled, Confirm transitions to read-only view on 200.
  - Draft load pre-fills inputs; Save draft POSTs the current values; second Save on same enrollment hits the same URL (store is at API level).
  - Read-only confirmed variant: inputs disabled, final grade shown.
  - Accepted-appeal re-grade variant: collapsed summary line, editable exam input, Confirm restored.
  - 400 on malformed submit: field error surfaces; Modal / panel stays open.
  - 403 on cross-professor interaction: toast + no state change (the frontend should not even expose cross-prof data; this test guards the handler mapping).
  - Commit: `test(frontend): integration tests for professor grading UI`

- **22c.4** Appeals UI tests (student + professor sides).
  - Student side: Write-appeal Modal, blurred backdrop present, textarea 1000-char cap, 1001 cannot be submitted; Submit success refreshes dashboard and closes Modal; Submit 400 field error renders inline; Submit while a Pending exists (API refuses) surfaces as a toast.
  - Student side: Confirm-grade button POSTs `/api/Grade/student-confirm` and the row flips to Truly final on refresh.
  - Professor side: Appeals section row rendering (Pending vs Overdue); View appeal Modal shows `[OVERDUE]` history greyed and current Pending normal; Accept/Deny buttons absent for Overdue entries; Accept flow writes `/accept`, Deny flow writes `/deny` after a confirm sub-step.
  - Deny undo: countdown ticks every second (verify via fake timers advancing 1 s and the rendered countdown decrementing by 00:00:01); Undo visible at 23h 59m 59s; disappears at exactly 24h; Undo click POSTs `/undo-deny` and the row flips to Pending.
  - Commit: `test(frontend): integration tests for appeals UI with time boundaries`

- **22c.5** Dashboard aggregate UI binding tests.
  - Student dashboard: Average Grade `8.37` renders exactly `8.37`; Passed Exams count renders; Non-passed count renders; Earned ECTS renders; subjects table rows map 1:1 to payload rows.
  - **Status + Action column matrix across every §4.6 state** as parameterized tests (Fresh / Pending / Denied / Accepted-awaiting / Overdue+live / Truly final): status label + colour + action-button set correct for each.
  - `canWriteAppeal` / `canConfirmGrade` from API drive buttons exactly — a test with `canWriteAppeal: true` and `canConfirmGrade: false` renders only Write appeal; swapping the flags swaps the buttons; both false renders no buttons.
  - Student with zero enrollments: tiles render zeros, subjects table renders empty-state copy.
  - Professor dashboard: subject / student / appeal lists bind to payload; Appeals section lists Pending + Overdue only (a Denied-inside-undo appeal must not appear here).
  - Professor with zero subjects: three empty columns + empty Appeals section.
  - Commit: `test(frontend): integration tests for dashboard aggregates and empty states`

- **22c.6** Reusable-component focused tests.
  - `<Modal>`: `open=true` renders dialog, `open=false` does not; `role="dialog"` + `aria-modal="true"`; backdrop click closes; `Escape` closes; focus trapped between first and last focusable; focus restored to opener on close; backdrop has `aria-hidden="true"`.
  - `<RoleGate>`: allows children for matching role; denies for mismatch; the denial path routes to the UI.md-defined fallback.
  - `<UserEditForm>`: client-side Zod validation (empty FirstName, bad Email format, over-max lengths); rejects submit with validation errors visible; emits only the fields it rendered on save.
  - Responsive table util (Task 20.1): swapping viewport width across the breakpoint shows table vs cards without data loss.
  - Commit: `test(frontend): integration tests for Modal, RoleGate, UserEditForm, responsive table`

- **22c.7** Responsive assertions.
  - Per the table in §6.2: at 575 px and 576 px, at 767 px and 768 px, the correct layout renders for admin tables, student subjects table, professor students + appeals lists.
  - Content parity: every column present in the table appears as a labelled field inside the collapsed card.
  - Commit: `test(frontend): responsive integration tests at sm and md breakpoints`

- **22c.8** Accessibility assertions.
  - Every page's primary heading is `h1` and reachable by `getByRole('heading', { level: 1 })`.
  - All interactive controls have an accessible name (iterate across the mounted trees for each page and assert `toHaveAccessibleName()` on buttons / inputs / links).
  - Modal focus trap + focus restoration + `role="dialog"` + `aria-modal="true"` (shared with 22c.6 — a11y file asserts the invariant on a representative Modal usage per feature, 22c.6 tests the component in isolation).
  - Password show/hide eye toggles have a reachable `aria-label` and the pressed state is announced.
  - `.active` nav link carries `aria-current="page"`.
  - Form validation errors are associated via `aria-describedby` or `role="alert"`.
  - Commit: `test(frontend): accessibility integration tests for pages and shared components`

- **22c.9** Run the full suite, produce the pass/fail report, propose fixes for failures.
  - Run `npm run test -- --run` (or the project's canonical Vitest invocation if named differently in `package.json`) from `frontend/`.
  - Capture the raw Vitest output; summarize into: total / passed / failed / skipped, with a per-feature-area table.
  - For each failing test, report (per the PRD §0 rule — the test wins by default):
    1. Fully qualified test name (`describe > it`).
    2. The PRD requirement it maps to (section + line reference).
    3. The expected behaviour per the PRD.
    4. The actual observed behaviour and the relevant failure message.
    5. Likely root cause, clearly distinguishing confirmed findings from hypotheses.
    6. Whether the failure indicates a production defect, a test defect, an environment problem, or an ambiguous requirement.
    7. A concrete, ordered remediation plan with the files and methods you expect to modify.
  - **Stop before fixing production code.** Present the report and wait for explicit approval before any production-code change outside the test files themselves. See §10.
  - Commit (test files only): `test(frontend): run full integration suite and record baseline report`
  - Save the full report to `frontend/src/test/integration/REPORT.md` as part of the same commit.

- **22c.10** README for the frontend integration test suite.
  - Create `frontend/src/test/integration/README.md` covering: how to run the suite (`npm run test`), how to run a single file, how `renderWithProviders` and `authenticatedRender` work, the MSW handler-override pattern, the `vi.useFakeTimers()` + `mockMatchMedia` conventions, the fixture catalogue, and the PRD-as-source-of-truth rule.
  - Commit: `docs(tests): README for frontend integration test suite`

**You:** nothing — this suite runs in Node 20 via Vitest and jsdom; Docker is not required.

## 10. Reporting and Stop-Before-Fixing-Production Rule

After the suite is implemented and executed (22c.9), report:

* Framework, package versions, test count (per-area + total).
* Pass / fail / skipped counts — actually measured, do not claim a pass you did not observe.
* PRD requirement(s) each failing test maps to.
* Whether a failure indicates a production defect, a test defect, an environment problem, or an ambiguous requirement.
* A concrete, ordered remediation plan per failing test.
* The names of failing tests and their associated application components.
* Any requirements that could not be fully verified at this layer (document as limitation; do not escalate to Playwright or E2E as part of this task).

**Do not modify production code to make a test pass.** No pre-approved production-code change exists for this task (unlike 22a's TimeProvider injection). Any production fix requires explicit approval first. See §0 — the test wins over the implementation by default.

If a test fails because the fixture or helper is wrong (test defect), fix the test and re-run before reporting. If a test fails because the implementation disagrees with the PRD, report per §9's 22c.9 steps and wait.

## 11. Execution Order

1. Read PRD, Tech.md, DB.md, UI.md.
2. Build the requirements traceability matrix.
3. Inspect existing frontend features, routes, components, store shape, and MSW setup (to learn how to invoke the UI — not to decide expected behaviour, which comes from the PRD per §0).
4. Present the strategy, the traceability matrix, and any ambiguities for review.
5. Implement subtasks 22c.1 → 22c.10 in order, each in its own commit.
6. Run the full suite (22c.9) and report real results. Save `REPORT.md`.
7. If anything fails: stop, report per §10, wait for approval before any production fix.

**Start with steps 1–4. Do not modify any files until you have presented the strategy and matrix for my review.**


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
