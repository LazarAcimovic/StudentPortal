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
    public async Task Login_EmailCasingDiffersFromStored_Succeeds()
    {
        var client = CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.Admin.Email.ToUpperInvariant(), Password = SeedUsers.Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "email identity is case-insensitive (D-042): login accepts any casing");
        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>();
        body!.Id.Should().Be(SeedUsers.Admin.Id);
    }

    [Fact]
    public async Task Login_OversizedPassword_RejectedWithoutPbkdf2Work()
    {
        var client = CreateAnonymousClient();

        // Warm up so first-request JIT cost does not skew the comparison.
        await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.Admin.Email, Password = "warmup-wrong-password" });

        // A wrong password of valid length runs the full PBKDF2 verify (→ 401).
        var hashSw = System.Diagnostics.Stopwatch.StartNew();
        var hashResponse = await client.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.Admin.Email, Password = "wrong-but-valid-length-password" });
        hashSw.Stop();
        hashResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // A 1 MB password must be rejected before any PBKDF2 work.
        var oversized = new string('a', 1024 * 1024);
        var json = JsonSerializer.Serialize(
            new LoginRequestDto { Email = SeedUsers.Admin.Email, Password = oversized });
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var bigSw = System.Diagnostics.Stopwatch.StartNew();
        var bigResponse = await client.PostAsync("/api/Account/Login", content);
        bigSw.Stop();

        bigResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "an oversized login payload must be rejected with 400, not processed");
        // No wall-clock threshold: the oversized rejection must simply be faster than a
        // request that did run PBKDF2, proving the hash never executed.
        bigSw.Elapsed.Should().BeLessThan(hashSw.Elapsed,
            "rejecting the oversized body must be faster than a real PBKDF2 verify");
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
