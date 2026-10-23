### Task 22 — Tests

#### Overview

Four test suites covering the StudentPortal stack:

- **22a** — Backend integration tests (xUnit + Testcontainers + Respawn + WebApplicationFactory + FakeTimeProvider).
- **22b** — Frontend unit tests (Vitest + jsdom + React Testing Library + MSW).
- **22c** — Frontend integration tests (Vitest + jsdom + RTL + MSW with multi-component flows).
- **22d** — End-to-end tests (Playwright + real backend + real frontend + Dockerized Postgres).

**Non-negotiable rule:** every test is derived from the PRD. If a test's expected outcome and the implementation disagree, the test wins by default and the discrepancy is a suspected production defect. Do not weaken an assertion, skip a test, or change an expected result to match current behavior. The ONLY pre-approved production change in this task is 22a.2 (TimeProvider injection).

Backend testing conventions (project layout, fixture pattern, Respawn, auth helpers, seed-vs-in-test policy, TimeProvider, anti-patterns, running) live in `docs/Tech.md` §2 Testing. Frontend testing conventions (co-located vs integration layout, shared helpers, mocking strategy, time control, MSW setup) live in `docs/Tech.md` §3 Testing. Load those first.

---

**22a — Backend integration tests**

#### 22a.1 — Test: Scaffold the integration test project

Rules: Tech.md §2 Testing (project layout, package set, image pinning).

- Create `backend/StudentPortal.IntegrationTests/StudentPortal.IntegrationTests.csproj` with: Microsoft.AspNetCore.Mvc.Testing, Testcontainers.PostgreSql, Respawn, Microsoft.Extensions.TimeProvider.Testing, FluentAssertions, xunit, xunit.runner.visualstudio, Microsoft.NET.Test.Sdk, coverlet.collector. Pin exact versions.
- Reference `StudentPortal.csproj`.
- Add `public partial class Program { }` at the end of `backend/StudentPortal/Program.cs`.
- Add the project to the solution file.

Commit: `test(backend): scaffold StudentPortal.IntegrationTests project`

#### 22a.2 — Backend-service: Inject TimeProvider in services that read "now"

Rules: Tech.md §2 Testing (time control), PRD §4 (appeal time rules).

- Replace `DateTime.UtcNow` in `AppealService`, `GradeService`, `GradeDraftService` (and any other "now" reader) with injected `TimeProvider.GetUtcNow()`.
- Register `TimeProvider.System` as the singleton default in `Program.cs`.
- Verify no behavior change: run existing unit tests — all still green.

Commit: `refactor(backend): inject TimeProvider for testable time-sensitive logic`

#### 22a.3 — Test: Integration test fixture + base class

Rules: Tech.md §2 Testing (fixture pattern, Respawn reset, auth helpers).

- `IntegrationTestFixture : IAsyncLifetime` — Postgres Testcontainer (`postgres:17`), WebApplicationFactory, EF migrate, Respawner, cached `seed.sql` contents.
- `[CollectionDefinition("Integration")]` + `ICollectionFixture<IntegrationTestFixture>`.
- `IntegrationTestBase` — per-test `ResetAndSeedAsync` in `InitializeAsync`, `CreateAuthenticatedClientAsync`, `CreateAnonymousClient`, cookie assertion helpers, `SeedUsers` constants, backdated-seed helpers.
- Smoke test: log in as seeded admin, hit `/api/Account/Me`.

Commit: `test(backend): add Testcontainers fixture, Respawn reset, and auth helpers`

#### 22a.4 — Test: Auth + user flow integration tests

Rules: PRD §6 (security — login, cookies, change-password sign-out-everywhere, refresh rotation, mass-assignment resistance), PRD §5.9 / §5.10 (profile and change-password flows), PRD §2.1 (admin self-restriction).

- Login happy path + wrong password → 401 generic error + soft-deleted → 401 generic error + cookies set with correct flags.
- Refresh rotates; refresh re-use detection revokes the whole chain.
- Logout clears both cookies.
- Change-password: correct current → 204 + all refresh rows revoked + old `sp_refresh` returns 401. Wrong current → 400 field error.
- Profile self update preserves missing fields; non-admin changing own `Email` → 403.
- Admin user CRUD guards: cannot soft-delete self, cannot demote self, cannot change role of another admin → 403.
- Mass-assignment: `PUT /api/User/{id}` with a different `Id` in the body → route id wins.
- Full 401/403 matrix across protected endpoints.

Commit: `test(backend): integration tests for auth and user flows`

#### 22a.5 — Test: Grading flow integration tests

Rules: PRD §3 (grading model — 5 fields, mapping, draft lifecycle, confirm, reconfirm).

- Draft `GET` happy path; `PUT` creates then updates in place (no duplicate); cross-professor 403 on another prof's draft.
- Confirm requires all 5 fields → 400 if any missing; happy path writes Grade + computed FinalGrade + deletes Draft + sets `ConfirmedAt`, leaves `FinalizedAt` NULL.
- Reconfirm exam after accepted appeal: only `ExamPoints` moves; other four fields frozen.
- Student-confirm sets `StudentConfirmedAt` + `FinalizedAt`; cross-student 403.
- Final-grade mapping `[Theory]` at every bucket boundary: 0, 50 → 5; 51, 60 → 6; 61, 70 → 7; 71, 80 → 8; 81, 90 → 9; 91, 100 → 10.
- Point-field validation `[Theory]`: 0.0 valid, exact max valid, max + 0.5 rejected, negative rejected, 0.3 (not step-aligned) rejected.

Commit: `test(backend): integration tests for grading flow`

#### 22a.6 — Test: Appeals flow integration tests with FakeTimeProvider

Rules: PRD §4 (full appeal flow including §4.1 window, §4.4 undo-deny, §4.5 overdue, §4.6 action-window rules, §4.7 ECTS rule).

- Submit happy path during the §4.6 window; refused outside; refused while a Pending exists (one-per-cycle).
- Accept / Deny inside the 7-day review window; both refused at and after 7d (overdue).
- Undo-deny at 23h 59m flips to Pending; refused at and after 24h.
- Overdue computed on read at the exact 7-day boundary (before: Pending; at and after: Overdue).
- Post-overdue second-appeal window: fresh 7 days from overdue moment; silent expiry does NOT auto-finalize (§4.6 Q53).
- Initial-window silent expiry: day 8 auto-finalizes (§4.6 Q28).
- Undo-past-day-7 edge: deny day 3, undo day 8 → appeal reads Overdue immediately; review clock NOT reset (§4.4).

Commit: `test(backend): integration tests for appeals flow with time-boundary coverage`

#### 22a.7 — Test: Dashboard aggregate integration tests

Rules: PRD §5.4 / §5.5 (dashboards), PRD §4.6 / §4.7 (status chain, Earned ECTS rule).

- Student dashboard — payload shape, Earned ECTS per §4.7 (truly-final AND final ≥ 6), Average Grade (two decimals, failures excluded), Passed Exams count, Non-passed count (failures + un-graded), per-subject status + action-button flags across every §4.6 state.
- Professor dashboard — subjects with enrolled students and their current grade/draft/appeal state; Appeals section lists Pending + Overdue across all the prof's subjects and nothing else.
- Empty-state: student with zero enrollments; professor with zero subjects.

Commit: `test(backend): integration tests for student and professor dashboards`

#### 22a.8 — Docs: README for the integration test project

Rules: none.

- Create `backend/StudentPortal.IntegrationTests/README.md` covering: Docker Desktop requirement, `dotnet test` command, approximate first-run time (image pull), the TimeProvider override pattern for new tests, the fixture/base-class contract.

Commit: `docs(tests): README for integration test project`

#### 22a.9 — Test: Run the full suite + deliver the pass/fail report (no commit — handoff step)

Rules: none.

- Execute `dotnet test backend/StudentPortal.IntegrationTests --logger "trx;LogFileName=integration-tests.trx"` from a clean checkout.
- Report (in chat, no file): summary line (Total / Passed / Failed / Blocked / Duration), passed-count by area, per-failure block (fully qualified test name, PRD section, expected, actual, classification, root cause, proposed fix, files to change), blocked-test reasons, PRD requirements covered vs uncovered, discrepancies.
- Stop before applying any production fix outside 22a.2's pre-approved TimeProvider injection. Wait for explicit approval, then apply only approved fixes and append a follow-up report.

---

**22b — Frontend unit tests**

#### 22b.1 — Test: Scaffold Vitest helpers, factories, smoke test

Rules: Tech.md §3 Testing (project layout, shared helpers, MSW setup).

- Create `src/test/server.ts` (MSW setup, `onUnhandledRequest: 'error'`), `src/test/helpers/renderWithProviders.tsx`, `src/test/helpers/time.ts`.
- Factory builders at `src/test/factories.ts` (user, subject, grade, appeal shapes).
- Smoke test: a trivial component renders.

Commit: `test(frontend): scaffold Vitest helpers, factories, and smoke test`

#### 22b.2 — Test: Lib, store, and axios interceptor

Rules: Tech.md §3 Testing (mocking strategy — stores and lib are no-mock; interceptor uses MSW handler sequencing).

- `useUserStore` transitions: set-user, clear-user, bootstrap.
- `lib/navigation` singleton behavior.
- Axios interceptor: on 401 → silent refresh → retry original; on refresh failure → force-logout + navigate to `/login`.

Commit: `test(frontend): lib helpers, user store, and axios interceptor`

#### 22b.3 — Test: Auth feature (schemas, service, LoginPage)

Rules: PRD §5.2 (login screen), PRD §6 (opaque error, cookie model), UI §5 (login page copy).

- `loginSchema` Zod: email format, required fields, password required.
- `authService.login` POSTs PascalCase body; parses response.
- `LoginPage`: valid submit calls service and navigates; 401 shows error; show/hide password toggle flips input type.

Commit: `test(frontend): auth schemas, service, and LoginPage`

#### 22b.4 — Test: User / profile feature (schemas, service, forms, pages)

Rules: PRD §5.9 / §5.10 (profile and change-password), PRD §2 (role-dependent field visibility), UI §9 / §10 / §11.6 (`<UserEditForm>` matrix).

- Zod: `updateProfileSchema`, `adminUpdateUserSchema`, `changePasswordSchema` (12–128 chars, confirm equals new).
- `profileService`, `userService` request shapes.
- `<UserEditForm>` field matrix: `scope='self'` vs `scope='admin'`, target role variations, Email hidden for non-admin self, IndexNumber only for Student target, UserRole/IsDeleted hidden when target is another admin.
- `MyProfilePage` renders Your Info, opens edit modal, Change password navigates.
- `ChangePasswordPage` client-side validation; submit flow calls `clearAuthSession` on 204.

Commit: `test(frontend): user/profile schemas, service, UserEditForm, MyProfile, ChangePassword`

#### 22b.5 — Test: Admin dashboard — forms, user matrix, tab actions

Rules: PRD §5.3 (admin dashboard tabs), PRD §2.1 (admin self-restrictions), UI §8 (admin dashboard patterns).

- Users tab: no Edit button on admin's own row.
- Create user modal: role dropdown toggles IndexNumber field; password show/hide toggle.
- Edit user modal: field matrix per target role; backend 403s surface as error toast.
- Subjects tab, Enrollments tab: create / edit / delete happy paths.

Commit: `test(frontend): admin dashboard forms, user matrix, and tab actions`

#### 22b.6 — Test: Student dashboard (hook, page, write-appeal modal, confirm-grade button)

Rules: PRD §5.5 (student dashboard aggregates), PRD §4.1 / §4.6 (action buttons by state), UI §6 (student dashboard patterns).

- `useStudentDashboard` hook: fetch, error, loading states.
- `StudentDashboardPage`: four stat tiles render exact values; subject rows render status + buttons per §4.6 state (Awaiting confirmation / Appeal pending / Passed / Failed / Appeal denied).
- Write-appeal modal: 1000-char validation, submit calls service.
- Confirm-grade button: optimistic update, revert on error.

Commit: `test(frontend): student dashboard hook, page, write-appeal modal, confirm-grade button`

#### 22b.7 — Test: Professor dashboard — grading panel + draft lifecycle

Rules: PRD §3 (grading model), PRD §5.6 (grading UI), UI §7.2 (grading panel).

- 5 point inputs with step 0.5 and respective max; sum displayed live.
- Save Draft visible only when at least one input is edited and no grade confirmed.
- Confirm button visible only when all 5 fields have a value.
- Final-grade live computation matches PRD mapping.
- Accepted-appeal re-grade variant: 4 fields collapsed to summary; exam editable.

Commit: `test(frontend): professor dashboard grading panel, mapping, and draft lifecycle`

#### 22b.8 — Test: Professor appeals (view modal + 24h deny-undo countdown with vi.useFakeTimers)

Rules: PRD §4.2 / §4.3 / §4.4 (review flow + undo window), UI §7.4 / §7.5 (appeals section and view modal).

- Appeals list: shows Pending + Overdue only.
- View-appeal modal: shows prior overdue appeals as read-only, Accept/Deny on the current Pending only.
- Overdue entries have no Accept/Deny buttons.
- Deny-undo countdown using `vi.useFakeTimers()`: visible button at 23h 59m; disappears at 24h 00m 00s.

Commit: `test(frontend): professor appeals list, view-appeal modal, 24h deny-undo countdown`

#### 22b.9 — Test: Shared UI primitives

Rules: UI §11 (reusable primitives), UI §12 (responsiveness).

- `<Modal>`: open/close, blurred backdrop prop, focus trap.
- `<RoleGate>`: shows/hides children per role.
- `<AuthGuard>`: redirects unauthenticated to `/login`.
- `<Navbar>`: shows Login when logged out; shows Dashboard + greeting + Logout when logged in; active-link class on current route.
- Responsive table collapses to card stack below breakpoint (using the matchMedia helper).

Commit: `test(frontend): shared Modal, RoleGate, AuthGuard, Navbar, and responsive table`

#### 22b.10 — Test: Run the suite, write TESTING.md, deliver the report

Rules: none.

- Run `npm run test` from `frontend/`.
- Add `frontend/TESTING.md` with the Vitest / MSW / RTL stack, how to run, how to add a new unit test.
- Report in chat (same shape as 22a.9).
- Wait for approval before any production fix.

Commit: `test(frontend): run suite, add TESTING.md, and report results`

---

**22c — Frontend integration tests**

#### 22c.1 — Test: Scaffold integration test tree + shared helpers

Rules: Tech.md §3 Testing (integration layout, `authenticatedRender`, `matchMedia`, MSW handlers).

- Create `src/test/integration/{auth,appeals,components,dashboards,grades,user,a11y,responsive}/` folders.
- `src/test/helpers/authenticatedRender.tsx` — provider shell + router + logged-in role selector.
- `src/test/helpers/matchMedia.ts` — jsdom-safe mock.
- `src/test/helpers/mswHandlers/` — handler factories per endpoint.
- `src/test/helpers/fixtures/` — typed response fixtures per dashboard shape.

Commit: `test(frontend): scaffold integration test tree and shared render/MSW helpers`

#### 22c.2 — Test: Auth and user integration flows

Rules: PRD §5.2 (login), PRD §5.9 / §5.10 (profile, change password), PRD §6 (auth model), UI §5.

- Unauthenticated visit to a protected route → redirect to `/login`.
- Successful login → navigate to role dashboard.
- Change password submit → `clearAuthSession` called, redirect to login with success toast.
- MyProfile edit → modal round-trip, server success refreshes card.

Commit: `test(frontend): integration tests for auth and user flows`

#### 22c.3 — Test: Grading UI integration

Rules: PRD §3 (grading model), PRD §5.6 (grading UI), UI §7.2 / §7.3 (grading panel variants).

- Full grading flow: enter 5 fields → Save Draft → reload → Confirm → read-only state.
- Appeal accept → re-grade exam → Confirm → truly-final state.
- Cross-professor 403 handled gracefully (error toast, no crash).

Commit: `test(frontend): integration tests for professor grading UI`

#### 22c.4 — Test: Appeals UI integration (student + professor sides)

Rules: PRD §4 (appeal flow), UI §6.5 (write appeal modal), UI §7.4 / §7.5 (professor appeals section + view-appeal modal).

- Student side: Write appeal from fresh-window state; Pending state hides buttons; post-overdue window shows Write appeal again; Appeal denied badge after deny past undo window.
- Professor side: Appeals list filtering; View appeal modal shows OVERDUE history greyed; Accept + Deny flows wired to endpoints.
- 24h deny-undo countdown using `vi.useFakeTimers()`.

Commit: `test(frontend): integration tests for appeals UI with time boundaries`

#### 22c.5 — Test: Dashboard aggregates + empty states

Rules: PRD §5.4 / §5.5 (dashboards), PRD §4.7 (ECTS rule rendering).

- Student dashboard renders exact values from `useStudentDashboard` payload (average 8.37 renders as "8.37", not "8.4").
- Status + action-button combinations across every §4.6 state render per spec.
- Empty-state: student with zero subjects; professor with zero subjects.

Commit: `test(frontend): integration tests for dashboard aggregates and empty states`

#### 22c.6 — Test: Reusable-component integration (Modal, RoleGate, UserEditForm, responsive table)

Rules: UI §11 (reusable primitives), UI §12 (responsiveness).

- `<Modal>` keyboard behavior (Esc closes, focus returns to trigger).
- `<RoleGate>` hides children for wrong role, shows for right.
- `<UserEditForm>` scope matrix end-to-end.
- Responsive table collapses to card stack below `md` on admin tabs and below `sm` on student/professor views.

Commit: `test(frontend): integration tests for Modal, RoleGate, UserEditForm, responsive table`

#### 22c.7 — Test: Responsive assertions at sm and md breakpoints

Rules: UI §12 (breakpoints, collapse rules, QA checklist).

- At <576px: student / professor views stack to cards.
- At <768px: admin tables stack to cards.
- Navbar collapses correctly at mobile widths.

Commit: `test(frontend): responsive integration tests at sm and md breakpoints`

#### 22c.8 — Test: Accessibility assertions

Rules: UI §14 (accessibility baseline).

- Form labels, aria attributes on modals, keyboard navigation on tabs.
- Login page, student dashboard, professor dashboard, admin dashboard — jest-axe sweep.

Commit: `test(frontend): accessibility integration tests for pages and shared components`

#### 22c.9 — Test: Run the suite + report

Rules: none.

- Run `npm run test` (integration folder scope).
- Report in chat (same shape as 22a.9 / 22b.10).
- Wait for approval before any production fix.

(No commit — report-only step.)

#### 22c.10 — Docs: README for the frontend integration test suite

Rules: none.

- `src/test/integration/README.md` covering: when to add integration vs unit, authenticated-render helper, MSW handler patterns, time-control patterns.

Commit: `docs(tests): README for frontend integration test suite`

---

**22d — End-to-end tests (Playwright, Chromium, real backend + real frontend + Dockerized Postgres)**

#### 22d.1 — Test: Scaffold the e2e project

Rules: none (operational — stack choice: Playwright + Chromium).

- Create root `e2e/` folder with `playwright.config.ts`, `tsconfig.json`, `package.json`.
- Chromium project only. `baseURL` from env.
- `docker-compose.yml` for Postgres 17.
- `.env.e2e` with ports and seeded credentials.

Commit: `test(e2e): scaffold Playwright project with Chromium, Docker Compose, and dotenv wiring`

#### 22d.2 — Backend-endpoint: Test-mode wiring + `/api/__test__/*` endpoints with safety guard

Rules: Tech.md §2 Testing (test-mode TimeProvider swap pattern), PRD §4 (appeal time boundaries that the clock-advance endpoint controls).

- `Program.cs` swaps `TimeProvider.System` for `FakeTimeProvider` when `ASPNETCORE_ENVIRONMENT == "e2e"`.
- `/api/__test__/advance-clock?seconds=N` advances the fake clock.
- `/api/__test__/reset` truncates test DB and re-seeds.
- Four-layer safety guard: endpoint only mounted when environment is `e2e` AND a per-build secret header is present AND the DB connection string matches the test DB AND a feature flag is on.

Commit: `feat(backend): test-mode TimeProvider swap and /api/__test__ endpoints with production safety guard`

#### 22d.3 — Test: Fixtures, helpers, global setup

Rules: none (operational).

- `playwright/fixtures.ts` with per-role `storageState` (student / professor / admin) seeded by global setup.
- Helpers: `advanceClock(seconds)`, `resetBackend()`.
- `globalSetup.ts`: start docker-compose, run migrations, run seed, log in each role, save `storageState`.
- Smoke test: unauthenticated visit to `/` renders home.

Commit: `test(e2e): fixtures, helpers, global setup with storageState, and smoke test`

#### 22d.4 — Test: Auth journey tests

Rules: PRD §5.2 (login), PRD §5.10 (change-password sign-out-everywhere), PRD §6 (session model).

- Login happy path; wrong password → generic error.
- Change password → signed out everywhere → old cookie no longer valid.

Commit: `test(e2e): auth journey — login and change-password sign-out-everywhere`

#### 22d.5 — Test: Grading loop journey tests

Rules: PRD §3 (grading model), PRD §4.1 (student choices in the 7-day window).

- Professor confirms a grade → student sees it → student-confirm path.
- Professor confirms → student submits appeal → professor accepts → reconfirm exam.
- Professor confirms → student submits appeal → professor denies.

Commit: `test(e2e): grading loop journeys — student-confirm, prof-accept, prof-deny`

#### 22d.6 — Test: Appeal time-boundary journeys using the advance-clock endpoint

Rules: PRD §4.5 (overdue), PRD §4.6 (initial window, post-overdue window, auto-finalize), PRD §4.4 (24h deny-undo).

- Appeal goes overdue exactly at the 7-day boundary (advance clock, re-fetch dashboard).
- Student submits second appeal after first went overdue.
- 24h deny-undo window closes exactly on time.
- Day-8 auto-finalize of the initial window.

Commit: `test(e2e): appeal time-boundary journeys with test-only clock-advance endpoint`

#### 22d.7 — Test: Admin journey tests

Rules: PRD §5.3 (admin dashboard), PRD §2.1 (admin self-restrictions).

- Admin creates a new student with password → login as that student → see empty dashboard.
- Admin cannot soft-delete self (UI hides the control; API returns 403).

Commit: `test(e2e): admin journey — create user and self-row protection`

#### 22d.8 — Test: Dashboard journey tests

Rules: PRD §5.4 / §5.5 (dashboards against seeded data).

- Student dashboard shows the exact seeded aggregates.
- Professor dashboard shows the professor's own subjects + enrolled students + appeals.

Commit: `test(e2e): dashboard journeys — student and professor seeded-data binding`

#### 22d.9 — Docs + Test: README + run the full suite + deliver the inline report

Rules: none.

- `e2e/README.md` covering: Docker + Playwright install (`npx playwright install chromium`), one-command runbook (`npm run e2e`), the test-mode safety guard, how to add a new journey.
- Run the full suite from a clean checkout.
- Report in chat (same shape as 22a.9).

Commit: `docs(e2e): README for Playwright e2e suite`
