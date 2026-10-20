using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Dashboards;

public class StudentDashboardTests : IntegrationTestBase
{
    public StudentDashboardTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly SeedUser Liam = SeedUsers.StudentLiam;
    private static readonly SeedUser Sophia = SeedUsers.StudentSophia;

    // Liam has three enrollments (no seeded grades/drafts): LinAlg, CompNet, Algorithms.
    private static readonly Guid Liam_LinearAlgebra = SeedIds.Enrollments.Liam_LinearAlgebra;
    private static readonly Guid Liam_CompNet = SeedIds.Enrollments.Liam_ComputerNetworks;
    private static readonly Guid Liam_Algorithms = SeedIds.Enrollments.Liam_Algorithms;

    // Sophia also has three enrollments and no seeded grades.
    private static readonly Guid Sophia_MathII = SeedIds.Enrollments.Sophia_MathII;

    // Each test clears Liam's rows so we assert only on in-test state (PRD §4a).
    private async Task ClearStudentGradesAndAppealsAsync(Guid studentId)
    {
        await WithDbAsync(async db =>
        {
            var enrollmentIds = await db.Enrollments
                .Where(e => e.StudentId == studentId)
                .Select(e => e.Id)
                .ToListAsync();
            db.Appeals.RemoveRange(db.Appeals.Where(a => enrollmentIds.Contains(a.Grade.EnrollmentId)));
            db.Grades.RemoveRange(db.Grades.Where(g => enrollmentIds.Contains(g.EnrollmentId)));
            db.GradeDrafts.RemoveRange(db.GradeDrafts.Where(d => enrollmentIds.Contains(d.EnrollmentId)));
            await db.SaveChangesAsync();
        });
    }

    [Fact]
    public async Task Dashboard_PayloadShape_IsPresent()
    {
        await ClearStudentGradesAndAppealsAsync(Liam.Id);
        var client = await CreateAuthenticatedClientAsync(Liam);

        var response = await client.GetAsync("/api/Student/me/dashboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();
        dto.Should().NotBeNull();
        dto!.Profile.Email.Should().Be(Liam.Email);
        dto.Profile.IndexNumber.Should().Be(Liam.IndexNumber);
        dto.Subjects.Should().HaveCount(3);
        dto.Stats.Should().NotBeNull();
    }

    [Fact]
    public async Task Dashboard_FailuresExcludedFromAverage_FailuresCountedAsNonPassed()
    {
        await ClearStudentGradesAndAppealsAsync(Liam.Id);
        var now = FakeTime.GetUtcNow().UtcDateTime;

        // One passed (grade 8) — truly final
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now,
            midterm1: 22m, midterm2: 20m, attendance: 4m, practical: 4m, exam: 25m,
            finalizedAt: now, studentConfirmedAt: now);

        // One failed (grade 5) — truly final
        await SeedGradeConfirmedAtAsync(Liam_CompNet, now,
            midterm1: 10m, midterm2: 10m, attendance: 2m, practical: 2m, exam: 15m,
            finalizedAt: now, studentConfirmedAt: now);

        // One ungraded (no grade row).

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.GetAsync("/api/Student/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        dto!.Stats.PassedExams.Should().Be(1);
        dto.Stats.NonPassedExams.Should().Be(2, "failed grade + ungraded enrollment");
        dto.Stats.AverageGrade.Should().Be(8.0,
            "average must exclude failures per PRD §4.7");
        dto.Stats.EarnedEcts.Should().Be(6, "one passed subject × 6 ECTS");
    }

    [Fact]
    public async Task Dashboard_EarnedEcts_OnlyTrulyFinalPassedCount()
    {
        await ClearStudentGradesAndAppealsAsync(Liam.Id);
        var now = FakeTime.GetUtcNow().UtcDateTime;

        // Grade 8, confirmed just now, NOT yet truly final (inside 7-day window, no student-confirm).
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now,
            midterm1: 22, midterm2: 20, attendance: 4, practical: 4, exam: 25);

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.GetAsync("/api/Student/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        dto!.Stats.EarnedEcts.Should().Be(0,
            "PRD §4.7 — ECTS only count for grades that are TRULY final AND >= 6");
    }

    [Fact]
    public async Task Dashboard_InsideInitialWindow_SubjectRowFlagsCanWriteAppealAndCanConfirmGrade()
    {
        await ClearStudentGradesAndAppealsAsync(Liam.Id);
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now,
            midterm1: 22, midterm2: 20, attendance: 4, practical: 4, exam: 25);

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.GetAsync("/api/Student/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        var row = dto!.Subjects.Single(s => s.EnrollmentId == Liam_LinearAlgebra);
        row.Status.Should().Be("Awaiting confirmation");
        row.CanWriteAppeal.Should().BeTrue();
        row.CanConfirmGrade.Should().BeTrue();
        row.ConfirmationDeadline.Should().NotBeNull();
    }

    [Fact]
    public async Task Dashboard_WithActivePendingAppeal_RowShowsAppealPendingAndPendingAppealId()
    {
        await ClearStudentGradesAndAppealsAsync(Liam.Id);
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        var appeal = await SeedAppealAtAsync(grade.Id, now.AddHours(-2), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.GetAsync("/api/Student/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        var row = dto!.Subjects.Single(s => s.EnrollmentId == Liam_LinearAlgebra);
        row.Status.Should().Be("Appeal pending");
        row.PendingAppealId.Should().Be(appeal.Id);
    }

    [Fact]
    public async Task Dashboard_StudentWithZeroEnrollments_ReturnsEmptyListAndZeroStats()
    {
        // Make a brand-new student by removing all of Sophia's enrollments.
        await WithDbAsync(async db =>
        {
            db.Enrollments.RemoveRange(db.Enrollments.Where(e => e.StudentId == Sophia.Id));
            await db.SaveChangesAsync();
        });

        var client = await CreateAuthenticatedClientAsync(Sophia);
        var response = await client.GetAsync("/api/Student/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        dto!.Subjects.Should().BeEmpty();
        dto.Stats.PassedExams.Should().Be(0);
        dto.Stats.NonPassedExams.Should().Be(0);
        dto.Stats.AverageGrade.Should().Be(0.0);
        dto.Stats.EarnedEcts.Should().Be(0);
    }

    [Fact]
    public async Task Dashboard_InitialWindowSilentExpiry_FlipsToPassed_AndECTSCount_OnDay8()
    {
        // PRD §4.6 Q28: silent expiry on day 8 → grade is treated as truly final.
        await ClearStudentGradesAndAppealsAsync(Liam.Id);
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-7).AddSeconds(-1),
            midterm1: 22, midterm2: 20, attendance: 4, practical: 4, exam: 25);

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.GetAsync("/api/Student/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();

        var row = dto!.Subjects.Single(s => s.EnrollmentId == Liam_LinearAlgebra);
        row.Status.Should().Be("Passed", "silent expiry on day 8 → truly final");
        dto.Stats.EarnedEcts.Should().Be(6);
    }
}
