using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class LogoutAndMeTests : IntegrationTestBase
{
    public LogoutAndMeTests(IntegrationTestFixture fixture) : base(fixture) { }

    // R03.1 ── sp_refresh must be scoped to /api/Account; ClearAuthCookies must
    // delete with matching attributes so the browser honours the deletion.

    [Fact]
    public async Task Login_SetsRefreshCookieWithAccountPath()
    {
        var client = CreateAnonymousClient();
        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.StudentSarah.Email, Password = SeedUsers.Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var header = GetSetCookieHeader(response, "sp_refresh").ToLowerInvariant();
        header.Should().Contain("path=/api/account",
            "sp_refresh must be scoped to /api/Account to avoid riding along with every XHR");
    }

    [Fact]
    public async Task Login_SetsAccessCookieWithRootPath()
    {
        var client = CreateAnonymousClient();
        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.StudentSarah.Email, Password = SeedUsers.Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var header = GetSetCookieHeader(response, "sp_access").ToLowerInvariant();
        // path=/ followed by ; — prevents false positive against path=/api/...
        header.Should().Contain("path=/;",
            "sp_access must be on Path=/ so it reaches every endpoint");
    }

    [Fact]
    public async Task Logout_CookieDeleteHeaders_MatchWritePaths()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await client.PostAsync("/api/Account/Logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var accessDelete = GetSetCookieHeader(response, "sp_access").ToLowerInvariant();
        accessDelete.Should().Contain("path=/;",
            "sp_access delete must use Path=/ to match write options");

        var refreshDelete = GetSetCookieHeader(response, "sp_refresh").ToLowerInvariant();
        refreshDelete.Should().Contain("path=/api/account",
            "sp_refresh delete must use Path=/api/Account so the browser accepts the deletion");
    }

    [Fact]
    public async Task Refresh_ReceivesScopedRefreshCookie_AfterLogin()
    {
        // Proves that sp_refresh (now scoped to /api/Account) is still delivered to
        // /api/Account/Refresh, which is a sub-path of /api/Account.
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await client.PostAsync("/api/Account/Refresh", null);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private static string GetSetCookieHeader(HttpResponseMessage response, string name)
    {
        response.Headers.TryGetValues("Set-Cookie", out var raw).Should().BeTrue(
            $"response should contain Set-Cookie for '{name}'");
        var cookie = raw!.FirstOrDefault(c => c.StartsWith(name + "=", StringComparison.OrdinalIgnoreCase));
        cookie.Should().NotBeNull($"response must include a Set-Cookie for '{name}'");
        return cookie!;
    }

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
    public async Task Logout_WithOnlyRefreshCookie_RevokesRow_AndReturns204()
    {
        // D-044: Logout is [AllowAnonymous] and authenticated by sp_refresh alone, so it
        // works with an expired access token — here the access cookie is never sent.
        var client = CreateAnonymousClient();
        var login = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.ProfessorSmith.Email, Password = SeedUsers.Password });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var refreshValue = ExtractCookieValue(login, "sp_refresh");

        // A bare client that sends ONLY sp_refresh — no access token at all.
        var bare = Fixture.Factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false,
            BaseAddress = new Uri("http://localhost"),
        });
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/Account/Logout");
        req.Headers.TryAddWithoutValidation("Cookie", $"sp_refresh={refreshValue}");

        var response = await bare.SendAsync(req);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var unrevoked = await WithDbAsync(db => db.RefreshTokens
            .CountAsync(t => t.UserId == SeedUsers.ProfessorSmith.Id && t.RevokedUtc == null));
        unrevoked.Should().Be(0,
            "logout authenticated by sp_refresh alone must revoke the live refresh row");
    }

    [Fact]
    public async Task Logout_WithNoCookies_Returns204()
    {
        // D-044: returns 204 either way so it cannot be used as a token-existence oracle,
        // and touches no rows when there is no token to revoke.
        var client = CreateAnonymousClient();

        var response = await client.PostAsync("/api/Account/Logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var revoked = await WithDbAsync(db => db.RefreshTokens.CountAsync(t => t.RevokedUtc != null));
        revoked.Should().Be(0, "a cookieless logout must not revoke anything");
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
