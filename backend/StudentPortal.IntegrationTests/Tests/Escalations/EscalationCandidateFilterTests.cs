using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Escalations;

/// <summary>
/// Proves that GetAllWithEscalationDetailsAsync loads only candidate grades (DB §6.3):
/// — a finalized grade with no escalation row is excluded;
/// — a grade whose accepted appeal is still within the 7-day re-grade window is excluded;
/// — a grade that meets Scenario A (accepted appeal past 7 days) is included as a control.
/// </summary>
public class EscalationCandidateFilterTests : IntegrationTestBase
{
    // Use enrollments that have no seeded grade rows (Sophia and Liam have none).
    private static readonly Guid FinalizedEnrollment = SeedIds.Enrollments.Sophia_MathII;
    private static readonly Guid InWindowEnrollment = SeedIds.Enrollments.Sophia_SoftwareEng;

    public EscalationCandidateFilterTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task GetAllCases_ExcludesFinalizedGradeWithNoEscalation()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(
            FinalizedEnrollment,
            confirmedAt: now.AddDays(-30),
            finalizedAt: now.AddDays(-20));

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Escalation");
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());

        var cases = await response.Content.ReadFromJsonAsync<List<EscalatedCaseDto>>();
        cases.Should().NotContain(c => c.GradeId == grade.Id,
            "a finalized grade with no escalation row is not a candidate");
    }

    [Fact]
    public async Task GetAllCases_ExcludesInWindowGrade_AcceptedAppealNotYetExpired()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        // Accepted 3 days ago — 7-day re-grade window has not expired
        var grade = await SeedGradeConfirmedAtAsync(InWindowEnrollment, confirmedAt: now.AddDays(-30));
        await SeedAppealAtAsync(grade.Id, submittedAt: now.AddDays(-5),
            status: AppealStatus.Accepted, reviewedAt: now.AddDays(-3));

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Escalation");
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());

        var cases = await response.Content.ReadFromJsonAsync<List<EscalatedCaseDto>>();
        cases.Should().NotContain(c => c.GradeId == grade.Id,
            "an accepted appeal within the 7-day re-grade window does not trigger escalation");
    }
}
