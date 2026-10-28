using System.Threading;

namespace StudentPortal.TestSupport;

/// <summary>
/// A mutable <see cref="TimeProvider"/> used ONLY in the e2e test environment so the
/// Playwright suite can freeze and advance "now" through <c>/api/__test__/advance-clock</c>.
///
/// It is the e2e counterpart of the unit/integration <c>FakeTimeProvider</c>, but lives in
/// the production assembly because it is wired in <c>Program.cs</c>. Unlike FakeTimeProvider
/// it can be re-anchored in either direction: <c>/api/__test__/reset</c> re-seeds the database
/// with wall-clock <c>NOW()</c> and re-anchors the clock to match, which requires moving the
/// instant backwards after a test has advanced it.
///
/// Registered as the singleton <see cref="TimeProvider"/> only when all four test-mode guard
/// layers hold (see <c>Program.cs</c> and Tech-Backend §6). In Development and Production the
/// system clock (<see cref="TimeProvider.System"/>) is used and this type is never constructed.
/// </summary>
public sealed class ControllableTimeProvider : TimeProvider
{
    private long _utcTicks;

    public ControllableTimeProvider(DateTimeOffset start)
    {
        _utcTicks = start.UtcDateTime.Ticks;
    }

    public override DateTimeOffset GetUtcNow()
        => new DateTimeOffset(Interlocked.Read(ref _utcTicks), TimeSpan.Zero);

    /// <summary>Moves the frozen clock forward by the given span.</summary>
    public void Advance(TimeSpan by)
        => Interlocked.Add(ref _utcTicks, by.Ticks);

    /// <summary>Re-anchors the clock to an absolute instant (may move backwards).</summary>
    public void ResetTo(DateTimeOffset instant)
        => Interlocked.Exchange(ref _utcTicks, instant.UtcDateTime.Ticks);
}
