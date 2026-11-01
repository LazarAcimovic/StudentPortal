using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class ProfessorDashboardServiceTests
{
    private readonly IEnrollmentRepository _enrollRepo = Substitute.For<IEnrollmentRepository>();
    private readonly IAppealRepository _appealRepo = Substitute.For<IAppealRepository>();
    private readonly IGradeRepository _gradeRepo = Substitute.For<IGradeRepository>();
    private readonly ISubjectRepository _subjectRepo = Substitute.For<ISubjectRepository>();

    private ProfessorDashboardService CreateSut() => new(_enrollRepo, _appealRepo, _gradeRepo, _subjectRepo, TimeProvider.System);

    private static Subject MakeSubject(string name = "Databases", int ects = 6) => new()
    {
        Id = Guid.NewGuid(), SubjectName = name, ECTS = ects, ProfessorId = Guid.NewGuid(),
    };

    private static User MakeStudent(string first = "Ann", string last = "Smith") => new()
    {
        Id = Guid.NewGuid(), FirstName = first, LastName = last,
        IndexNumber = "2026/0001", UserRole = RoleEnum.Student,
    };

    private static Enrollment MakeEnrollment(Subject subject, User student,
        Grade grade = null, GradeDraft draft = null)
    {
        return new Enrollment
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id, Student = student,
            SubjectId = subject.Id, Subject = subject,
            Grade = grade, GradeDraft = draft,
        };
    }

    // The dashboard exposes per-subject tiles (name, ECTS, StudentCount) and the
    // appeal / assigned-case rows. Per-student rows and their GradeState moved to
    // ProfessorStudentsService — see ProfessorStudentsServiceTests.

    [Fact]
    public async Task GetDashboardAsync_IncludesSubjectWithNoEnrollments()
    {
        // Regression: a freshly created subject with no enrolled students must still
        // appear on its professor's dashboard (previously it was grouped out).
        var profId = Guid.NewGuid();
        var subject = MakeSubject("Programiranje 3");
        _subjectRepo.GetSubjectsByProfessorIdAsync(profId).Returns(new List<Subject> { subject });
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment>());
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId, Arg.Any<DateTime>()).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Single(dto.Subjects);
        Assert.Equal("Programiranje 3", dto.Subjects[0].SubjectName);
        Assert.Equal(0, dto.Subjects[0].StudentCount);
    }

    [Fact]
    public async Task GetDashboardAsync_GroupsEnrollmentsBySubjectAndSortsByName()
    {
        var profId = Guid.NewGuid();
        var subjA = MakeSubject("AI");
        var subjB = MakeSubject("Databases");
        var student1 = MakeStudent("Ann", "A");
        var student2 = MakeStudent("Bob", "B");
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment>
        {
            MakeEnrollment(subjB, student1),
            MakeEnrollment(subjA, student2),
            MakeEnrollment(subjB, student2),
        });
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId, Arg.Any<DateTime>()).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal(2, dto.Subjects.Count);
        Assert.Equal("AI", dto.Subjects[0].SubjectName);         // alphabetical
        Assert.Equal("Databases", dto.Subjects[1].SubjectName);
        Assert.Equal(1, dto.Subjects[0].StudentCount);
        Assert.Equal(2, dto.Subjects[1].StudentCount);
    }

    [Fact]
    public async Task GetDashboardAsync_AppealRow_PendingWithinWindowReportsPending()
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var student = MakeStudent();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-3),
            Enrollment = MakeEnrollment(subject, student),
            Appeals = new List<Appeal>(),
        };
        grade.Enrollment.Grade = grade;
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-2),
            Grade = grade,
            Text = "please re-check",
        };
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment>());
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId, Arg.Any<DateTime>()).Returns(new List<Appeal> { appeal });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Single(dto.Appeals);
        Assert.Equal("Pending", dto.Appeals[0].Status);
        Assert.False(dto.Appeals[0].CanUndoDeny);
    }

    [Fact]
    public async Task GetDashboardAsync_AppealRow_PendingPastSevenDaysReportsOverdue()
    {
        // PRD Â§4.5: overdue is projected on read.
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var student = MakeStudent();
        var enrollment = MakeEnrollment(subject, student);
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-10),
            Enrollment = enrollment,
            Appeals = new List<Appeal>(),
        };
        enrollment.Grade = grade;
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-8),
            Grade = grade,
            Text = "...",
        };
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment>());
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId, Arg.Any<DateTime>()).Returns(new List<Appeal> { appeal });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("Overdue", dto.Appeals[0].Status);
    }

    [Fact]
    public async Task GetDashboardAsync_AppealRow_DeniedInsideUndoWindow_ReportsCanUndoDeny()
    {
        // PRD Â§4.4: 24h undo window after deny.
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var student = MakeStudent();
        var enrollment = MakeEnrollment(subject, student);
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-3),
            Enrollment = enrollment,
            Appeals = new List<Appeal>(),
        };
        enrollment.Grade = grade;
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Denied,
            SubmittedAt = DateTime.UtcNow.AddDays(-2),
            ReviewedAt = DateTime.UtcNow.AddHours(-1),
            Grade = grade,
            Text = "...",
        };
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment>());
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId, Arg.Any<DateTime>()).Returns(new List<Appeal> { appeal });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("Denied", dto.Appeals[0].Status);
        Assert.True(dto.Appeals[0].CanUndoDeny);
        Assert.NotNull(dto.Appeals[0].UndoDenyDeadline);
    }

    [Fact]
    public async Task GetDashboardAsync_AppealRow_DeniedPastUndoWindow_CanUndoDenyIsFalse()
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var student = MakeStudent();
        var enrollment = MakeEnrollment(subject, student);
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-5),
            Enrollment = enrollment,
            Appeals = new List<Appeal>(),
        };
        enrollment.Grade = grade;
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Denied,
            SubmittedAt = DateTime.UtcNow.AddDays(-4),
            ReviewedAt = DateTime.UtcNow.AddHours(-25),
            Grade = grade,
            Text = "...",
        };
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment>());
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId, Arg.Any<DateTime>()).Returns(new List<Appeal> { appeal });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.False(dto.Appeals[0].CanUndoDeny);
        Assert.Null(dto.Appeals[0].UndoDenyDeadline);
    }
}
