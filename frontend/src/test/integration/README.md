# Frontend Integration Test Suite

Component-level integration tests for the SPA. Mounts real routes against the real `axiosClient`, real `useUserStore`, and the real component tree, with **MSW 2** as the HTTP boundary. The source of truth is `docs/PRD.md` (plus `Tech.md`, `DB.md`, `UI.md`), not the current implementation — see §0 below.

## Running

From `frontend/`:

```bash
npm run test                      # watch mode
npx vitest run                    # one-shot (all tests)
npx vitest run src/test/integration/auth
npx vitest run src/test/integration/auth/LoginPage.test.tsx
```

Node 20+. **No Docker required** — this suite is Vitest + jsdom.

## Layout

```
src/test/
  server.ts            MSW node server (default handlers)
  setup.ts             beforeAll/afterEach/afterAll + modal-root + store reset
  helpers/
    renderWithProviders.tsx   renderApp / renderAt
    authenticatedRender.tsx   authenticatedRender / renderAnonymously
    time.ts                   pinNow / advance
    matchMedia.ts             mockMatchMedia(width)
    fixtures/                 users, studentDashboard, professorDashboard
    mswHandlers/              meHandler, loginHandler, dashboard handlers, …
  integration/
    smoke.test.tsx
    auth/                     LoginPage, bootstrap, AuthGuard, silent refresh, ChangePassword, Navbar
    user/                     UserEditForm matrix + save semantics, MyProfilePage
    grades/                   ProfessorDashboardPage grading flow
    appeals/                  StudentAppeal + ProfessorAppeal (incl. deny-undo)
    dashboards/               Student + Professor UI binding + aggregates
    components/               Modal, RoleGate
    responsive/               Student subjects + professor appeals breakpoint parity
    a11y/                     h1, aria-current, aria-modal, labels, alert
    REPORT.md                 baseline run report (22c.9)
```

## §0 — PRD is the source of truth

Tests MUST be derived from the PRD. When a test and the implementation disagree, the test wins and the discrepancy is reported in `REPORT.md`. Do not weaken an assertion, skip a test, or change an expected result to match current behaviour.

## Core helpers

### `renderApp({ initialEntries })`
Mounts the full App shell (Navbar, AuthGuard, ToastContainer, outlet) in a `createMemoryRouter`. Returns `{ user, router, ...render result }`. Use this when you need the real bootstrap flow (`GET /Account/Me`) and routing.

### `authenticatedRender({ as, initialEntries })`
Primes `useUserStore` with a seeded `student` | `professor` | `admin`, sets `isHydrating=false`, and installs an `/Account/Me` handler returning the same user. Fast path for tests that need to land on a protected page.

### `renderAnonymously(path)`
Mounts the App with `/Account/Me` returning 401 — for public pages and AuthGuard-redirect tests.

### `renderAt(element, path?)`
Mounts a single component inside a minimal MemoryRouter plus a ToastContainer. For pure-UI tests (`<Modal>`, `<UserEditForm>` matrix) where HTTP is not the point.

## MSW override pattern

The default handlers in `src/test/server.ts` are the happy-path baseline. Override per test with:

```ts
import { server } from '../../server';
import { studentDashboardHandler } from '../../helpers/mswHandlers';
server.use(studentDashboardHandler(myFixture));
```

The MSW server lives for the whole file (`beforeAll` / `afterAll`); `afterEach(() => server.resetHandlers())` is already wired in `setup.ts`. `onUnhandledRequest: 'error'` — forgotten endpoints fail loudly, as intended.

## Fixtures catalogue

- `seededStudent | seededProfessor | seededAdmin` (store users).
- `studentFx.emptyStudentDashboard`, `.dashboardWith837Average` (regression guard for PRD §2.4), `.dashboardFreshAwaiting`, `.dashboardPendingAppeal`, `.dashboardAppealDenied`, `.dashboardTrulyFinal`, `.makeSubject(overrides)`.
- `professorFx.emptyProfessorDashboard`, `.singleSubjectWithStudent`, `.makeSubject`, `.makeStudentRow`, `.makeAppealRow`.

## Time control

```ts
import { pinNow, advance } from '../../helpers/time';
pinNow('2026-10-20T12:00:00Z');
await advance(60_000);
```

`setup.ts` restores real timers in `afterEach`.

## Responsive helper

jsdom does **not** evaluate CSS media queries — both the table and the stacked-cards layouts are always in the DOM. The current responsive tests assert content parity between the two representations. For future tests whose implementation calls `window.matchMedia(...)`, use:

```ts
import { mockMatchMedia } from '../../helpers/matchMedia';
mockMatchMedia(575);   // below sm
```

## Anti-patterns

Avoid: `fireEvent` (use `userEvent.setup()`), `toHaveBeenCalled` on an axios mock (we don't mock axios), `getByTestId` as first resort (prefer `getByRole` / `getByLabelText` / `getByText`), hard-coded `setTimeout` waits, snapshot-of-tree tests, writing tests against what the code currently does rather than what the PRD requires.
