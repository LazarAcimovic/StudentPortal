# Architecture — frontend

> Source of truth for **how the React SPA is laid out, how it fetches data, and how it is tested**.
>
> Libraries and versions live in [`Tech.md`](Tech.md) §1. Product behaviour lives in `PRD.md`. Visual rules, copy and responsiveness live in `UI.md`.

---

## Section index

> Agents: do not Read this file whole. `grep -n "^## " docs/Tech-Frontend.md` for live line numbers, then Read with `offset`/`limit`. This index carries **no** line numbers on purpose (per D-011).

| Section | Title |
|---|---|
| 1 | Project layout |
| 2 | React patterns in use (and not in use) |
| 3 | Data-fetching hook templates |
| 4 | Axios singleton and routing |
| 5 | State management and forms |
| 6 | Styling |
| 7 | Testing |

---

## 1. Project layout

> **Verified against the working tree at commit `85f802b` (2026-10-29); legacy `src/models/`, `src/services/data/`, page folders and empty `components/common/` removed in refactor-01.** Before creating a file at any path below, confirm the parent directory still exists (Glob or `ls`). If it does not, fix this section in the same commit as your change (AGENTS §7).

```
frontend/src/
  App.tsx                       root <RouterProvider/> and the bootstrap useEffects
  main.tsx                      createRoot + Bootstrap CSS + react-toastify CSS
  index.css
  config/constants.ts           APP_ROUTES, API_ROUTES enums
  providers/
    router.tsx                  createBrowserRouter config
    authGuard.tsx               <AuthGuard>
    RoleHomeRedirect.tsx        <RoleGate> fallback: sends a mismatched role to its own dashboard
  components/
    ui/                         Modal.tsx, Navbar.tsx, PasswordInput.tsx, UserEditForm.tsx
    shared/                     RoleGate.tsx
  features/
    auth/
      api/authService.ts        login, logout, me, refresh (refresh called by the interceptor)
      constants/constants.ts
      models/schemas/loginSchema.ts
      pages/LoginPage.tsx
      index.ts
    user/                       ← dashboards, profile, and every admin/professor/student component
      api/userService.ts        CRUD on /api/User (admin side)
      api/profileService.ts     getMe, updateProfile, changePassword
      components/admin/         UsersTable, UserCreateForm, SubjectsTable,
                                SubjectCreateForm, SubjectEditForm,
                                EnrollmentsTable, EnrollmentCreateForm,
                                EscalationsTab
      components/professor/     SubjectsList, StudentsList, GradePanel,
                                AppealsSection, ViewAppealModal,
                                AssignedCasesSection, AssignedCaseItem,
                                AppealHistory, ResolveModal,
                                ScenarioAPanel, ScenarioBPanel
      components/student/       StudentInfoCard, StudyStatsCard, SubjectsCard,
                                AppealModal, ConfirmGradeModal
      components/profile/       ProfileInfoCard
      constants/                constants.ts + professor/ + student/ + admin/
      hooks/useStudentDashboard.ts        Pattern A — GET /api/Student/me/dashboard
      models/studentDashboard.ts
      models/professor/         professorDashboard.ts, gradePanel.ts
      pages/                    StudentDashboardPage, ProfessorDashboardPage,
                                AdminDashboardPage, MyProfilePage, ChangePasswordPage
      utils/                    dateUtils.ts, profileSchemas.ts, gradeUtils.ts, subjectSchemas.ts
      index.ts
    grades/
      api/gradeService.ts       POST /api/Grade/confirm, /reconfirm-exam, /student-confirm
      api/gradeDraftService.ts  GET+PUT /api/GradeDraft/{enrollmentId}
      hooks/useProfessorDashboard.ts      Pattern A — GET /api/Professor/me/dashboard
      models/                   grade.ts, gradeDraft.ts, professorDashboard.ts,
                                confirmGradeModal.ts
      constants/constants.ts
      index.ts
    appeals/
      api/appealService.ts      POST /api/Appeal (submit), /{id}/accept, /deny, /undo-deny
      models/appealModal.ts
      index.ts
    subjects/
      api/subjectService.ts
      api/enrollmentService.ts
      models/                   enrollment.ts, subject.ts
      index.ts
    escalations/
      api/escalationService.ts   getCases, getEligibleProfessors, assign, reassign
      hooks/useEscalations.ts    Pattern A — GET /api/Escalation
      hooks/useEligibleProfessors.ts  Pattern B — GET /api/Escalation/eligible-professors
      models/escalation.ts       EscalatedCase, AssignmentHistoryEntry, EscalationStatus, EligibleProfessor
      index.ts
  lib/
    navigation.ts               navigation singleton
    auth.ts                     clearAuthSession, withAuthRedirect, getRedirectTarget
  pages/
    HomePage.tsx                public landing
  shared/
    api/axiosClient.ts          singleton with withCredentials + silent refresh
    api/index.ts                barrel
    constants/                  constants.ts, icons.tsx
    models/                     User.ts, ChangePasswordFormState.ts
  store/
    user/useUserStore.ts        currentUser, isHydrating, setters
  test/                         see §7
```

**Where things go.** All three dashboards and every role-specific component live under `features/user/`, grouped by role in `components/<role>/`. `features/grades`, `features/appeals` and `features/subjects` own their **services, models and hooks** but no pages — the pages that use them are the dashboards under `features/user/pages/`. This is deliberate: a dashboard is a *user's* view, not a grade's view.

**Barrels.** Every feature exports its public surface via `index.ts`. Imports go through the barrel, not deep paths.

### 1.1 Professor dashboard payload — read before coding

`GET /api/Professor/me/dashboard` returns one `ProfessorDashboardDto` with three arrays — `subjects: ProfessorSubjectDto[]`, `appeals: ProfessorAppealRowDto[]`, and `assignedCases: AssignedCaseDto[]` — which together surface every state the professor UI cares about. Do **not** call `/api/Appeal/pending` from the dashboard page; it returns a literal `Status = Pending` subset, narrower than the UI needs.

| Appeal / grade state | Where it appears | How the UI knows |
|---|---|---|
| **Pending** | `appeals[]` | `row.status === "Pending"`, no `canUndoDeny` |
| **Overdue** (review deadline missed) | `appeals[]` | `row.status === "Overdue"` (computed on read from `SubmittedAt + 7d < now`) |
| **Denied, inside the 24 h undo window** | `appeals[]` | `row.status === "Denied"` + `row.canUndoDeny === true` + `row.undoDenyDeadline` |
| **Accepted, exam not yet re-confirmed** | `subjects[].students[]` (not in `appeals[]`) | `student.gradeState === "ReconfirmNeeded"` + `student.hasActiveAppeal === true` |
| **Escalated and assigned to me** | `assignedCases[]` | one row per grade where `AssignedProfessorId == me` and `FinalizedAt == null` (PRD §4.8) |
| **Denied past 24 h** | absent | filtered server-side by `AppealRepository.GetAppealsByProfessorIdForDashboardAsync` |
| **Accepted and re-confirmed, grade final** | absent | nothing left to do |

So the Appeals section renders from `payload.appeals`, the Assigned Cases section from `payload.assignedCases`, and the "needs re-grade" signal lives inside the subject column's student row — one request, three render locations.

---

## 2. React patterns in use (and not in use)

**In use:**

- Function components only.
- Pages hold state; presentational pieces take data via props.
- Composition via `children` / `<Outlet/>`.
- `useState`, `useEffect`, `useCallback` (only where a stable identity is required for a dependency), `useMemo` (only where profiling shows a real need), `useRef` sparingly (mount guards).
- Zustand slice-selectors: `useUserStore(s => s.currentUser)` — never whole-store destructuring.
- **Data-fetching custom hooks are the first-class pattern for every network read**: one hook per fetch, in the owning feature's `hooks/` folder, named `use<Noun>` (plural for a collection), calling a service function from that feature's `api/` folder. See §3 for the two canonical templates.
- `AbortSignal` plumbed hook → service → axios on every fetch.

**Not in use (do not introduce):**

- Class components. HOCs. React Context (beyond React's own Router / provider context). `React.memo`, `React.lazy`, `Suspense`. `forwardRef`, `useImperativeHandle`. `useReducer`, `useLayoutEffect`, `useTransition`, `useSyncExternalStore`, `useFormStatus`, `useActionState`.
- Advanced TypeScript (no conditional types, no mapped types beyond trivial, no deep inference puzzles). Prefer `type` over `interface`.
- Custom hooks of any kind **other than data-fetching hooks**. No `useForm`, no `useToggle`, no `useLocalStorage`, no `useDebounce`.
- A cookie / local-storage / auth-token wrapper service.
- React Query, SWR, TanStack Query, Redux, Jotai, Recoil, MobX.

---

## 3. Data-fetching hook templates

Every network read goes through one of these two shapes. **Match them exactly** — do not invent variants. One hook per fetch; one service per feature; both live in the feature folder.

**Pattern A — auto-fetch on mount.** For data a page always needs the moment it opens: dashboards, admin lists.

```ts
// features/user/hooks/useStudentDashboard.ts
export function useStudentDashboard() {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStudentDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const dashboard = await getStudentDashboard(controller.signal);

        setData(dashboard);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError : new Error('Failed to load dashboard.'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadStudentDashboard();

    return () => controller.abort();
  }, []);

  return { data, isLoading, error };
}
```

Rules for Pattern A:

- `data` initialises to `null` for a single object, `[]` for a collection; `isLoading` to `true`; `error` to `null`.
- The `useEffect` dep array is **empty**. The hook fetches exactly once per mount.
- Build an `AbortController` inside the effect, define an inner `async function load<Noun>()`, and `void` the call (React effects cannot be async).
- `catch`: return early if `controller.signal.aborted`; otherwise coerce to `Error` and `setError`.
- `finally`: only `setIsLoading(false)` if not aborted, so a late response from an abandoned mount cannot flip loading on stale state.
- Cleanup returns `() => controller.abort()`.
- Return shape is always `{ data, isLoading, error }`, optionally renaming the first key to the hook's noun.

**Pattern B — imperative loader.** For a fetch that depends on something the user does after mount: picking a subject, selecting a student, opening a modal that needs history.

```ts
// features/subjects/hooks/useStudentsBySubject.ts
export function useStudentsBySubject() {
  const [data, setData] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadStudents = useCallback(async (subjectId: string, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      const students = await getStudentsBySubject(subjectId, signal);

      if (!signal?.aborted) {
        setData(students);
      }
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }

      setError(loadError instanceof Error ? loadError : new Error('Failed to load students.'));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  return { data, isLoading, error, loadStudents };
}
```

Rules for Pattern B:

- No `useEffect` inside the hook. Fetching is caller-triggered.
- The loader is wrapped in `useCallback` with an empty dep array so its identity is stable and safe to use as a dependency.
- The **caller** owns the `AbortController`, so it can cancel on its own trigger changes:

  ```tsx
  useEffect(() => {
    if (!selectedSubjectId) return;
    const controller = new AbortController();
    void loadStudents(selectedSubjectId, controller.signal);
    return () => controller.abort();
  }, [selectedSubjectId, loadStudents]);
  ```
- Return shape is `{ data, isLoading, error, load<Noun> }`.

**Both patterns call the feature's own `api/*Service.ts` functions.** Services catch and re-throw as `Error`, accept an optional `AbortSignal`, and map response rows through `utils/map*.ts` where field renames are needed. Services never set React state — they return data.

**Client-side pagination** (per D-031 — student/professor per-user lists). The hook fetches all items once (Pattern A), then exposes `page`, `pageSize`, `setPage`, `setPageSize` as local `useState`. The visible slice is computed with `useMemo`:

```ts
const visibleItems = useMemo(
  () => items.slice((page - 1) * pageSize, page * pageSize),
  [items, page, pageSize],
);
const totalItems = items.length;
```

Changing `pageSize` resets `page` to 1. No extra network request is made for a page change.

**Server-side pagination** (per D-031 — admin lists and professor students). The hook extends Pattern B: the loader accepts `page` and `pageSize` and the caller re-triggers it when either changes. Return shape adds `totalItems`:

```ts
return { data, totalItems, isLoading, error, loadPage };
```

The service function maps the backend envelope `{ items: T[], total: number }` before returning.

---

## 4. Axios singleton and routing

**Axios** (`shared/api/axiosClient.ts`), on every request:

- `baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'`.
- `withCredentials: true` so cookies always travel.
- Default `Content-Type: application/json`.
- No `Authorization: Bearer` header — the JWT is in the httpOnly cookie.

Response interceptor:

- On `401` and `!config._retry`: set `_retry = true`, call `POST /api/Account/Refresh` (serialised through a module-scoped `refreshPromise` so a burst of 401s triggers exactly one refresh), then retry the original request.
- On refresh failure (the retried `401`): call `clearAuthSession({ redirectToLogin: true })` — clears the user store and navigates to `/login` via the navigation singleton.
- On `403`: **do not touch the session** — reject the promise so the caller handles it. A `403` is an authorization failure (authenticated, wrong role), not an authentication failure; clearing the session on `403` logged users out of a still-valid session whenever a request their role could not make slipped through (per D-029).

**Routing:**

- `createBrowserRouter` + `<RouterProvider/>`.
- Protected routes wrap `<AuthGuard>`, which reads `currentUser` + `isHydrating`, renders a spinner while hydrating, and `<Navigate to={APP_ROUTES.AUTH_LOGIN} replace/>` when unauthenticated.
- Role-restricted routes additionally wrap `<RoleGate allowed={USER_ROLES.Admin} fallback={<RoleHomeRedirect/>}>`. The fallback (`providers/RoleHomeRedirect.tsx`) redirects a mismatched role to its **own** dashboard, so a role never mounts another role's page and never fires the requests the backend answers with `403` (per D-030). The three dashboard routes are gated; `/profile` and `/profile/change-password` stay open to any authenticated user.
- Imperative navigation from non-components uses `lib/navigation.ts`, registered by `App.tsx`'s first `useEffect`.

---

## 5. State management and forms

**State.** `useUserStore` is the only global slice: `currentUser`, `isHydrating`, `setCurrentUser`, `clearCurrentUser`, `setHydrating`. **No `token` field** — the server owns token lifetime via cookies. Everything else is local `useState`.

**Forms.** Raw `useState` for values, a parallel `useState` for `touched` flags, one Zod schema per form in the feature's `utils/` (or `models/schemas/` where that is already the convention, as in `features/auth`):

```ts
const validation = schema.safeParse(form);
const fieldErrors = validation.success ? {} : (validation.error.flatten().fieldErrors as LoginFieldErrors);
// show errors only when touched[field] is true
```

Submit flow: mark all touched → bail if invalid → set `isSubmitting` → service call → `setServerError` on failure → navigate or toast on success.

A mutation that can fail **per field** — e.g. create-user, where a duplicate email returns `409` — resolves to a structured result (`{ ok: true, … } | { ok: false, fieldErrors?, message? }`) that the form maps onto the offending field (`fieldErrors`) or the top-of-form alert (`message`), instead of a toast. See `features/user/api/userService.ts` (`addUser`).

---

## 6. Styling

- Bootstrap 5 via the CSS import in `main.tsx`.
- No Tailwind, no shadcn, no CSS modules, no styled-components.
- Component-local styles use the inline `style` prop, or a single `.css` file next to the component when non-trivial.
- Colour comes from Bootstrap utility classes. The one documented exception is the escalation badge (UI §1, D-014).

---

## 7. Testing

Vitest + jsdom + React Testing Library + user-event + jest-dom. MSW 2 is the HTTP mock boundary.

**Two co-existing layouts:**

- **Unit tests, co-located** next to the subject: `features/<domain>/api/*.test.ts`, `features/<domain>/hooks/*.test.tsx`, `components/**/*.test.tsx`, `lib/*.test.ts`, `store/**/*.test.ts`. One component, hook, store, schema, service or helper per file.
- **Integration tests, dedicated folder** at `src/test/integration/<area>/`: multi-component flows and full page trees with router + MSW. Areas: `auth/`, `appeals/`, `dashboards/`, `grades/`, `user/`, `components/`, `a11y/`, `responsive/`.

**Shared helpers at `src/test/helpers/`:**

- `renderWithProviders.tsx` — anonymous render with the provider shell.
- `authenticatedRender.tsx` — render under a logged-in role (`as: 'student' | 'professor' | 'admin'`), router (`initialEntries`), all providers.
- `matchMedia.ts` — jsdom-safe `matchMedia` mock for responsive assertions.
- `time.ts` — fake-timer helpers that pair with `vi.useFakeTimers()`.
- `fixtures/` — typed response fixtures (student / professor dashboard payloads, users).
- `mswHandlers/` — MSW handler factories per endpoint, overridable per test with `server.use(handler)`.
- `src/test/factories.ts` — factory builders for user / subject / grade / appeal shapes.

**Mocking strategy:**

- Service modules (API functions) → **MSW** (real axios call, mocked HTTP response).
- Component / page tests → `vi.mock()` the service module. Faster, no network layer.
- Store, lib, Zod schema → no mocking. Pure units.
- Axios interceptor → MSW with handler sequencing (first 401, then 200 after refresh).
- Never mock what the test is verifying.

**Test naming.** Describe blocks reference the rule they enforce — e.g. `describe('StudentDashboardPage aggregates (PRD §5.5)', ...)`. Test names describe behaviour from the user's point of view.

**Time control (two treatments):**

- **Backend-authoritative display:** the server returns the full state (status, flags, deadlines) and the component just renders it. The test asserts the render.
- **Client-side countdown:** the component runs a timer (the 24 h undo-deny countdown). The test uses `vi.useFakeTimers()` to advance.
- No wall-clock sleeps.

**MSW setup.** `src/test/server.ts` with `onUnhandledRequest: 'error'`. Handlers emit `Set-Cookie` headers so axios plus jsdom cookie-jar emulation cover the full cookie plumbing. Vitest globals (`describe`, `it`, `expect`, `vi`) are configured, not imported.

**Running.** `npm run test` from `frontend/` (equivalent to `vitest`). jsdom and MSW are configured in `vitest.config.ts`.
