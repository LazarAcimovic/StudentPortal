using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

/// <summary>
/// 26.6: GET /api/User, /api/Subject, /api/Enrollment all return PagedResultDto
/// with correct totalCount, page slice, and pageSize clamping.
/// </summary>
public class AdminPaginationTests : IntegrationTestBase
{
    public AdminPaginationTests(IntegrationTestFixture fixture) : base(fixture) { }

    // ── Users ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetUsers_DefaultPage_ReturnsPagedEnvelope()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.GetAsync("/api/User?page=1&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserDto>>();
        paged.Should().NotBeNull();
        paged!.Page.Should().Be(1);
        paged.PageSize.Should().Be(15);
        paged.TotalCount.Should().BeGreaterThan(0);
        paged.Items.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetUsers_NonAllowedPageSize_ClampsTo15()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.GetAsync("/api/User?page=1&pageSize=99");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserDto>>();
        paged!.PageSize.Should().Be(15, "non-allowed pageSize clamps to default 15");
    }

    [Fact]
    public async Task GetUsers_SecondPage_EmptyItemsWithCorrectTotalCount()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var p1 = await admin.GetAsync("/api/User?page=1&pageSize=50");
        var total = (await p1.Content.ReadFromJsonAsync<PagedResultDto<UserDto>>())!.TotalCount;

        var response = await admin.GetAsync($"/api/User?page=9999&pageSize=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<UserDto>>();
        paged!.TotalCount.Should().Be(total, "totalCount is the same regardless of page");
        paged.Items.Should().BeEmpty("no users on a far-out page");
    }

    [Fact]
    public async Task GetUsers_StableOrdering_PageSliceDoesNotOverlap()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var p1 = await (await admin.GetAsync("/api/User?page=1&pageSize=15"))
            .Content.ReadFromJsonAsync<PagedResultDto<UserDto>>();

        var p2 = await (await admin.GetAsync("/api/User?page=2&pageSize=15"))
            .Content.ReadFromJsonAsync<PagedResultDto<UserDto>>();

        var ids1 = p1!.Items.Select(u => u.Id).ToHashSet();
        var ids2 = p2!.Items.Select(u => u.Id).ToHashSet();
        ids1.Intersect(ids2).Should().BeEmpty("pages must not overlap");
    }

    // ── Subjects ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSubjects_DefaultPage_ReturnsPagedEnvelope()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.GetAsync("/api/Subject?page=1&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectDto>>();
        paged.Should().NotBeNull();
        paged!.Page.Should().Be(1);
        paged.PageSize.Should().Be(15);
        paged.TotalCount.Should().BeGreaterThan(0);
        paged.Items.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetSubjects_NonAllowedPageSize_ClampsTo15()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.GetAsync("/api/Subject?page=1&pageSize=7");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectDto>>();
        paged!.PageSize.Should().Be(15);
    }

    [Fact]
    public async Task GetSubjects_SecondPage_CorrectTotalCount()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var p1 = await admin.GetAsync("/api/Subject?page=1&pageSize=15");
        var total = (await p1.Content.ReadFromJsonAsync<PagedResultDto<SubjectDto>>())!.TotalCount;

        var response = await admin.GetAsync("/api/Subject?page=9999&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectDto>>();
        paged!.TotalCount.Should().Be(total);
        paged.Items.Should().BeEmpty();
    }

    // ── Enrollments ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetEnrollments_DefaultPage_ReturnsPagedEnvelope()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.GetAsync("/api/Enrollment?page=1&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EnrollmentDto>>();
        paged.Should().NotBeNull();
        paged!.Page.Should().Be(1);
        paged.PageSize.Should().Be(15);
        paged.TotalCount.Should().BeGreaterThan(0);
        paged.Items.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetEnrollments_NonAllowedPageSize_ClampsTo15()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.GetAsync("/api/Enrollment?page=1&pageSize=3");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EnrollmentDto>>();
        paged!.PageSize.Should().Be(15);
    }

    [Fact]
    public async Task GetEnrollments_SecondPage_CorrectTotalCount()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var p1 = await admin.GetAsync("/api/Enrollment?page=1&pageSize=15");
        var total = (await p1.Content.ReadFromJsonAsync<PagedResultDto<EnrollmentDto>>())!.TotalCount;

        var response = await admin.GetAsync("/api/Enrollment?page=9999&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<EnrollmentDto>>();
        paged!.TotalCount.Should().Be(total);
        paged.Items.Should().BeEmpty();
    }
}
