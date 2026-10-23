# Architecture — shared

> Source of truth for **which libraries exist, how the database is tooled, how we deploy, and which trade-offs we accepted knowingly**.
>
> Backend architecture lives in [`Tech-Backend.md`](Tech-Backend.md). Frontend architecture lives in [`Tech-Frontend.md`](Tech-Frontend.md). Product behaviour lives in `PRD.md`. Table shapes live in `DB.md`. Visual rules live in `UI.md`.

---

## Section index

> Agents: do not Read this file whole. `grep -n "^## " docs/Tech.md` for live line numbers, then Read with `offset`/`limit`. This index carries **no** line numbers on purpose (per D-011).

| Section | Title |
|---|---|
| 1 | Stack snapshot |
| 2 | Database tooling |
| 3 | Deployment (Render — scaffolding only) |
| 4 | What's intentionally simple |

---

## 1. Stack snapshot

### Backend — already installed (`StudentPortal.csproj`)

- .NET 8.0, ASP.NET Core Web API, `Nullable disable`, `ImplicitUsings enable`.
- `AutoMapper 15.0.1` — object-to-object mapping between entities and DTOs.
- `Microsoft.AspNetCore.Authentication.JwtBearer 8.0.7` — JWT bearer middleware.
- `Npgsql.EntityFrameworkCore.PostgreSQL 9.0.4` — EF Core provider for PostgreSQL.
- `Microsoft.EntityFrameworkCore.Tools 9.0.8` — `dotnet ef migrations` tooling.
- `Swashbuckle.AspNetCore 6.6.2` — Swagger / OpenAPI UI at `/swagger`.
- `FluentValidation.AspNetCore` — auto-validation middleware returning 400 ProblemDetails on DTO failure. (Officially deprecated by the author but still functional on .NET 8; we accept that trade-off per PRD §6.)

### Backend — not installed, deliberately

- No new password-hashing library — PBKDF2-SHA512 at 100 000 iterations stays as-is per PRD §6.
- No rate-limit / lockout packages (PRD §10).
- No Serilog — default ASP.NET console logging.

### Frontend — already installed (`frontend/package.json`)

- `react 19.1.1`, `react-dom 19.1.1`.
- `vite 7.1.2`, `@vitejs/plugin-react 5.0.0` — build / dev server.
- `react-router-dom 6.30.1` — client routing.
- `axios 1.12.2` — HTTP client.
- `zustand 5.0.8` — state store.
- `bootstrap 5.3.8` + `@popperjs/core 2.11.8` — UI framework (kept per user instruction; no Tailwind, no shadcn).
- `@fortawesome/react-fontawesome 3.0.2` + `@fortawesome/free-solid-svg-icons 7.0.1` — icons (used sparingly; one-off icons such as the password-toggle eye use inline SVG instead).
- `zod` — runtime schema validation for form state.
- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` — testing stack.
- `msw` v2 — HTTP mock server for frontend tests.
- `react-toastify` — toast notifications.
- `babel-plugin-react-compiler` — enables React Compiler for automatic memoisation.
- TypeScript 5.8, ESLint 9.

### Frontend — to add

- `@playwright/test` — end-to-end suite. Not yet installed; see `docs/tasks/active/task-22-tests.md` (22d).

### Explicitly NOT installed (per user direction)

- `tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`, `class-variance-authority` — no Tailwind stack.
- `shadcn` scaffolding, `components.json`, `src/components/ui/*` scaffolds, radix primitives — not using shadcn.
- `lucide-react` — icons come from FontAwesome (already installed) or inline SVG.
- `@fontsource-variable/geist` — stick with the browser default / Bootstrap stack.
- `jwt-decode` — the SPA never decodes a JWT; the access token is an httpOnly cookie.
- No cookie / local-storage / auth-token wrapper services on the frontend — the browser's cookie jar is the only token-bearing surface.
- No `useForm` custom hook — every form uses raw `useState` + Zod `safeParse`.
- No `date-fns` / `dayjs` — relative times come from a hand-written helper (UI §13).

---

## 2. Database tooling

- EF Core 9 Code-First with Fluent API (`OnModelCreating` in `StudentPortalApiContext`).
- Migrations live in `backend/StudentPortal/Migrations/` as C# files plus a model snapshot.
- Seed data lives in `backend/StudentPortal/Migrations/seed.sql`, re-runnable (`DELETE FROM … ; INSERT INTO …`).
- The agent generates migrations locally with `dotnet ef migrations add <Name>` and commits the files. The human runs `dotnet ef database update` and `psql -f seed.sql`.
- Applied migrations, in order, are listed in `DB.md` §5. Add new ones to the end of that list in the same commit as the migration.

---

## 3. Deployment (Render — scaffolding only)

- Backend service: web service, build command `dotnet publish -c Release -o out`, start command `dotnet out/StudentPortal.dll`.
- Frontend service: static site, build command `npm run build`, publish directory `dist/`.
- Required Render env vars on the backend: `JwtConfig__Key`, `JwtConfig__Issuer`, `JwtConfig__Audience`, `ConnectionStrings__DefaultConnection`, `Cors__Origins__0`, `Cors__Origins__1`, `ASPNETCORE_ENVIRONMENT=Production`.
- Required Render env var on the frontend: `VITE_API_BASE_URL`.
- HTTPS is terminated by Render; the backend sets `UseHttpsRedirection()` and emits cookies with the `Secure` flag.
- Cookies are `SameSite=Strict`, so the backend and frontend **must share a registrable domain** (e.g. `api.example.com` + `app.example.com`). On Render's default `*.onrender.com` subdomains Strict will still work because both are first-level cousins — but verify in a browser once deployed.
- For now local development is the only supported mode and production URLs are placeholders (PRD §8).

---

## 4. What's intentionally simple

- Error handling: one global middleware plus typed exceptions, nothing per-controller.
- Validation: one FluentValidation validator per DTO, nothing clever.
- State: one Zustand store, slice-selectors, nothing clever.
- Forms: raw `useState` + Zod, no form library.
- Icons: inline SVG where one icon is needed; FontAwesome where many.
- Pagination, caching, optimistic updates: not implemented.
- Logging: default ASP.NET console logging. Serilog is not added.
- Overdue and escalation states are computed on read. No background jobs, no schedulers, no message queues.
