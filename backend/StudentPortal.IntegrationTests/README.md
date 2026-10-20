# StudentPortal.IntegrationTests

End-to-end API-level tests for the StudentPortal backend, built on
`WebApplicationFactory<Program>` + Testcontainers (Postgres 17) +
Respawn + `FakeTimeProvider`.

## Prerequisites

* **Docker Desktop running on the host machine.** Testcontainers starts a
  real `postgres:17` container per test session. The suite skips every
  test if Docker is unreachable.
* .NET 8 SDK.
* First run also downloads the `postgres:17` image (~150 MB), so the first
  invocation takes 1–3 minutes longer than subsequent runs.

## Running

From the repo root:

```bash
dotnet test backend/StudentPortal.IntegrationTests
```

With a TRX log (useful for CI or the §22a.9 report):

```bash
dotnet test backend/StudentPortal.IntegrationTests --logger "trx;LogFileName=integration-tests.trx"
```

A single test class or method:

```bash
dotnet test backend/StudentPortal.IntegrationTests --filter "FullyQualifiedName~LoginTests"
```

## Project layout

```
Infrastructure/
  IntegrationTestFixture.cs    One Postgres container + WebApplicationFactory
                               + Respawner + cached seed.sql, per test SESSION.
  IntegrationTestBase.cs       Per-test ResetAndSeed, auth helpers, DbContext
                               helpers, backdated seed helpers.
  SeedUsers.cs                 Deterministic auth cast from seed.sql (email + GUID).
  SeedIds.cs                   Deterministic subject + enrollment GUIDs.
Tests/
  Auth/      Login, Refresh, Logout, Me, change-password, profile, admin CRUD.
  (more suites added by subtasks 22a.5–22a.7)
SmokeTests.cs                  Single sanity check that the fixture boots and
                               a seeded admin can log in and call /Me.
```

## Fixture contract

* **One container, one `WebApplicationFactory`, for the whole suite** — a
  collection fixture (`[CollectionDefinition("Integration")]`) backs
  every test class.
* **Reset + full re-seed between EVERY test** via `Respawner` +
  `seed.sql` replay (strongest isolation).
* Nothing in production is mocked. The only test-only swap is replacing
  the registered `TimeProvider` with `FakeTimeProvider` so time-boundary
  tests can advance the clock deterministically.
* The HTTP client uses `HandleCookies = true`, so `sp_access` /
  `sp_refresh` cookies travel on every subsequent request automatically
  — tests speak to the real cookie/JWT pipeline, never a bypass.

## Writing a new test

```csharp
public class MyTests : IntegrationTestBase
{
    public MyTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Something_Behaves_This_Way()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        // ... act via HTTP, assert on response + DB state ...
    }
}
```

### Time-sensitive tests

Advance the fake clock:

```csharp
FakeTime.Advance(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));
```

Boundary coverage per PRD §6.3 (before / at / after). Fixture resets
`FakeTime` to `IntegrationTestFixture.InitialFakeTime` at the start of
every test.

### Scenario state — the two-layer policy (PRD §4a)

* **Layer 1** — the `seed.sql` auth cast (users with known emails /
  GUIDs). Tests MAY sign in as them. Tests MUST NOT assert on any seeded
  Grade / Draft / Appeal row.
* **Layer 2** — put the system into the state you want in-test:
  1. **Via the API** (preferred) as the appropriate authenticated user.
  2. **Via DbContext helpers** (`SeedGradeConfirmedAtAsync`,
     `SeedAppealAtAsync`, `SeedDeniedAppealAtAsync`) for state the API
     can't produce (backdated timestamps, pathological chains).

## Troubleshooting

* **`Docker daemon not running` / connection refused** — start Docker
  Desktop and re-run.
* **Slow first run** — image pull. Subsequent runs reuse the cached
  image.
* **`port already allocated`** — Testcontainers picks a free port per
  session; a stray leftover container is unlikely. `docker ps` + `docker
  rm -f` cleans up.
* **`Microsoft.EntityFrameworkCore` version mismatch at build time** —
  the test project pins EF Core 9.0.8 to match the production reference.
  Bumping EF Core in `StudentPortal.csproj` must be mirrored here.
