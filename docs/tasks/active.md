# Active implementation tasks

> Open tasks only. When a task is fully complete, move its entry to the current month's file in `docs/tasks/done/` (one row per parent task, subtasks nested, trimmed to id + commit message).

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

### Task 22d — End-to-end tests (Playwright, Chromium, real backend + real frontend + Dockerized Postgres)

# Task: Create a High-Quality End-to-End Test Suite

Your task is to create a reliable, maintainable **end-to-end (e2e) test suite** that drives the real SPA in a real Chromium browser against the real ASP.NET Core backend talking to a real Postgres database (brought up via Docker Compose, isolated from the developer's local Postgres). The suite covers the critical user journeys end-to-end — the paths a human would walk through the product.

Follow the testing best practices described in:

- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/test-fixtures
- https://playwright.dev/docs/test-auth
- https://playwright.dev/docs/test-webserver
- https://milanjovanovic.tech/blog/unit-testing-best-practices-dotnet (universal AAA / naming / isolation / determinism principles — apply to Playwright)

## 0. Non-negotiable rule — PRD is the source of truth

**All tests MUST be derived from the PRD, Tech.md, DB.md, and UI.md — never from the current implementation's behaviour.**

* The implementation may contain bugs or contradict the PRD. Tests exist to catch exactly that.
* If a test's expected outcome and the implementation disagree, the **test wins** by default; the discrepancy is reported as a suspected production defect per §10.
* Do not weaken an assertion, skip a test, or change an expected result to match what the code currently does.
* If a PRD requirement is ambiguous, incomplete, or contradictory, document the ambiguity in the strategy phase (§11 step 4) and stop for direction. Do not invent a rule.
* Inspecting the implementation is allowed only to understand *how to invoke* each flow (route names, button labels, API URLs, DOM structure), never to decide *what the expected behaviour is*.

## 1. Analyze the Requirements First

1. Read the PRD (§2 actors, §3 grading model, §4 appeal flow, §5 screens, §6 security, §7 seeding), `docs/Tech.md`, `docs/DB.md`, and `docs/UI.md`.
2. Extract every **cross-page, cross-role, cross-tier critical user journey** that a human actually walks through — login, change password, admin creates a user, professor grades a student, student appeals, professor reviews, dashboards update accordingly. These are flows that span the SPA + API + database and therefore cannot be fully verified by Task 22a (backend-only), 22b (frontend-unit), or 22c (frontend-integration).
3. Produce a concise requirements traceability matrix mapping each covered PRD rule to its planned e2e test. Present it in the strategy phase for review before implementation.

## 2. Scope: Critical User Journeys Only

**E2E tests exclusively. No pure unit tests (Task 22), no backend integration tests (22a), no frontend unit tests (22b), no frontend integration tests (22c), no load/performance/security-scanning tests.** Each test:

* Runs in a real **Chromium** browser via Playwright. Firefox and WebKit are **out of scope** for this task — Chromium is the single engine the project supports for e2e.
* Launches the real backend (`dotnet run`) and real frontend (`vite`) via Playwright's `webServer` config.
* Hits a real Postgres database brought up by `docker compose` from `e2e/docker-compose.yml` on port **5433** (never the developer's local 5432).
* Uses the real auth stack — real cookies set by the server, real JWT, real refresh rotation, real `axiosClient` silent-refresh interceptor.
* Asserts observable UI behaviour (what the user sees and can click), not implementation details.

**Target size: ~15–25 tests total.** This is deliberately small. E2E tests are expensive (slow, flaky under load, hard to debug). The suite covers only the critical journeys — the paths that must work for the product to be shippable. Granular coverage of validation rules, matrices, and edge cases lives in 22a/22b/22c.

Covered journeys (the "must work" list):

### 2.1 Auth journeys

* **Login happy path**: open `/login`, type seeded student's email + password, click `Login`, land on `/student-dashboard` with the greeting rendering the correct first name. Same for professor and admin seeded users (parameterised).
* **Login unhappy path**: wrong password → generic error toast ("Invalid email or password"), stays on `/login`, no cookies set.
* **Login as soft-deleted user**: same generic error, same cookie behaviour.
* **Change password + sign-out-everywhere**: authenticated student navigates to `/profile/change-password`, submits valid current + new password, is redirected to `/login` with the success toast visible, and attempting any protected request from the previous session fails.

### 2.2 Grading journey (the central product loop)

* **Full grading loop — student confirms**: professor opens dashboard, selects a subject, selects a student, enters 5 point values, clicks **Save draft**, re-opens the student (draft pre-fills), clicks **Confirm**. The student logs in, sees the grade on their dashboard with the correct Status badge (🟡 Awaiting confirmation), clicks **Confirm grade**, the row flips to 🟢 Passed / 🔴 Failed and Earned ECTS updates by the subject's ECTS value when the final grade ≥ 6.
* **Full grading loop — student appeals, professor accepts, professor re-confirms**: professor confirms a grade; student submits an appeal (text max 1000 chars) via the Write-appeal Modal; professor opens the Appeals section, clicks **View appeal**, clicks **Accept**; the grading panel re-opens with the four non-exam fields collapsed to a one-line summary and the exam input editable; professor edits exam, clicks **Confirm**; the student dashboard flips to the new final grade (truly final immediately — no new 7-day window).
* **Full grading loop — student appeals, professor denies**: professor confirms a grade; student submits an appeal; professor opens the appeal, clicks **Deny**, confirms the sub-step; the student dashboard shows the final grade with the 🔴 Appeal denied badge; ECTS counts (if passing).

### 2.3 Appeal time-boundary journeys (using the test-only clock-advance endpoint)

* **Appeal goes Overdue (prof forgets)**: student submits an appeal; test advances the clock by 7 days + 1 second via `POST /api/__test__/advance-clock`; professor's Appeals section shows the appeal as Overdue; **Accept** and **Deny** buttons are not rendered on the row; student's dashboard shows **Write appeal** again (fresh 7-day window).
* **24h deny-undo window**: professor denies an appeal; the row shows the **Undo** button with a positive countdown; test advances by 23h 59m — Undo still visible; advance by 2 more minutes (crossing 24h) — Undo gone and the row no longer offers it.
* **Day-8 auto-finalize of the initial window**: student does nothing after the grade is confirmed; test advances 7 days + 1 second; the student's dashboard shows the grade as truly final (status flipped to Passed / Failed, no action buttons), per PRD §4.6 Q28.

### 2.4 Admin journey

* **Admin creates a user**: admin opens `/admin-dashboard` Users tab, clicks **Create New User**, fills the form with role=Student (IndexNumber field appears), submits; the new user appears in the table and can log in on a second browser context using the password admin set.
* **Admin edits another user**: admin edits a seeded student's first name; the change persists after reload. Admin's own row has no Edit button rendered (PRD §5.3).
* **Admin cannot soft-delete self through the UI**: admin's own row never exposes an Edit button, confirming the client-side gate (PRD §5.3).

### 2.5 Dashboard journeys

* **Student dashboard renders real seeded data**: logged-in student sees My Information with their actual seeded first/last name, email, index number; Study Statistics tiles bind to the backend-computed values (Average Grade two decimals, Passed Exams, Non-passed Exams, Earned ECTS per §4.7); subjects table lists their seeded enrollments.
* **Professor dashboard renders real seeded data**: logged-in professor sees their subjects (ProfessorId == self), the enrolled students on subject click, and an Appeals section populated with any seeded Pending + Overdue appeals (and nothing from other professors).

**Out of scope for 22d (because 22a/22b/22c already cover them):**

* Zod validation permutations (covered in 22b/22c).
* Point-field range + step validation `[Theory]` (covered in 22a and 22b).
* Final-grade bucket mapping `[Theory]` (covered in 22a and 22b).
* All non-happy status matrix combinations beyond the ones listed above (covered in 22c).
* Responsive breakpoint collapse (covered in 22c).
* Accessibility assertions (covered in 22c).
* Silent-refresh interceptor single-flight serialization (covered in 22b and 22c).
* Role-based 401/403 matrix across every endpoint (covered in 22a).

## 3. Project Layout — root `e2e/` folder

The e2e suite lives in a brand-new folder at the repository root, **outside** `frontend/` and `backend/`. It has its own `package.json`, its own `node_modules`, and its own `tsconfig.json`.

```
e2e/
├── docker-compose.yml           # postgres:17 on port 5433, named volume for data
├── playwright.config.ts         # Chromium project, webServer config, globalSetup, globalTeardown
├── package.json                 # @playwright/test, pg, dotenv — no runtime app deps
├── tsconfig.json                # ES2022, strict, moduleResolution: bundler
├── .env.e2e.example             # committed — ENABLE_TEST_ENDPOINTS=true, E2E_DB_* keys with placeholders
├── README.md                    # how to run the suite, prerequisites, how auth storageState works
├── global-setup.ts              # waits for Postgres container, runs EF migrations, loads seed.sql, signs in each role once and saves storageState files
├── global-teardown.ts           # stops the backend/frontend child processes cleanly
├── fixtures/
│   ├── test.ts                  # extends Playwright `test` with per-test DB reset + re-seed + per-role contexts
│   ├── db.ts                    # pg client wrapper: `resetAndReseed()`, `backdateAppealSubmittedAt(id, timestamp)`, `backdateGradeConfirmedAt(id, timestamp)`, `backdateAppealReviewedAt(id, timestamp)`
│   └── api.ts                   # Sender-pattern API helpers: `apiLogin(role)`, `apiConfirmGrade(cookie, enrollmentId, points)`, `apiSubmitAppeal(cookie, gradeId, text)` — used only for setup inside tests, never as the thing under test
├── storage/                     # gitignored — populated by global-setup
│   ├── admin.json               # Playwright storageState for seeded admin
│   ├── professor-a.json
│   └── student-1.json
├── helpers/
│   ├── seedUsers.ts             # typed constants mirroring seed.sql (Admin, ProfessorA..D, Student1..10, Password123!)
│   └── clock.ts                 # thin wrapper around `POST /api/__test__/advance-clock` with typed args
└── tests/
    ├── auth/
    │   ├── login.spec.ts           # UI login (does NOT use storageState — the whole point is to test the login screen)
    │   └── change-password.spec.ts # sign-out-everywhere journey
    ├── grading/
    │   ├── full-loop-student-confirms.spec.ts
    │   ├── full-loop-student-appeals-prof-accepts.spec.ts
    │   └── full-loop-student-appeals-prof-denies.spec.ts
    ├── appeals/
    │   ├── appeal-goes-overdue.spec.ts
    │   ├── deny-undo-24h-boundary.spec.ts
    │   └── auto-finalize-day-8.spec.ts
    ├── admin/
    │   ├── create-user.spec.ts
    │   └── edit-user-and-self-row.spec.ts
    └── dashboards/
        ├── student-dashboard-renders-seeded-data.spec.ts
        └── professor-dashboard-renders-seeded-data.spec.ts
```

Gitignore additions (`.gitignore` at repo root):

```
e2e/node_modules
e2e/.env.e2e
e2e/storage/
e2e/test-results/
e2e/playwright-report/
e2e/blob-report/
```

**Not committed:**
* `e2e/.env.e2e` (holds the actual env values for the local run).
* `e2e/storage/*.json` (regenerated on every suite run by `global-setup.ts` — fresh signed-in sessions every run).
* `e2e/node_modules/` and all Playwright caches.
* Any Playwright report artifacts.

**Committed:**
* `e2e/.env.e2e.example` (documents the keys with placeholders; the dev value `ENABLE_TEST_ENDPOINTS=true` is safe to show in an example file — it is not a secret).

## 4. Fixture and Database Reset Strategy — reset + re-seed between every test

**Strongest isolation, slowest wall-clock.** Chosen deliberately: e2e tests must not depend on execution order, residual rows from a previous test, or shared mutable state.

`e2e/fixtures/test.ts` extends Playwright's `test`:

```ts
import { test as base } from '@playwright/test';
import { resetAndReseed } from './db';

export const test = base.extend<{ freshDb: void }>({
  freshDb: [async ({}, use) => {
    await resetAndReseed();
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
```

Every test file imports `test` from `e2e/fixtures/test.ts`, not from `@playwright/test`. The `auto: true` fixture runs before every test, calls `resetAndReseed()`, and the test starts from the full seeded baseline.

`resetAndReseed()`:

1. Open a pg client against the Dockerized Postgres (`localhost:5433`).
2. `TRUNCATE` every table in dependency-safe order, or run `Respawner`-equivalent SQL.
3. Execute `backend/StudentPortal/Migrations/seed.sql` against the test DB.
4. Reset the TimeProvider via `POST /api/__test__/reset-clock` so each test starts at the pinned baseline moment.

**Rules:**

* No test asserts on data from a previous test.
* No test modifies `seed.sql`.
* The baseline seed (per PRD §7) is the only shared starting point.
* Any state beyond the seed is created in-test via (preferred, Sender pattern) real API calls as a seeded user, or (fallback) direct DB writes through `e2e/fixtures/db.ts` for backdating timestamps.
* No test runs `node_modules`-level cleanup — all cleanup is DB truncation + re-seed.

Expected per-test overhead: ~5–10 seconds for truncate + seed + clock-reset. For ~20 tests, suite wall-clock sits around 3–5 minutes on a developer laptop. Acceptable for a project of this size.

## 5. Authentication in Tests — `storageState` per role (except `login.spec.ts`)

Tests do NOT sign in through the Login screen unless they are explicitly testing the Login screen. The default is Playwright's `storageState` pattern:

* `global-setup.ts` signs in once per seeded role (admin, professor A, student 1) by hitting `POST /api/Account/Login` with a `request` context, and saves the resulting cookies to `e2e/storage/<role>.json`.
* Each test file sets `test.use({ storageState: 'e2e/storage/student-1.json' })` (or admin / professor-a) at the top. Every page in the test opens already-authenticated — the browser context starts with `sp_access` + `sp_refresh` cookies pre-loaded.
* `tests/auth/login.spec.ts` is the exception: it uses `test.use({ storageState: { cookies: [], origins: [] } })` so the browser starts anonymous, then drives the real `/login` UI to verify the Login screen itself.

Why this is still real e2e:
* Every test still runs the real UI in a real Chromium against the real backend.
* `storageState` only skips the *repeated login step* that would otherwise cost ~2 seconds × 20 tests = 40 seconds of pure form-filling.
* The login UI is still exercised by `login.spec.ts` (success + wrong password + soft-deleted user).

Seeded users and shared password constants live in `e2e/helpers/seedUsers.ts`, mirroring the seed data per PRD §7. Shared password: `Password123!`.

## 6. Time Control — two mechanisms, both backed by the backend's injected TimeProvider

Playwright itself cannot control the backend's clock. We solve this with two coordinated primitives in the backend, both gated behind `ENABLE_TEST_ENDPOINTS=true` so they never ship to production.

### 6.1 TimeProvider swap (test-mode wiring in `Program.cs`)

When the backend boots with `ENABLE_TEST_ENDPOINTS=true`, `Program.cs` registers `FakeTimeProvider` as the singleton `TimeProvider` instead of `TimeProvider.System`:

```csharp
if (builder.Configuration.GetValue<bool>("EnableTestEndpoints")) {
    var fake = new FakeTimeProvider(startDateTime: DateTimeOffset.Parse("2026-01-01T00:00:00Z"));
    builder.Services.AddSingleton<TimeProvider>(fake);
    // test-only endpoints are also mapped — see §6.2
} else {
    builder.Services.AddSingleton(TimeProvider.System);
}
```

In production the flag is never set, so `TimeProvider.System` is the only registration path and no test endpoints exist in the route table.

### 6.2 Test-only `/api/__test__/*` endpoints

Mapped only when the flag is on:

* `POST /api/__test__/advance-clock` — body `{ "seconds": 604801 }` (7 days + 1 s). Calls `_fakeTimeProvider.Advance(TimeSpan.FromSeconds(dto.seconds))`.
* `POST /api/__test__/reset-clock` — resets the fake clock to the baseline `2026-01-01T00:00:00Z`.
* `POST /api/__test__/reset-db` — alternative to the pg-client reset path, in case any test needs it mid-run.

**Four-layer production safety guard** (all four MUST be implemented together):

1. **Endpoint registration gate** — the test endpoints are mapped only inside the `if (EnableTestEndpoints)` branch. In production the routes simply do not exist (HTTP 404).
2. **FakeTimeProvider gate** — the FakeTimeProvider singleton is registered only inside the same branch. In production `TimeProvider.System` is registered, so even if a test endpoint were somehow routed, there would be no fake clock to advance.
3. **Fail-fast startup guard** — `Program.cs` throws on boot if `EnableTestEndpoints == true` AND `builder.Environment.IsProduction()`. The app refuses to start on Render even if someone accidentally sets the env var.
4. **Kestrel localhost-only filter** — the test endpoints are additionally restricted to accept requests only from the loopback interface (`127.0.0.1` / `::1`) via a middleware or endpoint convention. Any non-loopback request to `/api/__test__/*` returns 404 regardless of the flag.

Env-var hygiene:

* `e2e/.env.e2e` (gitignored) holds `ENABLE_TEST_ENDPOINTS=true` and the test DB connection string. Playwright's `webServer` config reads this file via `dotenv/config` and passes the values as `env` to the spawned backend process.
* `e2e/.env.e2e.example` (committed) documents the keys with placeholders. Developers run `cp e2e/.env.e2e.example e2e/.env.e2e` before the first suite run.
* `.env.e2e` is **never** copied to any other environment. Render's env config does not contain this variable.

### 6.3 Required boundary coverage at e2e layer (narrow — exhaustive boundaries live in 22a)

| Boundary | Covered journey | How |
|---|---|---|
| Student initial 7-day window → auto-finalize on day 8 | `auto-finalize-day-8.spec.ts` | advance-clock by 7 days + 1 s, reload dashboard, assert status flip + ECTS |
| Professor 7-day review window → appeal becomes Overdue | `appeal-goes-overdue.spec.ts` | advance-clock by 7 days + 1 s, reload professor dashboard, assert Overdue row with no Accept/Deny |
| 24h deny-undo window | `deny-undo-24h-boundary.spec.ts` | advance-clock by 23h 59m (before — Undo visible) then + 2 min (after — Undo gone) |

Exact-second boundaries (6d 23h 59m, 7d 00m 00s, 7d 00m 01s) are **not** re-tested at e2e layer — Task 22a already covers them with sub-second precision. The e2e boundary coverage is "before vs after" at a 1-minute resolution to prove the two primitives (TimeProvider swap + advance-clock endpoint) are correctly wired.

### 6.4 No wall-clock sleeps

No `await page.waitForTimeout(N)` for time-sensitive behaviour. Any wait that is not explicitly a UI-animation debounce (and bounded to under 500 ms) fails code review. Use `expect(locator).toBeVisible()` with Playwright's web-first retrying assertions, which auto-wait on the UI without hardcoding a delay.

## 7. Test Design Rules

For every journey, cover:

* **Happy path** — the user walks the flow, every step succeeds, the final observable state is correct.
* **One critical unhappy path per journey** — login wrong password, change-password wrong current password, deny-undo past 24h. Validation-permutation testing stays in 22b/22c.
* **One critical edge case per journey where cheap** — admin's own row has no Edit button, 1000-char appeal accepted, Appeals section lists only Pending + Overdue (not Denied-inside-undo).
* **No duplication of 22a/22b/22c coverage.** If a rule is already covered by an integration or unit test, do not re-cover it here. The e2e suite's purpose is cross-tier integration confidence, not comprehensive matrix coverage.

**One logical journey per test.** Descriptive names following `describe('<Journey>', () => test('when X then Y', ...))`. No `.only`, no `.skip`, no `test.fixme` committed. Playwright web-first assertions throughout (`await expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveURL()`).

**Role selection in locators:**

* Prefer `page.getByRole('button', { name: /confirm grade/i })`.
* Prefer `page.getByLabel(/current password/i)`.
* Prefer `page.getByText(/awaiting confirmation/i)`.
* `data-testid` only as a last resort for elements with no accessible name.

## 8. Anti-Patterns to Avoid

* `page.waitForTimeout(ms)` for anything other than a bounded UI debounce.
* Hardcoded wall-clock sleeps in time-sensitive journeys — use the advance-clock endpoint.
* Running without the Dockerized test DB — never point the suite at the developer's local Postgres on 5432.
* Hitting production endpoints, external services, or any URL not controlled by this repo.
* Running tests against a shared browser context (`test.use({ storageState: ... })` creates per-test contexts automatically — do not disable this).
* Reusing a test's rows into the next test ("just reseed what I need") — the per-test reset is a hard contract.
* Setting cookies by hand to simulate auth — `global-setup.ts` is the only place that mints them.
* Minting JWTs by hand or installing a test AuthenticationHandler at the e2e layer.
* Asserting on specific CSS class names, computed styles, or React component names.
* Snapshot tests of entire page HTML.
* Writing cross-test fixtures that depend on each other (`test1` creates a user, `test2` grades them). Each test is self-contained.
* Testing Serbian strings — the project is English-only after Task 0.
* Committing `.env.e2e`, `storage/*.json`, or Playwright report artifacts.
* **Writing a test against what the UI does rather than what the PRD says.** Biggest anti-pattern — see §0.

## 9. Subtasks (each gets its own local commit)

- **22d.1** Scaffold the `e2e/` project.
  - Create `e2e/package.json` (deps: `@playwright/test`, `pg`, `dotenv`; scripts: `test`, `test:headed`, `test:ui`, `docker:up`, `docker:down`).
  - Create `e2e/tsconfig.json` (strict, ES2022, bundler resolution).
  - Create `e2e/playwright.config.ts` with: single Chromium project, `use.baseURL`, `use.trace: 'retain-on-failure'`, `use.screenshot: 'only-on-failure'`, `use.video: 'retain-on-failure'`, `globalSetup`, `globalTeardown`, `webServer` entries for backend and frontend, env piped from `.env.e2e` via `dotenv/config`, `workers: 1` (the single Dockerized DB + fake clock cannot be shared across parallel workers).
  - Create `e2e/docker-compose.yml` for `postgres:17` on port **5433**, named volume `studentportal-e2e-pg`, `POSTGRES_DB=StudentPortal`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, healthcheck.
  - Create `e2e/.env.e2e.example` with keys: `ENABLE_TEST_ENDPOINTS=true`, `E2E_DB_HOST=localhost`, `E2E_DB_PORT=5433`, `E2E_DB_NAME=StudentPortal`, `E2E_DB_USER=postgres`, `E2E_DB_PASSWORD=postgres`, `E2E_BASE_URL=http://localhost:5173`.
  - Update root `.gitignore`: add `e2e/node_modules`, `e2e/.env.e2e`, `e2e/storage/`, `e2e/test-results/`, `e2e/playwright-report/`, `e2e/blob-report/`.
  - **You:** run `cd e2e && npm install && npx playwright install chromium` once before the first suite run.
  - Commit: `test(e2e): scaffold Playwright project with Chromium, Docker Compose, and dotenv wiring`

- **22d.2** Backend: test-mode wiring and `/api/__test__/*` endpoints with the four-layer safety guard.
  - In `Program.cs`: read `EnableTestEndpoints` from configuration; if `true`, (a) register `FakeTimeProvider` as the `TimeProvider` singleton with baseline `2026-01-01T00:00:00Z`, (b) map the test endpoints, (c) apply the loopback-only middleware/convention to the `/api/__test__/*` route group.
  - Add the fail-fast guard in `Program.cs` after the configuration has been read but before `app.Run()`, using exactly this shape:

    ```csharp
    if (enableTestEndpoints &&
        app.Environment.IsProduction())
    {
        throw new InvalidOperationException(
            "Test endpoints cannot be enabled in Production.");
    }
    ```

    The local `enableTestEndpoints` boolean is the value read from `builder.Configuration.GetValue<bool>("EnableTestEndpoints")`. The exception type (`InvalidOperationException`) and the message string (`"Test endpoints cannot be enabled in Production."`) are fixed — do not vary either.
  - Create `Controllers/TestController.cs` (or minimal-API endpoint group) with `POST /api/__test__/advance-clock`, `POST /api/__test__/reset-clock`, `POST /api/__test__/reset-db`. Each action is `[Authorize]`-free (loopback filter is the gate) and returns `204`.
  - **This is a pre-approved production code change for Task 22d, analogous to 22a's TimeProvider injection.** No other production code change is permitted without explicit approval.
  - Verify Task 22a's integration tests still pass (they override TimeProvider via `WebApplicationFactory` DI, not via this env var, so they are unaffected).
  - Commit: `feat(backend): test-mode TimeProvider swap and /api/__test__ endpoints with production safety guard`

- **22d.3** Fixtures, helpers, and global setup.
  - Create `e2e/fixtures/db.ts` with a `pg` client, `resetAndReseed()`, and the backdating helpers listed in §3.
  - Create `e2e/fixtures/api.ts` with Sender-pattern helpers (`apiLogin`, `apiConfirmGrade`, `apiSubmitAppeal`, `apiConfirmDraft` for setup inside tests).
  - Create `e2e/fixtures/test.ts` extending Playwright `test` with the `freshDb` auto-fixture.
  - Create `e2e/helpers/seedUsers.ts` with typed constants for every seeded user (per PRD §7).
  - Create `e2e/helpers/clock.ts` with `advanceClock(seconds)` and `resetClock()` wrappers.
  - Create `e2e/global-setup.ts`: wait for Postgres container healthcheck, run EF migrations against the test DB (invoke `dotnet ef database update` with `ConnectionStrings__DefaultConnection` pointed at the container), load `seed.sql`, sign in each role via `POST /api/Account/Login` using Playwright's `request` context, save storageState files to `e2e/storage/*.json`.
  - Create `e2e/global-teardown.ts`: close pg clients, let `webServer` clean up on its own.
  - Add a smoke spec `e2e/tests/smoke.spec.ts` that opens `/` and asserts the hero heading — proves the whole stack boots end-to-end.
  - Commit: `test(e2e): fixtures, helpers, global setup with storageState, and smoke test`

- **22d.4** Auth journey tests.
  - `tests/auth/login.spec.ts` (anonymous storageState): login happy path for each of the three roles (parameterised), wrong password → generic error toast, soft-deleted user login → same generic error.
  - `tests/auth/change-password.spec.ts` (student storageState): navigate to `/profile/change-password`, submit correct current + valid new, land on `/login` with the success toast, previous session's cookies no longer refresh.
  - Commit: `test(e2e): auth journey — login and change-password sign-out-everywhere`

- **22d.5** Grading loop journey tests.
  - `tests/grading/full-loop-student-confirms.spec.ts`: professor grades → saves draft → re-opens (draft pre-fills) → confirms → student logs in via second context → sees 🟡 Awaiting confirmation → clicks Confirm grade → row flips to 🟢 Passed / 🔴 Failed → Earned ECTS tile updates.
  - `tests/grading/full-loop-student-appeals-prof-accepts.spec.ts`: professor confirms → student submits appeal (1000-char text accepted) → professor sees Appeals section row → clicks View appeal → clicks Accept → grading panel re-opens with the 4-field summary + editable exam → professor edits exam + Confirms → student dashboard shows the new final grade as truly final.
  - `tests/grading/full-loop-student-appeals-prof-denies.spec.ts`: professor confirms → student submits appeal → professor clicks Deny (confirm sub-step) → student dashboard shows final grade + 🔴 Appeal denied badge → ECTS counts when passing.
  - Commit: `test(e2e): grading loop journeys — student-confirm, prof-accept, prof-deny`

- **22d.6** Appeal time-boundary journey tests (using the advance-clock endpoint).
  - `tests/appeals/appeal-goes-overdue.spec.ts`: student submits appeal → advance-clock 7d + 1s → professor dashboard shows the row as Overdue, no Accept/Deny buttons → student dashboard shows **Write appeal** again (fresh window per PRD §4.5).
  - `tests/appeals/deny-undo-24h-boundary.spec.ts`: professor denies → row shows Undo + countdown → advance 23h 59m → Undo still visible → advance 2 more minutes → Undo gone.
  - `tests/appeals/auto-finalize-day-8.spec.ts`: professor confirms, student does nothing, advance 7d + 1s → student dashboard flips to Truly final → ECTS counts when passing (PRD §4.6 Q28).
  - Commit: `test(e2e): appeal time-boundary journeys with test-only clock-advance endpoint`

- **22d.7** Admin journey tests.
  - `tests/admin/create-user.spec.ts`: admin creates a new Student (IndexNumber field appears), submits, row appears in table; second browser context signs in with the new credentials and lands on `/student-dashboard`.
  - `tests/admin/edit-user-and-self-row.spec.ts`: admin edits another student's FirstName and verifies persistence after reload; admin's own row has no Edit button (PRD §5.3 — client-side gate).
  - Commit: `test(e2e): admin journey — create user and self-row protection`

- **22d.8** Dashboard journey tests.
  - `tests/dashboards/student-dashboard-renders-seeded-data.spec.ts`: student logs in via storageState → My Information card shows the seeded name/email/index → Study Statistics tiles bind to backend values with the exact formatting (Average Grade two decimals) → subjects table has one row per seeded enrollment.
  - `tests/dashboards/professor-dashboard-renders-seeded-data.spec.ts`: professor logs in via storageState → My Subjects list contains only their own subjects → clicking a subject populates the students column → Appeals section lists seeded Pending + Overdue appeals and nothing else (no Denied-inside-undo, no other professor's appeals).
  - Commit: `test(e2e): dashboard journeys — student and professor seeded-data binding`

- **22d.9** README + run the full suite + deliver the inline report.
  - Create `e2e/README.md` covering: prerequisites (Docker Desktop running, Node 20+, .NET 8 SDK), one-time setup (`cp .env.e2e.example .env.e2e`, `npm install`, `npx playwright install chromium`), the run command (see end-of-task), how storageState works, how to add a new test, the four-layer production safety guard summary, and the "PRD is source of truth" rule.
  - Run the full suite with `npx playwright test` from `e2e/` against a clean checkout and the running Docker Postgres container.
  - **Actually run it** — do not claim a pass that was not observed. If a test cannot run (Docker missing, port 5433 occupied, backend fails to boot, migration fails), report it as **blocked** with the reason.
  - **Deliver the report inline in chat** (no `REPORT.md` file is created — this is explicit per the human's instruction). The report contains:
    1. **Summary line** — `Total: N | Passed: X | Failed: Y | Blocked: Z | Duration: T`.
    2. **Per-area breakdown** — counts for Auth / Grading / Appeals / Admin / Dashboards.
    3. **Failed tests** — for each failure:
       - Fully qualified test name (`describe > test`).
       - PRD section + rule the test verifies.
       - Expected result per the PRD.
       - Actual result + the Playwright failure message / trace excerpt.
       - Classification: **production defect** (code violates PRD), **test defect** (test is wrong), **environment problem**, or **ambiguous requirement**.
       - Likely root cause (hypothesis vs confirmed).
       - **Proposed fix** — concrete, ordered steps naming the files + methods expected to change. For production defects, the fix proposal lives in chat; **no production code is modified yet** (§0 + §10 rule).
    4. **Blocked tests** — name + reason.
    5. **PRD requirements covered vs uncovered** — a short list of any PRD rule the e2e suite could not verify at this layer, with the reason.
    6. **Discrepancies between PRD and current implementation** — a short list, each pointing at the failing test(s) that exposed it.
  - After delivering the report, **stop and wait for explicit approval** before touching any production code outside the pre-approved 22d.2 test-mode wiring. On approval, apply only the approved fixes, rerun the affected tests, and append a short follow-up report with the new numbers.
  - Commit (README + any test file touch-ups, no production code): `test(e2e): add README, run full suite, and report baseline results`

## 10. Reporting and Stop-Before-Fixing-Production Rule

After the suite is implemented and executed, report inline (no `REPORT.md` file):

* Framework, package versions, test count.
* Pass / fail / blocked counts (actually measured — do not claim a pass you did not observe).
* PRD requirement(s) each failing test maps to.
* Whether a failure indicates a production defect, a test defect, an environment problem, or an ambiguous requirement.
* A concrete, ordered remediation plan.

**Do not modify production code to make a test pass, with one exception:** the test-mode wiring in 22d.2 (TimeProvider swap, `/api/__test__/*` endpoints, four-layer safety guard) is the only pre-approved production-code change for this task. Any other production fix requires explicit approval first. See §0 — the test wins over the implementation by default.

## 11. Execution Order

1. Read PRD, Tech.md, DB.md, UI.md.
2. Build the requirements traceability matrix (PRD rule → planned journey).
3. Inspect existing frontend routes, backend controllers, `seed.sql`, and the TimeProvider wiring from 22a.2 (to learn how to invoke the system — not to decide expected behaviour, which comes from the PRD per §0).
4. Present the strategy, the traceability matrix, and any ambiguities for review.
5. Implement subtasks 22d.1 → 22d.9 in order, each in its own commit.
6. Run the full suite (22d.9) and deliver the inline report per §10.
7. If anything fails: stop, report inline, wait for approval before any production fix outside 22d.2.

**Start with steps 1–4. Do not modify any files until you have presented the strategy and matrix for my review.**

## 12. How to run the e2e suite yourself

One-time setup (first run only):

```bash
cd e2e
cp .env.e2e.example .env.e2e
npm install
npx playwright install chromium
```

Every run — start the Dockerized Postgres container first, then the suite:

```bash
cd e2e
docker compose up -d
npx playwright test
docker compose down
```

Useful variants:

```bash
npx playwright test --headed                       # watch Chromium drive the UI
npx playwright test --ui                           # Playwright's interactive runner
npx playwright test tests/grading                  # one folder
npx playwright test tests/auth/login.spec.ts       # one file
npx playwright test -g "appeal goes overdue"       # match by test name
npx playwright show-report                         # open the HTML report from the last run
```

The suite expects the test DB on `localhost:5433` and will refuse to run against the developer's local Postgres on `5432`. If port 5433 is already in use, stop the conflicting container (`docker ps`) before running.


---



### Task 23 — Escalation workflow for unresolved appeals

#### Overview

When a professor fails to resolve an appeal within the allowed timeframe, the case is escalated to the administrator. Two scenarios trigger escalation:

- **Scenario A** — Professor accepts an appeal but does not re-enter exam points and re-confirm within **7 days of accepting** (`appeal.ReviewedAt + 7 days < now`).
- **Scenario B** — Student submits a second appeal (after the first went overdue) and the professor again fails to accept or deny within the applicable 7-day window, leaving two overdue Pending appeals in the DB.

In both cases the grade **must not auto-finalize** due to professor inaction. Escalation is the only resolution path. The administrator assigns an **eligible professor** — one who teaches another subject with the same `SubjectCode` as the escalated subject, excluding the original professor — who then resolves the case through the normal grading / appeal flow. If the assigned professor also fails to act within **7 days of their assignment**, the case surfaces again for the administrator to re-assign to someone else. Full assignment history is kept.

Key invariants:
- Maximum 2 appeals per grade remains enforced.
- The overdue-restriction on `AcceptAsync` / `DenyAsync` is lifted **only for the assigned professor** (they must be able to act on already-overdue appeals in Scenario B).
- **Read** actions on an escalated grade: allowed for both the original professor and the assigned professor.
- **Write** actions on an escalated grade (accept, deny, reconfirm exam): once `grade.AssignedProfessorId` is set, **only** the currently assigned professor may perform them; the original professor receives `403` and action buttons are hidden on the UI.

---

#### 23.1 — DB: Add `SubjectCode` to `Subject`

Add `SubjectCode VARCHAR(50) NOT NULL DEFAULT ''` to the `Subjects` table. `SubjectCode` groups subjects that represent the same course taught by different professors and is used to determine which professors are eligible for assignment.

-  generate migration — `dotnet ef migrations add AddSubjectCode` from `backend/StudentPortal/`. Review the generated files, then run `dotnet ef database update`.
- Commit: `feat(db): migration for SubjectCode on Subject`

**After completing this subtask, explain:**
- What `SubjectCode` represents and how it enables the professor-eligibility lookup.
- The overall Task 23 workflow from end to end (escalation triggers → admin assigns → professor resolves → grade finalizes → escalation closes; and the re-assignment path when the assigned professor also fails).

---

#### 23.2 — DB: `AssignedProfessorId` on `Grade` + `Escalations` + `EscalationAssignments` tables

**1.** Add nullable `AssignedProfessorId UUID` (FK → `Users`) to `Grades`. Always holds the **currently active** assigned professor. `NULL` on most grades; updated on every (re-)assignment and remains set until the grade is resolved.

**2.** Create `Escalations` table (one row per escalated grade — 1:1 with `Grades`):

| Column | Type | Constraints |
|---|---|---|
| `Id` | UUID | PK |
| `GradeId` | UUID | FK → Grades, UNIQUE |
| `Reason` | VARCHAR | NOT NULL — `'AcceptedUnresolved'` \| `'ChainExhausted'` |
| `ResolvedAt` | TIMESTAMP | NULL — stamped when grade finalizes |

**3.** Create `EscalationAssignments` table (one row per assignment attempt — 1:N with `Escalations`):

| Column | Type | Constraints |
|---|---|---|
| `Id` | UUID | PK |
| `EscalationId` | UUID | FK → Escalations |
| `AssignedProfessorId` | UUID | FK → Users |
| `AssignedByAdminId` | UUID | FK → Users |
| `AssignedAt` | TIMESTAMP | NOT NULL |
| `SupersededAt` | TIMESTAMP | NULL — stamped when this assignment is replaced by a new one |

The **currently active** assignment for an escalation is the row where `SupersededAt IS NULL`. On re-assignment the old row gets `SupersededAt = now`, a new row is inserted, and `Grade.AssignedProfessorId` is updated to match.

-  generate migration — `dotnet ef migrations add AddEscalationWorkflow`. Review, then run `dotnet ef database update`.
- Commit: `feat(db): migration for Grade.AssignedProfessorId, Escalations, and EscalationAssignments`

**After completing this subtask, explain:**
- Why `Grade.AssignedProfessorId` holds only the current assignment (ownership checks need a single value without joining).
- Why `Escalations` and `EscalationAssignments` are separate tables (`Escalations` is the case; `EscalationAssignments` is the history of who was assigned).
- The 1:1 relationship between `Grades` and `Escalations`, and the 1:N between `Escalations` and `EscalationAssignments`.

---

#### 23.3 — Backend: Entities, enums, and repositories

Add:
- `EscalationReason` enum (`AcceptedUnresolved`, `ChainExhausted`) in `Models/Enums/`.
- `Escalation` entity with navigation properties to `Grade` and `ICollection<EscalationAssignment> Assignments`.
- `EscalationAssignment` entity with navigation properties to `Escalation`, `AssignedProfessor` (User), `AssignedByAdmin` (User).
- `IEscalationRepository` with: `GetByGradeIdAsync(Guid)`, `AddAsync(Escalation)`, `UpdateAsync(Escalation)`.
- `IEscalationAssignmentRepository` with: `GetActiveByEscalationIdAsync(Guid)`, `GetAllByEscalationIdAsync(Guid)`, `AddAsync(EscalationAssignment)`, `UpdateAsync(EscalationAssignment)`.
- `EscalationRepository` and `EscalationAssignmentRepository` implementations.
- Register both `DbSet`s in `ApplicationDbContext` with EF mappings and FK constraints. Register both repository interfaces in `Program.cs`.
- Commit: `feat(backend): Escalation and EscalationAssignment entities and repositories`

**After completing this subtask, explain:**
- The entity graph and how navigation properties connect `Escalation` → `EscalationAssignment` → `User`.
- What "active assignment" means in code (`SupersededAt == null`).

---

#### 23.4 — Backend: `SubjectCode` on Subject entity + admin CRUD

- Add `SubjectCode string` property to the `Subject` entity. Update EF mapping.
- Add `SubjectCode` (required, 1–20 chars) to `SubjectCreateDto` and `SubjectUpdateDto`.
- Update `SubjectCreateDtoValidator` and `SubjectUpdateDtoValidator` to enforce 1–20 chars, non-empty.
- Update `SubjectService` create and update methods to persist `SubjectCode`.
- Update `SubjectController` response DTOs to include `SubjectCode`.
- Commit: `feat(backend): add SubjectCode to Subject entity and admin CRUD`

**After completing this subtask, explain:**
- Why `SubjectCode` is required (without it the eligibility query cannot run).
- How an admin sets it (covered in frontend subtask 23.13).

---

#### 23.5 — Backend: Ownership check updates in `GradeService` and `AppealService`

Replace the single `subject.ProfessorId == callerId` ownership guard with a two-tier check:

**Read actions** (`GetByEnrollmentAsync`, `GetByGradeAsync`): allow if `subject.ProfessorId == callerId` **OR** `grade.AssignedProfessorId == callerId`.

**Write actions** (`ReconfirmExamAsync`, `AcceptAsync`, `DenyAsync`, `UndoDenyAsync`):
- `grade.AssignedProfessorId == null` → allow only `subject.ProfessorId == callerId`.
- `grade.AssignedProfessorId != null` → allow only `grade.AssignedProfessorId == callerId`; original professor receives `403`.

**Overdue restriction lift**: in `AcceptAsync` and `DenyAsync`, skip the `appeal.SubmittedAt.AddDays(7) < now` overdue guard when `grade.AssignedProfessorId == callerId`.

- Commit: `feat(backend): two-tier ownership checks for escalated grades`

**After completing this subtask, explain:**
- The read vs write distinction and the rationale.
- Why the overdue restriction is lifted only for the assigned professor.
- Why the backend check is the authoritative security layer even if the frontend hides buttons.

---

#### 23.6 — Backend: `IEscalationService` + `EscalationService`

`EscalationService` in `Services/`, registered via `IEscalationService`:

**`GetAllCasesAsync(DateTime now)`** — returns `EscalatedCaseDto[]` covering:
- Grades with no `Escalation` record that match Scenario A or B detection conditions (status = `NeedsAssignment`).
- Grades with an `Escalation` record where `ResolvedAt == null` and the active assignment's `AssignedAt + 7 days >= now` (status = `Assigned`).
- Grades with an `Escalation` record where `ResolvedAt == null` and the active assignment's `AssignedAt + 7 days < now` (status = `NeedsReassignment`).
- Grades with an `Escalation` record where `ResolvedAt != null` (status = `Resolved` — kept for history).

Detection conditions:
- **Scenario A**: `grade.FinalizedAt == null` AND any appeal has `Status == Accepted` AND `appeal.ReviewedAt!.Value.AddDays(7) < now`.
- **Scenario B**: `grade.FinalizedAt == null` AND 2+ appeals all satisfy `Status == Pending && SubmittedAt.AddDays(7) < now`.

`EscalatedCaseDto` fields: `gradeId`, `enrollmentId`, `subjectName`, `subjectCode`, `studentFirstName`, `studentLastName`, `originalProfessorFirstName`, `originalProfessorLastName`, `finalGrade`, `reason`, `escalationStatus`, `escalatedSince`, `resolvedAt?`, `appeals[]`, `assignmentHistory[]` (from `EscalationAssignments`, ordered by `AssignedAt` — each entry carries `assignedProfessorName`, `assignedByAdminName`, `assignedAt`, `supersededAt?`).

**`GetEligibleProfessorsAsync(string subjectCode, Guid excludeProfessorId)`** — professors (not soft-deleted) who teach at least one `Subject` with `SubjectCode == subjectCode` and `ProfessorId != excludeProfessorId`.

**`AssignProfessorAsync(Guid gradeId, Guid assignedProfessorId, Guid adminId, DateTime now)`** — first assignment: validates grade exists and is not finalized, professor is eligible, no open `Escalation` record exists. Creates `Escalation` row + first `EscalationAssignment` row. Sets `grade.AssignedProfessorId`.

**`ReassignProfessorAsync(Guid gradeId, Guid newProfessorId, Guid adminId, DateTime now)`** — re-assignment: finds open `Escalation`, validates active assignment's `AssignedAt + 7 days < now` (otherwise reject — reassignment not yet due), new professor is eligible. Sets active assignment's `SupersededAt = now`. Inserts new `EscalationAssignment` row. Updates `grade.AssignedProfessorId`.

**`CloseIfEscalatedAsync(Guid gradeId, DateTime now)`** — finds open `Escalation` for the grade; if found sets `ResolvedAt = now`.

- Commit: `feat(backend): EscalationService with detection, assignment, reassignment, and auto-close`

**After completing this subtask, explain:**
- The four escalation statuses and how each is derived.
- Step by step: first assignment vs re-assignment (what rows change in each case).
- How `CloseIfEscalatedAsync` hooks into grade finalization.

---

#### 23.7 — Backend: `EscalationController` + auto-close hooks

**`EscalationController`** `[Authorize(Roles = "Admin")]`, route `api/Escalation`:

- `GET /` → `GetAllCasesAsync` → `200 EscalatedCaseDto[]`.
- `GET /eligible-professors?subjectCode={code}&excludeProfessorId={id}` → `GetEligibleProfessorsAsync` → `200 UserDto[]`.
- `POST /assign` body `{ gradeId, assignedProfessorId }` → `AssignProfessorAsync` → `200 EscalatedCaseDto`. `400` if grade not found or already has an open escalation. `422` if professor not eligible.
- `POST /reassign` body `{ gradeId, newProfessorId }` → `ReassignProfessorAsync` → `200 EscalatedCaseDto`. `400` if no open escalation or reassignment not yet due. `422` if professor not eligible.

**Auto-close hooks**: inject `IEscalationService` into `GradeService` and `AppealService`. Call `CloseIfEscalatedAsync` inside:
- `GradeService.ReconfirmExamAsync` — after `FinalizedAt` is set (Scenario A resolution path).
- `AppealService.DenyAsync` — after `grade.FinalizedAt` is set (Scenario B deny-path).
- Scenario B accept-path: `AcceptAsync` does not finalize; `ReconfirmExamAsync` does → already covered above.

- Commit: `feat(backend): EscalationController with assign/reassign endpoints and auto-close hooks`

**After completing this subtask, explain:**
- Each endpoint and its role.
- Why `POST /reassign` is a separate endpoint from `POST /assign`.
- The two finalization paths and why auto-close hooks into those specific methods.

---

#### 23.8 — Backend: Student dashboard — `"Under admin review"` status

Update `StudentDashboardService.BuildSubjectRow` and `SubjectRowDto`:

- Add `bool IsEscalated` to `SubjectRowDto`.
- Before the existing "accepted appeal awaiting reconfirm" and "overdue appeals" branches, check:
  - Scenario A active: `FinalizedAt == null` AND accepted appeal with `ReviewedAt + 7 days < now` → `Status = "Under admin review"`, `IsEscalated = true`, no buttons.
  - Scenario B active: `FinalizedAt == null` AND 2+ overdue Pending appeals → `Status = "Under admin review"`, `IsEscalated = true`, no buttons.

- Commit: `feat(backend): student dashboard escalation status`

**After completing this subtask, explain:**
- Where the new branches sit in the `BuildSubjectRow` decision chain.
- Why they must be evaluated before the generic accepted-appeal and overdue branches.

---

#### 23.9 — Backend: Professor dashboard — `assignedCases` section

Add `assignedCases: AssignedCaseDto[]` to the professor dashboard response. Entry appears for every grade where `grade.AssignedProfessorId == callerProfId` and `grade.FinalizedAt == null`.

`AssignedCaseDto`: `enrollmentId`, `gradeId`, `subjectName`, `studentFirstName`, `studentLastName`, `midterm1Points`, `midterm2Points`, `attendancePoints`, `practicalPoints`, `examPoints`, `finalGrade`, `reason`, `appeals: AppealDto[]`.

- Commit: `feat(backend): professor dashboard assigned cases section`

**After completing this subtask, explain:**
- How assigned cases are queried.
- What data the professor needs per scenario (Scenario A: grade fields + accepted appeal; Scenario B: both overdue appeal texts).

---

#### 23.10 — Frontend: Student dashboard `"Under admin review"` badge

When `status === "Under admin review"`, render a distinct badge (purple — not used by existing badges) with no action buttons. Stacked-card variant below `sm` shows the same badge.

- Commit: `feat(frontend): student dashboard under-admin-review status badge`

**After completing this subtask, explain:**
- Where in the status-rendering branch the new case is handled.
- The badge colour choice relative to existing badges.

---

#### 23.11 — Frontend: Professor dashboard `"Assigned Cases"` section

Add **Assigned Cases** section below the Appeals section, using `assignedCases` from the dashboard payload.

Each row: subject name, student name, final grade, reason label (`"Accepted appeal — awaiting re-grade"` / `"Two overdue appeals — awaiting review"`), **Resolve** button.

**Resolve modal** (reusable `Modal`, blurred backdrop):
- Appeal history list (status, submitted date, text).
- **Scenario A panel**: collapsed midterms/attendance/practical summary + editable exam input + **Confirm** → `POST /api/Grade/reconfirm-exam`. On success: close modal, remove row.
- **Scenario B panel**: two overdue appeal texts (oldest first) + **Accept** / **Deny** on the latest appeal → existing endpoints. Deny shows the confirm sub-step. On success: close modal, remove row.

Responsive: collapses to stacked cards below `sm`.

- Commit: `feat(frontend): professor dashboard assigned cases section with resolve modal`

**After completing this subtask, explain:**
- How the modal selects Scenario A vs B from the `reason` field.
- How section data is sourced (from dashboard payload, no extra fetch).
- The responsive collapse behaviour.

---

#### 23.12 — Frontend: Admin dashboard `"Escalations"` tab

Add **Escalations** tab to `AdminDashboardPage` alongside Users, Subjects, Enrollments.

Table columns: **Subject**, **Student**, **Original Professor**, **Grade**, **Reason**, **Escalated Since**, **Status**, **Action**.

Row rendering by `escalationStatus`:
- `NeedsAssignment` — `"Needs assignment"` badge; **Assign professor** button.
- `Assigned` — `"Assigned"` badge; no action button.
- `NeedsReassignment` — `"Needs reassignment"` badge (amber); **Reassign professor** button.
- `Resolved` — entire row greyed; `"Resolved"` badge + resolved date; no action button.

**Assign / Reassign modal** (shared layout, blurred backdrop):
- Case detail: subject, student, current grade, reason description, full appeal history.
- **Assignment history** list (from `assignmentHistory[]` in the DTO): chronological table showing professor name, assigned by, assigned at, outcome (`"Superseded"` + date or `"Active"` or `"Resolved"`).
- **Eligible professors** list — fetched once on modal open via `GET /api/Escalation/eligible-professors?subjectCode={code}&excludeProfessorId={id}`. The backend scopes the result to professors who teach the same `SubjectCode`, so the list is naturally small. Render as a selectable list (radio-style). If empty: `"No eligible professors available"` + disabled Confirm.
- **Confirm** → `POST /api/Escalation/assign` (first assignment) or `POST /api/Escalation/reassign` (re-assignment). On success: update row in-place, close modal.

Responsive: collapses to stacked cards below `md` (same as other admin tabs). Assign button full-width in card.

- Commit: `feat(frontend): admin escalations tab with assign/reassign modal and assignment history`

**After completing this subtask, explain:**
- How the four status states drive row rendering and which action button each shows.
- How the assignment history list is rendered inside the modal.
- The eligible-professor dropdown and the empty-list case.
- The responsive collapse behaviour.

---

#### 23.13 — Frontend: `SubjectCode` field in admin subject forms

Add `SubjectCode` text input (required, Zod: non-empty, ≤ 20 chars, label `"Subject Code"`) to subject **Create** and **Edit** forms, directly below Subject Name.

- Commit: `feat(frontend): SubjectCode field in admin subject create and edit forms`

**After completing this subtask, explain:**
- Where the field sits in the form layout.
- Why it is required and what format is expected (e.g. `"MATH-101"`).

---

#### 23.14 — Seed: Explicit Scenario A and Scenario B escalation rows

Update `seed.sql`:

1. Set `SubjectCode` on **all** seeded subjects. At minimum two subjects must share a code so an eligible professor exists for the escalated cases.

2. **Scenario A** — one enrollment + grade with an accepted appeal whose `ReviewedAt = NOW() - INTERVAL '10 days'` (past the 7-day reconfirm window). `FinalizedAt = NULL`. Subject shares a `SubjectCode` with a subject taught by a different professor.

3. **Scenario B** — one enrollment + grade with two Pending appeals: `SubmittedAt = NOW() - INTERVAL '17 days'` (first) and `NOW() - INTERVAL '10 days'` (second). Both overdue. `FinalizedAt = NULL`. Subject shares a `SubjectCode` with another professor's subject.

Document both in seed comments (`-- Scenario A ...`, `-- Scenario B ...`).

- Commit: `feat(db): seed Scenario A and B escalation cases with backdated timestamps`

**After completing this subtask, explain:**
- Which seeded students, professors, and subjects were used for each scenario.
- How to verify: log in as admin, open Escalations tab, confirm both rows appear with status `"Needs assignment"`.
