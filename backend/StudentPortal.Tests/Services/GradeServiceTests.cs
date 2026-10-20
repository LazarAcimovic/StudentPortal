using StudentPortal.Exceptions;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class GradeServiceTests
{
    private readonly IGradeRepository _gradeRepo = Substitute.For<IGradeRepository>();
    private readonly IGradeDraftRepository _draftRepo = Substitute.For<IGradeDraftRepository>();
    private readonly IEnrollmentRepository _enrollmentRepo = Substitute.For<IEnrollmentRepository>();

    private GradeService CreateSut() => new(_gradeRepo, _draftRepo, _enrollmentRepo, TimeProvider.System);

    private static Enrollment MakeEnrollment(Guid enrollmentId, Guid professorId, Guid? studentId = null)
    {
        return new Enrollment
        {
            Id = enrollmentId,
            StudentId = studentId ?? Guid.NewGuid(),
            SubjectId = Guid.NewGuid(),
            Subject = new Subject { Id = Guid.NewGuid(), ProfessorId = professorId, SubjectName = "Databases" },
            Student = new User { Id = studentId ?? Guid.NewGuid(), FirstName = "Mika", LastName = "Mikic" },
        };
    }

    private static Grade MakeConfirmedGrade(Guid enrollmentId, Enrollment enrollment = null, params Appeal[] appeals)
    {
        return new Grade
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollmentId,
            Midterm1Points = 20m,
            Midterm2Points = 20m,
            AttendancePoints = 3m,
            PracticalPoints = 3m,
            ExamPoints = 10m,
            FinalGrade = 6,
            ConfirmedAt = DateTime.UtcNow.AddDays(-1),
            Enrollment = enrollment,
            Appeals = appeals.ToList(),
        };
    }

    // ---------- ConfirmGradeAsync: final-grade mapping (PRD §3.2) ----------

    [Theory]
    [InlineData(0, 0, 0, 0, 0, 5)]       // sum 0 → 5
    [InlineData(10, 10, 5, 5, 20, 5)]    // sum 50 → 5
    [InlineData(10, 15, 5, 5, 16, 6)]    // sum 51 → 6
    [InlineData(15, 15, 5, 5, 20, 6)]    // sum 60 → 6
    [InlineData(15, 15, 5, 5, 21, 7)]    // sum 61 → 7
    [InlineData(20, 20, 5, 5, 20, 7)]    // sum 70 → 7
    [InlineData(20, 20, 5, 5, 21, 8)]    // sum 71 → 8
    [InlineData(25, 25, 5, 5, 20, 8)]    // sum 80 → 8
    [InlineData(25, 25, 5, 5, 21, 9)]    // sum 81 → 9
    [InlineData(30, 30, 5, 5, 20, 9)]    // sum 90 → 9
    [InlineData(30, 30, 5, 5, 21, 10)]   // sum 91 → 10
    [InlineData(30, 30, 5, 5, 30, 10)]   // sum 100 → 10
    public async Task ConfirmGradeAsync_MapsPointsSumToPrdFinalGradeScale(
        int m1, int m2, int att, int prac, int exam, int expectedFinal)
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(
            (Grade)null,
            // second call (after AddGradeAsync) returns the saved grade for the DTO mapping
            new Grade
            {
                Id = Guid.NewGuid(),
                EnrollmentId = enrollment.Id,
                Midterm1Points = m1, Midterm2Points = m2, AttendancePoints = att,
                PracticalPoints = prac, ExamPoints = exam, FinalGrade = expectedFinal,
                ConfirmedAt = DateTime.UtcNow,
                Enrollment = enrollment,
            });

        var sut = CreateSut();

        var dto = await sut.ConfirmGradeAsync(enrollment.Id, profId, m1, m2, att, prac, exam);

        Assert.Equal(expectedFinal, dto.FinalGrade);
        await _gradeRepo.Received(1).AddGradeAsync(Arg.Is<Grade>(g => g.FinalGrade == expectedFinal));
    }

    [Fact]
    public async Task ConfirmGradeAsync_GradeAlreadyExists_ThrowsAndDoesNotInsert()
    {
        // PRD §3.3: "After confirmation, all 5 fields are read-only (unless an appeal is accepted — see §4.3)."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(MakeConfirmedGrade(enrollment.Id, enrollment));

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.ConfirmGradeAsync(enrollment.Id, profId, 20, 20, 5, 5, 20));
        await _gradeRepo.DidNotReceiveWithAnyArgs().AddGradeAsync(default);
    }

    [Fact]
    public async Task ConfirmGradeAsync_StrangerProfessor_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.ConfirmGradeAsync(enrollment.Id, strangerProfId, 20, 20, 5, 5, 20));
        await _gradeRepo.DidNotReceiveWithAnyArgs().AddGradeAsync(default);
    }

    [Fact]
    public async Task ConfirmGradeAsync_EnrollmentNotFound_ThrowsKeyNotFound()
    {
        _enrollmentRepo.GetEnrollmentByIdAsync(Arg.Any<Guid>()).Returns((Enrollment)null);
        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            sut.ConfirmGradeAsync(Guid.NewGuid(), Guid.NewGuid(), 10, 10, 1, 1, 1));
    }

    [Fact]
    public async Task ConfirmGradeAsync_SuccessfulConfirm_DeletesExistingDraft()
    {
        // PRD §3.3: "Clicking Confirm writes the Grade, computes and stores the final grade,
        // DELETES the draft, and starts the student-facing 7-day window."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var draft = new GradeDraft { Id = Guid.NewGuid(), EnrollmentId = enrollment.Id };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(
            (Grade)null,
            MakeConfirmedGrade(enrollment.Id, enrollment));
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(draft);

        var sut = CreateSut();

        await sut.ConfirmGradeAsync(enrollment.Id, profId, 20, 20, 5, 5, 20);

        await _draftRepo.Received(1).DeleteAsync(draft);
    }

    [Fact]
    public async Task ConfirmGradeAsync_NoDraftToDelete_DoesNotCallDeleteAndStillSavesGrade()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(
            (Grade)null,
            MakeConfirmedGrade(enrollment.Id, enrollment));
        _draftRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((GradeDraft)null);

        var sut = CreateSut();

        await sut.ConfirmGradeAsync(enrollment.Id, profId, 20, 20, 5, 5, 20);

        await _draftRepo.DidNotReceiveWithAnyArgs().DeleteAsync(default);
        await _gradeRepo.Received(1).AddGradeAsync(Arg.Any<Grade>());
    }

    [Fact]
    public async Task ConfirmGradeAsync_StampsConfirmedAtWithCurrentUtc()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((Grade)null, MakeConfirmedGrade(enrollment.Id, enrollment));

        var sut = CreateSut();

        var before = DateTime.UtcNow;
        await sut.ConfirmGradeAsync(enrollment.Id, profId, 20, 20, 5, 5, 20);
        var after = DateTime.UtcNow;

        await _gradeRepo.Received(1).AddGradeAsync(Arg.Is<Grade>(g =>
            g.ConfirmedAt >= before && g.ConfirmedAt <= after));
    }

    // ---------- ReconfirmExamAsync (PRD §4.3) ----------

    [Fact]
    public async Task ReconfirmExamAsync_WithAcceptedAppeal_RecomputesFinalAndFinalizes()
    {
        // PRD §4.3: "Professor enters a new exam value → the final grade recomputes live → clicks Confirm again.
        // The new grade is now truly final immediately (no new 7-day window)."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeConfirmedGrade(enrollment.Id, enrollment,
            new Appeal { Id = Guid.NewGuid(), Status = AppealStatus.Accepted, SubmittedAt = DateTime.UtcNow.AddDays(-3) });
        // existing: m1=20 m2=20 att=3 prac=3 exam=10 → 56 → 6
        // reconfirm exam=28 → sum 74 → 8
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade, grade);

        var sut = CreateSut();

        var dto = await sut.ReconfirmExamAsync(enrollment.Id, profId, 28m);

        Assert.Equal(28m, grade.ExamPoints);
        Assert.Equal(8, grade.FinalGrade);
        Assert.NotNull(grade.FinalizedAt);
        await _gradeRepo.Received(1).UpdateGradeAsync(grade);
    }

    [Fact]
    public async Task ReconfirmExamAsync_NoGrade_ThrowsKeyNotFound()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((Grade)null);

        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            sut.ReconfirmExamAsync(enrollment.Id, profId, 20m));
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    [Fact]
    public async Task ReconfirmExamAsync_NoAcceptedAppeal_ThrowsInvalidOperation()
    {
        // PRD §4.3 (implicit): reconfirm is only possible after Accept.
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeConfirmedGrade(enrollment.Id, enrollment,
            new Appeal { Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow });
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.ReconfirmExamAsync(enrollment.Id, profId, 20m));
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    [Fact]
    public async Task ReconfirmExamAsync_StrangerProfessor_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.ReconfirmExamAsync(enrollment.Id, strangerProfId, 20m));
    }

    // ---------- StudentConfirmAsync (PRD §4.7 truly-final case 1) ----------

    [Fact]
    public async Task StudentConfirmAsync_HappyPath_FinalizesGrade()
    {
        // PRD §4.7: "A grade becomes truly final… 1. The student clicks Confirm grade."
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), Guid.NewGuid(), studentId);
        var grade = MakeConfirmedGrade(enrollment.Id, enrollment);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade, grade);

        var sut = CreateSut();

        var before = DateTime.UtcNow;
        await sut.StudentConfirmAsync(enrollment.Id, studentId);
        var after = DateTime.UtcNow;

        Assert.NotNull(grade.StudentConfirmedAt);
        Assert.NotNull(grade.FinalizedAt);
        Assert.InRange(grade.StudentConfirmedAt!.Value, before, after);
        Assert.InRange(grade.FinalizedAt!.Value, before, after);
        await _gradeRepo.Received(1).UpdateGradeAsync(grade);
    }

    [Fact]
    public async Task StudentConfirmAsync_StrangerStudent_ThrowsForbidden()
    {
        // PRD §6: "student can only touch their own enrollments, grades, and appeals."
        var ownerStudentId = Guid.NewGuid();
        var strangerStudentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), Guid.NewGuid(), ownerStudentId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.StudentConfirmAsync(enrollment.Id, strangerStudentId));
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    [Fact]
    public async Task StudentConfirmAsync_EnrollmentNotFound_ThrowsKeyNotFound()
    {
        var studentId = Guid.NewGuid();
        _enrollmentRepo.GetEnrollmentByIdAsync(Arg.Any<Guid>()).Returns((Enrollment)null);

        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            sut.StudentConfirmAsync(Guid.NewGuid(), studentId));
    }

    [Fact]
    public async Task StudentConfirmAsync_NoGrade_ThrowsInvalidOperation()
    {
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), Guid.NewGuid(), studentId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((Grade)null);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.StudentConfirmAsync(enrollment.Id, studentId));
    }

    [Fact]
    public async Task StudentConfirmAsync_AlreadyFinalized_ThrowsInvalidOperation()
    {
        // PRD §4.1: once truly final, action buttons disappear — a repeat must not re-finalize.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), Guid.NewGuid(), studentId);
        var grade = MakeConfirmedGrade(enrollment.Id, enrollment);
        grade.FinalizedAt = DateTime.UtcNow.AddHours(-1);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.StudentConfirmAsync(enrollment.Id, studentId));
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    [Fact]
    public async Task StudentConfirmAsync_PendingAppealExists_ThrowsInvalidOperation()
    {
        // PRD §4.1: "Once the student submits an appeal, both buttons disappear and the 7-day action window
        // no longer applies." Confirming must be blocked while a Pending appeal holds the grade open.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), Guid.NewGuid(), studentId);
        var grade = MakeConfirmedGrade(enrollment.Id, enrollment,
            new Appeal { Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow });
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.StudentConfirmAsync(enrollment.Id, studentId));
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    // ---------- GetByEnrollmentAsync ----------

    [Fact]
    public async Task GetByEnrollmentAsync_StrangerProfessor_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.GetByEnrollmentAsync(enrollment.Id, strangerProfId));
    }

    [Fact]
    public async Task GetByEnrollmentAsync_NoGrade_ReturnsNull()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((Grade)null);

        var sut = CreateSut();

        var result = await sut.GetByEnrollmentAsync(enrollment.Id, profId);

        Assert.Null(result);
    }
}
