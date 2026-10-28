# StudentPortal e2e suite (Playwright + Chromium)

End-to-end journeys that drive the **real** stack: the React frontend, the ASP.NET backend
running in its `e2e` environment, and a Dockerized Postgres 17 — no mocks. Time-dependent
rules (overdue, undo windows, auto-finalize, escalation) are exercised through a controllable
backend clock, not by waiting.

## Prerequisites

- **Docker Desktop** running (for Postgres).
- **.NET 8 SDK** and **Node 20+**.
- Chromium for Playwright: `npx playwright install chromium` (one-time).
- Port `7253` (backend https), `5173` (frontend) and `55432` (Postgres) free. If your
  own dev backend is running on `7253`, stop it first — the e2e backend binds the same port.

## One-command run

From `e2e/`:

```bash
npm install
npx playwright install chromium   # first time only
npm run e2e
```

`npm run e2e` is self-contained. Its `globalSetup`:

1. `docker compose --env-file .env.e2e up -d --wait` — starts Postgres 17.
2. Starts the backend with `ASPNETCORE_ENVIRONMENT=e2e` (controllable clock + `/api/__test__` mounted).
3. Starts the frontend (`vite dev`, which proxies `/api` to the backend).
4. `POST /api/__test__/reset` — migrates + seeds the test database.
5. Logs each role in and saves a `storageState` under `playwright/.auth/`.

`globalTeardown` stops the frontend, the backend and Postgres. Reports land in `playwright-report/`
(`npm run report` to open the last one).

Useful filters (journeys are tagged via their `describe` name):

```bash
npm run e2e -- --grep smoke
npm run e2e -- --grep auth
npm run e2e -- --grep grading
npm run e2e -- --grep boundary
npm run e2e -- --grep admin
npm run e2e -- --grep dashboard
npm run e2e -- --headed      # watch it run
```

Already have the stack up yourself? `E2E_MANAGE_SERVERS=false npm run e2e` skips the
docker/backend/frontend spawn and only seeds + logs in against what's already running.

## The test-mode safety guard

The clock and reset endpoints live under `/api/__test__/*` and are protected by **four layers that
must all hold at once** (backend `Program.cs` + `TestSupport/TestModeEndpoints.cs`):

1. `ASPNETCORE_ENVIRONMENT == e2e`,
2. the `TestMode:Enabled` feature flag is on,
3. the connection string points at the configured `TestMode:DatabaseName`,
4. each request carries the matching `X-Test-Secret` header (the per-build secret).

If any boot-time layer (1–3) is missing the endpoints are **not mapped** at all; a missing or wrong
secret (layer 4) returns `404` so the surface can't even be probed. Under Development or Production
none of this mounts — verified by `StudentPortal.IntegrationTests` (`--filter TestMode`), which also
asserts a `404` under `ASPNETCORE_ENVIRONMENT=Production`. Nothing here touches the production auth
pipeline. The secret in `.env.e2e` is a local test value; rotate it per environment and never reuse
a production value.

## Layout

```
e2e/
  playwright.config.ts     Chromium project, baseURL from env, serial (shared backend state)
  docker-compose.yml       Postgres 17 (pinned), tmpfs, healthcheck
  .env.e2e                 ports, URLs, secret, seeded credentials
  playwright/
    globalSetup.ts         bring up the stack, seed, log each role in → storageState
    globalTeardown.ts      tear the stack down
    fixtures.ts            per-role page fixtures + loginContext (multi-role journeys)
    helpers.ts             resetBackend(), advanceClock(seconds), STORAGE, USERS
  tests/
    smoke.spec.ts          anonymous home renders
    auth.spec.ts           login + change-password sign-out-everywhere
    grading.spec.ts        confirm / appeal→accept→reconfirm / appeal→deny
    boundary.spec.ts       7-day overdue, second appeal, 24 h undo, day-8 finalize, Scenario B
    admin.spec.ts          create user, subject code, self-row protection
    dashboard.spec.ts      seeded student + professor dashboards
```

## Adding a journey

1. Create `tests/<area>.spec.ts` and `test.describe('<tag>', …)` so `--grep <tag>` selects it.
2. `test.beforeEach(() => resetBackend())` for a clean, freshly-seeded database and a re-anchored clock.
3. Land on a page as a role via the `adminPage` / `professorPage` / `studentPage` fixtures, or
   `loginContext(browser, email)` for a journey that needs two roles at once.
4. For time-dependent behaviour, act, then `await advanceClock(seconds)` and reload — never sleep.
5. Keep the suite serial: the backend clock and database are one shared service.
