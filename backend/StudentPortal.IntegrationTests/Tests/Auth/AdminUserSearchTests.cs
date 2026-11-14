using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

/// <summary>
/// 30.1: GET /api/User/search — role filter, soft-delete exclusion, name/index
/// search, empty query, pagination boundaries, deterministic order.
/// </summary>
public class AdminUserSearchTests : IntegrationTestBase
{
    public AdminUserSearchTests(IntegrationTestFixture fixture) : base(fixture) { }

    // ── Authorization ──────────────────────────────────────────────────────

    [Fact]
    public async Task Search_Anonymous_Returns401()
    {
        var client = CreateAnonymousClient();
        var response = await client.GetAsync("/api/User/search?role=Professor");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Search_AsStudent_Returns403()
    {
        var student = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await student.GetAsync("/api/User/search?role=Professor");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Search_AsProfessor_Returns403()
    {
        var prof = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);
        var response = await prof.GetAsync("/api/User/search?role=Professor");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Role filter ────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_RoleProfessor_ReturnsOnlyProfessors()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Professor&pageSize=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged.Should().NotBeNull();
        paged!.TotalCount.Should().Be(4, "seed has 4 professors");
        paged.Items.Should().HaveCount(4);
    }

    [Fact]
    public async Task Search_RoleStudent_ReturnsOnlyStudents()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&pageSize=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(10, "seed has 10 students");
    }

    // ── Soft-delete exclusion ──────────────────────────────────────────────

    [Fact]
    public async Task Search_DeletedProfessor_IsExcluded()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        // soft-delete one seeded professor via PUT with IsDeleted = true
        var target = SeedUsers.ProfessorSmith;
        var softDeleteDto = new AdminUpdateUserDto
        {
            FirstName = target.FirstName,
            LastName = target.LastName,
            Email = target.Email,
            IsDeleted = true,
        };
        var softDeleteResponse = await admin.PutAsJsonAsync($"/api/User/{target.Id}", softDeleteDto);
        softDeleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await admin.GetAsync("/api/User/search?role=Professor&pageSize=50");
        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();

        paged!.TotalCount.Should().Be(3, "soft-deleted professor must be excluded");
        paged.Items.Should().NotContain(u => u.Id == SeedUsers.ProfessorSmith.Id);
    }

    // ── Name search (professors) ────────────────────────────────────────────

    [Fact]
    public async Task Search_Professor_ByLastName_ReturnsMatch()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Professor&query=Smith");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(1);
        paged.Items.First().Id.Should().Be(SeedUsers.ProfessorSmith.Id);
    }

    [Fact]
    public async Task Search_Professor_ByFirstNameCaseInsensitive_ReturnsMatch()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Professor&query=emily");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(1);
        paged.Items.First().Id.Should().Be(SeedUsers.ProfessorJohnson.Id);
    }

    // ── Index + name search (students) ────────────────────────────────────

    [Fact]
    public async Task Search_Student_ByIndexNumber_ReturnsMatch()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&query=SW-001");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(1);
        paged.Items.First().Id.Should().Be(SeedUsers.StudentSarah.Id);
    }

    [Fact]
    public async Task Search_Student_ByFirstName_ReturnsMatch()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&query=David");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(1);
        paged.Items.First().Id.Should().Be(SeedUsers.StudentDavid.Id);
    }

    [Fact]
    public async Task Search_Student_NoMatchingQuery_ReturnsEmptyItems()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&query=ZZZ_NO_MATCH");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(0);
        paged.Items.Should().BeEmpty();
    }

    // ── Empty query returns all ────────────────────────────────────────────

    [Fact]
    public async Task Search_EmptyQuery_ReturnsPaginatedAll()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&query=&pageSize=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(10);
    }

    // ── Pagination ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_Pagination_SecondPageIsEmpty_WhenBeyondTotal()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Professor&page=9999&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.Items.Should().BeEmpty();
        paged.TotalCount.Should().Be(4, "totalCount is stable regardless of page");
    }

    [Fact]
    public async Task Search_PageSizeOver50_ClampsTo50()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&pageSize=999");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.PageSize.Should().Be(50, "pageSize is clamped to max 50");
    }

    [Fact]
    public async Task Search_DefaultPageSize_Is15()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.PageSize.Should().Be(15);
    }

    // ── LIKE-pattern escaping ──────────────────────────────────────────────

    [Fact]
    public async Task Search_UnderscoreQuery_MatchesOnlyLiteralUnderscore()
    {
        // '_' is a single-char wildcard in SQL LIKE/ILIKE. After escaping it
        // must match only rows with a literal underscore — none in seed data.
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&query=_&pageSize=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(0, "no seeded student name or index contains a literal underscore");
    }

    [Fact]
    public async Task Search_WildcardOnlyQuery_ReturnsZeroResults()
    {
        // '%' is a multi-char wildcard. Without escaping '%%%%' would scan the
        // whole table and match every row. After escaping it matches a literal
        // '%' — none in seed data.
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/User/search?role=Student&query=%%%%&pageSize=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        paged!.TotalCount.Should().Be(0, "no seeded student name contains a literal percent sign");
    }

    // ── Deterministic order ────────────────────────────────────────────────

    [Fact]
    public async Task Search_Pages_DoNotOverlap()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var p1 = await (await admin.GetAsync("/api/User/search?role=Student&page=1&pageSize=5"))
            .Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();
        var p2 = await (await admin.GetAsync("/api/User/search?role=Student&page=2&pageSize=5"))
            .Content.ReadFromJsonAsync<PagedResultDto<UserSearchResultDto>>();

        var ids1 = p1!.Items.Select(u => u.Id).ToHashSet();
        var ids2 = p2!.Items.Select(u => u.Id).ToHashSet();
        ids1.Intersect(ids2).Should().BeEmpty("pages must not overlap");
    }
}
