using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

public class AdminUserCrudTests : IntegrationTestBase
{
    public AdminUserCrudTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static AdminUpdateUserDto MakeDto(SeedUser u, Action<AdminUpdateUserDto> tweak = null)
    {
        var dto = new AdminUpdateUserDto
        {
            FirstName = u.FirstName,
            LastName = u.LastName,
            Email = u.Email,
            IndexNumber = u.IndexNumber,
            UserRole = u.Role,
            IsDeleted = false,
        };
        tweak?.Invoke(dto);
        return dto;
    }

    [Fact]
    public async Task AdminUpdateUser_StudentAllFields_Succeeds()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var target = SeedUsers.StudentSarah;

        var dto = MakeDto(target, d =>
        {
            d.FirstName = "Sara-updated";
            d.LastName = "Williams-updated";
            d.Email = "sarah.renamed@student.edu";
            d.IndexNumber = "SW-NEW-2024";
        });

        var response = await client.PutAsJsonAsync($"/api/User/{target.Id}", dto);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<UserDto>();
        updated!.FirstName.Should().Be("Sara-updated");
        updated.Email.Should().Be("sarah.renamed@student.edu");
        updated.IndexNumber.Should().Be("SW-NEW-2024");
    }

    [Fact]
    public async Task AdminUpdateUser_CannotSoftDeleteSelf_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var dto = MakeDto(SeedUsers.Admin, d => d.IsDeleted = true);

        var response = await client.PutAsJsonAsync($"/api/User/{SeedUsers.Admin.Id}", dto);

        ((int)response.StatusCode).Should().Be(403);

        var stillActive = await WithDbAsync(db => db.Users
            .Where(u => u.Id == SeedUsers.Admin.Id)
            .Select(u => u.IsDeleted)
            .FirstAsync());
        stillActive.Should().BeFalse();
    }

    [Fact]
    public async Task AdminUpdateUser_CannotDemoteSelf_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var dto = MakeDto(SeedUsers.Admin, d => d.UserRole = RoleEnum.Professor);

        var response = await client.PutAsJsonAsync($"/api/User/{SeedUsers.Admin.Id}", dto);

        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task AdminUpdateUser_CannotChangeRoleOfAnotherAdmin_Returns403()
    {
        // Make a second admin via the DB.
        var otherAdminId = Guid.NewGuid();
        await WithDbAsync(async db =>
        {
            // Hash is for Password123! taken from seed.sql (admin's hash).
            db.Users.Add(new User
            {
                Id = otherAdminId,
                FirstName = "Second",
                LastName = "Admin",
                Email = "second.admin@uni.edu",
                UserPassword = "AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==",
                UserRole = RoleEnum.Admin,
                IsDeleted = false,
            });
            await db.SaveChangesAsync();
        });

        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var dto = new AdminUpdateUserDto
        {
            FirstName = "Second",
            LastName = "Admin",
            Email = "second.admin@uni.edu",
            IndexNumber = null,
            UserRole = RoleEnum.Professor, // trying to demote
            IsDeleted = false,
        };

        var response = await client.PutAsJsonAsync($"/api/User/{otherAdminId}", dto);

        ((int)response.StatusCode).Should().Be(403,
            "PRD §2.1: an admin cannot change another admin's role");
    }

    [Fact]
    public async Task UpdateUser_MassAssignment_IdInBodyIgnored()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var target = SeedUsers.StudentSophia;

        // Body carries a different Id — the route id should win.
        var body = new
        {
            Id = Guid.NewGuid(),
            FirstName = "NewSophia",
            LastName = target.LastName,
            Email = target.Email,
            IndexNumber = target.IndexNumber,
            UserRole = target.Role,
            IsDeleted = false,
        };

        var response = await client.PutAsJsonAsync($"/api/User/{target.Id}", body);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // The seeded user (route id) is the one that got updated.
        var inDb = await WithDbAsync(db => db.Users.FirstAsync(u => u.Id == target.Id));
        inDb.FirstName.Should().Be("NewSophia");
    }

    [Fact]
    public async Task UpdateUser_UserDto_DoesNotLeakIsDeleted()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var dto = MakeDto(SeedUsers.StudentJessica, d => d.FirstName = "Jesse");

        var response = await client.PutAsJsonAsync($"/api/User/{SeedUsers.StudentJessica.Id}", dto);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("isDeleted");
        body.Should().NotContain("IsDeleted");
    }

    [Fact]
    public async Task NonAdmin_CannotCall_AdminEndpoints_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentJames);

        var get = await client.GetAsync("/api/User");
        ((int)get.StatusCode).Should().Be(403);

        var update = await client.PutAsJsonAsync($"/api/User/{SeedUsers.StudentSarah.Id}",
            MakeDto(SeedUsers.StudentSarah));
        ((int)update.StatusCode).Should().Be(403);
    }
}
