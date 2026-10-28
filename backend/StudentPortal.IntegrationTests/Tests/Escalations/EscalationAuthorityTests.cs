using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Escalations;

/// <summary>
/// Checkbox 3: Authority matrix — original professor 403 on write once assigned, assigned professor 200,
/// both 200 on read.
/// Checkbox 4: Assigned professor can accept or deny an already overdue appeal; original professor cannot.
/// </summary>
public class EscalationAuthorityTests : IntegrationTestBase
{
    // Algorithms (CS-DS): Wilson is original professor, Johnson is eligible (teaches Data Structures CS-DS)
    // Liam_Algorithms has no seeded grade, avoiding the IX_Grades_EnrollmentId unique constraint
    private static readonly Guid Enrollment = SeedIds.Enrollments.Liam_Algorithms;
    private static readonly SeedUser OriginalProf = SeedUsers.ProfessorWilson;
    private static readonly SeedUser EligibleProf = SeedUsers.ProfessorJohnson;

    public EscalationAuthorityTests(IntegrationTestFixture fixture) : base(fixture) { }

    // ─── Helpers ──────────────────────────────────────────────────────────

    /// <summary>Seeds a grade with an overdue pending appeal (ChainExhausted scenario — two overdue pending appeals).</summary>
    private async Task<(Grade grade, Appeal overdueAppeal)> SeedScenarioBGradeAsync()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-30));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-20), AppealStatus.Pending);
        var second = await SeedAppealAtAsync(grade.Id, now.AddDays(-10), AppealStatus.Pending);
        return (grade, second);
    }

    private async Task<Grade> AssignAndGetGradeAsync(Guid gradeId)
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var assignResponse = await admin.PostAsJsonAsync("/api/Escalation/assign", new
        {
            gradeId,
            assignedProfessorId = EligibleProf.Id
        });
        assignResponse.StatusCode.Should().Be(HttpStatusCode.OK,
            $"assign must succeed: {await assignResponse.Content.ReadAsStringAsync()}");

        var dbGrade = await WithDbAsync(db =>
            db.Grades
                .Include(g => g.Enrollment).ThenInclude(e => e.Subject)
                .FirstAsync(g => g.Id == gradeId));
        return dbGrade;
    }

    // ─── Checkbox 3: Authority matrix ─────────────────────────────────────

    [Fact]
    public async Task Read_OriginalProfessor_Returns200AfterAssignment()
    {
        var (grade, _) = await SeedScenarioBGradeAsync();
        await AssignAndGetGradeAsync(grade.Id);

        var client = await CreateAuthenticatedClientAsync(OriginalProf);
        var response = await client.GetAsync($"/api/Appeal/by-grade/{grade.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "PRD §4.8 — original professor may still read the grade's appeals");
    }

    [Fact]
    public async Task Read_AssignedProfessor_Returns200()
    {
        var (grade, _) = await SeedScenarioBGradeAsync();
        await AssignAndGetGradeAsync(grade.Id);

        var client = await CreateAuthenticatedClientAsync(EligibleProf);
        var response = await client.GetAsync($"/api/Appeal/by-grade/{grade.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "assigned professor must be able to read the appeals");
    }

    [Fact]
    public async Task Write_Accept_OriginalProfessor_Returns403AfterAssignment()
    {
        // Seed a non-overdue appeal so the only barrier is the authority check, not the overdue guard
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-20));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-20), AppealStatus.Pending);
        await SeedAppealAtAsync(grade.Id, now.AddDays(-20), AppealStatus.Pending);
        await AssignAndGetGradeAsync(grade.Id);

        // Seed a fresh non-overdue pending appeal on the same grade for the original prof to attempt
        var freshAppeal = await SeedAppealAtAsync(grade.Id, now.AddDays(-1), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(OriginalProf);
        var response = await client.PostAsync($"/api/Appeal/{freshAppeal.Id}/accept", null);

        ((int)response.StatusCode).Should().Be(403,
            "PRD §4.8 — once assigned, only the assigned professor may write");
    }

    [Fact]
    public async Task Write_Accept_AssignedProfessor_Returns200()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-20));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-20), AppealStatus.Pending);
        await SeedAppealAtAsync(grade.Id, now.AddDays(-20), AppealStatus.Pending);
        await AssignAndGetGradeAsync(grade.Id);

        // Seed a fresh non-overdue pending appeal for the assigned professor to accept
        var freshAppeal = await SeedAppealAtAsync(grade.Id, now.AddDays(-1), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(EligibleProf);
        var response = await client.PostAsync($"/api/Appeal/{freshAppeal.Id}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "assigned professor must be able to accept a non-overdue appeal");
    }

    // ─── Checkbox 4: Assigned professor can act on overdue appeal ─────────

    [Fact]
    public async Task AcceptOverdueAppeal_AssignedProfessor_Returns200()
    {
        var (grade, overdueAppeal) = await SeedScenarioBGradeAsync();
        await AssignAndGetGradeAsync(grade.Id);

        // Both appeals are overdue (seeded 10+ days ago)
        var client = await CreateAuthenticatedClientAsync(EligibleProf);
        var response = await client.PostAsync($"/api/Appeal/{overdueAppeal.Id}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "PRD §4.8 — the 'cannot act on overdue' rule is lifted for the assigned professor");
    }

    [Fact]
    public async Task DenyOverdueAppeal_AssignedProfessor_Returns200()
    {
        var (grade, overdueAppeal) = await SeedScenarioBGradeAsync();
        await AssignAndGetGradeAsync(grade.Id);

        var client = await CreateAuthenticatedClientAsync(EligibleProf);
        var response = await client.PostAsync($"/api/Appeal/{overdueAppeal.Id}/deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "assigned professor must be able to deny an overdue appeal");
    }

    [Fact]
    public async Task AcceptOverdueAppeal_OriginalProfessor_Returns403()
    {
        var (grade, overdueAppeal) = await SeedScenarioBGradeAsync();
        await AssignAndGetGradeAsync(grade.Id);

        var client = await CreateAuthenticatedClientAsync(OriginalProf);
        var response = await client.PostAsync($"/api/Appeal/{overdueAppeal.Id}/accept", null);

        ((int)response.StatusCode).Should().Be(403,
            "original professor loses write access once the grade is assigned (PRD §4.8)");
    }

    [Fact]
    public async Task DenyOverdueAppeal_OriginalProfessor_Returns403()
    {
        var (grade, overdueAppeal) = await SeedScenarioBGradeAsync();
        await AssignAndGetGradeAsync(grade.Id);

        var client = await CreateAuthenticatedClientAsync(OriginalProf);
        var response = await client.PostAsync($"/api/Appeal/{overdueAppeal.Id}/deny", null);

        ((int)response.StatusCode).Should().Be(403,
            "original professor cannot deny — write is exclusively the assigned professor's");
    }
}
