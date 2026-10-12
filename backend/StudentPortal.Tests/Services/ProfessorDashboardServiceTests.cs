using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class ProfessorDashboardServiceTests
{
    private readonly IEnrollmentRepository _enrollRepo = Substitute.For<IEnrollmentRepository>();
    private readonly IAppealRepository _appealRepo = Substitute.For<IAppealRepository>();

    private ProfessorDashboardService CreateSut() => new(_enrollRepo, _appealRepo);

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
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal(2, dto.Subjects.Count);
        Assert.Equal("AI", dto.Subjects[0].SubjectName);         // alphabetical
        Assert.Equal("Databases", dto.Subjects[1].SubjectName);
        Assert.Single(dto.Subjects[0].Students);
        Assert.Equal(2, dto.Subjects[1].Students.Count);
    }

    [Fact]
    public async Task GetDashboardAsync_NotGraded_WhenNoGradeAndNoDraft()
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment>
        {
            MakeEnrollment(subject, MakeStudent()),
        });
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("NotGraded", dto.Subjects[0].Students[0].GradeState);
    }

    [Fact]
    public async Task GetDashboardAsync_Draft_WhenDraftExistsButNoGrade()
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var enrollment = MakeEnrollment(subject, MakeStudent(),
            draft: new GradeDraft { Id = Guid.NewGuid(), Midterm1Points = 10 });
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment> { enrollment });
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("Draft", dto.Subjects[0].Students[0].GradeState);
    }

    [Fact]
    public async Task GetDashboardAsync_ReconfirmNeeded_WhenAnAcceptedAppealIsOpen()
    {
        // PRD §4.3: after Accept, the professor must re-confirm the exam.
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7, ConfirmedAt = DateTime.UtcNow.AddDays(-5),
            Appeals = new List<Appeal>
            {
                new() { Status = AppealStatus.Accepted, SubmittedAt = DateTime.UtcNow.AddDays(-3) },
            },
        };
        var enrollment = MakeEnrollment(subject, MakeStudent(), grade);
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment> { enrollment });
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("ReconfirmNeeded", dto.Subjects[0].Students[0].GradeState);
    }

    [Fact]
    public async Task GetDashboardAsync_Finalized_WhenFinalizedAtSet()
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 8,
            ConfirmedAt = DateTime.UtcNow.AddDays(-10),
            FinalizedAt = DateTime.UtcNow.AddDays(-2),
            Appeals = new List<Appeal>(),
        };
        var enrollment = MakeEnrollment(subject, MakeStudent(), grade);
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment> { enrollment });
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("Finalized", dto.Subjects[0].Students[0].GradeState);
    }

    [Fact]
    public async Task GetDashboardAsync_Finalized_WhenInitialWindowLapsedWithoutAppeal()
    {
        // PRD §4.7 case 2: auto-finalize after 7 days of silence on the initial window.
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-10),      // > 7 days ago
            FinalizedAt = null,
            Appeals = new List<Appeal>(),
        };
        var enrollment = MakeEnrollment(subject, MakeStudent(), grade);
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment> { enrollment });
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("Finalized", dto.Subjects[0].Students[0].GradeState);
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
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal> { appeal });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Single(dto.Appeals);
        Assert.Equal("Pending", dto.Appeals[0].Status);
        Assert.False(dto.Appeals[0].CanUndoDeny);
    }

    [Fact]
    public async Task GetDashboardAsync_AppealRow_PendingPastSevenDaysReportsOverdue()
    {
        // PRD §4.5: overdue is projected on read.
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
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal> { appeal });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.Equal("Overdue", dto.Appeals[0].Status);
    }

    [Fact]
    public async Task GetDashboardAsync_AppealRow_DeniedInsideUndoWindow_ReportsCanUndoDeny()
    {
        // PRD §4.4: 24h undo window after deny.
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
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal> { appeal });

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
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal> { appeal });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.False(dto.Appeals[0].CanUndoDeny);
        Assert.Null(dto.Appeals[0].UndoDenyDeadline);
    }

    [Fact]
    public async Task GetDashboardAsync_StudentRow_FlagsActiveAppealWhenGradeHasPendingOrAcceptedAppeal()
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-2),
            Appeals = new List<Appeal>
            {
                new() { Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-1) },
            },
        };
        var enrollment = MakeEnrollment(subject, MakeStudent(), grade);
        _enrollRepo.GetEnrollmentsForProfessorDashboardAsync(profId).Returns(new List<Enrollment> { enrollment });
        _appealRepo.GetAppealsByProfessorIdForDashboardAsync(profId).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(profId);

        Assert.True(dto.Subjects[0].Students[0].HasActiveAppeal);
    }
}
