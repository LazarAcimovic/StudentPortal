using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class ProfileUpdateTests : IntegrationTestBase
{
    public ProfileUpdateTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task UpdateProfile_WithOnlyFirstName_PreservesLastNameAndEmail()
    {
        var original = SeedUsers.StudentSarah;
        var client = await CreateAuthenticatedClientAsync(original);

        var response = await client.PutAsJsonAsync("/api/Account/profile",
            new UpdateProfileDto { FirstName = "Saraphine" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<UserDto>();
        dto.Should().NotBeNull();
        dto!.FirstName.Should().Be("Saraphine");
        dto.LastName.Should().Be(original.LastName,
            because: "the LastName was not in the payload — it must stay as stored");
        dto.Email.Should().Be(original.Email,
            because: "the Email was not in the payload — it must stay as stored");
    }

    [Fact]
    public async Task UpdateProfile_NonAdminChangingEmail_Returns403()
    {
        var original = SeedUsers.StudentDavid;
        var client = await CreateAuthenticatedClientAsync(original);

        var response = await client.PutAsJsonAsync("/api/Account/profile",
            new UpdateProfileDto { Email = "sneaky-new@student.edu" });

        ((int)response.StatusCode).Should().Be(403,
            "PRD §2.3: non-admins cannot change their own email");

        // Email in DB must be unchanged.
        var email = await WithDbAsync(db => db.Users
            .Where(u => u.Id == original.Id)
            .Select(u => u.Email)
            .FirstAsync());
        email.Should().Be(original.Email);
    }

    [Fact]
    public async Task UpdateProfile_NonAdminSettingSameEmail_Succeeds()
    {
        var user = SeedUsers.StudentDaniel;
        var client = await CreateAuthenticatedClientAsync(user);

        var response = await client.PutAsJsonAsync("/api/Account/profile",
            new UpdateProfileDto { Email = user.Email, FirstName = "Danny" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateProfile_AdminCanChangeOwnEmail()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await client.PutAsJsonAsync("/api/Account/profile",
            new UpdateProfileDto { Email = "new-admin@uni.edu" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<UserDto>();
        dto!.Email.Should().Be("new-admin@uni.edu");
    }

    [Fact]
    public async Task UpdateProfile_InvalidEmail_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await client.PutAsJsonAsync("/api/Account/profile",
            new UpdateProfileDto { Email = "not-an-email" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateProfile_WithoutAuth_Returns401()
    {
        var client = CreateAnonymousClient();

        var response = await client.PutAsJsonAsync("/api/Account/profile",
            new UpdateProfileDto { FirstName = "Hacker" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
