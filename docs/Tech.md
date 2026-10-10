# Architecture & Technical Implementation

> This document is the **source of truth for how the code is laid out and which libraries do what**. Product behaviour lives in `PRD.md`. Table shapes live in `DB.md`. UI copy / patterns live in `UI.md`.

---

## 1. Stack snapshot

### Backend — already installed (`StudentPortal.csproj`)

- .NET 8.0, ASP.NET Core Web API, `Nullable disable`, `ImplicitUsings enable`.
- `AutoMapper 15.0.1` — object-to-object mapping between entities and DTOs.
- `Microsoft.AspNetCore.Authentication.JwtBearer 8.0.7` — JWT bearer middleware.
- `Npgsql.EntityFrameworkCore.PostgreSQL 9.0.4` — EF Core provider for PostgreSQL.
- `Microsoft.EntityFrameworkCore.Tools 9.0.8` — `dotnet ef migrations` tooling.
- `Swashbuckle.AspNetCore 6.6.2` — Swagger / OpenAPI UI at `/swagger`.

### Backend — to add

- `FluentValidation.AspNetCore` — auto-validation middleware that returns 400 ProblemDetails when a DTO fails. (Officially deprecated by the author but still functional on .NET 8; we accept that trade-off per PRD scope.)
- No new password-hashing library — PBKDF2-SHA512 at 100 000 iterations stays as-is per PRD §6.
- No new rate-limit / lockout packages.

### Frontend — already installed (`frontend/package.json`)

- `react 19.1.1`, `react-dom 19.1.1`.
- `vite 7.1.2`, `@vitejs/plugin-react 5.0.0` — build / dev server.
- `react-router-dom 6.30.1` — client routing.
- `axios 1.12.2` — HTTP client.
- `zustand 5.0.8` — state store.
- `bootstrap 5.3.8` + `@popperjs/core 2.11.8` — UI framework (kept per user instruction; no Tailwind, no shadcn).
- `@fortawesome/react-fontawesome 3.0.2` + `@fortawesome/free-solid-svg-icons 7.0.1` — icons (used sparingly; the password-toggle eye may use inline SVG instead to avoid broader icon imports).
- TypeScript 5.8, ESLint 9.

### Frontend — to add

- `zod` — runtime schema validation for form state.
- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` — testing stack.
- `msw` v2 — HTTP mock server for frontend tests.
- `react-toastify` — toast notifications per PRD Task 21.
- `babel-plugin-react-compiler` — enables React Compiler for automatic memoisation.

### Explicitly NOT installed (per user direction)

- `tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`, `class-variance-authority` — no Tailwind stack.
- `shadcn` scaffolding, `components.json`, `src/components/ui/*` scaffolds, radix primitives — not using shadcn.
- `lucide-react` — icons come from FontAwesome (already installed) or inline SVG.
- `@fontsource-variable/geist` — stick with the browser default / Bootstrap stack.
- `jwt-decode` — the SPA never decodes a JWT; the access token is an httpOnly cookie.
- No cookie / local-storage / auth-token wrapper services on the frontend — the browser's cookie jar is the only token-bearing surface.
- No `useForm` custom hook — login (and any future form) uses raw `useState` + Zod `safeParse`.

---

## 2. Backend architecture

### 2.1 Project layout

```
backend/StudentPortal/
  Program.cs                        bootstrap, DI, middleware pipeline
  appsettings.json                  non-secret config (Issuer, Audience, lifetimes, CORS origins)
  appsettings.Development.json      dev overrides
  Controllers/                      thin HTTP layer; one class per resource
  Services/                         business logic; one interface + one implementation per domain
  Repositories/                     EF access; one per aggregate
  Interfaces/                       all abstractions used across layers
  Models/
    Entities/                       EF entity classes + DbContext
    Enums/                          RoleEnum, AppealStatus
  Dtos/                             request + response shapes
  Validators/                       FluentValidation AbstractValidators (new folder)
  Profiles/                         AutoMapper profiles
  Handlers/                         PasswordHashHandler (stays as-is)
  Migrations/                       EF migrations + seed.sql
  Properties/launchSettings.json    dev launch URLs
```

### 2.2 Request pipeline

```
[Client] → HTTPS → CORS (allow-list) → JwtBearer auth (reads sp_access cookie)
        → Authorization (role policies) → FluentValidation (auto 400) → Controller
        → Service (ownership checks) → Repository → EF Core → PostgreSQL
```

### 2.3 Dependency injection

Everything is `Scoped` (per-request). Order of registration in `Program.cs`:
1. `AddDbContext<StudentPortalApiContext>(options => options.UseNpgsql(connectionString))`.
2. Repositories: `IUserRepository → UserRepository`, `ISubjectRepository → SubjectRepository`, `IEnrollmentRepository → EnrollmentRepository`, `IGradeRepository → GradeRepository`, `IGradeDraftRepository → GradeDraftRepository` (new), `IAppealRepository → AppealRepository` (new), `IRefreshTokenRepository → RefreshTokenRepository` (new).
3. Services: `IUserService → UserService`, `ISubjectService → SubjectService`, `IEnrollmentService → EnrollmentService`, `IGradeService → GradeService`, `IGradeDraftService → GradeDraftService` (new), `IAppealService → AppealService` (new), `IAuthService → AuthService` (renamed from `JwtService`), `ITokenService → TokenService` (new).
4. `AddAutoMapper(typeof(MappingProfile).Assembly)`.
5. `AddControllers()` + `AddFluentValidationAutoValidation()` + `AddValidatorsFromAssemblyContaining<LoginRequestDtoValidator>()`.
6. `AddEndpointsApiExplorer()` + `AddSwaggerGen(...)` with Bearer security scheme (kept for Swagger testing even though prod uses cookies).
7. `AddAuthentication(JwtBearerDefaults).AddJwtBearer(options => { ... })` — JWT validation parameters pinned per PRD §6 and `OnMessageReceived` configured to read the JWT from the `sp_access` cookie.
8. `AddAuthorization(opt => { opt.AddPolicy("AdminOnly", p => p.RequireRole("Admin")); opt.AddPolicy("ProfessorOnly", p => p.RequireRole("Professor")); opt.AddPolicy("StudentOnly", p => p.RequireRole("Student")); })`.
9. `AddCors(options => options.AddPolicy("Default", p => p.WithOrigins(configuredOrigins).AllowAnyHeader().WithMethods(...).AllowCredentials()))`.

### 2.4 Authorization layering

**Layer 1 — Controller attribute** gates by role. Examples:
- `UserController` class → `[Authorize]`. Create/edit/delete actions → `[Authorize(Roles = "Admin")]`.
- `GradeController` → `[Authorize]`. Confirm / reconfirm-exam actions → `[Authorize(Roles = "Professor")]`. Student-confirm action → `[Authorize(Roles = "Student")]`.
- `AppealController` → `[Authorize]`. Submit → `[Authorize(Roles = "Student")]`. Accept / Deny / Undo-deny → `[Authorize(Roles = "Professor")]`.
- `AccountController`'s `Login` and `Refresh` → `[AllowAnonymous]`. `Me` and `Logout` require auth.

**Layer 2 — Service ownership check** reads `currentUserId` from `HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)` (passed into services via `IHttpContextAccessor` or as an explicit parameter from the controller). Examples:
- `GradeService.ConfirmAsync(enrollmentId, callerProfId)` loads the subject via the enrollment and verifies `subject.ProfessorId == callerProfId` → `ForbiddenAccessException` if not.
- `AppealService.SubmitAsync(gradeId, callerStudentId)` loads the grade's enrollment and verifies `enrollment.StudentId == callerStudentId`.
- `AppealService.AcceptAsync(appealId, callerProfId)` verifies the appeal's grade's subject's professor is the caller.

### 2.5 Cookie / token model

- **`sp_access`** cookie — holds the access JWT. `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900` (15 minutes).
- **`sp_refresh`** cookie — holds the raw refresh token. `HttpOnly; Secure; SameSite=Strict; Path=/api/Account; Max-Age=604800` (7 days). Scoping the `Path` to `/api/Account` means it is sent only to `/Refresh` and `/Logout`.
- The browser sends both cookies automatically on every request to the API. The SPA never reads either (`HttpOnly` prevents JS access).
- On `/Refresh`: server reads the cookie, hashes it with SHA-256, looks up the row in `RefreshTokens`, rejects if missing / expired / revoked / `ReplacedByTokenId` set. On success, it inserts a new row, revokes the old row (sets `RevokedUtc` + `ReplacedByTokenId`), and re-issues both cookies. **Reuse detection:** if a client presents a refresh token whose row's `RevokedUtc` is already set (someone else already rotated it), revoke every active refresh row for that user → 401.
- On `/Logout`: revoke the current refresh row and overwrite both cookies with `Max-Age=0`.
- The JWT itself carries claims: `sub` = user GUID, `nameidentifier` = user GUID, `role` = role name, `email` = email, `jti` = random GUID, `exp` = 15 min from now.

### 2.6 Validation

FluentValidation `AbstractValidator<T>` per DTO (see `Validators/`). `AddFluentValidationAutoValidation()` wires them into the MVC pipeline so a validation failure returns `400 Bad Request` with a `ValidationProblemDetails` body — no controller code needed. Each validator covers:
- Non-null / non-empty, length bounds, email format (`EmailAddress()`), role enum range for admin DTOs.
- Grade DTOs: point ranges per PRD §3.1, must be multiples of 0.5, decimal precision.
- Appeal DTO: text length ≤ 1000.

### 2.7 Error handling

Replace every `catch (Exception ex) { return StatusCode(500, $"Internal server error: {ex.Message}") }` with a single `UseExceptionHandler` middleware returning `ProblemDetails { title: "An error occurred.", traceId }`. Business failures surface as typed exceptions (`NotFoundException`, `ForbiddenAccessException`, `ValidationException`, `ConflictException`) which the middleware maps to 404 / 403 / 400 / 409 respectively. Service / repository exceptions are logged with the traceId; the client sees only the opaque message.

### 2.8 Secrets

- Local dev: `dotnet user-secrets` (`JwtConfig:Key`, `ConnectionStrings:DefaultConnection`).
- Production (Render): environment variables `JwtConfig__Key`, `ConnectionStrings__DefaultConnection`. ASP.NET's config system reads double-underscore env vars automatically; nothing extra needed. `appsettings.json` holds only non-secret values. Program.cs fails fast at startup if any required value is missing.

---

## 3. Frontend architecture

### 3.1 Project layout (feature-sliced)

```
frontend/src/
  App.tsx                       root <RouterProvider/> and 3 bootstrap useEffects
  main.tsx                      createRoot + Bootstrap CSS + react-toastify CSS
  config/constants.ts           APP_ROUTES, API_ROUTES enums
  providers/
    router.tsx                  createBrowserRouter config
    authGuard.tsx               <AuthGuard>{children}</AuthGuard>
  components/
    ui/                         reusable primitives (Modal, PasswordInput, Spinner)
    shared/                     cross-feature pieces (RoleGate, ResponsiveTable)
    layout/                     Navbar, PageLayout
  features/
    auth/
      api/authService.ts        login, logout, me, refresh (refresh called by interceptor)
      components/LoginForm.tsx
      models/                   LoginRequest, LoginResponse
      pages/LoginPage.tsx
      utils/loginSchema.ts      Zod schema + type exports
      index.ts
    user/
      api/userService.ts
      hooks/useStudentDashboard.ts   data-fetching custom hook (allowed exception per user)
      models/User.ts
      pages/StudentDashboardPage.tsx
      utils/
      index.ts
    grades/
      api/gradeService.ts
      api/gradeDraftService.ts
      components/GradingPanel.tsx
      hooks/useProfessorDashboard.ts
      models/Grade.ts GradeDraft.ts
      utils/calculateFinalGrade.ts   pure helper (not a hook)
      pages/ProfessorDashboardPage.tsx
      index.ts
    appeals/
      api/appealService.ts
      components/AppealModal.tsx ViewAppealModal.tsx
      models/Appeal.ts
      utils/computeAppealWindowRemaining.ts   pure helper
      index.ts
    subjects/
      api/subjectService.ts
      components/SubjectsTable.tsx SubjectCreateForm.tsx SubjectEditForm.tsx
      models/Subject.ts
      index.ts
    enrollments/
      api/enrollmentService.ts
      components/EnrollmentsTable.tsx EnrollmentCreateForm.tsx
      models/Enrollment.ts
      index.ts
    admin/
      pages/AdminDashboardPage.tsx    hosts the three tabs
      components/UsersTable.tsx UserCreateForm.tsx UserEditForm.tsx
  lib/
    navigation.ts               navigation singleton
    auth.ts                     clearAuthSession, withAuthRedirect, getRedirectTarget
  pages/
    HomePage.tsx                public landing
  shared/
    api/axiosClient.ts          singleton with withCredentials + silent refresh
    api/index.ts                barrel
  store/
    user/useUserStore.ts        currentUser, isHydrating, setters
  test/
    setup.ts                    vitest + jest-dom + MSW mount
    server.ts                   setupServer({ onUnhandledRequest: 'error' })
    handlers/                   per-feature MSW handler files
```

Every folder exports its public surface via `index.ts`. Imports go through the barrel, not deep paths.

### 3.2 React patterns in use (and NOT in use)

**In use:**
- Function components only.
- Pages hold state; presentational pieces take data via props.
- Composition via `children` / `<Outlet/>`.
- `useState`, `useEffect`, `useCallback` (only when a stable identity is required for a dependency), `useMemo` (only when profiling shows a real need), `useRef` sparingly (mount guards).
- Zustand slice-selectors: `useUserStore(s => s.currentUser)` — never whole-store destructuring.
- Custom hooks **only** for data fetching (one per domain), as an explicit exception to the "no custom hooks" rule. These follow the frontend_skills.md pattern A (auto-fetch with `AbortController`).
- `AbortSignal` plumbed hook → service → axios.

**Not in use (do not introduce):**
- Class components. HOCs. React Context (except React's own default context for Router / providers). `React.memo`, `React.lazy`, `Suspense`. `forwardRef`, `useImperativeHandle`. `useReducer`, `useLayoutEffect`, `useTransition`, `useSyncExternalStore`, `useFormStatus`, `useActionState`.
- Advanced TypeScript (no conditional types, no mapped types beyond trivial, no deep inference puzzles). Prefer `type` over `interface`.
- A custom `useForm` hook. Forms are raw `useState` + Zod `safeParse`.
- A cookie / local-storage / auth-token wrapper service.

### 3.3 Axios singleton

Behaviour on every request:
- `baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'`.
- `withCredentials: true` so cookies always travel.
- Default `Content-Type: application/json`.
- No `Authorization: Bearer` header. The JWT is in the httpOnly cookie.

Response interceptor:
- On `401` and `!config._retry`: set `_retry = true`, call `POST /api/Account/Refresh` (serialised via a module-scoped `refreshPromise` so a burst of 401s triggers exactly one refresh), retry the original request on success.
- On refresh failure OR on `403`: call `clearAuthSession({ redirectToLogin: true })` (clears user store, fire-and-forget `POST /api/Account/Logout`, navigates to `/login` via the navigation singleton).

### 3.4 Routing

- `createBrowserRouter` + `<RouterProvider/>` in `main.tsx`.
- Protected routes wrap `<AuthGuard>` which reads `currentUser` + `isHydrating` from the store, renders a spinner while hydrating, and `<Navigate to={APP_ROUTES.AUTH_LOGIN} state={withAuthRedirect(location)} replace/>` when not authenticated.
- Role-restricted routes additionally wrap `<RoleGate roles={[USER_ROLES.ADMIN]}>`.
- Imperative navigation from non-components uses `src/lib/navigation.ts` (the singleton is registered by `App.tsx`'s first `useEffect`).

### 3.5 State management

- `useUserStore` — the only global slice. Fields: `currentUser`, `isHydrating`, `setCurrentUser`, `clearCurrentUser`, `setHydrating`. **No `token` field** — the server owns token lifetime via cookies.
- Local state via `useState`. No `useReducer`.
- No Redux / Jotai / Recoil / MobX / React Query / SWR / TanStack Query.

### 3.6 Forms

- Raw `useState` for form values. `touched` flags via a parallel `useState`.
- Zod schema per form in the feature's `utils/`:
  ```ts
  const validation = schema.safeParse(form);
  const fieldErrors = validation.success ? {} : (validation.error.flatten().fieldErrors as LoginFieldErrors);
  // show errors only when touched[field] is true
  ```
- Submit flow: mark all touched → bail if invalid → set `isSubmitting` → service call → `setServerError` on failure → navigate on success.

### 3.7 Testing

- Vitest + jsdom + @testing-library/react + @testing-library/user-event + @testing-library/jest-dom.
- MSW 2 with `onUnhandledRequest: 'error'` in `src/test/server.ts`. Handlers emit `Set-Cookie` headers to exercise the full cookie plumbing (axios + browser cookie jar emulation in jsdom).
- Vitest globals (`describe`, `it`, `expect`, `vi`) — not imported.
- Co-locate tests next to source: `features/auth/pages/LoginPage.test.tsx`, etc.

### 3.8 Styling

- Bootstrap 5 via the CSS import in `main.tsx`.
- No Tailwind, no shadcn, no CSS modules, no styled-components.
- Component-local styles use inline `style` prop or a single `.css` file next to the component when non-trivial.
- Backdrop blur for appeal modal: inline style `backdropFilter: 'blur(4px)'` on the `.modal-backdrop` override.

---

## 4. Database tooling

- EF Core 9 Code-First with Fluent API (`OnModelCreating` in `StudentPortalApiContext`).
- Migrations live in `backend/StudentPortal/Migrations/` as C# files + a model snapshot.
- Seed data lives in `backend/StudentPortal/Migrations/seed.sql`, re-runnable (`DELETE FROM ... ; INSERT INTO ...`).
- The agent generates migrations locally with `dotnet ef migrations add <Name>` and commits the files. The human runs `dotnet ef database update` and `psql -f seed.sql`.

---

## 5. Deployment (Render — scaffolding only)

- Backend service: web service, build command `dotnet publish -c Release -o out`, start command `dotnet out/StudentPortal.dll`.
- Frontend service: static site, build command `npm run build`, publish directory `dist/`.
- Required Render env vars on the backend: `JwtConfig__Key`, `JwtConfig__Issuer`, `JwtConfig__Audience`, `ConnectionStrings__DefaultConnection`, `Cors__Origins__0`, `Cors__Origins__1`, `ASPNETCORE_ENVIRONMENT=Production`.
- Required Render env var on the frontend: `VITE_API_BASE_URL`.
- HTTPS is terminated by Render; the backend sets `UseHttpsRedirection()` and emits cookies with `Secure` flag.
- Cookies are `SameSite=Strict`, so the backend and frontend **must share a registrable domain** (e.g. `api.example.com` + `app.example.com`). On Render's default `*.onrender.com` subdomains, Strict will still work because both are first-level cousins — but double-check in a browser once deployed.

---

## 6. What's intentionally simple

- Error handling: one global middleware + typed exceptions, nothing per-controller.
- Validation: one FluentValidation validator per DTO, nothing clever.
- State: one Zustand store, slice-selectors, nothing clever.
- Forms: raw useState + Zod, no form library.
- Icons: inline SVG where one icon is needed; FontAwesome where many.
- Pagination, caching, optimistic updates: not implemented.
- Logging: default ASP.NET console logging. Serilog is not added.
