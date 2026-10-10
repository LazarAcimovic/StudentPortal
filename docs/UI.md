# UI Features & Patterns

> This document is the **source of truth for visual rules, interaction patterns, copy and responsiveness**. Product rules live in `PRD.md`. Code structure lives in `Tech.md`.

---

## 1. Visual foundation

- **Framework:** Bootstrap 5 (`bootstrap@5.3.8` is already in `frontend/package.json`). All layout, typography, spacing, cards, forms, alerts, modals and tables use existing Bootstrap classes. **Do not** introduce Tailwind, shadcn, radix, lucide-react, or `cn()` helpers.
- **Icons:** FontAwesome (already installed via `@fortawesome/react-fontawesome` + `@fortawesome/free-solid-svg-icons`) for anywhere icons are already used. For one-off icons (password-field eye), prefer inline SVG so we don't pull in extra packages.
- **Font:** Browser default + Bootstrap's native stack. No `@fontsource` imports.
- **Colour palette:** Bootstrap defaults.
  - Primary blue — brand, call-to-action buttons, active nav link.
  - Success green — Passed status, confirmation.
  - Danger red — Failed status, Appeal denied badge, destructive buttons.
  - Warning yellow — Edit buttons, "Awaiting confirmation" status.
  - Secondary grey — overdue appeal text, disabled inputs, "Not graded" status.
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
```

Multiple badges stack with `ms-1` spacing.

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
- Password field uses `type="password"` by default. **No** show/hide toggle on the login screen (toggle is only on admin create-user per PRD).
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

| Tile | Format | Source |
|---|---|---|
| Average Grade | one decimal (`.toFixed(1)`), big green `<h2>` | mean of final grades 6–10 across truly-final grades (failures excluded) |
| Passed Exams | integer, big primary `<h2>` | count of truly-final grades with `FinalGrade >= 6` |
| Non-passed Exams | integer, big danger `<h2>` | count of truly-final `FinalGrade = 5` **plus** count of enrollments with no truly-final grade yet |
| Earned ECTS | integer, big info `<h2>` | sum of `Subject.ECTS` across truly-final passed grades |

Zero values render as `0`, not em-dash.

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

Below `sm`: table collapses to one card per subject.

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

### 7.1 Three-column layout (desktop)

`row g-3` with three `col-lg-4`. On `<lg` the columns stack vertically.

- **Column 1 — My Subjects**: `list-group` of selectable subjects. The selected subject has `active` class.
- **Column 2 — Students in {subject}**: `list-group` of students enrolled in the selected subject. The selected student has `active` class.
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

### 7.4 Appeals section

Below the three columns, a full-width card titled "Appeals". Table columns:

| Student | Subject | Submitted | Status | Action |

- `Submitted` is relative time ("2 days ago") computed client-side from the backend `submittedAt` + current time.
- `Status` badge: `Pending` (info), `Overdue` (grey).
- `Action`: `[View appeal]` button opens the reusable `<Modal>`.

Below `sm`: table collapses to cards.

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

## 8. Admin dashboard

### 8.1 Tabs

Three Bootstrap pill tabs: Users, Subjects, Enrollments. The active tab's content renders below; non-active content is unmounted (`conditional rendering`, no `display:none` hiding).

### 8.2 Users tab

Table columns (desktop): ID (short, first 8 chars of GUID), First Name, Last Name, Email, Role, Status (Active green badge / Inactive secondary badge from `IsDeleted`), Action.

Above the table: `[Create New User]` button (success).

Below `md`: cards per user.

### 8.3 Create / Edit user modals

Create form fields:
- First name — required, 1–50 chars.
- Last name — required, 1–50 chars.
- Email — required, email format, 1–100 chars.
- Role — select (Student / Professor / Admin).
- Index number — required if role=Student, hidden otherwise.
- Password — required, 12–128 chars. **With show/hide toggle:** `<input type={show ? 'text' : 'password'}>` paired with a `[btn btn-outline-secondary]` showing an inline SVG eye icon that toggles state.

Edit form fields:
- Same as create minus the Password field.

### 8.4 Subjects tab

Table columns (desktop): Subject Name, ECTS, Professor, Action.

Create / Edit subject fields:
- Subject Name — required, 1–100 chars.
- ECTS — required, integer 1–30, default 6.
- Professor — select populated from `/api/User?role=Professor`.

### 8.5 Enrollments tab

Table columns (desktop): Student, Subject, Enrolled At, Action.

Create form fields:
- Student — select (students only).
- Subject — select.

No edit (delete / recreate instead).

---

## 9. Reusable primitives

### 9.1 `<Modal>`

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

### 9.2 `<PasswordInput>`

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

Renders a `.input-group` with an `<input>` + a `[btn btn-outline-secondary]` holding the eye SVG. Internal `useState` toggles `type` between `password` and `text`.

### 9.3 `<RoleGate>`

```ts
<RoleGate roles={[USER_ROLES.ADMIN]}>
  <AdminDashboardPage/>
</RoleGate>
```

Reads `currentUser` via slice-selector; if role not in list → `<Navigate to="/" replace/>`.

### 9.4 `<AuthGuard>`

Reads `currentUser` + `isHydrating`. While `isHydrating`: spinner. If `currentUser` is null after hydration: `<Navigate to={APP_ROUTES.AUTH_LOGIN} state={withAuthRedirect(location)} replace/>`. Otherwise `<Outlet/>`.

### 9.5 Toasts

- Mounted once in `App.tsx` via `<ToastContainer position="top-right" autoClose={3500}/>`.
- Fired via `toast.success(...)`, `toast.error(...)`, `toast.info(...)` from any service / page.
- `appealService.submit` fires `toast.success('Appeal submitted')` on 201.

---

## 10. Responsiveness

### 10.1 Breakpoints (Bootstrap defaults)

| Prefix | Min width |
|---|---|
| `xs` | 0 |
| `sm` | 576 px |
| `md` | 768 px |
| `lg` | 992 px |
| `xl` | 1200 px |

### 10.2 Collapse rules (per PRD §5)

| Context | Table cutoff | Below cutoff |
|---|---|---|
| Admin tables (Users, Subjects, Enrollments) | `md` (768 px) | Stacked cards, scrollable page |
| Student subjects table | `sm` (576 px) | Stacked cards |
| Professor students list | `sm` (576 px) | Already a list-group — stays vertical |
| Professor appeals table | `sm` (576 px) | Stacked cards |

### 10.3 QA checklist (per Task 20.3)

Test the following widths in Chrome devtools:

- **320 px** — iPhone SE first-gen. Everything must still fit; no horizontal scrollbar on any page.
- **375 px** — iPhone X / 13 Mini.
- **414 px** — iPhone 13 Pro Max.
- **576 px** — exactly at the `sm` boundary; verify student/professor tables flip to cards here.
- **768 px** — exactly at the `md` boundary; verify admin tables flip to cards here.
- **992 px** — exactly at the `lg` boundary; verify the professor 3-column layout appears.
- Spot-check in **landscape** on 414 / 576 — some phones become wider than `sm` sideways.

### 10.4 Spacing

- Minimum tap target 44×44 px: all buttons use `btn-sm` on compact rows but with `py-2 px-3` so they stay ≥ 44 px tall.
- Minimum gutter 16 px: use `container` (which has 12 px gutter at `sm`, 16 px above `sm`) and avoid flush-left content on `xs` by applying `px-3` on the outermost container.

---

## 11. Copy conventions

- All UI copy is **English**. No remaining Serbian strings.
- Buttons use imperative verbs: "Save draft", "Confirm grade", "Write appeal", "Submit", "Cancel", "Delete".
- Status badges use adjectives / past-tense: "Passed", "Failed", "Not graded", "Awaiting confirmation", "Appeal pending", "Appeal denied".
- Error messages are concrete and short: "Invalid email or password", "Password must be at least 12 characters", "Appeal text is required".
- Toasts are one sentence, no punctuation at the end: `toast.success('Appeal submitted')`, `toast.error('Could not save draft')`.
- Dates on screen: short local format (`navigator.language` + `toLocaleDateString()`). Relative times ("2 days ago") computed with a small `utils/relativeTime.ts` helper (no `date-fns`, no `dayjs` dependency — write the ~20-line helper).

---

## 12. Accessibility baseline

- Every `<input>` has an associated `<label htmlFor>`.
- Every button that's icon-only has an `aria-label`.
- Modals use `role="dialog"` + `aria-modal="true"` + `aria-labelledby` referencing the title id. Focus moves to the first focusable element inside the modal on open; returns to the trigger on close.
- Colour alone never conveys meaning (every status badge has text too).
- Focus outlines: do not remove Bootstrap's default focus rings.
- Form validation: on submit, if validation fails, focus the first invalid input.
