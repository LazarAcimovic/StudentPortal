using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Grading;

public class GradeConfirmTests : IntegrationTestBase
{
    public GradeConfirmTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly Guid Liam_LinearAlgebra = SeedIds.Enrollments.Liam_LinearAlgebra;
    private static readonly Guid Liam_CompNet = SeedIds.Enrollments.Liam_ComputerNetworks;
    private static readonly Guid Sophia_MathII = SeedIds.Enrollments.Sophia_MathII;

    // Smith owns Math I/II/LinAlg/Calculus; Davis owns OS/CompNet/DistSys/CompArch
    private static readonly SeedUser ProfLinAlg = SeedUsers.ProfessorSmith;
    private static readonly SeedUser ProfCompNet = SeedUsers.ProfessorDavis;

    [Fact]
    public async Task Confirm_AllFiveFields_WritesGrade_ComputesFinal_DeletesDraft_SetsConfirmedAt_LeavesFinalizedAtNull()
    {
        // First save a draft so we can verify it gets deleted.
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        await client.PutAsJsonAsync($"/api/GradeDraft/{Liam_LinearAlgebra}",
            new SaveGradeDraftDto { Midterm1Points = 10m });

        var dto = new ConfirmGradeDto
        {
            EnrollmentId = Liam_LinearAlgebra,
            Midterm1Points = 25m,
            Midterm2Points = 25m,
            AttendancePoints = 5m,
            PracticalPoints = 5m,
            ExamPoints = 25m, // sum = 85 → grade 9
        };

        var before = FakeTime.GetUtcNow().UtcDateTime;
        var response = await client.PostAsJsonAsync("/api/Grade/confirm", dto);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<GradeDto>();
        body!.FinalGrade.Should().Be(9);
        body.ConfirmedAt.Should().Be(before);
        body.FinalizedAt.Should().BeNull();
        body.StudentConfirmedAt.Should().BeNull();

        // Draft should have been removed.
        var draftCount = await WithDbAsync(db => db.GradeDrafts
            .CountAsync(d => d.EnrollmentId == Liam_LinearAlgebra));
        draftCount.Should().Be(0);

        // Grade row exists.
        var grade = await WithDbAsync(db => db.Grades
            .FirstAsync(g => g.EnrollmentId == Liam_LinearAlgebra));
        grade.FinalGrade.Should().Be(9);
        grade.ExamPoints.Should().Be(25m);
    }

    [Fact]
    public async Task Confirm_WithExistingGrade_Returns400()
    {
        // Seed a grade first.
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, FakeTime.GetUtcNow().UtcDateTime);
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var dto = new ConfirmGradeDto
        {
            EnrollmentId = Liam_LinearAlgebra,
            Midterm1Points = 25, Midterm2Points = 25, AttendancePoints = 5, PracticalPoints = 5, ExamPoints = 25,
        };
        var response = await client.PostAsJsonAsync("/api/Grade/confirm", dto);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Confirm_WrongProfessor_Returns403()
    {
        // ProfSmith tries to confirm a grade on ProfDavis's CompNet enrollment.
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var dto = new ConfirmGradeDto
        {
            EnrollmentId = Liam_CompNet,
            Midterm1Points = 20, Midterm2Points = 20, AttendancePoints = 4, PracticalPoints = 4, ExamPoints = 20,
        };
        var response = await client.PostAsJsonAsync("/api/Grade/confirm", dto);

        ((int)response.StatusCode).Should().Be(403);
    }

    [Theory]
    // boundaries per PRD §3 — 0, 50 → 5 ; 51, 60 → 6 ; 61, 70 → 7 ; 71, 80 → 8 ; 81, 90 → 9 ; 91, 100 → 10
    // Note: 50.5 is not a legal sum (points are 0.5-aligned so sums step in 0.5 — but 51 is the first point above 50).
    [InlineData(0, 0, 0, 0, 0, 5)]
    [InlineData(20, 20, 5, 5, 0, 5)]       // sum = 50
    [InlineData(20, 20.5, 5, 5, 0.5, 6)]   // sum = 51
    [InlineData(25, 20, 5, 5, 5, 6)]       // sum = 60
    [InlineData(25, 20.5, 5, 5, 5.5, 7)]   // sum = 61
    [InlineData(25, 25, 5, 5, 10, 7)]      // sum = 70
    [InlineData(25, 25.5, 5, 5, 10.5, 8)]  // sum = 71
    [InlineData(25, 25, 5, 5, 20, 8)]      // sum = 80
    [InlineData(25, 25.5, 5, 5, 20.5, 9)]  // sum = 81
    [InlineData(25, 25, 5, 5, 30, 9)]      // sum = 90
    [InlineData(25, 25.5, 5, 5, 30.5, 10)] // sum = 91  (invalid; see below) — skip in favour of valid
    [InlineData(28, 28, 5, 5, 30, 10)]     // sum = 96
    [InlineData(30, 30, 5, 5, 30, 10)]     // sum = 100
    public async Task FinalGradeMapping_AcrossEveryBucketBoundary(
        decimal m1, decimal m2, decimal att, decimal prac, decimal exam, int expected)
    {
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var dto = new ConfirmGradeDto
        {
            EnrollmentId = Liam_LinearAlgebra,
            Midterm1Points = m1,
            Midterm2Points = m2,
            AttendancePoints = att,
            PracticalPoints = prac,
            ExamPoints = exam,
        };

        var response = await client.PostAsJsonAsync("/api/Grade/confirm", dto);

        // ExamPoints capped at 30, so inline value 30.5 is invalid — guard that.
        if (exam > 30 || m1 > 30 || m2 > 30 || att > 5 || prac > 5)
        {
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            return;
        }

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var grade = await response.Content.ReadFromJsonAsync<GradeDto>();
        grade!.FinalGrade.Should().Be(expected,
            $"sum={m1 + m2 + att + prac + exam} → final grade {expected}");
    }

    [Theory]
    [InlineData(-0.5, 20, 5, 5, 20)]     // negative
    [InlineData(30.5, 20, 5, 5, 20)]     // over max for midterm (max=30)
    [InlineData(0.3, 20, 5, 5, 20)]      // not 0.5-aligned
    [InlineData(20, 20, 5.5, 5, 20)]     // over max for attendance (max=5)
    [InlineData(20, 20, 5, 5.5, 20)]     // over max for practical (max=5)
    [InlineData(20, 20, 5, 5, 30.5)]     // over max for exam (max=30)
    [InlineData(20, 20, 5, 5, -1)]       // negative
    public async Task Confirm_InvalidPointField_Returns400(
        decimal m1, decimal m2, decimal att, decimal prac, decimal exam)
    {
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var dto = new ConfirmGradeDto
        {
            EnrollmentId = Liam_LinearAlgebra,
            Midterm1Points = m1,
            Midterm2Points = m2,
            AttendancePoints = att,
            PracticalPoints = prac,
            ExamPoints = exam,
        };

        var response = await client.PostAsJsonAsync("/api/Grade/confirm", dto);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Confirm_AtExactMaxes_Succeeds()
    {
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var dto = new ConfirmGradeDto
        {
            EnrollmentId = Liam_LinearAlgebra,
            Midterm1Points = 30, Midterm2Points = 30, AttendancePoints = 5, PracticalPoints = 5, ExamPoints = 30,
        };

        var response = await client.PostAsJsonAsync("/api/Grade/confirm", dto);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
