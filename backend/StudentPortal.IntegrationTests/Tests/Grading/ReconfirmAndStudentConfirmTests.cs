using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Grading;

public class ReconfirmAndStudentConfirmTests : IntegrationTestBase
{
    public ReconfirmAndStudentConfirmTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly Guid Liam_LinearAlgebra = SeedIds.Enrollments.Liam_LinearAlgebra;
    private static readonly Guid Liam_CompNet = SeedIds.Enrollments.Liam_ComputerNetworks;
    private static readonly SeedUser ProfLinAlg = SeedUsers.ProfessorSmith;    // teaches LinAlg
    private static readonly SeedUser ProfCompNet = SeedUsers.ProfessorDavis;   // teaches CompNet

    [Fact]
    public async Task ReconfirmExam_AfterAcceptedAppeal_OnlyExamMoves_OtherFieldsFrozen()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1),
            midterm1: 20m, midterm2: 20m, attendance: 4m, practical: 4m, exam: 10m);

        // Simulate an Accepted appeal in the DB.
        await SeedAppealAtAsync(grade.Id, now.AddHours(-6),
            status: AppealStatus.Accepted, reviewedAt: now.AddHours(-1));

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.PostAsJsonAsync("/api/Grade/reconfirm-exam",
            new ReconfirmExamDto { EnrollmentId = Liam_LinearAlgebra, ExamPoints = 25m });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<GradeDto>();
        dto!.Midterm1Points.Should().Be(20m, "non-exam fields are frozen after an accepted appeal");
        dto.Midterm2Points.Should().Be(20m);
        dto.AttendancePoints.Should().Be(4m);
        dto.PracticalPoints.Should().Be(4m);
        dto.ExamPoints.Should().Be(25m);
        dto.FinalizedAt.Should().NotBeNull("reconfirm finalizes the grade");
    }

    [Fact]
    public async Task ReconfirmExam_WithoutAcceptedAppeal_Returns400()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddHours(-2));

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.PostAsJsonAsync("/api/Grade/reconfirm-exam",
            new ReconfirmExamDto { EnrollmentId = Liam_LinearAlgebra, ExamPoints = 25m });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ReconfirmExam_WrongProfessor_Returns403()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddHours(-1));
        await SeedAppealAtAsync(grade.Id, now, status: AppealStatus.Accepted, reviewedAt: now);

        var client = await CreateAuthenticatedClientAsync(ProfCompNet);

        var response = await client.PostAsJsonAsync("/api/Grade/reconfirm-exam",
            new ReconfirmExamDto { EnrollmentId = Liam_LinearAlgebra, ExamPoints = 25m });

        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task StudentConfirm_FlipsStudentConfirmedAtAndFinalizedAt()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddHours(-1));

        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentLiam);

        var response = await client.PostAsJsonAsync("/api/Grade/student-confirm",
            new StudentConfirmGradeDto { EnrollmentId = Liam_LinearAlgebra });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<GradeDto>();
        dto!.StudentConfirmedAt.Should().NotBeNull();
        dto.FinalizedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task StudentConfirm_WrongStudent_Returns403()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now);

        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);

        var response = await client.PostAsJsonAsync("/api/Grade/student-confirm",
            new StudentConfirmGradeDto { EnrollmentId = Liam_LinearAlgebra });

        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task GetByEnrollment_CrossProfessor_Returns403()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now);

        var client = await CreateAuthenticatedClientAsync(ProfCompNet);

        var response = await client.GetAsync($"/api/Grade/by-enrollment/{Liam_LinearAlgebra}");

        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task GetByEnrollment_OwningProfessor_ReturnsGrade()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now);

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.GetAsync($"/api/Grade/by-enrollment/{Liam_LinearAlgebra}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
