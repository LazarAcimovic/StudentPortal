using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.EnrollmentEndpoints;

public class EnrollmentDeleteTests : IntegrationTestBase
{
    public EnrollmentDeleteTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Delete_Enrollment_Returns405()
    {
        // DELETE /api/Enrollment/{id} was removed per D-027 (enrollments are create-only).
        // ASP.NET should return 405 Method Not Allowed because the route exists but the verb is not registered.
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var enrollmentId = SeedIds.Enrollments.Sarah_MathI;

        var response = await client.DeleteAsync($"/api/Enrollment/{enrollmentId}");

        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed,
            "DELETE /api/Enrollment/{id} was removed per D-027; enrollments are create-only");
    }
}
