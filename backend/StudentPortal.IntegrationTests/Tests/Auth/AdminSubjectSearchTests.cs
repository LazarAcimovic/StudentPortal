using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

/// <summary>
/// 30.2: GET /api/Subject/search — name/code search, soft-delete exclusion,
/// pagination, deterministic order, empty results.
/// </summary>
public class AdminSubjectSearchTests : IntegrationTestBase
{
    public AdminSubjectSearchTests(IntegrationTestFixture fixture) : base(fixture) { }

    // ── Authorization ──────────────────────────────────────────────────────

    [Fact]
    public async Task Search_Anonymous_Returns401()
    {
        var client = CreateAnonymousClient();
        var response = await client.GetAsync("/api/Subject/search");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Search_AsStudent_Returns403()
    {
        var student = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await student.GetAsync("/api/Subject/search");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Search_AsProfessor_Returns403()
    {
        var prof = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);
        var response = await prof.GetAsync("/api/Subject/search");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Empty query returns all ────────────────────────────────────────────

    [Fact]
    public async Task Search_EmptyQuery_ReturnsAllActiveSubjects()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Subject/search?pageSize=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        paged.Should().NotBeNull();
        paged!.TotalCount.Should().Be(15, "seed has 15 active subjects");
        paged.Items.Should().HaveCount(15);
    }

    // ── Name search ────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_BySubjectName_ReturnsMatches()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Subject/search?query=Mathematics");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        // "Mathematics I", "Mathematics II", "Discrete Mathematics" = 3
        paged!.TotalCount.Should().Be(3);
        paged.Items.Should().AllSatisfy(s =>
            s.SubjectName.Should().ContainEquivalentOf("Mathematics"));
    }

    [Fact]
    public async Task Search_BySubjectNameCaseInsensitive_ReturnsMatches()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Subject/search?query=software");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        paged!.TotalCount.Should().Be(1);
        paged.Items.Single().Id.Should().Be(SeedIds.Subjects.SoftwareEngineering);
    }

    // ── Code search ────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_BySubjectCode_ReturnsMatches()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        // "CS-DS" matches Data Structures and Algorithms
        var response = await admin.GetAsync("/api/Subject/search?query=CS-DS");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        paged!.TotalCount.Should().Be(2);
        paged.Items.Should().Contain(s => s.Id == SeedIds.Subjects.DataStructures);
        paged.Items.Should().Contain(s => s.Id == SeedIds.Subjects.Algorithms);
    }

    // ── No match ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_NoMatch_ReturnsEmpty()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Subject/search?query=ZZZ_NO_MATCH");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        paged!.TotalCount.Should().Be(0);
        paged.Items.Should().BeEmpty();
    }

    // ── Soft-delete exclusion ──────────────────────────────────────────────

    [Fact]
    public async Task Search_DeletedSubject_IsExcluded()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        // Fetch the subject first so we can replicate its fields in the PUT
        var getResponse = await admin.GetAsync($"/api/Subject/{SeedIds.Subjects.MathI}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var existing = await getResponse.Content.ReadFromJsonAsync<SubjectDto>();

        var softDeleteDto = new SubjectUpdateDto
        {
            Id = existing!.Id,
            SubjectName = existing.SubjectName,
            SubjectCode = existing.SubjectCode,
            ECTS = existing.ECTS,
            ProfessorId = existing.ProfessorId,
            IsDeleted = true,
        };
        var putResponse = await admin.PutAsJsonAsync($"/api/Subject/{SeedIds.Subjects.MathI}", softDeleteDto);
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await admin.GetAsync("/api/Subject/search?pageSize=50");
        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();

        paged!.TotalCount.Should().Be(14, "soft-deleted subject must be excluded");
        paged.Items.Should().NotContain(s => s.Id == SeedIds.Subjects.MathI);
    }

    // ── Pagination ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_DefaultPageSize_Is15()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Subject/search");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        paged!.PageSize.Should().Be(15);
    }

    [Fact]
    public async Task Search_PageSizeOver50_ClampsTo50()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Subject/search?pageSize=999");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        paged!.PageSize.Should().Be(50, "pageSize is clamped to max 50");
    }

    [Fact]
    public async Task Search_BeyondLastPage_ReturnsEmptyItems()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.GetAsync("/api/Subject/search?page=9999&pageSize=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        paged!.Items.Should().BeEmpty();
        paged.TotalCount.Should().Be(15, "totalCount is stable regardless of page");
    }

    // ── Deterministic order ────────────────────────────────────────────────

    [Fact]
    public async Task Search_Pages_DoNotOverlap()
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var p1 = await (await admin.GetAsync("/api/Subject/search?page=1&pageSize=5"))
            .Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();
        var p2 = await (await admin.GetAsync("/api/Subject/search?page=2&pageSize=5"))
            .Content.ReadFromJsonAsync<PagedResultDto<SubjectSearchResultDto>>();

        var ids1 = p1!.Items.Select(s => s.Id).ToHashSet();
        var ids2 = p2!.Items.Select(s => s.Id).ToHashSet();
        ids1.Intersect(ids2).Should().BeEmpty("pages must not overlap");
    }
}
