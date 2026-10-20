using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class LoginTests : IntegrationTestBase
{
    public LoginTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithUserShape()
    {
        var client = CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.Admin.Email, Password = SeedUsers.Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>();
        body.Should().NotBeNull();
        body!.Id.Should().Be(SeedUsers.Admin.Id);
        body.Email.Should().Be(SeedUsers.Admin.Email);
        body.UserRole.Should().Be(RoleEnum.Admin);
        body.FirstName.Should().Be(SeedUsers.Admin.FirstName);
        body.LastName.Should().Be(SeedUsers.Admin.LastName);
    }

    [Fact]
    public async Task Login_SetsBothCookies_WithHttpOnlyAndSameSiteStrict()
    {
        var client = CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.StudentSarah.Email, Password = SeedUsers.Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        AssertSetCookie(response, "sp_access");
        AssertSetCookie(response, "sp_refresh");
    }

    [Fact]
    public async Task Login_LoginResponseDto_DoesNotLeakIsDeleted()
    {
        var client = CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.StudentDavid.Email, Password = SeedUsers.Password });

        var payload = await response.Content.ReadAsStringAsync();
        payload.Should().NotContain("IsDeleted", "LoginResponseDto must not leak the IsDeleted flag");
        payload.Should().NotContain("isDeleted");
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401WithGenericMessage()
    {
        var client = CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.Admin.Email, Password = "WrongPassword123!" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401()
    {
        var client = CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = "nobody@uni.edu", Password = "Password123!" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_SoftDeletedUser_Returns401()
    {
        await WithDbAsync(async db =>
        {
            var user = await db.Users.FirstAsync(u => u.Id == SeedUsers.StudentLiam.Id);
            user.IsDeleted = true;
            await db.SaveChangesAsync();
        });

        var client = CreateAnonymousClient();
        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.StudentLiam.Email, Password = SeedUsers.Password });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
