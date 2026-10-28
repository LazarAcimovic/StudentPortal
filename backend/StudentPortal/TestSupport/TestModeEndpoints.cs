using System.Data;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using StudentPortal.Models.Entities;

namespace StudentPortal.TestSupport;

/// <summary>
/// The <c>/api/__test__/*</c> control surface used by the Playwright e2e suite (task 22d.2).
/// These endpoints are mapped ONLY when all three boot-time guard layers hold — environment
/// is <c>e2e</c>, the <c>TestMode:Enabled</c> flag is on, and the connection string points at
/// the configured test database — so under Development and Production they do not exist (404).
/// The fourth layer, a per-build secret header, is enforced per request below: a missing or
/// wrong <c>X-Test-Secret</c> yields 404 as well, so the endpoints can't be probed.
/// Nothing here weakens production auth — the real pipeline is untouched (PRD §6).
/// </summary>
public static class TestModeEndpoints
{
    public static void MapTestModeEndpoints(this IEndpointRouteBuilder app, string secret)
    {
        var group = app.MapGroup("/api/__test__");

        // Layer 4: the per-build secret header. Compared in fixed time; no match ⇒ 404.
        group.AddEndpointFilter(async (ctx, next) =>
        {
            var provided = ctx.HttpContext.Request.Headers["X-Test-Secret"].ToString();
            if (string.IsNullOrEmpty(secret) || !SecretMatches(provided, secret))
                return Results.NotFound();
            return await next(ctx);
        });

        // Freeze-and-advance the e2e clock. Returns the new "now" so callers can assert.
        group.MapPost("/advance-clock", (ControllableTimeProvider clock, int seconds) =>
        {
            clock.Advance(TimeSpan.FromSeconds(seconds));
            return Results.Ok(new { now = clock.GetUtcNow() });
        });

        // Truncate + re-seed the test database (seed.sql deletes children-first then inserts)
        // and re-anchor the clock to wall-clock now so the seeded relative rows are valid again.
        // Migrate() is idempotent and runs first so the very first reset also creates the schema,
        // which lets the server boot without touching the database (no startup ordering race).
        group.MapPost("/reset", async (StudentPortalApiContext db, ControllableTimeProvider clock) =>
        {
            await db.Database.MigrateAsync();
            await TestSeed.RunAsync(db);
            clock.ResetTo(DateTimeOffset.UtcNow);
            return Results.NoContent();
        });
    }

    private static bool SecretMatches(string provided, string expected)
        => CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(provided), Encoding.UTF8.GetBytes(expected));
}

/// <summary>Locates and replays <c>Migrations/seed.sql</c> at runtime for test-mode provisioning.</summary>
public static class TestSeed
{
    public static async Task RunAsync(StudentPortalApiContext db)
    {
        var sql = await File.ReadAllTextAsync(ResolveSeedPath());
        var conn = db.Database.GetDbConnection();
        var openedHere = false;
        if (conn.State != ConnectionState.Open)
        {
            await conn.OpenAsync();
            openedHere = true;
        }
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            if (openedHere) await conn.CloseAsync();
        }
    }

    private static string ResolveSeedPath()
    {
        // The csproj copies seed.sql next to the assembly, so prefer the output copy.
        var direct = Path.Combine(AppContext.BaseDirectory, "Migrations", "seed.sql");
        if (File.Exists(direct)) return direct;

        // Fallback: walk up the source tree (handy when run straight from the project dir).
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 12 && dir is not null; i++)
        {
            var candidate = Path.Combine(dir, "StudentPortal", "Migrations", "seed.sql");
            if (File.Exists(candidate)) return candidate;
            var parent = Directory.GetParent(dir);
            if (parent is null) break;
            dir = parent.FullName;
        }

        throw new FileNotFoundException(
            "Could not locate Migrations/seed.sql for test-mode reset.");
    }
}
