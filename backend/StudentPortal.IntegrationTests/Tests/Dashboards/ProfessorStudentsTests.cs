using StudentPortal.Dtos;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Dashboards;

public class ProfessorStudentsTests : IntegrationTestBase
{
    public ProfessorStudentsTests(IntegrationTestFixture fixture) : base(fixture) { }

    private static readonly SeedUser ProfLinAlg = SeedUsers.ProfessorSmith;
    private static readonly SeedUser OtherProf = SeedUsers.ProfessorDavis;
    private static readonly Guid LinearAlgebra = SeedIds.Subjects.LinearAlgebra;

    [Fact]
    public async Task SubjectStudents_PagedCorrectly_ReturnsExpectedCounts()
    {
        // Seed 4 extra students into LinearAlgebra so there are 6 total
        // (Jessica + Liam are already seeded; we add 4 more).
        await WithDbAsync(async db =>
        {
            for (var i = 0; i < 4; i++)
            {
                var studentId = Guid.NewGuid();
                db.Users.Add(new User
                {
                    Id = studentId,
                    FirstName = $"Extra{i}",
                    LastName = $"Stud{i:D2}",
                    Email = $"extra{i}@student.edu",
                    UserPassword = "AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==",
                    IndexNumber = $"EX-{i:D3}-2024",
                    UserRole = RoleEnum.Student,
                    IsDeleted = false,
                });
                db.Enrollments.Add(new Enrollment
                {
                    Id = Guid.NewGuid(),
                    StudentId = studentId,
                    SubjectId = LinearAlgebra,
                    IsDeleted = false,
                });
            }
            await db.SaveChangesAsync();
        });

        var client = await CreateAuthenticatedClientAsync(ProfLinAlg);

        var r1 = await client.GetAsync($"/api/Professor/subjects/{LinearAlgebra}/students?page=1&pageSize=5");
        r1.StatusCode.Should().Be(HttpStatusCode.OK);
        var p1 = await r1.Content.ReadFromJsonAsync<PagedResultDto<ProfessorStudentRowDto>>();
        p1!.TotalCount.Should().Be(6);
        p1.Items.Should().HaveCount(5);

        var r2 = await client.GetAsync($"/api/Professor/subjects/{LinearAlgebra}/students?page=2&pageSize=5");
        r2.StatusCode.Should().Be(HttpStatusCode.OK);
        var p2 = await r2.Content.ReadFromJsonAsync<PagedResultDto<ProfessorStudentRowDto>>();
        p2!.TotalCount.Should().Be(6);
        p2.Items.Should().HaveCount(1);

        p1.Items.Select(i => i.EnrollmentId).Should()
            .NotIntersectWith(p2.Items.Select(i => i.EnrollmentId));
    }

    [Fact]
    public async Task SubjectStudents_WrongProfessor_ReturnsForbidden()
    {
        var client = await CreateAuthenticatedClientAsync(OtherProf);

        var response = await client.GetAsync($"/api/Professor/subjects/{LinearAlgebra}/students");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SubjectStudents_NoEnrollments_ReturnsTotalCountZero()
    {
        var profId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();

        await WithDbAsync(async db =>
        {
            db.Users.Add(new User
            {
                Id = profId,
                FirstName = "Empty",
                LastName = "Prof",
                Email = "empty.prof@uni.edu",
                UserPassword = "AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==",
                UserRole = RoleEnum.Professor,
                IsDeleted = false,
            });
            db.Subjects.Add(new Subject
            {
                Id = subjectId,
                SubjectName = "Empty Subject",
                SubjectCode = "EMPTY-01",
                ECTS = 3,
                ProfessorId = profId,
                IsDeleted = false,
            });
            await db.SaveChangesAsync();
        });

        var client = await CreateAuthenticatedClientAsync("empty.prof@uni.edu");
        var response = await client.GetAsync($"/api/Professor/subjects/{subjectId}/students?page=1&pageSize=5");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<PagedResultDto<ProfessorStudentRowDto>>();
        dto!.TotalCount.Should().Be(0);
        dto.Items.Should().BeEmpty();
    }
}
