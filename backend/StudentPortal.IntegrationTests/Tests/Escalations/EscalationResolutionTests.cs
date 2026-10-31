using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Escalations;

/// <summary>
/// Checkbox 5: Auto-close: reconfirm-exam and deny both stamp ResolvedAt.
/// Checkbox 6: An escalated grade contributes no ECTS; once resolved, the grade finalizes and its ECTS counts (D-007, D-021).
/// Checkbox 7: One overdue appeal alone does not escalate; two do (PRD §4.8).
/// </summary>
public class EscalationResolutionTests : IntegrationTestBase
{
    // Liam → Algorithms (CS-DS): Wilson is original professor, Johnson teaches Data Structures (CS-DS) → eligible
    private static readonly Guid Enrollment = SeedIds.Enrollments.Liam_Algorithms;
    private static readonly SeedUser EligibleProf = SeedUsers.ProfessorJohnson;
    private static readonly SeedUser Student = SeedUsers.StudentLiam;

    public EscalationResolutionTests(IntegrationTestFixture fixture) : base(fixture) { }

    // ─── Helpers ──────────────────────────────────────────────────────────

    /// <summary>Seeds a Scenario B grade (two overdue pending appeals) and assigns EligibleProf.</summary>
    private async Task<(Grade grade, Appeal secondAppeal)> SeedScenarioBAndAssignAsync()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-30));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-15), AppealStatus.Pending);
        var second = await SeedAppealAtAsync(grade.Id, now.AddDays(-8), AppealStatus.Pending);

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var resp = await admin.PostAsJsonAsync("/api/Escalation/assign",
            new { gradeId = grade.Id, assignedProfessorId = EligibleProf.Id });
        resp.StatusCode.Should().Be(HttpStatusCode.OK,
            $"assign should succeed: {await resp.Content.ReadAsStringAsync()}");

        return (grade, second);
    }

    // ─── Checkbox 5: Auto-close stamps ResolvedAt ─────────────────────────

    [Fact]
    public async Task Deny_OnEscalatedGrade_StampsResolvedAt()
    {
        var (grade, secondAppeal) = await SeedScenarioBAndAssignAsync();

        var client = await CreateAuthenticatedClientAsync(EligibleProf);
        var response = await client.PostAsync($"/api/Appeal/{secondAppeal.Id}/deny", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());

        var escalation = await WithDbAsync(db =>
            db.Escalations.FirstAsync(e => e.GradeId == grade.Id));
        escalation.ResolvedAt.Should().NotBeNull(
            "PRD §4.8 — deny must auto-close the escalation");
    }

    [Fact]
    public async Task ReconfirmExam_OnEscalatedGrade_StampsResolvedAt()
    {
        // Scenario A: accepted appeal whose re-grade window expired 8 days ago.
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-30));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-12), AppealStatus.Accepted, now.AddDays(-8));

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var assignResp = await admin.PostAsJsonAsync("/api/Escalation/assign",
            new { gradeId = grade.Id, assignedProfessorId = EligibleProf.Id });
        assignResp.StatusCode.Should().Be(HttpStatusCode.OK,
            await assignResp.Content.ReadAsStringAsync());

        var client = await CreateAuthenticatedClientAsync(EligibleProf);
        var response = await client.PostAsJsonAsync("/api/Grade/reconfirm-exam",
            new { enrollmentId = Enrollment, examPoints = 25m });
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());

        var escalation = await WithDbAsync(db =>
            db.Escalations.FirstAsync(e => e.GradeId == grade.Id));
        escalation.ResolvedAt.Should().NotBeNull(
            "PRD §4.8 — reconfirm-exam must auto-close the escalation");
    }

    // ─── Checkbox 6: ECTS blocked while escalated, counted after resolved ─

    [Fact]
    public async Task EscalatedGrade_EarnedEctsIsZero()
    {
        // D-021: an open escalation means the grade is not truly final → no ECTS.
        await SeedScenarioBAndAssignAsync();

        var client = await CreateAuthenticatedClientAsync(Student);
        var response = await client.GetAsync("/api/Student/me/dashboard");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        dto!.Stats.EarnedEcts.Should().Be(0,
            "D-021: an open escalation means the grade is not truly final");
    }

    [Fact]
    public async Task ResolvedEscalation_GradeFinalizesAndEctsCount()
    {
        // D-007/D-021: once the escalation resolves and the grade finalizes, its ECTS must count.
        var (_, secondAppeal) = await SeedScenarioBAndAssignAsync();

        var profClient = await CreateAuthenticatedClientAsync(EligibleProf);
        var denyResp = await profClient.PostAsync($"/api/Appeal/{secondAppeal.Id}/deny", null);
        denyResp.StatusCode.Should().Be(HttpStatusCode.OK,
            await denyResp.Content.ReadAsStringAsync());

        var studentClient = await CreateAuthenticatedClientAsync(Student);
        var response = await studentClient.GetAsync("/api/Student/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        dto!.Stats.EarnedEcts.Should().BeGreaterThan(0,
            "D-007/D-021: resolved escalation finalizes the grade and its ECTS must count");
    }

    // ─── Checkbox 7: Single overdue appeal does not escalate; two do ──────

    [Fact]
    public async Task GetCases_OneOverduePendingAppeal_NoCaseForThatGrade()
    {
        // PRD §4.8: a single overdue pending appeal does not trigger escalation.
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-20));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-8), AppealStatus.Pending);

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Escalation");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EscalatedCaseDto>>();
        paged!.Items.Should().NotContain(c => c.GradeId == grade.Id,
            "PRD §4.8 — a single overdue pending appeal does not meet the ChainExhausted threshold");
    }

    [Fact]
    public async Task GetCases_TwoOverduePendingAppeals_CaseReturned()
    {
        // PRD §4.8: two overdue pending appeals trigger a ChainExhausted escalation.
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-30));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-15), AppealStatus.Pending);
        await SeedAppealAtAsync(grade.Id, now.AddDays(-8), AppealStatus.Pending);

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Escalation");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EscalatedCaseDto>>();
        paged!.Items.Should().Contain(c => c.GradeId == grade.Id,
            "PRD §4.8 — two overdue pending appeals trigger ChainExhausted escalation");
    }
}
