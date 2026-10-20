using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class LogoutAndMeTests : IntegrationTestBase
{
    public LogoutAndMeTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Logout_ClearsBothCookiesAndRevokesRefreshRow()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);

        var response = await client.PostAsync("/api/Account/Logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var unrevoked = await WithDbAsync(db => db.RefreshTokens
            .CountAsync(t => t.UserId == SeedUsers.StudentSarah.Id && t.RevokedUtc == null));
        unrevoked.Should().Be(0, "logout must revoke the user's active refresh row");

        // Follow-up refresh should fail.
        var refreshAfter = await client.PostAsync("/api/Account/Refresh", null);
        refreshAfter.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_ReturnsCurrentUserShape_WithoutIsDeleted()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);

        var response = await client.GetAsync("/api/Account/Me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        json.Should().NotContain("IsDeleted");
        json.Should().NotContain("isDeleted");

        var dto = JsonSerializer.Deserialize<UserDto>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        });
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(SeedUsers.ProfessorSmith.Id);
        dto.Email.Should().Be(SeedUsers.ProfessorSmith.Email);
        dto.UserRole.Should().Be(RoleEnum.Professor);
    }

    [Fact]
    public async Task Me_WithoutCookies_Returns401()
    {
        var client = CreateAnonymousClient();

        var response = await client.GetAsync("/api/Account/Me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
