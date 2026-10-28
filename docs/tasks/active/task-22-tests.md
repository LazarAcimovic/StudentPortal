### Task 22 — Tests (backend integration, frontend unit, frontend integration, e2e)

#### Overview

Four suites covering the stack:

- **22a** — Backend integration tests (xUnit + Testcontainers + Respawn + WebApplicationFactory + FakeTimeProvider).
- **22b** — Frontend unit tests (Vitest + jsdom + React Testing Library + MSW).
- **22c** — Frontend integration tests (Vitest + jsdom + RTL + MSW, multi-component flows).
- **22d** — End-to-end tests (Playwright + real backend + real frontend + Dockerized Postgres).

Backend **unit** tests are not a subtask here: `backend/StudentPortal.Tests` already exists and every implementation subtask adds to it in its own Red step (AGENTS §9). This task is the integration, frontend and e2e sweep on top of that.

**Non-negotiable rule:** every test is derived from the source-of-truth documents, and PRD wins on behaviour (AGENTS §0). If a test's expected outcome and the implementation disagree, the test wins by default and the discrepancy is a suspected production defect. Do not weaken an assertion, skip a test, or change an expected result to match current behaviour. If the test and a *document* disagree, stop — that is an `OPEN` entry in `docs/Decisions.md`, not a judgement call.

Conventions: backend in `Tech-Backend.md` §7, frontend in `Tech-Frontend.md` §7. Load the relevant one before writing tests.

> **Reconciled against the code on 2026-10-23.** 22a, 22b and 22c have essentially landed. Outstanding: `frontend/TESTING.md` (22b.10), the full-suite reports (22a.9, 22c.9), and **all of 22d — Playwright has never been scaffolded**. Escalation coverage is *not* part of this task; it is task 23.15.

**Depends on:** task 23 (its 23.15 owns escalation coverage) · **Blocks:** nothing

---

**22a — Backend integration tests**

#### 22a.1 — Test: Scaffold the integration test project

Rules: Tech-Backend §7 (project layout, package set, image pinning)
Not in scope: writing domain tests.
Docs to update: none
Verify: `dotnet build backend/StudentPortal.IntegrationTests`

- [x] `StudentPortal.IntegrationTests.csproj` with Mvc.Testing, Testcontainers.PostgreSql, Respawn, TimeProvider.Testing, FluentAssertions, xunit, runner, Test.Sdk, coverlet — all pinned.
- [x] Project reference to `StudentPortal.csproj`; added to the solution.
- [x] `public partial class Program { }` at the end of `Program.cs`.
- Commit: `test(backend): scaffold StudentPortal.IntegrationTests project`

#### 22a.2 — Refactor: Inject TimeProvider in services that read "now"

Rules: Tech-Backend §6 (time), Tech-Backend §7 (time control), PRD §4 (the rules being made testable)
Not in scope: changing any behaviour; `AuthService` / `TokenService` token lifetimes stay on `DateTime.UtcNow` (Tech-Backend §6).
Docs to update: Tech-Backend §6
Verify: `dotnet test backend/StudentPortal.Tests` — all green, no behaviour change

Tagged `Refactor`, so no new test is required (AGENTS §9); the existing unit suite must stay green.

- [x] `AppealService`, `GradeService`, `GradeDraftService`, `StudentDashboardService`, `ProfessorDashboardService` take `TimeProvider` and call `GetUtcNow()`.
- [x] `TimeProvider.System` registered as the singleton default in `Program.cs`.
- [ ] `EscalationService` aligned the same way (currently takes `DateTime now` parameters). Shared with 23.6 — do it in one place, not both.
- Commit: `refactor(backend): inject TimeProvider for testable time-sensitive logic`

#### 22a.3 — Test: Integration fixture + base class

Rules: Tech-Backend §7 (fixture pattern, Respawn reset, auth helpers, backdating helpers)
Not in scope: domain assertions.
Docs to update: none
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Smoke`

- [x] `IntegrationTestFixture : IAsyncLifetime` — `postgres:17` container, WebApplicationFactory, EF migrate, Respawner, cached `seed.sql`.
- [x] `[CollectionDefinition("Integration")]` + `ICollectionFixture<IntegrationTestFixture>`.
- [x] `IntegrationTestBase` — per-test `ResetAndSeedAsync`, `CreateAuthenticatedClientAsync`, `CreateAnonymousClient`, cookie assertions, `SeedUsers` / `SeedIds`, backdating helpers.
- [x] Smoke test: log in as the seeded admin, hit `/api/Account/Me`.
- Commit: `test(backend): add Testcontainers fixture, Respawn reset, and auth helpers`

#### 22a.4 — Test: Auth and user flows

Rules: PRD §6 (login, cookies, change-password sign-out-everywhere, refresh rotation, mass-assignment), PRD §5.9 / §5.10, PRD §2.1 (admin self-restrictions)
Not in scope: UI assertions.
Docs to update: none
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Auth`

- [x] Login happy path; wrong password → 401 generic; soft-deleted → 401 generic; cookie flags correct.
- [x] Refresh rotates; re-use detection revokes the chain.
- [x] Logout clears both cookies.
- [x] Change-password: correct current → 204 + all refresh rows revoked + old `sp_refresh` → 401. Wrong current → 400 field error.
- [x] Profile self-update preserves missing fields; non-admin changing own `Email` → 403.
- [x] Admin guards: cannot soft-delete self, cannot demote self, cannot change another admin's role → 403.
- [x] Mass-assignment: `PUT /api/User/{id}` with a different `Id` in the body → route id wins.
- [x] Full 401/403 matrix across protected endpoints.
- Commit: `test(backend): integration tests for auth and user flows`

#### 22a.5 — Test: Grading flow

Rules: PRD §3 (5 fields, mapping, draft lifecycle, confirm, reconfirm)
Not in scope: appeal timing — 22a.6.
Docs to update: none
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Grading`

- [x] Draft `GET` happy path; `PUT` creates then updates in place; cross-professor 403.
- [x] Confirm requires all 5 fields → 400 if any missing; happy path writes Grade + FinalGrade, deletes the draft, sets `ConfirmedAt`, leaves `FinalizedAt` NULL.
- [x] Reconfirm after an accepted appeal moves only `ExamPoints`.
- [x] Student-confirm sets `StudentConfirmedAt` + `FinalizedAt`; cross-student 403.
- [x] Mapping `[Theory]` at every boundary: 0, 50 → 5; 51, 60 → 6; 61, 70 → 7; 71, 80 → 8; 81, 90 → 9; 91, 100 → 10.
- [x] Point validation `[Theory]`: 0.0 valid, exact max valid, max + 0.5 rejected, negative rejected, 0.3 rejected.
- Commit: `test(backend): integration tests for grading flow`

#### 22a.6 — Test: Appeals flow with FakeTimeProvider

Rules: PRD §4.1, §4.4, §4.5, §4.6, §4.7 · PRD §4.8 (who may act on an overdue appeal) · Tech-Backend §7 (three-point boundary testing)
Not in scope: escalation detection and assignment — 23.15.
Docs to update: none
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Appeals`

- [x] Submit happy path inside the §4.6 window; refused outside; refused while a Pending exists.
- [x] Accept / Deny inside the 7-day review window.
- [x] Undo-deny at 23 h 59 m flips to Pending; refused at and after 24 h.
- [x] Overdue computed on read at the exact 7-day boundary (before: Pending; at and after: Overdue).
- [x] Post-overdue second-appeal window: fresh 7 days from the overdue moment; silent expiry does **not** auto-finalize (per D-003).
- [x] Initial-window silent expiry: day 8 auto-finalizes (per D-002).
- [x] Undo-past-day-7 edge: deny day 3, undo day 8 → the appeal reads Overdue immediately; the review clock is not reset (§4.4).
- [ ] **Overdue accept/deny authority, three explicit cases** (PRD §4.5 + §4.8, D-017) — the old single assertion "nobody can act after 7 d" is no longer true and must be split:
  - original professor, grade not escalated → refused at and after 7 d;
  - original professor, `AssignedProfessorId` set → `403` on accept, deny, undo-deny and reconfirm;
  - assigned professor → accept and deny **allowed** on an already-overdue appeal.
- Commit: `test(backend): integration tests for appeals flow with time-boundary coverage`

#### 22a.7 — Test: Dashboard aggregates

Rules: PRD §5.4 / §5.5 (dashboards), PRD §4.6 / §4.7 (status chain, ECTS), DB §6.2 (the ECTS query's cases)
Not in scope: rendering.
Docs to update: none
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Dashboards`

- [x] Student dashboard payload shape; Average Grade with two decimals (per D-004); Passed / Non-passed counts over truly-final grades only (per D-005, D-006); per-subject status + action flags across every §4.6 state.
- [x] Professor dashboard: subjects with students and their grade/draft/appeal state; Appeals lists Pending + Overdue + denied-within-24 h and nothing else.
- [x] Empty states: student with zero enrollments; professor with zero subjects.
- [ ] **Earned ECTS across every row of the DB §6.2 table** (per D-007) — in particular "appeal #1 overdue → appeal #2 denied" **does** count, and accepted-awaiting-reconfirm does not.
- Commit: `test(backend): integration tests for student and professor dashboards`

#### 22a.8 — Docs: README for the integration test project

Rules: none
Not in scope: code.
Docs to update: none
Verify: a new contributor can run the suite from the README alone

- [x] `backend/StudentPortal.IntegrationTests/README.md`: Docker requirement, `dotnet test` command, first-run image-pull time, the TimeProvider override pattern, the fixture/base-class contract.
- Commit: `docs(tests): README for integration test project`

#### 22a.9 — Test: Run the full suite and deliver the report

Rules: none
Not in scope: applying production fixes — approval first.
Docs to update: none
Verify: the suite runs from a clean checkout

- [ ] Run `dotnet test backend/StudentPortal.IntegrationTests --logger "trx;LogFileName=integration-tests.trx"`.
- [ ] Report: summary line (Total / Passed / Failed / Blocked / Duration), passed count by area, and per failure the fully qualified test name, the PRD section, expected, actual, classification, root cause, proposed fix and files to change; plus blocked-test reasons and requirements covered vs uncovered.
- [ ] Stop before applying any production fix. Wait for explicit approval, then apply only approved fixes and append a follow-up report.

No commit — handoff step.

---

**22b — Frontend unit tests**

#### 22b.1 — Test: Scaffold Vitest helpers, factories, smoke test

Rules: Tech-Frontend §7 (layout, shared helpers, MSW setup)
Not in scope: feature tests.
Docs to update: none
Verify: `npm run test -- smoke`

- [x] `src/test/server.ts` (MSW, `onUnhandledRequest: 'error'`), `src/test/helpers/renderWithProviders.tsx`, `src/test/helpers/time.ts`.
- [x] `src/test/factories.ts` (user, subject, grade, appeal shapes).
- [x] Smoke test renders a trivial component.
- Commit: `test(frontend): scaffold Vitest helpers, factories, and smoke test`

#### 22b.2 — Test: Lib, store, axios interceptor

Rules: Tech-Frontend §7 (no-mock for stores and lib; interceptor via MSW sequencing), Tech-Frontend §4
Not in scope: components.
Docs to update: none
Verify: `npm run test -- lib store axiosClient`

- [x] `useUserStore` transitions: set-user, clear-user, bootstrap.
- [x] `lib/navigation` singleton behaviour.
- [x] Interceptor: 401 → silent refresh → retry; refresh failure → force logout + navigate to `/login`.
- Commit: `test(frontend): lib helpers, user store, and axios interceptor`

#### 22b.3 — Test: Auth feature (schema, service, LoginPage)

Rules: PRD §5.2 (login screen), PRD §6 (opaque error, cookie model), UI §5 (login page copy and the password toggle, per D-001)
Not in scope: integration flows — 22c.2.
Docs to update: none
Verify: `npm run test -- auth`

- [x] `loginSchema`: email format, required fields.
- [x] `authService.login` posts a PascalCase body and parses the response.
- [x] `LoginPage`: valid submit calls the service and navigates; 401 shows the inline `alert alert-danger` above the form (UI §5), not a toast.
- [x] The show/hide password toggle flips the input type — the login field is a `<PasswordInput>` (UI §5, §11.2).
- Commit: `test(frontend): auth schemas, service, and LoginPage`

#### 22b.4 — Test: User / profile feature

Rules: PRD §5.9 / §5.10, PRD §2 (role-dependent field visibility), UI §9 / §10 / §11.6 (`<UserEditForm>` matrix)
Not in scope: admin tabs — 22b.5.
Docs to update: none
Verify: `npm run test -- profile UserEditForm`

- [x] Zod: `updateProfileSchema`, `adminUpdateUserSchema`, `changePasswordSchema` (12–128, confirm equals new).
- [x] `profileService`, `userService` request shapes.
- [x] `<UserEditForm>` matrix across scope and target role.
- [x] `MyProfilePage` renders Your Info, opens the edit modal, navigates to change-password.
- [x] `ChangePasswordPage` validation; submit calls `clearAuthSession` on 204.
- Commit: `test(frontend): user/profile schemas, service, UserEditForm, MyProfile, ChangePassword`

#### 22b.5 — Test: Admin dashboard forms and tab actions

Rules: PRD §5.3 (tabs), PRD §2.1 (admin self-restrictions), UI §8 (admin patterns, including the Subject Code field in §8.4)
Not in scope: the Escalations tab — it ships with 23.12.
Docs to update: none
Verify: `npm run test -- admin`

- [x] Users tab: no Edit button on the admin's own row.
- [x] Create-user modal: role dropdown toggles IndexNumber; password toggle present.
- [x] Edit-user modal: matrix per target role; backend 403 surfaces as an error toast.
- [x] Subjects and Enrollments tabs: create / edit / delete happy paths.
- [ ] Subjects create and edit send `subjectCode`, and the field is required 1–20 characters (UI §8.4, D-015). Ships with 23.13.
- Commit: `test(frontend): admin dashboard forms, user matrix, and tab actions`

#### 22b.6 — Test: Student dashboard

Rules: PRD §5.5 (aggregates), PRD §4.1 / §4.6 (action buttons by state), PRD §4.8 (Under admin review), UI §6
Not in scope: professor side.
Docs to update: none
Verify: `npm run test -- StudentDashboard`

- [x] `useStudentDashboard`: fetch, error, loading.
- [x] Four stat tiles render exact values; Average Grade with two decimals (D-004).
- [x] Subject rows render status + buttons per §4.6 state.
- [x] Write-appeal modal: 1000-char validation, submit calls the service.
- [x] Confirm-grade button: optimistic update, revert on error.
- [x] `Under admin review` renders the purple badge with no buttons (UI §2.5, §6.4).
- Commit: `test(frontend): student dashboard hook, page, write-appeal modal, confirm-grade button`

#### 22b.7 — Test: Professor grading panel and draft lifecycle

Rules: PRD §3, PRD §5.6, UI §7.2 / §7.3
Not in scope: appeals modal — 22b.8.
Docs to update: none
Verify: `npm run test -- GradePanel`

- [x] 5 inputs with step 0.5 and respective max; sum shown live.
- [x] Save Draft visible only when an input is edited and no grade is confirmed.
- [x] Confirm visible only when all 5 have a value.
- [x] Live final-grade computation matches the PRD mapping.
- [x] Accepted-appeal re-grade variant: 4 fields collapsed, exam editable.
- Commit: `test(frontend): professor dashboard grading panel, mapping, and draft lifecycle`

#### 22b.8 — Test: Professor appeals modal and 24 h undo countdown

Rules: PRD §4.2 / §4.3 / §4.4, UI §7.4 / §7.5, Tech-Frontend §7 (client-side countdown treatment)
Not in scope: assigned cases — ships with 23.11.
Docs to update: none
Verify: `npm run test -- ProfessorAppeal`

- [x] Appeals list shows Pending + Overdue only.
- [x] View-appeal modal: prior overdue appeals read-only; Accept/Deny on the current Pending only.
- [x] Overdue entries have no Accept/Deny buttons.
- [x] Deny-undo countdown with `vi.useFakeTimers()`: visible at 23 h 59 m, gone at 24 h.
- Commit: `test(frontend): professor appeals list, view-appeal modal, 24h deny-undo countdown`

#### 22b.9 — Test: Shared UI primitives

Rules: UI §11 (primitives), UI §12 (responsiveness), UI §14 (a11y)
Not in scope: page-level flows.
Docs to update: none
Verify: `npm run test -- components`

- [x] `<Modal>`: open/close, blurred backdrop prop, focus handling.
- [x] `<RoleGate>`: shows/hides per role.
- [x] `<AuthGuard>`: redirects unauthenticated to `/login`.
- [x] `<Navbar>`: Login when logged out; Dashboard + greeting + Logout when logged in; active-link class.
- [x] Responsive table collapses to cards below the breakpoint (via the matchMedia helper).
- [ ] `<PasswordInput>` exists as a shared primitive and is used by login, admin create-user and change-password (UI §11.2, D-001). Ships with task 24.
- Commit: `test(frontend): shared Modal, RoleGate, AuthGuard, Navbar, and responsive table`

#### 22b.10 — Docs: TESTING.md and the unit-suite report

Rules: none
Not in scope: production fixes.
Docs to update: none
Verify: `npm run test` from `frontend/`

- [ ] `frontend/TESTING.md`: the Vitest / MSW / RTL stack, how to run, how to add a unit test, when to choose unit vs integration.
- [ ] Report in chat, same shape as 22a.9.
- Commit: `docs(tests): add frontend TESTING.md`

---

**22c — Frontend integration tests**

#### 22c.1 — Test: Scaffold the integration tree and shared helpers

Rules: Tech-Frontend §7 (integration layout, `authenticatedRender`, `matchMedia`, MSW handlers)
Not in scope: assertions.
Docs to update: none
Verify: `npm run test -- integration/smoke`

- [x] `src/test/integration/{auth,appeals,components,dashboards,grades,user,a11y,responsive}/`.
- [x] `helpers/authenticatedRender.tsx`, `helpers/matchMedia.ts`, `helpers/mswHandlers/`, `helpers/fixtures/`.
- Commit: `test(frontend): scaffold integration test tree and shared render/MSW helpers`

#### 22c.2 — Test: Auth and user integration flows

Rules: PRD §5.2, §5.9, §5.10, §6 · UI §5
Not in scope: grading.
Docs to update: none
Verify: `npm run test -- integration/auth integration/user`

- [x] Unauthenticated visit to a protected route redirects to `/login`.
- [x] Successful login navigates to the role dashboard.
- [x] Change-password submit calls `clearAuthSession`, redirects to login with the success toast.
- [x] MyProfile edit round-trip refreshes the card.
- Commit: `test(frontend): integration tests for auth and user flows`

#### 22c.3 — Test: Grading UI integration

Rules: PRD §3, PRD §5.6, UI §7.2 / §7.3
Not in scope: appeals.
Docs to update: none
Verify: `npm run test -- integration/grades`

- [x] Full flow: enter 5 fields → Save Draft → reload → Confirm → read-only.
- [x] Appeal accept → re-grade exam → Confirm → truly-final.
- [x] Cross-professor 403 handled gracefully (error toast, no crash).
- Commit: `test(frontend): integration tests for professor grading UI`

#### 22c.4 — Test: Appeals UI integration, both sides

Rules: PRD §4, UI §6.5, UI §7.4 / §7.5
Not in scope: escalation UI — 23.12.
Docs to update: none
Verify: `npm run test -- integration/appeals`

- [x] Student: Write appeal from the fresh window; Pending hides buttons; post-overdue window shows Write appeal again; Appeal denied badge after a deny past the undo window.
- [x] Professor: list filtering; View modal shows OVERDUE history greyed; Accept and Deny wired to the endpoints.
- [x] 24 h deny-undo countdown with `vi.useFakeTimers()`.
- Commit: `test(frontend): integration tests for appeals UI with time boundaries`

#### 22c.5 — Test: Dashboard aggregates and empty states

Rules: PRD §5.4 / §5.5, PRD §4.7 (ECTS rendering)
Not in scope: backend computation — 22a.7.
Docs to update: none
Verify: `npm run test -- integration/dashboards`

- [x] Student dashboard renders exact payload values — average `8.37` renders as `"8.37"`, not `"8.4"` (D-004).
- [x] Status + action-button combinations across every §4.6 state.
- [x] Empty states: student with zero subjects; professor with zero subjects.
- Commit: `test(frontend): integration tests for dashboard aggregates and empty states`

#### 22c.6 — Test: Reusable-component integration

Rules: UI §11, UI §12
Not in scope: new primitives.
Docs to update: none
Verify: `npm run test -- integration/components`

- [x] `<Modal>` keyboard behaviour (Esc closes, focus returns to the trigger).
- [x] `<RoleGate>` hides for the wrong role, shows for the right one.
- [x] `<UserEditForm>` scope matrix end to end.
- [x] Responsive table collapses below `md` on admin tabs and below `sm` on student/professor views.
- Commit: `test(frontend): integration tests for Modal, RoleGate, UserEditForm, responsive table`

#### 22c.7 — Test: Responsive assertions

Rules: UI §12 (breakpoints, collapse rules, QA checklist), UI §7.1 (the three-stage professor layout, per D-008)
Not in scope: visual regression.
Docs to update: none
Verify: `npm run test -- integration/responsive`

- [x] Below 576 px: student / professor views stack to cards.
- [x] Below 768 px: admin tables stack to cards.
- [x] Navbar collapses at mobile widths.
- [ ] **Professor dashboard three-stage layout** (UI §7.1): 1 column below 576 px, 2 columns at 576–991 px, 3 columns at 992 px and above. The two-column stage was previously untested and the markup still uses a bare `col-lg-4` — ships with task 25.
- Commit: `test(frontend): responsive integration tests at sm, md and lg breakpoints`

#### 22c.8 — Test: Accessibility assertions

Rules: UI §14
Not in scope: full WCAG audit.
Docs to update: none
Verify: `npm run test -- integration/a11y`

- [x] Form labels, modal aria attributes, keyboard navigation on tabs.
- [x] jest-axe sweep over login, student, professor and admin dashboards.
- Commit: `test(frontend): accessibility integration tests for pages and shared components`

#### 22c.9 — Test: Run the suite and report

Rules: none
Not in scope: production fixes without approval.
Docs to update: none
Verify: `npm run test`

- [ ] Run the integration scope and report in chat, same shape as 22a.9.

No commit — report-only step.

#### 22c.10 — Docs: README for the frontend integration suite

Rules: none
Not in scope: code.
Docs to update: none
Verify: readable from a clean checkout

- [x] `src/test/integration/README.md`: unit vs integration, the authenticated-render helper, MSW handler patterns, time-control patterns.
- Commit: `docs(tests): README for frontend integration test suite`

---

**22d — End-to-end tests (Playwright, Chromium, real backend + frontend + Dockerized Postgres)**

Nothing in 22d has started.

#### 22d.1 — DevOps: Scaffold the e2e project

Rules: none (operational — stack choice: Playwright + Chromium)
Not in scope: writing journeys.
Docs to update: Tech.md §1 (move `@playwright/test` from "to add" to "installed")
Verify: `npx playwright --version` from `e2e/`

- [x] Root `e2e/` with `playwright.config.ts`, `tsconfig.json`, `package.json`. Chromium project only, `baseURL` from env.
- [x] `docker-compose.yml` for Postgres 17.
- [x] `.env.e2e` with ports and seeded credentials.
- Commit: `test(e2e): scaffold Playwright project with Chromium, Docker Compose, and dotenv wiring`

#### 22d.2 — Backend-endpoint: Test-mode wiring and `/api/__test__/*` behind a safety guard

Rules: Tech-Backend §6 (TimeProvider), Tech-Backend §7 (FakeTimeProvider swap), PRD §4 (the boundaries the clock endpoint controls), PRD §6 (nothing may weaken production auth)
Not in scope: shipping anything reachable in Production — if any guard layer is unavailable the endpoints must not mount.
Docs to update: Tech-Backend §6 (document the test-mode swap and the guard)
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter TestMode`, plus an explicit test asserting the endpoints 404 under `ASPNETCORE_ENVIRONMENT=Production`

- [x] `Program.cs` swaps `TimeProvider.System` for a controllable `TimeProvider` only when `ASPNETCORE_ENVIRONMENT == "e2e"`.
- [x] `POST /api/__test__/advance-clock?seconds=N` advances the fake clock.
- [x] `POST /api/__test__/reset` truncates and re-seeds the test database.
- [x] Four-layer guard, all required simultaneously: environment is `e2e`, a per-build secret header matches, the connection string points at the test database, and the feature flag is on.
- Commit: `feat(backend): test-mode TimeProvider swap and /api/__test__ endpoints with production safety guard`

#### 22d.3 — Test: Fixtures, helpers, global setup

Rules: none (operational)
Not in scope: journeys.
Docs to update: none
Verify: `npm run e2e -- --grep smoke`

- [ ] `playwright/fixtures.ts` with per-role `storageState` seeded by global setup.
- [ ] Helpers `advanceClock(seconds)` and `resetBackend()`.
- [ ] `globalSetup.ts`: start docker-compose, migrate, seed, log in each role, save `storageState`.
- [ ] Smoke test: anonymous visit to `/` renders home.
- Commit: `test(e2e): fixtures, helpers, global setup with storageState, and smoke test`

#### 22d.4 — Test: Auth journeys

Rules: PRD §5.2, §5.10, §6
Not in scope: grading.
Docs to update: none
Verify: `npm run e2e -- --grep auth`

- [ ] Login happy path; wrong password shows the generic error.
- [ ] Change password → signed out everywhere → the old cookie no longer works.
- Commit: `test(e2e): auth journey — login and change-password sign-out-everywhere`

#### 22d.5 — Test: Grading loop journeys

Rules: PRD §3, PRD §4.1
Not in scope: time boundaries — 22d.6.
Docs to update: none
Verify: `npm run e2e -- --grep grading`

- [ ] Professor confirms → student sees it → student confirms.
- [ ] Professor confirms → student appeals → professor accepts → reconfirm exam.
- [ ] Professor confirms → student appeals → professor denies.
- Commit: `test(e2e): grading loop journeys — student-confirm, prof-accept, prof-deny`

#### 22d.6 — Test: Appeal and escalation time-boundary journeys

Rules: PRD §4.4, §4.5, §4.6 · PRD §4.8 (escalation triggers and the assignment path)
Not in scope: unit-level detection — 23.15.
Docs to update: none
Verify: `npm run e2e -- --grep boundary`

- [ ] An appeal goes overdue exactly at the 7-day boundary (advance the clock, refetch the dashboard).
- [ ] The student submits a second appeal after the first went overdue.
- [ ] The 24 h deny-undo window closes exactly on time.
- [ ] Day-8 auto-finalize of the initial window (D-002).
- [ ] Scenario B end to end: two overdue appeals → admin sees the case → assigns an eligible professor → that professor denies the latest appeal → the grade finalizes and the case shows `Resolved`.
- Commit: `test(e2e): appeal and escalation time-boundary journeys with the clock-advance endpoint`

#### 22d.7 — Test: Admin journeys

Rules: PRD §5.3, PRD §2.1, UI §8.4 (Subject Code is required)
Not in scope: escalation — 22d.6.
Docs to update: none
Verify: `npm run e2e -- --grep admin`

- [ ] Admin creates a student → logs in as that student → sees an empty dashboard.
- [ ] Admin cannot soft-delete self (control hidden, API returns 403).
- [ ] Admin creates a subject with a Subject Code and it persists.
- Commit: `test(e2e): admin journey — create user, subject code, and self-row protection`

#### 22d.8 — Test: Dashboard journeys

Rules: PRD §5.4 / §5.5
Not in scope: aggregate maths — 22a.7.
Docs to update: none
Verify: `npm run e2e -- --grep dashboard`

- [ ] Student dashboard shows the exact seeded aggregates.
- [ ] Professor dashboard shows their own subjects, enrolled students and appeals.
- Commit: `test(e2e): dashboard journeys — student and professor seeded-data binding`

#### 22d.9 — Docs: e2e README and the full-suite report

Rules: none
Not in scope: production fixes without approval.
Docs to update: none
Verify: the suite runs from a clean checkout following the README

- [ ] `e2e/README.md`: Docker + `npx playwright install chromium`, the one-command runbook, the test-mode safety guard, how to add a journey.
- [ ] Run the full suite and report in chat, same shape as 22a.9.
- Commit: `docs(e2e): README for Playwright e2e suite`
