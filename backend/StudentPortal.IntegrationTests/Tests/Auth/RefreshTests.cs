using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class RefreshTests : IntegrationTestBase
{
    public RefreshTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Refresh_RotatesCookies_IssuingNewAccessAndRefresh()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);

        var response = await client.PostAsync("/api/Account/Refresh", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        AssertSetCookie(response, "sp_access");
        AssertSetCookie(response, "sp_refresh");

        // The old refresh row should now be revoked.
        var active = await WithDbAsync(db => db.RefreshTokens
            .CountAsync(t => t.UserId == SeedUsers.StudentSarah.Id && t.RevokedUtc == null));
        active.Should().Be(1, "exactly one unrevoked refresh token should remain after a rotation");
    }

    [Fact]
    public async Task Refresh_MissingCookie_Returns401()
    {
        var client = CreateAnonymousClient();

        var response = await client.PostAsync("/api/Account/Refresh", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_ReuseOfRotatedToken_RevokesEntireChainAndReturns401()
    {
        // Login + capture the raw sp_refresh value
        var client = CreateAnonymousClient();
        var login = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.StudentJessica.Email, Password = SeedUsers.Password });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var originalRefresh = ExtractCookieValue(login, "sp_refresh");

        // First refresh — rotates the cookie, cookie container holds the new one now.
        var firstRefresh = await client.PostAsync("/api/Account/Refresh", null);
        firstRefresh.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Replay the ORIGINAL (already-rotated) refresh token on a fresh client.
        var replayClient = CreateAnonymousClient();
        var replayReq = new HttpRequestMessage(HttpMethod.Post, "/api/Account/Refresh");
        replayReq.Headers.Add("Cookie", $"sp_refresh={originalRefresh}");
        var replay = await replayClient.SendAsync(replayReq);
        replay.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // The whole chain for that user must now be revoked.
        var unrevoked = await WithDbAsync(db => db.RefreshTokens
            .CountAsync(t => t.UserId == SeedUsers.StudentJessica.Id && t.RevokedUtc == null));
        unrevoked.Should().Be(0, "re-use detection must revoke every refresh row for the user");

        // Even the newest refresh cookie (held by the first client) should no longer work.
        var afterReplay = await client.PostAsync("/api/Account/Refresh", null);
        afterReplay.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
