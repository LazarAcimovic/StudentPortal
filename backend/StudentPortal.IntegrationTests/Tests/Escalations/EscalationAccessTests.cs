using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Escalations;

/// <summary>
/// Checkbox 2: admin-only access (401/403), assign happy path, 422 ineligible, 400 double assign,
/// reassign before and after the deadline.
/// </summary>
public class EscalationAccessTests : IntegrationTestBase
{
    // Algorithms (CS-DS) → Wilson is original professor; Johnson teaches Data Structures (CS-DS) → eligible
    // Liam_Algorithms has no seeded grade, avoiding the IX_Grades_EnrollmentId unique constraint
    private static readonly Guid Enrollment = SeedIds.Enrollments.Liam_Algorithms;
    private static readonly SeedUser OriginalProf = SeedUsers.ProfessorWilson;
    private static readonly SeedUser EligibleProf = SeedUsers.ProfessorJohnson;
    private static readonly SeedUser OtherProf = SeedUsers.ProfessorSmith; // teaches MATH-*, not CS-DS
    private static readonly SeedUser Student = SeedUsers.StudentLiam;

    public EscalationAccessTests(IntegrationTestFixture fixture) : base(fixture) { }

    // ─── Helpers ──────────────────────────────────────────────────────────

    /// <summary>Seeds a grade in Scenario A (AcceptedUnresolved): accepted appeal ReviewedAt 8 days ago.</summary>
    private async Task<Grade> SeedScenarioAGradeAsync()
    {
        var now = FakeTime.GetUtcNow().UtcDateTime;
        var grade = await SeedGradeConfirmedAtAsync(Enrollment, now.AddDays(-20));
        await SeedAppealAtAsync(grade.Id, now.AddDays(-12), AppealStatus.Accepted, now.AddDays(-8));
        return grade;
    }

    private async Task<EscalationAssignment> AssignEligibleProfAsync(Guid gradeId)
    {
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.PostAsJsonAsync("/api/Escalation/assign", new
        {
            gradeId,
            assignedProfessorId = EligibleProf.Id
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"assign should succeed: {await response.Content.ReadAsStringAsync()}");
        return await WithDbAsync(db =>
            db.EscalationAssignments.OrderByDescending(a => a.AssignedAt).FirstAsync());
    }

    // ─── Anonymous / non-admin access ─────────────────────────────────────

    [Fact]
    public async Task GetCases_Anonymous_Returns401()
    {
        var client = CreateAnonymousClient();
        var response = await client.GetAsync("/api/Escalation");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetCases_Professor_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(OriginalProf);
        var response = await client.GetAsync("/api/Escalation");
        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task GetCases_Student_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync(Student);
        var response = await client.GetAsync("/api/Escalation");
        ((int)response.StatusCode).Should().Be(403);
    }

    [Fact]
    public async Task Assign_Anonymous_Returns401()
    {
        var grade = await SeedScenarioAGradeAsync();
        var client = CreateAnonymousClient();
        var response = await client.PostAsJsonAsync("/api/Escalation/assign",
            new { gradeId = grade.Id, assignedProfessorId = EligibleProf.Id });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Assign_Professor_Returns403()
    {
        var grade = await SeedScenarioAGradeAsync();
        var client = await CreateAuthenticatedClientAsync(OriginalProf);
        var response = await client.PostAsJsonAsync("/api/Escalation/assign",
            new { gradeId = grade.Id, assignedProfessorId = EligibleProf.Id });
        ((int)response.StatusCode).Should().Be(403);
    }

    // ─── Assign happy path ────────────────────────────────────────────────

    [Fact]
    public async Task Assign_HappyPath_Returns200AndUpdatesGrade()
    {
        var grade = await SeedScenarioAGradeAsync();
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.PostAsJsonAsync("/api/Escalation/assign", new
        {
            gradeId = grade.Id,
            assignedProfessorId = EligibleProf.Id
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());

        var dbGrade = await WithDbAsync(db => db.Grades.FirstAsync(g => g.Id == grade.Id));
        dbGrade.AssignedProfessorId.Should().Be(EligibleProf.Id);

        var assignment = await WithDbAsync(db =>
            db.EscalationAssignments.Where(a => a.AssignedProfessorId == EligibleProf.Id).FirstOrDefaultAsync());
        assignment.Should().NotBeNull();
    }

    // ─── Assign — ineligible professor ────────────────────────────────────

    [Fact]
    public async Task Assign_IneligibleProfessor_Returns422()
    {
        var grade = await SeedScenarioAGradeAsync();
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        var response = await admin.PostAsJsonAsync("/api/Escalation/assign", new
        {
            gradeId = grade.Id,
            assignedProfessorId = OtherProf.Id // Davis teaches CS-302/CS-402/CS-403 — no MATH-CALC
        });

        ((int)response.StatusCode).Should().Be(422,
            "a professor who does not teach MATH-CALC is ineligible");
    }

    // ─── Assign — double assign (already open escalation) ─────────────────

    [Fact]
    public async Task Assign_DoubleAssign_Returns400()
    {
        var grade = await SeedScenarioAGradeAsync();
        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);

        // First assign — must succeed
        var first = await admin.PostAsJsonAsync("/api/Escalation/assign", new
        {
            gradeId = grade.Id,
            assignedProfessorId = EligibleProf.Id
        });
        first.StatusCode.Should().Be(HttpStatusCode.OK);

        // Second assign to the same grade — open escalation already exists
        var second = await admin.PostAsJsonAsync("/api/Escalation/assign", new
        {
            gradeId = grade.Id,
            assignedProfessorId = EligibleProf.Id
        });
        second.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "re-assigning while an open escalation exists must be rejected");
    }

    // ─── Reassign before and after the deadline ───────────────────────────

    [Fact]
    public async Task Reassign_BeforeDeadline_Returns400()
    {
        var grade = await SeedScenarioAGradeAsync();
        await AssignEligibleProfAsync(grade.Id);

        // Window hasn't expired — advance clock only 3 days
        FakeTime.Advance(TimeSpan.FromDays(3));

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.PostAsJsonAsync("/api/Escalation/reassign", new
        {
            gradeId = grade.Id,
            newProfessorId = EligibleProf.Id
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "reassignment is not due until the 7-day window has expired");
    }

    [Fact]
    public async Task Reassign_AfterDeadline_Returns200AndSupersedesOldAssignment()
    {
        var grade = await SeedScenarioAGradeAsync();
        var firstAssignment = await AssignEligibleProfAsync(grade.Id);

        // Advance past the 7-day assignment window
        FakeTime.Advance(TimeSpan.FromDays(7).Add(TimeSpan.FromSeconds(1)));

        // Need a second eligible professor for CS-DS (not Wilson=original, not Johnson=first assignee).
        // Seed a CS-DS subject for Smith so Smith becomes eligible.
        var smithId = SeedUsers.ProfessorSmith.Id;
        await WithDbAsync(async db =>
        {
            db.Subjects.Add(new Subject
            {
                Id = Guid.NewGuid(),
                SubjectName = "Algorithms II",
                SubjectCode = "CS-DS",
                ECTS = 4,
                ProfessorId = smithId,
                IsDeleted = false,
                CreatedAt = FakeTime.GetUtcNow().UtcDateTime
            });
            await db.SaveChangesAsync();
        });

        var admin = await CreateAuthenticatedClientAsync(SeedUsers.Admin);
        var response = await admin.PostAsJsonAsync("/api/Escalation/reassign", new
        {
            gradeId = grade.Id,
            newProfessorId = smithId
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());

        var superseded = await WithDbAsync(db =>
            db.EscalationAssignments.FirstAsync(a => a.Id == firstAssignment.Id));
        superseded.SupersededAt.Should().NotBeNull("the original assignment must be superseded after reassignment");
    }
}
