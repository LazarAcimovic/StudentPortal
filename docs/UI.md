# UI Features & Patterns

> This document is the **source of truth for visual rules, interaction patterns, copy and responsiveness**. Product rules live in `PRD.md`. Code structure lives in `Tech.md`.

---

## Section index

> Agents: do not Read this file whole. `grep -n "^## " docs/UI.md` for live line numbers, then Read with `offset`/`limit`. This index carries **no** line numbers on purpose (per D-011).

| Section | Title |
|---|---|
| 1 | Visual foundation |
| 2 | Layout patterns |
| 3 | Navbar |
| 4 | Home page |
| 5 | Login page |
| 6 | Student dashboard |
| 7 | Professor dashboard |
| 8 | Admin dashboard |
| 9 | My Profile page |
| 10 | Change password page |
| 11 | Reusable primitives (includes §11.7 `<Pagination>`) |
| 12 | Responsiveness |
| 13 | Copy conventions |
| 14 | Accessibility baseline |

---

## 1. Visual foundation

- **Framework:** Bootstrap 5 (`bootstrap@5.3.8` is already in `frontend/package.json`). All layout, typography, spacing, cards, forms, alerts, modals and tables use existing Bootstrap classes. **Do not** introduce Tailwind, shadcn, radix, lucide-react, or `cn()` helpers.
- **Icons:** FontAwesome (already installed via `@fortawesome/react-fontawesome` + `@fortawesome/free-solid-svg-icons`) for anywhere icons are already used. For one-off icons (password-field eye), prefer inline SVG so we don't pull in extra packages.
- **Font:** Browser default + Bootstrap's native stack. No `@fontsource` imports.
- **Colour palette:** Bootstrap defaults, applied through utility classes.
  - Primary blue — brand, call-to-action buttons, active nav link.
  - Success green — Passed status, confirmation.
  - Danger red — Failed status, Appeal denied badge, destructive buttons.
  - Warning yellow — Edit buttons, "Awaiting confirmation" status.
  - Info cyan — "Appeal pending" status, appeals review section header.
  - Secondary grey — overdue appeal text, disabled inputs, "Not graded" status.
  - **One documented exception (per D-014):** the "Under admin review" badge uses Bootstrap's own `$purple` `#6f42c1` via an inline `backgroundColor`, because Bootstrap 5 ships no `.bg-purple` utility. This is the only colour in the app not applied through a utility class. Do not add a second exception — if you need another distinct colour, raise it as a decision first.
- **Password fields:** every password input in the app is a `<PasswordInput>` (§11.2) with a show/hide eye toggle — login, admin create-user, and all three change-password fields (per D-001). There is no screen with a bare `type="password"`.
- **Language:** English only. No Serbian strings in UI (translate anything that lingers).

---

## 2. Layout patterns

### 2.1 Page shell

Every logged-in page renders inside a shared `<PageLayout>`:

```
<Navbar>
<main class="container my-4">
  {page content}
</main>
<ToastContainer />
```

- `container` for standard pages. `container-fluid` only when the page truly needs edge-to-edge (none of ours do).
- Top-level page heading uses `<h1>` with `mb-4`.

### 2.2 Section / card pattern

Grouped content lives in Bootstrap cards:

```jsx
<div className="card mb-4">
  <div className="card-header bg-primary text-white">
    <h5 className="mb-0">Section title</h5>
  </div>
  <div className="card-body">
    {content}
  </div>
</div>
```

Use `bg-primary` for identity sections (My Information), `bg-success` for stats, `bg-info` for the appeals review section.

### 2.3 Form pattern

```jsx
<div className="mb-3">
  <label htmlFor="email" className="form-label">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    className={`form-control ${touched.email && errors.email ? 'is-invalid' : ''}`}
    value={form.email}
    onChange={handleChange}
    onBlur={handleBlur}
    required
    autoComplete="username"
  />
  {touched.email && errors.email && (
    <div className="invalid-feedback">{errors.email[0]}</div>
  )}
</div>
```

Rules:
- Every input has `id`, `name`, `autoComplete`, `required` where applicable.
- Password inputs: `autoComplete="current-password"` on login, `"new-password"` on admin-create.
- Validation errors render **only** when `touched[field]` is true (Zod errors otherwise show as the user types the first character — annoying).
- Submit buttons disable while `isSubmitting`:
  ```jsx
  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
    {isSubmitting ? (
      <><span className="spinner-border spinner-border-sm me-2" role="status"/>Signing in…</>
    ) : 'Sign in'}
  </button>
  ```

### 2.4 Table pattern

```jsx
<div className="table-responsive d-none d-md-block">
  <table className="table table-hover align-middle">
    <thead>
      <tr>
        <th>Column</th>
        <th className="text-end">Action</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={r.id}>
          <td>{r.name}</td>
          <td className="text-end">
            <button className="btn btn-warning btn-sm">
              <i className="fas fa-pen"/> Edit
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div className="d-md-none">
  {rows.map(r => (
    <div key={r.id} className="card mb-2">
      <div className="card-body">
        <div className="fw-bold">{r.name}</div>
        {/* ... other fields as labelled lines ... */}
        <button className="btn btn-warning btn-sm mt-2 w-100">Edit</button>
      </div>
    </div>
  ))}
</div>
```

The `d-none d-md-block` + `d-md-none` pair gives us the table-above-`md` / cards-below-`md` behaviour for admin tables. For student/professor tables use `d-none d-sm-block` + `d-sm-none` (card cutoff at `sm`).

### 2.5 Status badges

```jsx
<span className="badge rounded-pill bg-success">Passed</span>
<span className="badge rounded-pill bg-danger">Failed</span>
<span className="badge rounded-pill bg-secondary">Not graded</span>
<span className="badge rounded-pill bg-warning text-dark">Awaiting confirmation</span>
<span className="badge rounded-pill bg-info text-dark">Appeal pending</span>
<span className="badge rounded-pill bg-danger ms-1">Appeal denied</span>
<span className="badge rounded-pill text-white" style={{ backgroundColor: '#6f42c1' }}>Under admin review</span>
```

Multiple badges stack with `ms-1` spacing.

The "Under admin review" badge is the escalation status (PRD §4.8) and the single documented colour exception (§1, D-014).

---

## 3. Navbar

- Brand: "Student Portal" linking to `/`.
- Replace `<Link>` with `<NavLink>` so React Router applies `.active` class on the current route automatically.
- Styles for active link: Bootstrap's default `.nav-link.active` works; override to a slightly brighter underline if needed via one line of inline CSS in `Navbar.css`.
- No "Students" link.
- Right side when logged out: a single "Login" button (`btn btn-outline-light`).
- Right side when logged in: greeting (`Hello, <firstName>`) + `Logout` button.

---

## 4. Home page

Single login button, in the Navbar only. The hero section keeps its headline + lead paragraph but has no button underneath. Below the hero the three feature cards stay (Grades, Subjects, Statistics) — translate the Serbian copy to English:

- "Overview of Grades — Track all your grades in one place. From preliminary to final, everything is transparent and accessible."
- "All Subjects — Access information about every subject you are enrolled in, including professor and ECTS data."
- "Statistics — Analyse your academic progress through interactive statistics such as average grade and earned ECTS."

---

## 5. Login page

- Centred card at `col-md-6 offset-md-3`.
- Card header: "Login" (`<h3>`).
- Two fields (email, password), both required, both show validation errors below after `touched`.
- The password field is a `<PasswordInput autoComplete="current-password">` (§11.2): masked by default, with a show/hide eye toggle (per D-001, PRD §5.2). Every password field in the app has this toggle.
- Submit error renders as a `<div className="alert alert-danger">` above the form.
- Success toast fires on successful login ("Welcome back, {firstName}") via react-toastify.

---

## 6. Student dashboard

### 6.1 Hero block
`<h1>Student Dashboard</h1>` and `<p>Hello, {firstName} {lastName}!</p>`.

### 6.2 My Information card (`bg-primary` header)
Three lines: Name, Email, Index Number.

### 6.3 Study Statistics card (`bg-success` header)
Four columns on desktop (`row g-3` with four `col-md-3`), collapsing to two columns at `sm` and one column at `xs`:

All four tiles count **only truly-final grades** (PRD §4.7, per D-005).

| Tile | Format | Source |
|---|---|---|
| Average Grade | **two decimals** (`.toFixed(2)`, per D-004), big green `<h2>` | mean of final grades 6–10 across truly-final grades (failures excluded) |
| Passed Exams | integer, big primary `<h2>` | count of truly-final grades with `FinalGrade >= 6` |
| Non-passed Exams | integer, big danger `<h2>` | count of truly-final `FinalGrade = 5` **plus** count of enrollments with no truly-final grade yet (per D-006) |
| Earned ECTS | integer, big info `<h2>` | sum of `Subject.ECTS` across truly-final passed grades |

Zero values render as `0`, not em-dash. The backend computes every figure; the component only formats (PRD §5.5 owns the definitions).

### 6.4 My Subjects table

Columns (desktop): Subject, Professor, Final grade, Status, Action.

| Grade state | Final grade cell | Status cell | Action cell |
|---|---|---|---|
| Not graded (no row in `Grades`) | `—` | `Not graded` grey badge | empty |
| Confirmed, inside 7-day student window, no appeal | the number | `Awaiting confirmation` warning badge | `[Write appeal]` and `[Confirm grade]` buttons |
| Confirmed, Pending appeal | the number | `Appeal pending` info badge | empty (student submitted) |
| Confirmed, Overdue appeal | the number | `Awaiting confirmation` warning badge | `[Write appeal]` (fresh window) |
| Appeal denied (inside 24h undo) | the number | `Passed` / `Failed` + `Appeal denied` red badge | empty |
| Truly final (passed) | the number | `Passed` green badge | empty |
| Truly final (failed) | the number | `Failed` red badge | empty |
| Appeal accepted, awaiting reconfirm | `—` | `Appeal pending` info badge | empty |
| Escalated to the admin (PRD §4.8) | the number | `Under admin review` purple badge | empty |

Below `sm`: table collapses to one card per subject.

**Pagination** (client-side, per D-031): default 5 rows per page, selector options 5 / 20 / 50. Renders the `<Pagination>` control (§11.7) whenever `totalItems >= 1`; hidden when the student has no subjects.

### 6.5 Write Appeal modal

Reusable `<Modal>`:
- Title: "Write an appeal for {subject name}".
- Body: `<textarea>` max 1000 chars with a live char counter.
- Backdrop: `.modal-backdrop` has `backdrop-filter: blur(4px)`.
- Footer: `[Cancel]` + `[Submit]`.
- On submit: service call → success toast ("Appeal submitted") → close modal → refetch dashboard.

### 6.6 Confirm Grade button

`btn btn-success btn-sm`. Click opens a small confirmation modal ("Confirm this grade now? You will not be able to appeal afterwards.") → POST → success toast → refetch.

---

## 7. Professor dashboard

### 7.1 Three-stage column layout

`row g-3` with three `col-12 col-sm-6 col-lg-4` children. That gives the three stages PRD §5.4 requires (per D-008):

| Width | Columns |
|---|---|
| < 576 px (`xs`) | 1 — each panel full width, stacked |
| 576–991 px (`sm`, `md`) | 2 — the third panel wraps onto its own row |
| ≥ 992 px (`lg` and up) | 3 — side by side |

Do not use a bare `col-lg-4`: it jumps straight from one column to three and skips the two-column stage.

- **Column 1 — My Subjects**: `list-group` of selectable subjects — every subject the professor teaches, including student-less ones (per D-028). The selected subject has `active` class. **Pagination** (client-side, per D-031): default 5 items per page, options 5 / 20 / 50; `<Pagination>` (§11.7) renders whenever `totalItems >= 1`.
- **Column 2 — Students in {subject}**: `list-group` of students enrolled in the selected subject. The selected student has `active` class. **Pagination** (server-side via `GET /professor/subjects/{subjectId}/students?page=N&pageSize=N`, per D-031): default 5 items per page, options 5 / 20 / 50; `<Pagination>` (§11.7) renders whenever the subject has at least one enrolled student. The list is empty — and the control hidden — until the professor selects a subject.
- **Column 3 — Grade for {student}**: the grading panel (§7.2).

### 7.2 Grading panel

A card containing 5 number inputs stacked vertically (desktop) or in a 2-column grid (`row g-2`, each in `col-md-6`) depending on space:

| Label | `min` | `max` | `step` |
|---|---|---|---|
| First midterm points | 0 | 30 | 0.5 |
| Second midterm points | 0 | 30 | 0.5 |
| Lecture attendance points | 0 | 5 | 0.5 |
| Practical class points | 0 | 5 | 0.5 |
| Exam points | 0 | 30 | 0.5 |

Below the inputs, a non-editable **Final grade** read-out: `{sum.toFixed(1)} / 100 → Grade {finalGradeNumber}` once all five fields have numeric values; otherwise `— / 100 → Grade —`.

Buttons row:
- `[Save draft]` — primary outline — visible whenever any input has been edited and the grade is not yet confirmed.
- `[Confirm grade]` — primary — **visible only** when all 5 inputs have a numeric value.

### 7.3 Grading panel variants

- **Fresh (no grade, no draft):** empty inputs.
- **Draft exists:** inputs pre-filled, Save draft and Confirm both available (Confirm only if all 5 filled).
- **Confirmed, no appeal:** 5 inputs rendered `disabled`, Final grade shown, no buttons.
- **Appeal accepted, awaiting reconfirm:** midterms + attendance + practical shown as a one-line read-only summary (`Midterms: 50/60 • Attendance: 5/5 • Practical: 4/5`); only Exam input editable; Final grade re-computes live; Confirm button re-appears.
- **Overdue appeal / Pending appeal for this grade:** the panel shows the confirmed grade read-only; a small banner above says "This student has a pending/overdue appeal — resolve it from the Appeals section below."
- **Escalated, assigned to me:** read-only, with a banner "This case is assigned to you — resolve it from the Assigned Cases section below." (§7.6)
- **Escalated, assigned to someone else:** read-only, no action buttons, banner "This case is under admin review and assigned to another professor." Write attempts would return `403` (PRD §4.8).

### 7.4 Appeals section

Below the three columns, a full-width card titled "Appeals". Table columns:

| Student | Subject | Submitted | Status | Action |

- `Submitted` is relative time ("2 days ago") computed client-side from the backend `submittedAt` + current time.
- `Status` badge: `Pending` (info), `Overdue` (grey).
- `Action`: `[View appeal]` button opens the reusable `<Modal>`.

Below `sm`: table collapses to cards.

**Pagination** (client-side, per D-031): default 5 rows per page, options 5 / 20 / 50. `<Pagination>` (§11.7) renders whenever there is at least one appeal row.

### 7.5 View Appeal modal

Reusable `<Modal>`:
- Title: "Appeal — {student name}, {subject name}".
- Body:
  - If there are prior overdue appeals for the same grade, each one shown as a `<blockquote>` with a grey left border and `[OVERDUE]` prefix label in grey.
  - The current Pending appeal body shown as a normal `<blockquote>`.
- Footer:
  - If the current appeal is `Pending`: `[Deny]` (danger) + `[Accept]` (success).
  - If the current appeal is `Denied` and `NOW - ReviewedAt < 24h`: a note "Denied {relative time}. Undo possible for {countdown}." + `[Undo deny]` button.
  - If the current appeal is `Overdue`: no action buttons; a note "This appeal is overdue — the student may submit a new one."

Clicking `[Deny]` shows a confirmation sub-step inside the modal: "Deny this appeal? The grade will become final immediately." → `[Cancel]` + `[Deny]`.
Clicking `[Accept]` closes the modal and refocuses the grading panel on the exam field (which is now editable).

---

### 7.6 Assigned Cases section

Below the Appeals section, a full-width card titled "Assigned Cases", rendered from `payload.assignedCases` (`Tech-Frontend.md` §1.1). **The whole section is hidden when the array is empty** — most professors never see it. Rules: PRD §4.8.

Table columns:

| Subject | Student | Grade | Reason | Action |

- `Reason` is a label, not the raw enum: `AcceptedUnresolved` → "Accepted appeal — awaiting re-grade", `ChainExhausted` → "Two overdue appeals — awaiting review".
- `Action` is a `[Resolve]` button (`btn btn-primary btn-sm`) opening the resolve modal.

**Resolve modal** (reusable `<Modal>` with a blurred backdrop):

- Appeal history list: each appeal as a `<blockquote>` with status, submitted date and text, oldest first.
- **Scenario A panel** (`reason === 'AcceptedUnresolved'`): the collapsed read-only summary of midterms / attendance / practical (same one-line format as §7.3), an editable Exam input, a live final-grade read-out, and `[Confirm]` → `POST /api/Grade/reconfirm-exam`.
- **Scenario B panel** (`reason === 'ChainExhausted'`): both overdue appeal texts, then `[Deny]` + `[Accept]` acting on the **latest** appeal. Deny shows the same confirmation sub-step as §7.5.
- On success: close the modal, remove the row, refetch the dashboard.

Below `sm`: the table collapses to stacked cards, `[Resolve]` full width.

**Pagination** (client-side, per D-031): default 5 rows per page, options 5 / 20 / 50. `<Pagination>` (§11.7) renders whenever there is at least one assigned case row; the section is hidden entirely when the array is empty.

An escalated case the professor does **not** hold shows nothing here, and their grading panel shows the read-only banner from §7.3 instead — write buttons are hidden because the backend would return `403` (PRD §4.8, D-017).

---

## 8. Admin dashboard

### 8.1 Tabs

Four Bootstrap pill tabs: Users, Subjects, Enrollments, Escalations. The active tab's content renders below; non-active content is unmounted (`conditional rendering`, no `display:none` hiding).

### 8.2 Users tab

Table columns (desktop): ID (short, first 8 chars of GUID), First Name, Last Name, Email, Role, Status (Active green badge / Inactive secondary badge from `IsDeleted`), Action.

Above the table: `[Create New User]` button (success).

Below `md`: cards per user.

**Pagination** (server-side, per D-031): default 15 rows per page, options 15 / 20 / 50. `<Pagination>` (§11.7) renders whenever the list has at least one user row.

### 8.3 Create / Edit user modals

**Create user form** (`<UserCreateForm>`):
- First name — required, 1–50 chars.
- Last name — required, 1–50 chars.
- Email — required, email format, 1–100 chars.
- Role — select (Student / Professor / Admin).
- Index number — required if role=Student, hidden otherwise.
- Password — required, 12–128 chars. **With show/hide toggle:** `<input type={show ? 'text' : 'password'}>` paired with a `[btn btn-outline-secondary]` showing an inline SVG eye icon that toggles state.

**Validation is inline, never a popup.** Each field shows a Bootstrap `invalid-feedback` message once it has been touched (the same touched-on-blur pattern as the login page, §5); there is no `alert()`. The Create button stays disabled until the form is valid. A server-side **duplicate email** (`409`) renders under the Email field; any other server error renders as a top-of-form `alert alert-danger` (per D-024).

**Edit user flow** uses the reusable `<UserEditForm scope='admin' user={row} callerRole={ADMIN}>` (see §11.6) opened inside the shared `<Modal>` (§11.1). Field visibility follows the matrix in §11.6 — `IndexNumber` shows only when the target is a Student; `UserRole` and `IsDeleted` are **hidden** when the target is another Admin. **Admin's own row in the Users table renders no Edit button** (no self-edit from admin dashboard — he uses `/profile`, see §9).

### 8.4 Subjects tab

Table columns (desktop): Subject Name, Subject Code, ECTS, Professor, Action.

**Pagination** (server-side, per D-031): default 15 rows per page, options 15 / 20 / 50. `<Pagination>` (§11.7) renders whenever the list has at least one subject row.

Create / Edit subject fields, in this order:
- Subject Name — required, 1–100 chars.
- **Subject Code** — required, 1–20 chars (per D-015), label `"Subject Code"`, placed directly below Subject Name. Help text: "Subjects sharing a code are the same course taught by different professors." Without it the subject has no eligible substitute professor, so an escalated case on it cannot be assigned (PRD §4.8).
- ECTS — required, integer 1–30, default 6.
- Professor — select populated from `/api/User?role=Professor`. **Soft-deleted (inactive) professors are excluded** from the list; an inactive user cannot be assigned a subject (per D-025). On the **edit** form the subject's current professor stays selectable even if inactive, but the subject cannot be reassigned to a different inactive one (per D-026).

**Validation is inline, never a popup** (same pattern as §5 / §8.3), on both the create and edit forms: each field shows a Bootstrap `invalid-feedback` once touched, the Create / Save Changes button stays disabled until the form is valid, and a server error (e.g. an inactive professor on edit) renders as a top-of-form `alert alert-danger` — no `alert()`.

### 8.5 Enrollments tab

Table columns (desktop): Student, Subject, Enrolled At.

Create form fields, inline-validated like §8.4 (Create disabled until both are chosen; a server error renders as a top-of-form `alert alert-danger`):
- Student — select of **active students only** (soft-deleted users are excluded).
- Subject — select, excluding subjects the chosen student is already enrolled in and any inactive subject.

Enrollments are **create-only: there is no edit and no delete** (per D-027). A duplicate (same student and subject), an inactive student or subject, or a non-student is rejected by the server with a specific `400` message shown inline.

**Pagination** (server-side, per D-031): default 15 rows per page, options 15 / 20 / 50. `<Pagination>` (§11.7) renders whenever the list has at least one enrollment row.

### 8.6 Escalations tab

One row per escalated case. Rules: PRD §4.8, PRD §5.3.

Table columns (desktop): **Subject**, **Student**, **Original Professor**, **Grade**, **Reason**, **Escalated Since**, **Status**, **Action**.

Row rendering by `escalationStatus`:

| Status | Badge | Action |
|---|---|---|
| `NeedsAssignment` | `badge rounded-pill bg-danger` "Needs assignment" | `[Assign professor]` |
| `Assigned` | `badge rounded-pill bg-info text-dark` "Assigned" | none |
| `NeedsReassignment` | `badge rounded-pill bg-warning text-dark` "Needs reassignment" | `[Reassign professor]` |
| `Resolved` | `badge rounded-pill bg-success` "Resolved" + resolved date, whole row `text-muted` | none |

`Escalated Since` is a relative time ("3 days ago") from the `escalatedSince` field via the helper in §13.

**Assign / Reassign modal** — one shared layout, blurred backdrop, title "Assign professor" or "Reassign professor":

- **Case detail**: subject (with its code), student, current grade, and the reason in prose.
- **Appeal history**: each appeal as a `<blockquote>` with status, submitted date and text.
- **Assignment history**, from `assignmentHistory[]`: a chronological table of professor name, assigned by, assigned at, and outcome — "Superseded" + date, "Active", or "Resolved". Hidden on a first assignment, when the list is empty.
- **Eligible professors**: fetched once on modal open from `GET /api/Escalation/eligible-professors?subjectCode={code}&gradeId={id}`, rendered as a radio-style `list-group` (the backend scopes it to one subject code and excludes the original professor and all past assignees, so the list is naturally short). If empty: the text "No eligible professors available" and a disabled Confirm.
- **Confirm** → `POST /api/Escalation/assign` on a first assignment, `POST /api/Escalation/reassign` on a later one. On success update the row in place and close.

**Pagination (per D-032):** The tab uses server-side pagination via the shared `<Pagination>` component. Default page size is **15** rows; the user may switch to **20** or **50** using the page-size selector beside the pager. The pager is hidden when there is only one page.

Below `md`: stacked cards like the other admin tabs, action button full width.

---

## 9. My Profile page

Accessible to **any authenticated user** at `/profile` (behind `<AuthGuard>`).

### 9.1 Layout

- `<h1>My Profile</h1>` with the owner's full name underneath (`<p className="text-muted">`).
- A read-only **"Your Info"** card (`bg-primary` header), content inside `<dl className="row">` — label (`<dt className="col-sm-3">`) + value (`<dd className="col-sm-9">`) rows. Fields shown (role-dependent):
  - Student: First Name, Last Name, Email, Index Number, Role, Member since.
  - Professor: First Name, Last Name, Email, Role, Member since.
  - Admin: First Name, Last Name, Email, Role, Member since.
- Two buttons below the card inside `<div className="d-flex gap-2">`:
  - `<button className="btn btn-primary">Edit profile</button>` — opens `<Modal title="Edit profile">` containing `<UserEditForm scope='self' user={currentUser} callerRole={currentUser.userRole}/>` (see §11.6).
  - `<Link className="btn btn-outline-primary" to="/profile/change-password">Change password</Link>`.

### 9.2 Save Changes behaviour

- Clicking **Save Changes** inside the modal validates the form, calls `profileService.updateProfile(dto)` which POSTs the only-rendered-fields payload to `PUT /api/Account/profile`.
- Missing fields in the payload are preserved by the backend; empty-string fields fail validation client- and server-side.
- Non-admin callers cannot change their own Email — the field isn't rendered for them (and backend returns 403 if bypassed).
- On success: close the modal, refetch `getMe()` to repopulate the Your Info card, fire `toast.success('Profile updated')`.

### 9.3 Responsiveness

Card and buttons use Bootstrap `col-md-8 offset-md-2` on desktop, full width below `md`.

---

## 10. Change password page

Accessible to **any authenticated user** at `/profile/change-password` (behind `<AuthGuard>`). Separate URL (not a modal) because success logs the user out of all sessions.

### 10.1 Layout

- `<h1>Change Password</h1>`.
- Hint paragraph `<p className="text-muted">You will be signed out of all sessions after a successful change.</p>`.
- Form card at `col-md-6 offset-md-3` containing three `<PasswordInput>` instances (§11.2 — show/hide eye icon on each):
  - **Current password** — required, `autoComplete="current-password"`.
  - **New password** — required, 12–128 chars, `autoComplete="new-password"`.
  - **Confirm new password** — required, must equal New password, `autoComplete="new-password"`.
- Footer buttons: `<button className="btn btn-primary">Change password</button>` + `<Link className="btn btn-outline-secondary" to="/profile">Cancel</Link>`.

### 10.2 Client-side validation

- Zod schema `changePasswordSchema` in `features/user/utils/profileSchemas.ts`:
  ```ts
  z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(128),
    confirmPassword: z.string(),
  }).refine(d => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
  ```
- Submit button disabled while `isSubmitting`.

### 10.3 Submit flow

1. SPA calls `profileService.changePassword({ currentPassword, newPassword })` → `POST /api/Account/change-password`.
2. On `400` (wrong current password): render field error "Current password is incorrect".
3. On `204`:
   - Call `clearAuthSession({ redirectToLogin: true })` (clears `useUserStore.currentUser`; backend already revoked all refresh tokens and cleared cookies).
   - Navigate to `/login`.
   - After navigation, fire `toast.success("Password changed — please sign in with your new password")`.

### 10.4 Responsiveness

Form card width is `col-md-6 offset-md-3` on desktop, `col-12` below `sm`.

---

## 11. Reusable primitives

### 11.1 `<Modal>`

Signature:

```ts
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  blurBackdrop?: boolean;
  children: ReactNode;
};
```

Behaviour:
- Renders via `createPortal` into a `<div id="modal-root">` appended to `document.body` (added in `index.html`).
- Uses Bootstrap `.modal.show.d-block` with `.modal-dialog` + `.modal-content`. No `@popperjs` interaction needed.
- `.modal-backdrop.show` sibling for the backdrop. If `blurBackdrop`, add inline `style={{ backdropFilter: 'blur(4px)' }}`.
- Esc key and backdrop click call `onClose`. Prevent body scroll (`document.body.style.overflow = 'hidden'`) while open.

### 11.2 `<PasswordInput>`

Signature:

```ts
type PasswordInputProps = {
  id: string;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  autoComplete: 'current-password' | 'new-password';
  required?: boolean;
  isInvalid?: boolean;
};
```

Renders a `.input-group` with an `<input>` + a `[btn btn-outline-secondary]` holding the eye SVG. Internal `useState` toggles `type` between `password` and `text`. The toggle button carries an `aria-label` of "Show password" / "Hide password" (§14).

**Used by every password field in the app** (per D-001): login (§5), admin create-user (§8.3), and all three change-password fields (§10). A raw `<input type="password">` anywhere is a bug.

### 11.3 `<RoleGate>`

```ts
<RoleGate roles={[USER_ROLES.ADMIN]}>
  <AdminDashboardPage/>
</RoleGate>
```

Reads `currentUser` via slice-selector; if role not in list → `<Navigate to="/" replace/>`.

### 11.4 `<AuthGuard>`

Reads `currentUser` + `isHydrating`. While `isHydrating`: spinner. If `currentUser` is null after hydration: `<Navigate to={APP_ROUTES.AUTH_LOGIN} state={withAuthRedirect(location)} replace/>`. Otherwise `<Outlet/>`.

### 11.5 Toasts

- Mounted once in `App.tsx` via `<ToastContainer position="top-right" autoClose={3500}/>`.
- Fired via `toast.success(...)`, `toast.error(...)`, `toast.info(...)` from any service / page.
- `appealService.submit` fires `toast.success('Appeal submitted')` on 201.
- `profileService.updateProfile` fires `toast.success('Profile updated')` on 204.
- `LoginPage` fires `toast.success('Password changed — please sign in with your new password')` on mount when the previous route was `/profile/change-password` (passed via `navigate(..., { state: { fromChangePassword: true } })`).

### 11.6 `<UserEditForm>`

Signature:

```ts
type UserEditFormProps = {
  scope: 'self' | 'admin';
  user: User;                 // the user being edited
  callerRole: UserRole;       // the role of the current signed-in user
  onSaved: () => void;        // parent re-fetches and closes the modal (if applicable)
};
```

**Behaviour:** renders only the fields allowed for the (scope, callerRole, user.userRole) triple per the matrix below. Validates with Zod (`updateProfileSchema` for self, `adminUpdateUserSchema` for admin). Submit dispatches to the appropriate endpoint; on success calls `onSaved()`.

**Field visibility matrix:**

| Field | Self + Student/Professor | Self + Admin | Admin → Student | Admin → Professor | Admin → Admin |
|---|---|---|---|---|---|
| FirstName | ✓ editable | ✓ editable | ✓ editable | ✓ editable | ✓ editable |
| LastName | ✓ editable | ✓ editable | ✓ editable | ✓ editable | ✓ editable |
| Email | *hidden* | ✓ editable | ✓ editable | ✓ editable | ✓ editable |
| IndexNumber | *hidden* | *hidden* | ✓ editable | *hidden* | *hidden* |
| UserRole | *hidden* | *hidden* | ✓ dropdown | ✓ dropdown | *hidden* |
| IsDeleted | *hidden* | *hidden* | ✓ checkbox | ✓ checkbox | *hidden* |

Three internal rules compute visibility — no deep nesting:

```ts
const showEmail       = scope === 'admin' || callerRole === USER_ROLES.ADMIN;
const showIndexNumber = scope === 'admin' && user.userRole === USER_ROLES.STUDENT;
const showAdminFields = scope === 'admin' && user.userRole !== USER_ROLES.ADMIN;
// UserRole + IsDeleted both bound to showAdminFields
```

**Endpoints dispatched:**
- `scope === 'self'` → `PUT /api/Account/profile`, body `{ firstName?, lastName?, email? }` (only the rendered fields are sent; omitted fields are preserved by the backend).
- `scope === 'admin'` → `PUT /api/User/{user.id}`, body `{ firstName, lastName, email, indexNumber?, userRole, isDeleted }` (all admin-rendered fields).

**Submit button label:** always "Save Changes" regardless of scope.

**Does not host the Change password button** — that lives on the `/profile` page itself (§9), not inside this form.

### 11.7 `<Pagination>`

Presentational component used by every paged list in the app. Signature:

```ts
type PaginationProps = {
  page: number;              // 1-based current page
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[]; // [5, 20, 50] or [15, 20, 50] — caller passes the right one
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};
```

Renders:
- A `"Total: N"` label (copy from §13).
- A `"Rows per page:"` label + `<select>` pre-filled with `pageSizeOptions` (copy from §13).
- Bootstrap's `<ul class="pagination">` with Prev / page numbers / Next. Prev is disabled on page 1; Next is disabled on the last page. The active page is marked with `.active`.

**Visibility rule (per D-031):** renders whenever `totalItems >= 1`; the parent is responsible for not rendering it at all when `totalItems === 0`. Even a single-page list (all items fit on one page) still renders the control so the "Total: N" count is always visible.

**Page-size defaults by dashboard context:**
- Student and professor sections: default `pageSize = 5`, `pageSizeOptions = [5, 20, 50]`.
- Admin sections: default `pageSize = 15`, `pageSizeOptions = [15, 20, 50]`.

These defaults are set at the call site, not inside `<Pagination>` itself — the component is page-size-agnostic.

---

## 12. Responsiveness

### 12.1 Breakpoints (Bootstrap defaults)

| Prefix | Min width |
|---|---|
| `xs` | 0 |
| `sm` | 576 px |
| `md` | 768 px |
| `lg` | 992 px |
| `xl` | 1200 px |

### 12.2 Collapse rules (per PRD §5)

| Context | Table cutoff | Below cutoff |
|---|---|---|
| Admin tables (Users, Subjects, Enrollments, Escalations) | `md` (768 px) | Stacked cards, scrollable page |
| Student subjects table | `sm` (576 px) | Stacked cards |
| Professor students list | `sm` (576 px) | Already a list-group — stays vertical |
| Professor appeals table | `sm` (576 px) | Stacked cards |
| Professor assigned-cases table | `sm` (576 px) | Stacked cards |

The professor dashboard's three selection columns are not a table and follow their own three-stage rule — 1 / 2 / 3 columns at `xs` / `sm` / `lg` (§7.1, per D-008).

### 12.3 QA checklist (per Task 20.3)

Test the following widths in Chrome devtools:

- **320 px** — iPhone SE first-gen. Everything must still fit; no horizontal scrollbar on any page.
- **375 px** — iPhone X / 13 Mini.
- **414 px** — iPhone 13 Pro Max.
- **576 px** — exactly at the `sm` boundary; verify student/professor tables flip to cards, **and** the professor dashboard goes from 1 column to 2 (§7.1).
- **768 px** — exactly at the `md` boundary; verify admin tables (including Escalations) flip to cards here.
- **992 px** — exactly at the `lg` boundary; verify the professor dashboard goes from 2 columns to 3 (§7.1).
- Spot-check in **landscape** on 414 / 576 — some phones become wider than `sm` sideways.

### 12.4 Spacing

- Minimum tap target 44×44 px: all buttons use `btn-sm` on compact rows but with `py-2 px-3` so they stay ≥ 44 px tall.
- Minimum gutter 16 px: use `container` (which has 12 px gutter at `sm`, 16 px above `sm`) and avoid flush-left content on `xs` by applying `px-3` on the outermost container.

---

## 13. Copy conventions

- All UI copy is **English**. No remaining Serbian strings.
- Buttons use imperative verbs: "Save draft", "Confirm grade", "Write appeal", "Submit", "Cancel", "Delete".
- Status badges use adjectives / past-tense: "Passed", "Failed", "Not graded", "Awaiting confirmation", "Appeal pending", "Appeal denied", "Under admin review", "Needs assignment", "Assigned", "Needs reassignment", "Resolved".
- Error messages are concrete and short: "Invalid email or password", "Password must be at least 12 characters", "Appeal text is required".
- Toasts are one sentence, no punctuation at the end: `toast.success('Appeal submitted')`, `toast.error('Could not save draft')`.
- Dates on screen: short local format, via `formatDate` in `features/user/utils/dateUtils.ts`.
- Relative times ("2 days ago") come from a `relativeTime` export in the same `dateUtils.ts` — no `date-fns`, no `dayjs` (Tech.md §1). **The helper does not exist yet**, so the relative times required by §7.4 and §8.6 currently render as absolute dates; building it is task 25.4.
- **Pagination total label:** `"Total: {N}"` — rendered as plain text above the Bootstrap pagination control (per D-031).
- **Pagination page-size selector:** label text `"Rows per page:"` followed by the `<select>` element (per D-031).

---

## 14. Accessibility baseline

- Every `<input>` has an associated `<label htmlFor>`.
- Every button that's icon-only has an `aria-label`.
- Modals use `role="dialog"` + `aria-modal="true"` + `aria-labelledby` referencing the title id. Focus moves to the first focusable element inside the modal on open; returns to the trigger on close.
- Colour alone never conveys meaning (every status badge has text too).
- Focus outlines: do not remove Bootstrap's default focus rings.
- Form validation: on submit, if validation fails, focus the first invalid input.
