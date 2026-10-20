using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Appeals;

public class AppealSubmitTests : IntegrationTestBase
{
    public AppealSubmitTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly Guid Liam_LinearAlgebra = SeedIds.Enrollments.Liam_LinearAlgebra;
    private static readonly SeedUser Liam = SeedUsers.StudentLiam;

    private SubmitAppealDto Dto(Guid enrollmentId, string text = "Please re-evaluate my work.") =>
        new() { EnrollmentId = enrollmentId, Text = text };

    [Fact]
    public async Task Submit_InsideInitialWindow_Returns200AndCreatesPendingAppeal()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.PostAsJsonAsync("/api/Appeal", Dto(Liam_LinearAlgebra));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var count = await WithDbAsync(db => db.Appeals
            .CountAsync(a => a.GradeId == grade.Id && a.Status == AppealStatus.Pending));
        count.Should().Be(1);
    }

    [Fact]
    public async Task Submit_OutsideInitialWindow_Returns400()
    {
        // Grade confirmed 10 days ago → appeal window expired.
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-10));

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.PostAsJsonAsync("/api/Appeal", Dto(Liam_LinearAlgebra));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Submit_WhileOneIsPending_Returns400()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        await SeedAppealAtAsync(grade.Id, now.AddHours(-2), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.PostAsJsonAsync("/api/Appeal", Dto(Liam_LinearAlgebra));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Submit_PostOverdueFreshWindow_Succeeds()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-20));
        // First appeal submitted 10 days ago → went overdue 3 days ago → fresh window still open.
        await SeedAppealAtAsync(grade.Id, now.AddDays(-10), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.PostAsJsonAsync("/api/Appeal", Dto(Liam_LinearAlgebra));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Submit_PostOverdueWindowExpired_Returns400()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-30));
        // First appeal 20 days ago → went overdue 13 days ago → post-overdue window ended 6 days ago.
        await SeedAppealAtAsync(grade.Id, now.AddDays(-20), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(Liam);
        var response = await client.PostAsJsonAsync("/api/Appeal", Dto(Liam_LinearAlgebra));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Submit_WrongStudent_Returns403()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now);

        var client = await CreateAuthenticatedClientAsync(SeedUsers.StudentSarah);
        var response = await client.PostAsJsonAsync("/api/Appeal", Dto(Liam_LinearAlgebra));

        ((int)response.StatusCode).Should().Be(403);
    }
}
