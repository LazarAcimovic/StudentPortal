using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

// Per-student rows (GradeState, HasActiveAppeal) are produced here, not by the
// professor dashboard — the dashboard only exposes a StudentCount per subject.
public class ProfessorStudentsServiceTests
{
    private readonly ISubjectRepository _subjectRepo = Substitute.For<ISubjectRepository>();
    private readonly IEnrollmentRepository _enrollRepo = Substitute.For<IEnrollmentRepository>();

    private ProfessorStudentsService CreateSut() => new(_subjectRepo, _enrollRepo, TimeProvider.System);

    private static Subject MakeSubject(Guid professorId, string name = "Databases") => new()
    {
        Id = Guid.NewGuid(), SubjectName = name, ECTS = 6, ProfessorId = professorId,
    };

    private static User MakeStudent(string first = "Ann", string last = "Smith") => new()
    {
        Id = Guid.NewGuid(), FirstName = first, LastName = last,
        IndexNumber = "2026/0001", UserRole = RoleEnum.Student,
    };

    private static Enrollment MakeEnrollment(Subject subject, User student,
        Grade grade = null, GradeDraft draft = null) => new()
    {
        Id = Guid.NewGuid(),
        StudentId = student.Id, Student = student,
        SubjectId = subject.Id, Subject = subject,
        Grade = grade, GradeDraft = draft,
    };

    // Arranges one enrolled student on a subject the professor owns and returns the row.
    private async Task<ProfessorStudentRowDto> FirstRowAsync(Grade grade = null, GradeDraft draft = null)
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject(profId);
        var enrollment = MakeEnrollment(subject, MakeStudent(), grade, draft);

        _subjectRepo.GetSubjectByIdAsync(subject.Id).Returns(subject);
        _enrollRepo.GetPagedStudentsForSubjectAsync(subject.Id, Arg.Any<int>(), Arg.Any<int>())
            .Returns(((IReadOnlyList<Enrollment>)new List<Enrollment> { enrollment }, 1));

        var result = await CreateSut().GetPagedStudentsAsync(subject.Id, profId, 1, 15);
        return result.Items[0];
    }

    [Fact]
    public async Task GradeState_NotGraded_WhenNoGradeAndNoDraft()
    {
        var row = await FirstRowAsync();
        Assert.Equal("NotGraded", row.GradeState);
    }

    [Fact]
    public async Task GradeState_Draft_WhenDraftExistsButNoGrade()
    {
        var row = await FirstRowAsync(draft: new GradeDraft { Id = Guid.NewGuid(), Midterm1Points = 10 });
        Assert.Equal("Draft", row.GradeState);
    }

    [Fact]
    public async Task GradeState_Confirmed_WhenGradeConfirmedWithinWindowAndNoAppeal()
    {
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-2),   // within the 7-day window
            FinalizedAt = null,
            Appeals = new List<Appeal>(),
        };
        var row = await FirstRowAsync(grade);
        Assert.Equal("Confirmed", row.GradeState);
    }

    [Fact]
    public async Task GradeState_ReconfirmNeeded_WhenAnAcceptedAppealIsOpen()
    {
        // PRD Â§4.3: after Accept, the professor must re-confirm the exam.
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7, ConfirmedAt = DateTime.UtcNow.AddDays(-5),
            Appeals = new List<Appeal>
            {
                new() { Status = AppealStatus.Accepted, SubmittedAt = DateTime.UtcNow.AddDays(-3) },
            },
        };
        var row = await FirstRowAsync(grade);
        Assert.Equal("ReconfirmNeeded", row.GradeState);
    }

    [Fact]
    public async Task GradeState_Finalized_WhenFinalizedAtSet()
    {
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 8,
            ConfirmedAt = DateTime.UtcNow.AddDays(-10),
            FinalizedAt = DateTime.UtcNow.AddDays(-2),
            Appeals = new List<Appeal>(),
        };
        var row = await FirstRowAsync(grade);
        Assert.Equal("Finalized", row.GradeState);
    }

    [Fact]
    public async Task GradeState_Finalized_WhenInitialWindowLapsedWithoutAppeal()
    {
        // PRD Â§4.7 case 2: auto-finalize after 7 days of silence on the initial window.
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-10),   // > 7 days ago
            FinalizedAt = null,
            Appeals = new List<Appeal>(),
        };
        var row = await FirstRowAsync(grade);
        Assert.Equal("Finalized", row.GradeState);
    }

    [Fact]
    public async Task HasActiveAppeal_True_WhenGradeHasPendingAppeal()
    {
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-2),
            Appeals = new List<Appeal>
            {
                new() { Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-1) },
            },
        };
        var row = await FirstRowAsync(grade);
        Assert.True(row.HasActiveAppeal);
    }

    [Fact]
    public async Task HasActiveAppeal_False_WhenNoAppeal()
    {
        var grade = new Grade
        {
            Id = Guid.NewGuid(), FinalGrade = 7,
            ConfirmedAt = DateTime.UtcNow.AddDays(-2),
            Appeals = new List<Appeal>(),
        };
        var row = await FirstRowAsync(grade);
        Assert.False(row.HasActiveAppeal);
    }

    [Fact]
    public async Task GetPagedStudentsAsync_Throws_WhenSubjectNotOwnedByProfessor()
    {
        var subject = MakeSubject(Guid.NewGuid());   // owned by someone else
        _subjectRepo.GetSubjectByIdAsync(subject.Id).Returns(subject);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            CreateSut().GetPagedStudentsAsync(subject.Id, Guid.NewGuid(), 1, 15));
    }

    [Fact]
    public async Task GetPagedStudentsAsync_Throws_WhenSubjectIsDeleted()
    {
        var profId = Guid.NewGuid();
        var subject = MakeSubject(profId);
        subject.IsDeleted = true;
        _subjectRepo.GetSubjectByIdAsync(subject.Id).Returns(subject);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            CreateSut().GetPagedStudentsAsync(subject.Id, profId, 1, 15));
    }
}
