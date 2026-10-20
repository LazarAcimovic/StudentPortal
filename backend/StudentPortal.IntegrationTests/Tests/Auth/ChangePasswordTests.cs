using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class ChangePasswordTests : IntegrationTestBase
{
    public ChangePasswordTests(IntegrationTestFixture fixture) : base(fixture) { }

    private const string NewPassword = "FreshPass!2026-aA";

    [Fact]
    public async Task ChangePassword_CorrectCurrent_Returns204_AndRevokesEveryRefreshRow()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentOlivia);
        // Login a second time from another client to confirm BOTH rows get revoked.
        _ = await CreateAuthenticatedClientAsync(SeedUsers.StudentOlivia);

        var beforeRows = await WithDbAsync(db => db.RefreshTokens
            .CountAsync(t => t.UserId == SeedUsers.StudentOlivia.Id && t.RevokedUtc == null));
        beforeRows.Should().BeGreaterOrEqualTo(2);

        var response = await client.PostAsJsonAsync("/api/Account/change-password",
            new ChangePasswordDto { CurrentPassword = SeedUsers.Password, NewPassword = NewPassword });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var afterRows = await WithDbAsync(db => db.RefreshTokens
            .CountAsync(t => t.UserId == SeedUsers.StudentOlivia.Id && t.RevokedUtc == null));
        afterRows.Should().Be(0,
            "PRD §5.10: change-password must sign the user out everywhere (every refresh row revoked)");
    }

    [Fact]
    public async Task ChangePassword_OldRefreshCookie_Returns401OnRefresh()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentDaniel);

        var change = await client.PostAsJsonAsync("/api/Account/change-password",
            new ChangePasswordDto { CurrentPassword = SeedUsers.Password, NewPassword = NewPassword });
        change.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // The sp_refresh in the client's cookie container is now stale.
        var refresh = await client.PostAsync("/api/Account/Refresh", null);
        refresh.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Returns400WithFieldError()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentEmma);

        var response = await client.PostAsJsonAsync("/api/Account/change-password",
            new ChangePasswordDto { CurrentPassword = "WrongPassword123!", NewPassword = NewPassword });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("currentPassword",
            because: "PRD §5.10 — field error payload names the field in error");
    }

    [Theory]
    [InlineData("short1A!a", "too short")]           // < 12
    [InlineData("alllowercase1!a", "no uppercase")]
    [InlineData("ALLUPPERCASE1!A", "no lowercase")]
    [InlineData("NoDigitsHere!aa", "no digit")]
    [InlineData("NoSpecialChar123a", "no special")]
    [InlineData("Password123!", "same as current")]
    public async Task ChangePassword_InvalidNewPassword_Returns400(string newPassword, string reason)
    {
        _ = reason;
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentNoah);

        var response = await client.PostAsJsonAsync("/api/Account/change-password",
            new ChangePasswordDto { CurrentPassword = SeedUsers.Password, NewPassword = newPassword });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangePassword_NewPasswordOver128Chars_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorJohnson);
        var over = "Aa1!" + new string('a', 125); // 129 chars

        var response = await client.PostAsJsonAsync("/api/Account/change-password",
            new ChangePasswordDto { CurrentPassword = SeedUsers.Password, NewPassword = over });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
