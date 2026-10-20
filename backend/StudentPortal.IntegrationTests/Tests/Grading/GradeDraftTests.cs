using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Grading;

public class GradeDraftTests : IntegrationTestBase
{
    public GradeDraftTests(IntegrationTestFixture fixture) : base(fixture) { }

    // ─── Fresh enrollment (no draft, no grade yet) ───────────────────────
    // Liam Clark (ProfWilson's Algorithms) has no seeded draft/grade.
    private static readonly Guid WilsonAlgoLiamEnrollment = SeedIds.Enrollments.Liam_Algorithms;

    // Jessica Taylor — ProfJohnson's Software Engineering, no seeded draft.
    private static readonly Guid JohnsonSoftEngJessica = SeedIds.Enrollments.Jessica_SoftwareEng;

    [Fact]
    public async Task GetDraft_NoDraft_Returns204()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorWilson);

        var response = await client.GetAsync($"/api/GradeDraft/{WilsonAlgoLiamEnrollment}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PutDraft_FirstCall_CreatesRow()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorWilson);
        var dto = new SaveGradeDraftDto { Midterm1Points = 22.5m };

        var response = await client.PutAsJsonAsync($"/api/GradeDraft/{WilsonAlgoLiamEnrollment}", dto);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var count = await WithDbAsync(db => db.GradeDrafts
            .CountAsync(d => d.EnrollmentId == WilsonAlgoLiamEnrollment));
        count.Should().Be(1);
    }

    [Fact]
    public async Task PutDraft_SecondCallSameEnrollment_UpdatesInPlace_NoDuplicate()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorWilson);

        var first = await client.PutAsJsonAsync($"/api/GradeDraft/{WilsonAlgoLiamEnrollment}",
            new SaveGradeDraftDto { Midterm1Points = 10m });
        first.StatusCode.Should().Be(HttpStatusCode.OK);

        var second = await client.PutAsJsonAsync($"/api/GradeDraft/{WilsonAlgoLiamEnrollment}",
            new SaveGradeDraftDto { Midterm1Points = 15m, Midterm2Points = 20m });
        second.StatusCode.Should().Be(HttpStatusCode.OK);

        var rows = await WithDbAsync(db => db.GradeDrafts
            .Where(d => d.EnrollmentId == WilsonAlgoLiamEnrollment)
            .ToListAsync());
        rows.Should().HaveCount(1, "PRD §5.3 — a draft is unique per enrollment");
        rows[0].Midterm1Points.Should().Be(15m);
        rows[0].Midterm2Points.Should().Be(20m);
    }

    [Fact]
    public async Task PutDraft_WrongProfessor_Returns403()
    {
        // ProfSmith teaches Math — ProfJohnson teaches Software Engineering.
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorSmith);

        var response = await client.PutAsJsonAsync(
            $"/api/GradeDraft/{JohnsonSoftEngJessica}",
            new SaveGradeDraftDto { Midterm1Points = 10m });

        ((int)response.StatusCode).Should().Be(403,
            "PRD §5.3 — a professor can only touch drafts for subjects they teach");
    }

    [Fact]
    public async Task PutDraft_AsStudent_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);

        var response = await client.PutAsJsonAsync($"/api/GradeDraft/{WilsonAlgoLiamEnrollment}",
            new SaveGradeDraftDto { Midterm1Points = 10m });

        ((int)response.StatusCode).Should().Be(403);
    }
}
