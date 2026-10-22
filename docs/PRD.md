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

## 9. Implementation task list

Open tasks live in `docs/tasks/active.md`.
Completed tasks are archived in `docs/tasks/done/`.

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

---
