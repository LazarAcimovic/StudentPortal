using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class StudentDashboardServiceTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IEnrollmentRepository _enrollRepo = Substitute.For<IEnrollmentRepository>();

    private StudentDashboardService CreateSut() => new(_userRepo, _enrollRepo, TimeProvider.System);

    private static User MakeStudent() => new()
    {
        Id = Guid.NewGuid(), FirstName = "Stu", LastName = "Dent",
        Email = "s@example.com", IndexNumber = "2026/0001", UserRole = RoleEnum.Student,
    };

    private static Enrollment MakeEnrollment(User student, int ects, Grade grade = null) => new()
    {
        Id = Guid.NewGuid(),
        StudentId = student.Id, Student = student,
        SubjectId = Guid.NewGuid(),
        Subject = new Subject
        {
            Id = Guid.NewGuid(), SubjectName = "Databases", ECTS = ects,
            Professor = new User { FirstName = "Pro", LastName = "F" },
        },
        Grade = grade,
    };

    private static Grade MakeTrulyFinalGrade(int finalGrade) => new()
    {
        Id = Guid.NewGuid(), FinalGrade = finalGrade,
        ConfirmedAt = DateTime.UtcNow.AddDays(-30),
        FinalizedAt = DateTime.UtcNow.AddDays(-20),
        Appeals = new List<Appeal>(),
    };

    [Fact]
    public async Task GetDashboardAsync_UnknownStudent_ThrowsKeyNotFound()
    {
        _userRepo.GetUserByIdAsync(Arg.Any<Guid>()).Returns((User)null);
        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => sut.GetDashboardAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetDashboardAsync_NoEnrollments_ReturnsZeroStats()
    {
        var student = MakeStudent();
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment>());

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(student.Id);

        Assert.Empty(dto.Subjects);
        Assert.Equal(0, dto.Stats.PassedExams);
        Assert.Equal(0, dto.Stats.NonPassedExams);
        Assert.Equal(0, dto.Stats.EarnedEcts);
        Assert.Equal(0.0, dto.Stats.AverageGrade);
    }

    [Fact]
    public async Task GetDashboardAsync_AverageGrade_IsMeanOfPassedGradesOnlyToTwoDecimals()
    {
        // PRD §5.5: "Average Grade (two decimal place, mean of all confirmed-passed grades, failures excluded)."
        var student = MakeStudent();
        var passed7 = MakeEnrollment(student, 6, MakeTrulyFinalGrade(7));
        var passed9 = MakeEnrollment(student, 6, MakeTrulyFinalGrade(9));
        var failed5 = MakeEnrollment(student, 6, MakeTrulyFinalGrade(5));
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(
            new List<Enrollment> { passed7, passed9, failed5 });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(student.Id);

        Assert.Equal(2, dto.Stats.PassedExams);
        Assert.Equal(1, dto.Stats.NonPassedExams);
        Assert.Equal(8.0, dto.Stats.AverageGrade);  // (7+9)/2
    }

    [Fact]
    public async Task GetDashboardAsync_EarnedEcts_SumsEctsOfPassedTrulyFinalGradesOnly()
    {
        // PRD §4.7: "A grade contributes its subject's ECTS to Earned ECTS only when the grade is
        // truly final AND the final grade is ≥ 6."
        var student = MakeStudent();
        var passed6 = MakeEnrollment(student, 6, MakeTrulyFinalGrade(6));
        var passed8 = MakeEnrollment(student, 8, MakeTrulyFinalGrade(8));
        var failed5 = MakeEnrollment(student, 6, MakeTrulyFinalGrade(5));
        var notGraded = MakeEnrollment(student, 7);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(
            new List<Enrollment> { passed6, passed8, failed5, notGraded });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(student.Id);

        Assert.Equal(14, dto.Stats.EarnedEcts);  // 6 + 8 only
        Assert.Equal(2, dto.Stats.NonPassedExams); // PRD §5.5: failures + ungraded enrollments
    }

    [Fact]
    public async Task GetDashboardAsync_UngradedEnrollment_HasStatusNotGraded()
    {
        var student = MakeStudent();
        var enrollment = MakeEnrollment(student, 6);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment> { enrollment });

        var sut = CreateSut();

        var dto = await sut.GetDashboardAsync(student.Id);

        Assert.Equal("Not graded", dto.Subjects[0].Status);
        Assert.Null(dto.Subjects[0].FinalGrade);
    }

    [Fact]
    public async Task GetDashboardAsync_FreshGradeInsideWindow_ShowsAwaitingConfirmationWithBothActions()
    {
        // PRD §4.1: inside the fresh 7-day window the student sees Write appeal + Confirm grade.
        var student = MakeStudent();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-2),
            FinalizedAt = null,
            Appeals = new List<Appeal>(),
        };
        var enrollment = MakeEnrollment(student, 6, grade);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment> { enrollment });

        var sut = CreateSut();

        var row = (await sut.GetDashboardAsync(student.Id)).Subjects[0];

        Assert.Equal("Awaiting confirmation", row.Status);
        Assert.True(row.CanWriteAppeal);
        Assert.True(row.CanConfirmGrade);
        Assert.NotNull(row.ConfirmationDeadline);
    }

    [Fact]
    public async Task GetDashboardAsync_PendingAppeal_ShowsAppealPendingAndNoActions()
    {
        // PRD §4.1: once a pending appeal exists, buttons disappear.
        var student = MakeStudent();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-2),
            FinalizedAt = null,
            Appeals = new List<Appeal>
            {
                new() { Id = Guid.NewGuid(), Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-1) },
            },
        };
        var enrollment = MakeEnrollment(student, 6, grade);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment> { enrollment });

        var sut = CreateSut();

        var row = (await sut.GetDashboardAsync(student.Id)).Subjects[0];

        Assert.Equal("Appeal pending", row.Status);
        Assert.False(row.CanWriteAppeal);
        Assert.False(row.CanConfirmGrade);
        Assert.NotNull(row.PendingAppealId);
    }

    [Fact]
    public async Task GetDashboardAsync_PostOverdueWithinFreshWindow_AllowsWriteAppealButNotConfirm()
    {
        // PRD §4.5 / §4.6: after overdue, a brand-new 7-day window opens; student can submit one more appeal,
        // but Confirm grade does NOT apply to the post-overdue window.
        var student = MakeStudent();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-11),
            FinalizedAt = null,
            Appeals = new List<Appeal>
            {
                new() { Id = Guid.NewGuid(), Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-10) },
            },
        };
        var enrollment = MakeEnrollment(student, 6, grade);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment> { enrollment });

        var sut = CreateSut();

        var row = (await sut.GetDashboardAsync(student.Id)).Subjects[0];

        Assert.Equal("Awaiting confirmation", row.Status);
        Assert.True(row.CanWriteAppeal);
        Assert.False(row.CanConfirmGrade);
    }

    [Fact]
    public async Task GetDashboardAsync_TwoOverdueChain_ExhaustsAndOffersNoActions()
    {
        // PRD §4.5: at most 2 overdue appeals in the chain.
        var student = MakeStudent();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-30),
            FinalizedAt = null,
            Appeals = new List<Appeal>
            {
                new() { Id = Guid.NewGuid(), Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-28) },
                new() { Id = Guid.NewGuid(), Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-14) },
            },
        };
        var enrollment = MakeEnrollment(student, 6, grade);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment> { enrollment });

        var sut = CreateSut();

        var row = (await sut.GetDashboardAsync(student.Id)).Subjects[0];

        Assert.False(row.CanWriteAppeal);
        Assert.False(row.CanConfirmGrade);
    }

    [Fact]
    public async Task GetDashboardAsync_DeniedAppealOnTrulyFinalGrade_ShowsAppealDeniedBadge()
    {
        // PRD §4.4: "a red Appeal denied badge" alongside the final Passed/Failed label.
        var student = MakeStudent();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-5),
            FinalizedAt = DateTime.UtcNow.AddDays(-1),  // truly final
            Appeals = new List<Appeal>
            {
                new()
                {
                    Id = Guid.NewGuid(), Status = AppealStatus.Denied,
                    SubmittedAt = DateTime.UtcNow.AddDays(-3),
                    ReviewedAt = DateTime.UtcNow.AddDays(-1),
                },
            },
        };
        var enrollment = MakeEnrollment(student, 6, grade);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment> { enrollment });

        var sut = CreateSut();

        var row = (await sut.GetDashboardAsync(student.Id)).Subjects[0];

        Assert.Equal("Passed", row.Status);
        Assert.Equal("Appeal denied", row.AppealStatus);
    }

    [Fact]
    public async Task GetDashboardAsync_AutoFinalizedByInitialWindowLapse_StatusReflectsPassOrFail()
    {
        // PRD §4.7 case 2: "7 days pass with no student action on the initial window
        // (no pending appeal has ever been submitted)."
        var student = MakeStudent();
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 5,            // fail
            ConfirmedAt = DateTime.UtcNow.AddDays(-10),      // > 7 days ago, no appeals
            FinalizedAt = null,                              // never explicitly finalized
            Appeals = new List<Appeal>(),
        };
        var enrollment = MakeEnrollment(student, 6, grade);
        _userRepo.GetUserByIdAsync(student.Id).Returns(student);
        _enrollRepo.GetStudentEnrollmentsForDashboardAsync(student.Id).Returns(new List<Enrollment> { enrollment });

        var sut = CreateSut();

        var row = (await sut.GetDashboardAsync(student.Id)).Subjects[0];

        Assert.Equal("Failed", row.Status);
    }
}
