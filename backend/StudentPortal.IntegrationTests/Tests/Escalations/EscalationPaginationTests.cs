using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Escalations;

/// <summary>
/// 28.3: GET /api/Escalation returns a PagedResultDto — correct totalCount and page slice.
/// </summary>
public class EscalationPaginationTests : IntegrationTestBase
{
    // Sophia and Liam enrollments have no seeded grade rows — safe to use here.
    private static readonly Guid Enroll1 = SeedIds.Enrollments.Sophia_MathII;
    private static readonly Guid Enroll2 = SeedIds.Enrollments.Sophia_SoftwareEng;
    private static readonly Guid Enroll3 = SeedIds.Enrollments.Sophia_DistSys;

    public EscalationPaginationTests(IntegrationTestFixture fixture) : base(fixture) { }

    private async Task<Grade[]> SeedThreeCandidatesAsync()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var enrollments = new[] { Enroll1, Enroll2, Enroll3 };
        var grades = new Grade[3];
        for (var i = 0; i < 3; i++)
        {
            grades[i] = await SeedGradeConfirmedAtAsync(enrollments[i], now.AddDays(-20));
            // Scenario A: accepted appeal reviewed 8 days ago → escalation trigger met
            await SeedAppealAtAsync(grades[i].Id, now.AddDays(-12), AppealStatus.Accepted, now.AddDays(-8));
        }
        return grades;
    }

    [Fact]
    public async Task GetCases_ReturnsPagedEnvelope_WithCorrectCountAndSlice()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        // Capture baseline count from seed data before adding our own candidates
        var baseResponse = await admin.GetAsync("/api/Escalation?page=1&pageSize=15");
        var basePaged = await baseResponse.Content.ReadFromJsonAsync<PagedResultDto<EscalatedCaseDto>>();
        var baselineCount = basePaged!.TotalCount;

        var grades = await SeedThreeCandidatesAsync();

        var response = await admin.GetAsync("/api/Escalation?page=1&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EscalatedCaseDto>>();
        paged.Should().NotBeNull();
        paged!.TotalCount.Should().Be(baselineCount + 3, "three new candidate grades were seeded");
        paged.Page.Should().Be(1);
        paged.PageSize.Should().Be(15);
        foreach (var grade in grades)
            paged.Items.Should().Contain(c => c.GradeId == grade.Id);
    }

    [Fact]
    public async Task GetCases_SecondPage_EmptyItemsWithCorrectTotalCount()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var baseResponse = await admin.GetAsync("/api/Escalation?page=1&pageSize=15");
        var basePaged = await baseResponse.Content.ReadFromJsonAsync<PagedResultDto<EscalatedCaseDto>>();
        var baselineCount = basePaged!.TotalCount;

        await SeedThreeCandidatesAsync();

        // All cases fit on page 1 (≤15), so page 2 is empty but totalCount is still reported
        var response = await admin.GetAsync("/api/Escalation?page=2&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EscalatedCaseDto>>();
        paged!.TotalCount.Should().Be(baselineCount + 3, "totalCount reflects all candidates regardless of page");
        paged.Items.Should().BeEmpty("all cases fit on page 1");
    }

    [Fact]
    public async Task GetCases_NonAllowedPageSize_ClampsTo15()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.GetAsync("/api/Escalation?page=1&pageSize=99");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EscalatedCaseDto>>();
        paged!.PageSize.Should().Be(15, "non-allowed pageSize values clamp to the default of 15");
    }
}
