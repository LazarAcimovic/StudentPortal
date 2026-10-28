# Architecture — backend

> Source of truth for **how the ASP.NET Core backend is laid out and how its layers talk to each other**.
>
> Libraries and versions live in [`Tech.md`](Tech.md) §1. Product behaviour lives in `PRD.md`. Table shapes live in `DB.md`.

---

## Section index

> Agents: do not Read this file whole. `grep -n "^## " docs/Tech-Backend.md` for live line numbers, then Read with `offset`/`limit`. This index carries **no** line numbers on purpose (per D-011).

| Section | Title |
|---|---|
| 1 | Project layout |
| 2 | Request pipeline and dependency injection |
| 3 | Authorization layering |
| 4 | Cookie and token model |
| 5 | Validation |
| 6 | Error handling, secrets, and time |
| 7 | Testing |

---

## 1. Project layout

```
backend/
  StudentPortal/
    Program.cs                        bootstrap, DI, middleware pipeline
    appsettings.json                  non-secret config (Issuer, Audience, lifetimes, CORS origins)
    appsettings.Development.json      dev overrides
    Controllers/                      thin HTTP layer; one class per resource
    Services/                         business logic; one interface + one implementation per domain
    Repositories/                     EF access; one per aggregate
    Interfaces/                       all abstractions used across layers
    Models/
      Entities/                       EF entity classes + StudentPortalApiContext
      Enums/                          RoleEnum, AppealStatus, EscalationReason
    Dtos/                             request + response shapes
    Validators/                       FluentValidation AbstractValidators
    Profiles/                         AutoMapper profiles
    Handlers/                         PasswordHashHandler
    Migrations/                       EF migrations + model snapshot + seed.sql
    Properties/launchSettings.json    dev launch URLs
  StudentPortal.Tests/                unit tests (xUnit + NSubstitute + FluentAssertions)
  StudentPortal.IntegrationTests/     integration tests (Testcontainers + Respawn + WebApplicationFactory)
```

The DbContext class is **`StudentPortalApiContext`** (`Models/Entities/StudentPortalApiContext.cs`). There is no `ApplicationDbContext`; do not create one.

---

## 2. Request pipeline and dependency injection

```
[Client] → HTTPS → CORS (allow-list) → JwtBearer auth (reads sp_access cookie)
        → Authorization (role policies) → FluentValidation (auto 400) → Controller
        → Service (ownership checks) → Repository → EF Core → PostgreSQL
```

Everything is `Scoped` (per-request) except `TimeProvider`, which is a singleton. Order of registration in `Program.cs`:

1. `AddDbContext<StudentPortalApiContext>(options => options.UseNpgsql(connectionString))`.
2. Repositories: `IUserRepository`, `ISubjectRepository`, `IEnrollmentRepository`, `IGradeRepository`, `IGradeDraftRepository`, `IAppealRepository`, `IRefreshTokenRepository`, `IEscalationRepository`, `IEscalationAssignmentRepository`.
3. Services: `IUserService`, `ISubjectService`, `IEnrollmentService`, `IGradeService`, `IGradeDraftService`, `IAppealService`, `IAuthService`, `ITokenService`, `IEscalationService`, `IStudentDashboardService`, `IProfessorDashboardService`.
4. `TimeProvider.System` as the singleton default (see §6).
5. `AddAutoMapper(typeof(MappingProfile).Assembly)`.
6. `AddControllers()` + `AddFluentValidationAutoValidation()` + `AddValidatorsFromAssemblyContaining<LoginRequestDtoValidator>()`.
7. `AddEndpointsApiExplorer()` + `AddSwaggerGen(...)` with a Bearer security scheme (kept for Swagger testing even though production uses cookies).
8. `AddAuthentication(JwtBearerDefaults).AddJwtBearer(...)` — validation parameters pinned per PRD §6, with `OnMessageReceived` configured to read the JWT from the `sp_access` cookie.
9. `AddAuthorization(...)` with policies `AdminOnly`, `ProfessorOnly`, `StudentOnly`.
10. `AddCors(...)` with `WithOrigins(configuredOrigins).AllowAnyHeader().WithMethods(...).AllowCredentials()`.

---

## 3. Authorization layering

**Layer 1 — controller attribute** gates by role:

- `UserController` → `[Authorize]`; create/edit/delete → `[Authorize(Roles = "Admin")]`.
- `GradeController` → `[Authorize]`; confirm / reconfirm-exam → `Professor`; student-confirm → `Student`.
- `AppealController` → `[Authorize]`; submit → `Student`; accept / deny / undo-deny → `Professor`.
- `EscalationController` → `[Authorize(Roles = "Admin")]` on the whole class.
- `AccountController`: `Login` and `Refresh` are `[AllowAnonymous]`; `Me`, `Logout`, `PUT /profile`, `POST /change-password` are `[Authorize]` (role-agnostic).

**Layer 2 — service ownership check** reads `currentUserId` from the `ClaimTypes.NameIdentifier` claim and is the authoritative layer: it must hold even if the UI is bypassed.

- `GradeService.ConfirmAsync(enrollmentId, callerProfId)` verifies `subject.ProfessorId == callerProfId`, else `ForbiddenAccessException`.
- `AppealService.SubmitAsync(gradeId, callerStudentId)` verifies `enrollment.StudentId == callerStudentId`.
- `UserService.UpdateProfileAsync(callerId, dto)` — if `callerRole != Admin` and the submitted `Email` differs from the stored row → `ForbiddenAccessException`.
- `UserService.AdminUpdateUserAsync(targetId, callerId, dto)` — `targetId != callerId` for soft-delete and for role change; `target.UserRole != Admin` for both `UserRole` and `IsDeleted` changes.
- `UserService.ChangePasswordAsync(callerId, dto)` verifies the current password, then calls `IRefreshTokenRepository.RevokeAllForUserAsync(callerId)`.

**Layer 2b — two-tier check for escalated grades** (PRD §4.8, D-017). Once `Grade.AssignedProfessorId` is set, write authority moves to the assignee:

| Action class | Methods | Rule |
|---|---|---|
| Read | `GetByEnrollmentAsync`, `GetByGradeAsync` | allow if `subject.ProfessorId == callerId` **OR** `grade.AssignedProfessorId == callerId` |
| Write | `ReconfirmExamAsync`, `AcceptAsync`, `DenyAsync`, `UndoDenyAsync` | `AssignedProfessorId == null` → only `subject.ProfessorId == callerId`; `AssignedProfessorId != null` → only `grade.AssignedProfessorId == callerId`, original professor gets `403` |

The overdue guard (`appeal.SubmittedAt.AddDays(7) < now`) in `AcceptAsync` / `DenyAsync` is skipped **only** when the caller is the assigned professor.

**Escalation service surface** (`IEscalationService`):

- `GetAllCasesAsync(now)` → `EscalatedCaseDto[]` across four derived statuses: `NeedsAssignment`, `Assigned`, `NeedsReassignment`, `Resolved` (PRD §4.8).
- `GetEligibleProfessorsAsync(gradeId)` → non-deleted professors teaching a `Subject` with the same `SubjectCode`, excluding the original professor and every professor in the escalation's assignment history (PRD §4.8, per D-023). Backed by `IUserRepository.GetProfessorsBySubjectCodeAsync(subjectCode, excludeIds)` where `excludeIds` is built from `Grade.AssignedProfessorId` (original professor) plus all `EscalationAssignment.AssignedProfessorId` values for the open escalation.
- `AssignProfessorAsync` / `ReassignProfessorAsync` — write `Escalations` + `EscalationAssignments` rows and keep `Grade.AssignedProfessorId` in sync with the active assignment (`SupersededAt IS NULL`).
- `CloseIfEscalatedAsync(gradeId, now)` — stamps `Escalation.ResolvedAt`. Called from the two finalization paths only: `GradeService.ReconfirmExamAsync` and `AppealService.DenyAsync`.

---

## 4. Cookie and token model

- **`sp_access`** — the access JWT. `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900` (15 minutes).
- **`sp_refresh`** — the raw refresh token. `HttpOnly; Secure; SameSite=Strict; Path=/api/Account; Max-Age=604800` (7 days). Scoping `Path` means it is sent only to `/Refresh` and `/Logout`.
- The browser sends both automatically; the SPA never reads either (`HttpOnly` blocks JS access).
- On `/Refresh`: read the cookie, hash with SHA-256, look the row up in `RefreshTokens`, reject if missing / expired / revoked / `ReplacedByTokenId` set. On success insert a new row, revoke the old one (`RevokedUtc` + `ReplacedByTokenId`), re-issue both cookies. **Reuse detection:** a presented token whose row is already revoked revokes every active refresh row for that user → 401.
- On `/Logout`: revoke the current refresh row, overwrite both cookies with `Max-Age=0`.
- On `POST /change-password`: verify current password, re-hash, `RevokeAllForUserAsync`, clear both cookies, return `204`. The SPA treats this as a hard logout.
- JWT claims: `sub` = user GUID, `nameidentifier` = user GUID, `role`, `email`, `jti` = random GUID, `exp` = 15 minutes out.

---

## 5. Validation

One FluentValidation `AbstractValidator<T>` per DTO in `Validators/`. `AddFluentValidationAutoValidation()` wires them into the MVC pipeline, so a failure returns `400` with a `ValidationProblemDetails` body and no controller code.

Each validator covers non-null / non-empty, length bounds, email format (`EmailAddress()`), and enum range for admin DTOs. Specifics worth pinning:

- Grade DTOs: point ranges per PRD §3.1, multiples of 0.5, decimal precision.
- Appeal DTO: text length ≤ 1000.
- Password DTOs: 12–128 characters.
- `SubjectCreateDto` / `SubjectUpdateDto`: `SubjectCode` required, 1–20 characters (D-015 — the column is `varchar(50)` for migration headroom, but 20 is the contract).

---

## 6. Error handling, secrets, and time

**Error handling.** A single `UseExceptionHandler` middleware returns `ProblemDetails { title: "An error occurred.", traceId }`. Business failures surface as typed exceptions — `NotFoundException`, `ForbiddenAccessException`, `ValidationException`, `ConflictException` — which the middleware maps to 404 / 403 / 400 / 409. Exceptions are logged with the traceId; the client sees only the opaque message. No per-controller `catch (Exception ex) { return StatusCode(500, ex.Message) }`.

**Secrets.**

- Local dev: `dotnet user-secrets` (`JwtConfig:Key`, `ConnectionStrings:DefaultConnection`).
- Production (Render): env vars `JwtConfig__Key`, `ConnectionStrings__DefaultConnection`. ASP.NET's config system reads double-underscore env vars automatically. `appsettings.json` holds only non-secret values, and `Program.cs` fails fast at startup if a required value is missing.

**Time.** Every service that implements a time-dependent **product rule** takes `System.TimeProvider` by constructor injection and calls `GetUtcNow()` — `AppealService`, `GradeService`, `GradeDraftService`, `StudentDashboardService`, `ProfessorDashboardService`. `Program.cs` registers `TimeProvider.System` as a singleton; tests replace it with `FakeTimeProvider` (§7). All timestamps are stored as `timestamp with time zone` in UTC (D-016).

Two known deviations, both tracked as open subtasks rather than silently tolerated:

- `EscalationService` still threads `DateTime now` through its public methods instead of injecting `TimeProvider`. Aligning it is the last open box of task 23.6.
- `AuthService` and `TokenService` still call `DateTime.UtcNow` for refresh-token expiry and JWT `Expires`. These are infrastructure lifetimes rather than product rules, so no test depends on moving them, but new code must not copy the pattern.

**Test-mode clock and `/api/__test__/*` (e2e only).** The Playwright suite (task 22d) needs to freeze and advance "now" against a running server, which the integration-test `FakeTimeProvider` swap (§7) cannot do because it lives in the test host. So `Program.cs` registers `TestSupport/ControllableTimeProvider` (a mutable `TimeProvider` that can be advanced and re-anchored in either direction) in place of `TimeProvider.System`, and mounts two minimal-API endpoints — `POST /api/__test__/advance-clock?seconds=N` and `POST /api/__test__/reset` (truncate + re-seed via `seed.sql`, then re-anchor the clock). Both the swap and the endpoints activate only when a **four-layer guard** holds, all at once: (1) `ASPNETCORE_ENVIRONMENT == e2e`, (2) the `TestMode:Enabled` flag is on, (3) the connection string's database equals `TestMode:DatabaseName`, and (4) the request carries the matching `TestMode:Secret` as an `X-Test-Secret` header. Layers 1–3 are evaluated at boot — if any is missing the clock stays `TimeProvider.System` and the endpoints are never mapped; layer 4 is a per-request check that returns `404` on a miss so the surface can't be probed. Under Development and Production nothing mounts (asserted by `StudentPortal.IntegrationTests` `--filter TestMode`, including a `404`-under-Production test). This never alters the production auth pipeline (PRD §6).

---

## 7. Testing

Two sibling test projects:

- **`backend/StudentPortal.Tests/`** — unit tests. xUnit + NSubstitute + FluentAssertions, organised as `Services/<ServiceName>Tests.cs`. No DB, no HTTP, mocked repositories. One `CreateSut()` per test class; private `MakeX()` helpers build domain objects.
- **`backend/StudentPortal.IntegrationTests/`** — integration tests. xUnit + Testcontainers (`postgres:17` pinned, never `latest`) + Respawn + `Microsoft.AspNetCore.Mvc.Testing` + `Microsoft.Extensions.TimeProvider.Testing` + FluentAssertions. Organised by domain folder: `Tests/Auth/`, `Tests/Grading/`, `Tests/Appeals/`, `Tests/Dashboards/`, `Tests/Escalations/`.

**Unit test conventions.** AAA structure. Names: `MethodName_Scenario_ExpectedResult` or `When_X_Then_Y`. One logical behaviour per test. Mock only external collaborators of the unit under test — never the business logic being tested. `[Theory]` + `[InlineData]` for parameterized cases (final-grade buckets, point-field validation).

**Integration test conventions.**

- One Postgres container per suite via `[CollectionDefinition("Integration")]` + `[Collection("Integration")]`. `IntegrationTestFixture : IAsyncLifetime` starts the container, builds `WebApplicationFactory<Program>`, applies EF migrations, builds a Respawner.
- Reset between **every** test: Respawn truncates all tables, then `seed.sql` replays. `IntegrationTestBase.InitializeAsync` runs this.
- Expose `Program` so `WebApplicationFactory<Program>` compiles: `public partial class Program { }` at the end of `Program.cs`.
- Auth helpers: `CreateAuthenticatedClientAsync(email, password)` POSTs to `/api/Account/Login` through the real pipeline; `HandleCookies = true` means `sp_access` and `sp_refresh` ride on every later request. `CreateAnonymousClient()` for 401 tests. Never mint JWTs by hand; never install a test `AuthenticationHandler`.
- `SeedUsers` / `SeedIds` constants hold the seeded cast and fixed GUIDs.

**Seed vs in-test data.** `seed.sql` provides the auth cast and realistic shape. Tests MUST NOT depend on a specific seeded Grade / GradeDraft / Appeal row or its timestamps, and **no time-sensitive row ever lives in `seed.sql`** — a backdated row there would leak into every test, because the seed replays before each one. Per-test state comes from either (a) real API calls as an authenticated user (preferred when an endpoint exists), or (b) DbContext builder helpers on the base class (`SeedAppealAtAsync`, `SeedGradeConfirmedAtAsync`, `SeedDeniedAppealAtAsync`) for backdated timestamps and states the API cannot produce.

**Time control.** The fixture overrides the singleton with `FakeTimeProvider` via `s.Replace(ServiceDescriptor.Singleton<TimeProvider>(FakeTime))`. Advance with `FakeTime.Advance(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)))` to land on boundaries exactly. Every time-dependent rule is tested at three points: immediately before, exactly at, immediately after the deadline.

**Anti-patterns.** Hardcoded ports, unpinned image tags, `postgres:latest`, a shared container with no reset, mocking the database, EF InMemory, infrastructure code inside test bodies, hand-minted JWTs, wall-clock sleeps (`Thread.Sleep`, `await Task.Delay`) in time-dependent tests.

**Running.** Unit: `dotnet test backend/StudentPortal.Tests` (no Docker). Integration: `dotnet test backend/StudentPortal.IntegrationTests` (requires Docker Desktop; the first run pulls `postgres:17`).
