using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Validation;

public class DtoValidationTests : IntegrationTestBase
{
    public DtoValidationTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task SaveGradeDraft_OutOfRangePoint_Returns400WithValidationErrors()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorWilson);
        var response = await client.PutAsJsonAsync(
            $"/api/GradeDraft/{SeedIds.Enrollments.Liam_Algorithms}",
            new SaveGradeDraftDto { Midterm1Points = -1m });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"errors\"", "FluentValidation returns a ValidationProblemDetails body");
    }

    [Fact]
    public async Task ReconfirmExam_OutOfRangeExamPoints_Returns400WithValidationErrors()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);
        var response = await client.PostAsJsonAsync("/api/Grade/reconfirm-exam",
            new ReconfirmExamDto { EnrollmentId = SeedIds.Enrollments.Liam_LinearAlgebra, ExamPoints = 31m });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"errors\"", "FluentValidation returns a ValidationProblemDetails body");
    }

    [Fact]
    public async Task StudentConfirmGrade_EmptyEnrollmentId_Returns400WithValidationErrors()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentLiam);
        var response = await client.PostAsJsonAsync("/api/Grade/student-confirm",
            new StudentConfirmGradeDto { EnrollmentId = Guid.Empty });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"errors\"", "FluentValidation returns a ValidationProblemDetails body");
    }

    [Fact]
    public async Task AssignProfessor_EmptyGradeId_Returns400WithValidationErrors()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await client.PostAsJsonAsync("/api/Escalation/assign",
            new AssignProfessorDto { GradeId = Guid.Empty, AssignedProfessorId = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"errors\"", "FluentValidation returns a ValidationProblemDetails body");
    }

    [Fact]
    public async Task ReassignProfessor_EmptyNewProfessorId_Returns400WithValidationErrors()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await client.PostAsJsonAsync("/api/Escalation/reassign",
            new ReassignProfessorDto { GradeId = Guid.NewGuid(), NewProfessorId = Guid.Empty });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"errors\"", "FluentValidation returns a ValidationProblemDetails body");
    }
}
