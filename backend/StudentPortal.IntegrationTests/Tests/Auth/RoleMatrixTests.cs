using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class RoleMatrixTests : IntegrationTestBase
{
    public RoleMatrixTests(IntegrationTestFixture fixture) : base(fixture) { }

    public static IEnumerable<object[]> ProtectedEndpoints => new List<object[]>
    {
        new object[] { HttpMethod.Get, "/api/User" },
        new object[] { HttpMethod.Get, "/api/Student/me/dashboard" },
        new object[] { HttpMethod.Get, "/api/Professor/me/dashboard" },
        new object[] { HttpMethod.Get, "/api/Appeal/pending" },
        new object[] { HttpMethod.Get, "/api/Account/Me" },
    };

    [Theory]
    [MemberData(nameof(ProtectedEndpoints))]
    public async Task Anonymous_HittingProtectedEndpoint_Returns401(HttpMethod method, string path)
    {
        var client = CreateAnonymousClient();
        var request = new HttpRequestMessage(method, path);

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Student_HittingProfessorEndpoint_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);

        var response = await client.GetAsync("/api/Professor/me/dashboard");

        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task Professor_HittingStudentDashboard_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);

        var response = await client.GetAsync("/api/Student/me/dashboard");

        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task Student_HittingAdminEndpoint_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);

        var response = await client.GetAsync("/api/User");

        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task Professor_HittingAdminEndpoint_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorJohnson);

        var response = await client.GetAsync("/api/User");

        ((int)response.StatusCode).Should().Be(403);
    }

    // Enrollment list — Admin-only per the access-control matrix

    [Fact]
    public async Task Student_GetEnrollments_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await client.GetAsync("/api/Enrollment");
        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task Professor_GetEnrollments_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);
        var response = await client.GetAsync("/api/Enrollment");
        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task Student_GetEnrollmentById_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await client.GetAsync($"/api/Enrollment/{Guid.NewGuid()}");
        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task Professor_GetEnrollmentById_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);
        var response = await client.GetAsync($"/api/Enrollment/{Guid.NewGuid()}");
        ((int)response.StatusCode).Should().Be(403);
    }

    // Deleted routes — recorded as removed in the access-control matrix

    [Fact]
    public async Task GetSubjectsByProfessorId_DeletedRoute_Returns404()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await client.GetAsync($"/api/Subject/professor/{SeedUsers.ProfessorSmith.Id}");
        ((int)response.StatusCode).Should().BeOneOf(404, 405);
    }

    [Fact]
    public async Task GetStudentsBySubjectId_DeletedRoute_Returns404()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await client.GetAsync($"/api/Subject/{Guid.NewGuid()}/students");
        ((int)response.StatusCode).Should().BeOneOf(404, 405);
    }
}
