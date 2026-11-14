using System.Data;
using Microsoft.EntityFrameworkCore;
using StudentPortal.Models.Entities;

namespace StudentPortal.Demo;

/// <summary>
/// Replays the demo fixtures (<see cref="SeedScriptLocator.DemoScripts"/>) against the live
/// database, serialised so two visitors pressing "Reset demo" in the same moment cannot
/// interleave.
///
/// <para><b>Why a process-local semaphore and not a Postgres advisory lock</b> (per D-049).
/// The only writer is this one process: there is no cron job and no second instance.
/// <c>pg_advisory_xact_lock</c> would in fact be the wrong flavour — each fixture file carries
/// its own <c>BEGIN; … COMMIT;</c>, so a transaction-scoped lock would be released after the
/// first file and leave the other two unguarded. A session-scoped advisory lock would work but
/// costs round trips and can outlive a crashed request; a semaphore cannot, and a process
/// restart clears it.</para>
///
/// <para><b>What serialisation prevents.</b> The fixtures insert fixed GUIDs. Two concurrent
/// replays make the loser's <c>INSERT</c>s collide with the winner's committed rows, which
/// surfaces as a 500 duplicate-key error; and between the base seed's commit and the dev
/// layers' there is a window in which a third visitor sees a dashboard with no escalations.
/// Rejecting the second click is strictly better than queuing it, because both clicks ask for
/// the identical end state.</para>
/// </summary>
public sealed class DemoResetService
{
    // Static: the gate is process-wide, while this service is resolved per request.
    private static readonly SemaphoreSlim Gate = new(1, 1);

    private readonly StudentPortalApiContext _db;
    private readonly ILogger<DemoResetService> _logger;

    public DemoResetService(StudentPortalApiContext db, ILogger<DemoResetService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Replays the fixtures in order. Returns <c>false</c> without touching the database when a
    /// reset is already in flight — the endpoint turns that into <c>409 Conflict</c>.
    /// </summary>
    public async Task<bool> TryResetAsync(CancellationToken ct = default)
    {
        if (!await Gate.WaitAsync(TimeSpan.Zero, ct))
        {
            _logger.LogInformation("Demo reset rejected: another reset is already running.");
            return false;
        }

        try
        {
            var conn = _db.Database.GetDbConnection();
            var openedHere = false;
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync(ct);
                openedHere = true;
            }

            try
            {
                foreach (var fileName in SeedScriptLocator.DemoScripts)
                {
                    var sql = await File.ReadAllTextAsync(SeedScriptLocator.Resolve(fileName), ct);
                    await using var cmd = conn.CreateCommand();
                    cmd.CommandText = sql;
                    await cmd.ExecuteNonQueryAsync(ct);
                }
            }
            finally
            {
                if (openedHere) await conn.CloseAsync();
            }

            _logger.LogInformation(
                "Demo reset complete: replayed {Count} fixtures.", SeedScriptLocator.DemoScripts.Length);
            return true;
        }
        finally
        {
            Gate.Release();
        }
    }
}
