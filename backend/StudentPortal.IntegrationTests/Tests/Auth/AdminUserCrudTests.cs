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
            IsDeleted = false,
        };
        tweak?.Invoke(dto);
        return dto;
    }

    [Fact]
    public async Task AdminCreateUser_EmailDifferingOnlyInCase_Returns409()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var first = new AdminCreateUserDto
        {
            FirstName = "Case",
            LastName = "Upper",
            Email = "CaseUser@uni.edu",
            Password = "Password123!",
            IndexNumber = "CASE-UP-1",
            UserRole = RoleEnum.Student,
        };
        (await client.PostAsJsonAsync("/api/User", first)).StatusCode
            .Should().Be(HttpStatusCode.Created);

        var second = new AdminCreateUserDto
        {
            FirstName = "Case",
            LastName = "Lower",
            Email = "caseuser@uni.edu",
            Password = "Password123!",
            IndexNumber = "CASE-LO-1",
            UserRole = RoleEnum.Student,
        };
        var response = await client.PostAsJsonAsync("/api/User", second);

        ((int)response.StatusCode).Should().Be(409,
            "email identity is case-insensitive (D-042): a case-only duplicate is a conflict");
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

    [Fact]
    public async Task AdminUpdateUser_DuplicateEmail_Returns409()
    {
        // D-046: a duplicate email on the update path is 409, never 500.
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await client.PutAsJsonAsync($"/api/User/{SeedUsers.StudentSarah.Id}",
            MakeDto(SeedUsers.StudentSarah, d => d.Email = SeedUsers.StudentDavid.Email));

        ((int)response.StatusCode).Should().Be(409,
            "updating to an email already owned by another user must yield 409 (D-046)");
    }

    [Fact]
    public async Task AdminUpdateUser_ConcurrentDuplicateEmail_NeverReturns500()
    {
        // D-046: even when two requests race past the check-then-write gap, the
        // unique-index catch must translate the violation to 409, never 500.
        const string raceEmail = "race-target-r04@uni.edu";
        var client = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var t1 = client.PutAsJsonAsync($"/api/User/{SeedUsers.StudentSarah.Id}",
            MakeDto(SeedUsers.StudentSarah, d => d.Email = raceEmail));
        var t2 = client.PutAsJsonAsync($"/api/User/{SeedUsers.StudentDavid.Id}",
            MakeDto(SeedUsers.StudentDavid, d => d.Email = raceEmail));

        var responses = await Task.WhenAll(t1, t2);
        var codes = responses.Select(r => (int)r.StatusCode).OrderBy(x => x).ToArray();

        codes.Should().NotContain(500, "a unique-index violation must never leak as 500 (D-046)");
        codes.Should().BeEquivalentTo(new[] { 200, 409 },
            "one request must win with 200 and the other must lose with 409");
    }

    // ── D-047: soft-delete tests ───────────────────────────────────────────

    [Fact]
    public async Task AdminDeleteUser_WithEnrollments_RowSurvivesAsInactive()
    {
        // StudentSarah has three seeded enrollments — a hard delete would hit RESTRICT.
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.DeleteAsync($"/api/User/{SeedUsers.StudentSarah.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent,
            "DELETE /api/User/{id} must succeed even when the user owns enrollments (D-047)");

        var isDeleted = await WithDbAsync(db => db.Users
            .Where(u => u.Id == SeedUsers.StudentSarah.Id)
            .Select(u => (bool?)u.IsDeleted)
            .FirstOrDefaultAsync());
        isDeleted.Should().BeTrue("the row must survive with IsDeleted = true (D-047)");
    }

    [Fact]
    public async Task AdminDeleteUser_DeletedUserCannotLogin()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        await admin.DeleteAsync($"/api/User/{SeedUsers.StudentSarah.Id}");

        var anon = CreateAnonymousClient();
        var loginResponse = await anon.PostAsJsonAsync("/api/Account/Login",
            new LoginRequestDto { Email = SeedUsers.StudentSarah.Email, Password = SeedUsers.Password });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "a soft-deleted user must not be able to log in");
    }

    [Fact]
    public async Task AdminDeleteUser_AppearsInactiveInAdminList()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        await admin.DeleteAsync($"/api/User/{SeedUsers.StudentSarah.Id}");

        var listResponse = await admin.GetAsync("/api/User?page=1&pageSize=50");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await listResponse.Content.ReadFromJsonAsync<PagedResultDto<AdminUserDto>>();
        var sarah = paged!.Items.FirstOrDefault(u => u.Id == SeedUsers.StudentSarah.Id);
        sarah.Should().NotBeNull("admin list must include soft-deleted users (D-035)");
        sarah!.IsDeleted.Should().BeTrue("the admin list row must reflect IsDeleted = true (D-035)");
    }

    [Fact]
    public async Task AdminDeleteSubject_WithEnrollments_RowSurvivesAsDeleted()
    {
        // MathI has seeded enrollments for Sarah — a hard delete would hit RESTRICT.
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.DeleteAsync($"/api/Subject/{SeedIds.Subjects.MathI}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent,
            "DELETE /api/Subject/{id} must succeed even when the subject has enrollments (D-047)");

        var isDeleted = await WithDbAsync(db => db.Subjects
            .Where(s => s.Id == SeedIds.Subjects.MathI)
            .Select(s => (bool?)s.IsDeleted)
            .FirstOrDefaultAsync());
        isDeleted.Should().BeTrue("the row must survive with IsDeleted = true (D-047)");
    }
}
