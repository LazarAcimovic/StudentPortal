using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Appeals;

public class AppealAcceptDenyTests : IntegrationTestBase
{
    public AppealAcceptDenyTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly Guid Liam_LinearAlgebra = SeedIds.Enrollments.Liam_LinearAlgebra;
    private static readonly SeedUser ProfLinAlg = SeedUsers.ProfessorSmith;

    private async Task<Appeal> SeedPendingAppealAgedAsync(TimeSpan age)
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        return await SeedAppealAtAsync(grade.Id, now.Subtract(age), AppealStatus.Pending);
    }

    // ─── Accept ──────────────────────────────────────────────────────────
    [Fact]
    public async Task Accept_InsideReviewWindow_Succeeds()
    {
        var appeal = await SeedPendingAppealAgedAsync(TimeSpan.FromDays(3));
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Accept_AtExactly7Days_Refused()
    {
        // SubmittedAt = NOW()-7d exactly → SubmittedAt+7d = NOW → NOT strictly less than NOW
        //   → still considered inside the window. Shift by one second to put it strictly past.
        var appeal = await SeedPendingAppealAgedAsync(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "PRD §4.5 — accept is refused once the appeal is overdue");
    }

    [Fact]
    public async Task Accept_OvertimeByOneSecond_Refused()
    {
        var appeal = await SeedPendingAppealAgedAsync(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Accept_WrongProfessor_Returns403()
    {
        var appeal = await SeedPendingAppealAgedAsync(TimeSpan.FromDays(1));
        var client = await CreateAuthenticatedClientAsync(SeedUsers.ProfessorDavis);

        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/accept", null);

        ((int)response.StatusCode).Should().Be(403);
    }

    // ─── Deny ────────────────────────────────────────────────────────────
    [Fact]
    public async Task Deny_InsideReviewWindow_SetsStatusAndFinalizedAt()
    {
        var appeal = await SeedPendingAppealAgedAsync(TimeSpan.FromDays(3));
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dbAppeal = await WithDbAsync(db => db.Appeals.FirstAsync(a => a.Id == appeal.Id));
        dbAppeal.Status.Should().Be(AppealStatus.Denied);
        dbAppeal.ReviewedAt.Should().NotBeNull();

        var grade = await WithDbAsync(db => db.Grades.FirstAsync(g => g.Id == appeal.GradeId));
        grade.FinalizedAt.Should().NotBeNull("deny finalizes the grade");
    }

    [Fact]
    public async Task Deny_OnOverdueAppeal_Refused()
    {
        var appeal = await SeedPendingAppealAgedAsync(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ─── Undo ────────────────────────────────────────────────────────────
    [Fact]
    public async Task UndoDeny_Within24h_FlipsBackToPending()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        var appeal = await SeedDeniedAppealAtAsync(
            grade.Id,
            submittedAt: now.AddDays(-2),
            reviewedAt: now.AddHours(-23).AddMinutes(-59));

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/undo-deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dbAppeal = await WithDbAsync(db => db.Appeals.FirstAsync(a => a.Id == appeal.Id));
        dbAppeal.Status.Should().Be(AppealStatus.Pending);
        dbAppeal.ReviewedAt.Should().BeNull();

        var dbGrade = await WithDbAsync(db => db.Grades.FirstAsync(g => g.Id == grade.Id));
        dbGrade.FinalizedAt.Should().BeNull("undoing a deny reverts FinalizedAt to NULL");
    }

    [Fact]
    public async Task UndoDeny_Exactly24h_Refused()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        var appeal = await SeedDeniedAppealAtAsync(
            grade.Id,
            submittedAt: now.AddDays(-2),
            reviewedAt: now.AddHours(-24));

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/undo-deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "PRD §4.4 — the 24h undo window is strictly less-than");
    }

    [Fact]
    public async Task UndoDeny_Past24h_Refused()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-2));
        var appeal = await SeedDeniedAppealAtAsync(
            grade.Id,
            submittedAt: now.AddDays(-3),
            reviewedAt: now.AddDays(-2));

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/undo-deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UndoDeny_UndoPastDay7_AppealImmediatelyReadsOverdue()
    {
        // PRD §4.4: deny day 3, undo day 8 (past 24h from reviewedAt but inside) →
        // when undone, SubmittedAt is still 8+ days ago, so the appeal reads Overdue
        // on the next GET — the review clock is NOT reset.
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-10));
        // Submitted 8 days ago, denied 7 days ago (deny on day 3 after submission), undo now (day 8)
        var appeal = await SeedDeniedAppealAtAsync(
            grade.Id,
            submittedAt: now.AddDays(-8),
            reviewedAt: now.AddHours(-23));   // deny reviewed <24h ago so undo is allowed

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/undo-deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Now re-reading as professor should show the appeal with Overdue (computed on read).
        var getResp = await client.GetAsync($"/api/Appeal/by-grade/{grade.Id}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await getResp.Content.ReadAsStringAsync();
        body.Should().Contain("Overdue",
            "undo past day 7 leaves the appeal immediately Overdue because the review clock is not reset");
    }

    [Fact]
    public async Task UndoDeny_NonDenied_Returns400()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        var appeal = await SeedAppealAtAsync(grade.Id, now.AddHours(-1), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.PostAsync($"/api/Appeal/{appeal.Id}/undo-deny", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
