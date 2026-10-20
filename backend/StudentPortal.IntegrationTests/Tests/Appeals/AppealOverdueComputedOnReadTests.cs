using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Appeals;

public class AppealOverdueComputedOnReadTests : IntegrationTestBase
{
    public AppealOverdueComputedOnReadTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly Guid Liam_LinearAlgebra = SeedIds.Enrollments.Liam_LinearAlgebra;
    private static readonly SeedUser ProfLinAlg = SeedUsers.ProfessorSmith;

    [Fact]
    public async Task PendingAppeal_BeforeDeadline_StillReadsPending()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        // Submitted 6d 23h 59m ago → still Pending
        await SeedAppealAtAsync(grade.Id, now.AddDays(-7).AddMinutes(1), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.GetAsync($"/api/Appeal/by-grade/{grade.Id}");

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Pending");
        body.Should().NotContain("Overdue");
    }

    [Fact]
    public async Task PendingAppeal_PastDeadline_ReadsOverdue()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-10));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-7).AddMinutes(-1), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.GetAsync($"/api/Appeal/by-grade/{grade.Id}");

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Overdue");
    }

    [Fact]
    public async Task AdvancingClockPast7Days_FlipsReadFromPendingToOverdue()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now);
        await SeedAppealAtAsync(grade.Id, now, AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        // Fresh — reads Pending
        var fresh = await client.GetAsync($"/api/Appeal/by-grade/{grade.Id}");
        (await fresh.Content.ReadAsStringAsync()).Should().Contain("Pending");

        // Advance past the 7-day deadline
        FakeTime.Advance(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));

        var after = await client.GetAsync($"/api/Appeal/by-grade/{grade.Id}");
        (await after.Content.ReadAsStringAsync()).Should().Contain("Overdue");
    }
}
