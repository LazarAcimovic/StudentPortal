using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Dashboards;

public class ProfessorDashboardTests : IntegrationTestBase
{
    public ProfessorDashboardTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly SeedUser ProfLinAlg = SeedUsers.ProfessorSmith;
    private static readonly SeedUser ProfOperatingSys = SeedUsers.ProfessorDavis;
    private static readonly SeedUser ProfSoftEng = SeedUsers.ProfessorJohnson;
    private static readonly Guid Liam_LinearAlgebra = SeedIds.Enrollments.Liam_LinearAlgebra;

    [Fact]
    public async Task Dashboard_HasSubjectsAndAppealsStructures()
    {
        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var response = await client.GetAsync("/api/Professor/me/dashboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<ProfessorDashboardDto>();
        dto.Should().NotBeNull();
        dto!.Subjects.Should().NotBeEmpty();
        dto.Appeals.Should().NotBeNull();
    }

    [Fact]
    public async Task Dashboard_AppealsSection_ListsOnlyPendingAndOverdueForOwnedSubjects()
    {
        // Clear every seeded appeal first, then plant exactly one Pending for ProfLinAlg
        // and one Pending for a different professor — only the former should appear.
        var now = FakeTime.GetUtcNow().UtcDateTime;

        await WithDbAsync(async db =>
        {
            db.Appeals.RemoveRange(db.Appeals);
            db.Grades.RemoveRange(db.Grades);
            db.GradeDrafts.RemoveRange(db.GradeDrafts);
            await db.SaveChangesAsync();
        });

        var ownGrade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        var ownAppeal = await SeedAppealAtAsync(ownGrade.Id, now.AddHours(-1), AppealStatus.Pending);

        // Someone else's appeal — ProfSoftEng's enrollment
        var foreignGrade = await SeedGradeConfirmedAtAsync(SeedIds.Enrollments.Jessica_SoftwareEng, now.AddDays(-1));
        _ = await SeedAppealAtAsync(foreignGrade.Id, now.AddHours(-1), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.GetAsync("/api/Professor/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<ProfessorDashboardDto>();

        dto!.Appeals.Should().ContainSingle(a => a.AppealId == ownAppeal.Id);
        dto.Appeals.Select(a => a.AppealId).Should().NotContain(foreignGrade.Id);
    }

    [Fact]
    public async Task Dashboard_ProfessorWithZeroSubjects_ReturnsEmptyLists()
    {
        // Create a brand-new professor with no subjects.
        var profId = Guid.NewGuid();
        await WithDbAsync(async db =>
        {
            db.Users.Add(new User
            {
                Id = profId,
                FirstName = "Fresh",
                LastName = "Prof",
                Email = "fresh.prof@uni.edu",
                UserPassword = "AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==",
                UserRole = RoleEnum.Professor,
                IsDeleted = false,
            });
            await db.SaveChangesAsync();
        });

        var client = await CreateAuthenticatedClientAsync("fresh.prof@uni.edu");
        var response = await client.GetAsync("/api/Professor/me/dashboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<ProfessorDashboardDto>();
        dto!.Subjects.Should().BeEmpty();
        dto.Appeals.Should().BeEmpty();
    }

    [Fact]
    public async Task Dashboard_HasActiveAppealFlag_IsTrueForEnrollmentWithPendingAppeal()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;

        var grade = await SeedGradeConfirmedAtAsync(Liam_LinearAlgebra, now.AddDays(-1));
        await SeedAppealAtAsync(grade.Id, now.AddHours(-1), AppealStatus.Pending);

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);
        var response = await client.GetAsync("/api/Professor/me/dashboard");
        var dto = await response.Content.ReadFromJsonAsync<ProfessorDashboardDto>();

        var row = dto!.Subjects
            .SelectMany(s => s.Students)
            .Single(s => s.EnrollmentId == Liam_LinearAlgebra);
        row.HasActiveAppeal.Should().BeTrue();
        row.GradeState.Should().Be("Confirmed");
    }
}
