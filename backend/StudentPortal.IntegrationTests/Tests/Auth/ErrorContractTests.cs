using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class ErrorContractTests : IntegrationTestBase
{
    public ErrorContractTests(IntegrationTestFixture fixture) : base(fixture) { }

    // PRD §6: a duplicate email is 409, never a generic 500.
    // Former path: POST /api/User with existing email threw EmailAlreadyExistsException
    // which was caught by a Conflict() handler, then a generic catch leaked 500.
    // Now the exception bubbles to GlobalExceptionHandler (ConflictException → 409).
    [Fact]
    public async Task AddUser_DuplicateEmail_Returns409_NoInternalServerError()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var dto = new AdminCreateUserDto
        {
            FirstName = "Dupe",
            LastName = "User",
            Email = SeedUsers.StudentSarah.Email,
            Password = "Password123!",
            IndexNumber = "DUPE-001",
            UserRole = RoleEnum.Student,
        };

        var response = await client.PostAsJsonAsync("/api/User", dto);

        ((int)response.StatusCode).Should().Be(409,
            "PRD §6: duplicate email must yield 409, not 500");
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("Internal server error",
            "GlobalExceptionHandler must not leak raw exception messages");
    }

    // Former path: PUT /api/Account/profile where non-admin changes email
    // threw ForbiddenAccessException, which had a dedicated catch → 403,
    // then a generic catch that leaked 500 on any other error.
    // Now ForbiddenAccessException bubbles to GlobalExceptionHandler → 403.
    [Fact]
    public async Task UpdateProfile_EmailChangeByNonAdmin_Returns403_NoInternalServerError()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentDavid);

        var response = await client.PutAsJsonAsync("/api/Account/profile",
            new UpdateProfileDto { Email = "sneaky@student.edu" });

        ((int)response.StatusCode).Should().Be(403);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("Internal server error");
    }

    // Former path: PUT /api/User/{id} self-delete threw ForbiddenAccessException,
    // which had a dedicated catch → 403, then a generic catch that leaked 500.
    // Now ForbiddenAccessException bubbles to GlobalExceptionHandler → 403.
    [Fact]
    public async Task UpdateUser_SelfDelete_Returns403_NoInternalServerError()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var dto = new AdminUpdateUserDto
        {
            FirstName = SeedUsers.Admin.FirstName,
            LastName = SeedUsers.Admin.LastName,
            Email = SeedUsers.Admin.Email,
            IndexNumber = SeedUsers.Admin.IndexNumber,
            IsDeleted = true,
        };

        var response = await client.PutAsJsonAsync($"/api/User/{SeedUsers.Admin.Id}", dto);

        ((int)response.StatusCode).Should().Be(403);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("Internal server error");
    }
}
