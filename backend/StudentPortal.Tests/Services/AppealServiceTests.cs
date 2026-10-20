using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class AppealServiceTests
{
    private readonly IAppealRepository _appealRepo = Substitute.For<IAppealRepository>();
    private readonly IGradeRepository _gradeRepo = Substitute.For<IGradeRepository>();
    private readonly IEnrollmentRepository _enrollmentRepo = Substitute.For<IEnrollmentRepository>();

    private AppealService CreateSut() => new(_appealRepo, _gradeRepo, _enrollmentRepo, TimeProvider.System);

    private static Enrollment MakeEnrollment(Guid studentId, Guid professorId)
    {
        return new Enrollment
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            SubjectId = Guid.NewGuid(),
            Subject = new Subject { Id = Guid.NewGuid(), ProfessorId = professorId, SubjectName = "AI" },
            Student = new User { Id = studentId, FirstName = "Petar", LastName = "Petrovic" },
        };
    }

    private static Grade MakeGrade(Guid enrollmentId, Enrollment enrollment, DateTime confirmedAt, bool finalized = false)
    {
        return new Grade
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollmentId,
            ConfirmedAt = confirmedAt,
            FinalizedAt = finalized ? DateTime.UtcNow.AddHours(-1) : (DateTime?)null,
            Enrollment = enrollment,
            Appeals = new List<Appeal>(),
        };
    }

    // ---------- SubmitAsync ----------

    [Fact]
    public async Task SubmitAsync_HappyPath_FreshWindow_CreatesPendingAppeal()
    {
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);
        _appealRepo.GetByGradeIdAsync(grade.Id).Returns(new List<Appeal>());

        var sut = CreateSut();

        var dto = await sut.SubmitAsync(studentId,
            new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "Please re-check my exam." });

        await _appealRepo.Received(1).AddAsync(Arg.Is<Appeal>(a =>
            a.GradeId == grade.Id &&
            a.Text == "Please re-check my exam." &&
            a.Status == AppealStatus.Pending));
        Assert.Equal(AppealStatus.Pending.ToString(), dto.Status);
    }

    [Fact]
    public async Task SubmitAsync_EnrollmentNotFound_ThrowsKeyNotFound()
    {
        _enrollmentRepo.GetEnrollmentByIdAsync(Arg.Any<Guid>()).Returns((Enrollment)null);
        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            sut.SubmitAsync(Guid.NewGuid(), new SubmitAppealDto { EnrollmentId = Guid.NewGuid(), Text = "x" }));
        await _appealRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task SubmitAsync_StrangerStudent_ThrowsForbidden()
    {
        // PRD §6: "student can only touch their own enrollments, grades, and appeals."
        var ownerStudentId = Guid.NewGuid();
        var strangerStudentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(ownerStudentId, Guid.NewGuid());
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            sut.SubmitAsync(strangerStudentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
        await _appealRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task SubmitAsync_NoGradeYet_ThrowsInvalidOperation()
    {
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns((Grade)null);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SubmitAsync(studentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
    }

    [Fact]
    public async Task SubmitAsync_GradeAlreadyFinalized_ThrowsInvalidOperation()
    {
        // PRD §4.1: once truly final, both buttons disappear — the API must enforce this if hit directly.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2), finalized: true);
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SubmitAsync(studentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
    }

    [Fact]
    public async Task SubmitAsync_AlreadyHasActivePendingAppeal_ThrowsInvalidOperation()
    {
        // PRD §4.1: "Submit ONE appeal per grade confirmation cycle."
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        var activePending = new Appeal
        {
            Id = Guid.NewGuid(),
            GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-1),
        };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);
        _appealRepo.GetByGradeIdAsync(grade.Id).Returns(new List<Appeal> { activePending });

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SubmitAsync(studentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
        await _appealRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task SubmitAsync_AcceptedAppealAwaitingReconfirm_ThrowsInvalidOperation()
    {
        // PRD §4.3: "The new grade is now truly final immediately" after reconfirm.
        // Prior to reconfirm, an Accepted appeal must block further student actions.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        var accepted = new Appeal
        {
            Id = Guid.NewGuid(),
            GradeId = grade.Id,
            Status = AppealStatus.Accepted,
            SubmittedAt = DateTime.UtcNow.AddDays(-3),
            ReviewedAt = DateTime.UtcNow.AddHours(-1),
        };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);
        _appealRepo.GetByGradeIdAsync(grade.Id).Returns(new List<Appeal> { accepted });

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SubmitAsync(studentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
    }

    [Fact]
    public async Task SubmitAsync_PostOverdue_OpensFreshWindowAndAllowsOneMoreAppeal()
    {
        // PRD §4.5: "A brand-new 7-day window from the overdue moment; the student can submit one more appeal."
        // The first appeal: SubmittedAt = 10 days ago → went overdue 3 days ago → fresh window still open.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-11));
        var firstOverdue = new Appeal
        {
            Id = Guid.NewGuid(),
            GradeId = grade.Id,
            Status = AppealStatus.Pending,            // Overdue is computed on read; still Pending in DB
            SubmittedAt = DateTime.UtcNow.AddDays(-10),
        };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);
        _appealRepo.GetByGradeIdAsync(grade.Id).Returns(new List<Appeal> { firstOverdue });

        var sut = CreateSut();

        await sut.SubmitAsync(studentId,
            new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "second try" });

        await _appealRepo.Received(1).AddAsync(Arg.Is<Appeal>(a => a.GradeId == grade.Id));
    }

    [Fact]
    public async Task SubmitAsync_TwoOrMoreOverdueAlready_RejectsFurtherAppeals()
    {
        // PRD §4.5: "The student can submit ONE more appeal; the first overdue one stays in the DB as audit."
        // Translation: at most one post-overdue appeal — i.e. the overdue chain caps at two.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-30));
        var firstOverdue = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-28),
        };
        var secondOverdue = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-14),
        };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);
        _appealRepo.GetByGradeIdAsync(grade.Id).Returns(new List<Appeal> { firstOverdue, secondOverdue });

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SubmitAsync(studentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
        await _appealRepo.DidNotReceiveWithAnyArgs().AddAsync(default);
    }

    [Fact]
    public async Task SubmitAsync_FreshWindowLongExpired_RejectsAppeal()
    {
        // PRD §4.1: "the student has 7 calendar days." Grade confirmed 30 days ago, no prior appeal → window gone.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-30));
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);
        _appealRepo.GetByGradeIdAsync(grade.Id).Returns(new List<Appeal>());

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SubmitAsync(studentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
    }

    [Fact]
    public async Task SubmitAsync_PostOverdueWindowLongExpired_RejectsAppeal()
    {
        // PRD §4.6: "Post-overdue window silently expires | Grade stays open — no auto-finalize."
        // But if the student tries to submit after the fresh 7-day post-overdue window is also gone,
        // the service must reject.
        var studentId = Guid.NewGuid();
        var enrollment = MakeEnrollment(studentId, Guid.NewGuid());
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-60));
        var firstOverdue = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-30),  // overdue 23 days ago → post-overdue window gone
        };
        _enrollmentRepo.GetEnrollmentByIdAsync(enrollment.Id).Returns(enrollment);
        _gradeRepo.GetByEnrollmentIdAsync(enrollment.Id).Returns(grade);
        _appealRepo.GetByGradeIdAsync(grade.Id).Returns(new List<Appeal> { firstOverdue });

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SubmitAsync(studentId, new SubmitAppealDto { EnrollmentId = enrollment.Id, Text = "x" }));
    }

    // ---------- AcceptAsync (PRD §4.3) ----------

    [Fact]
    public async Task AcceptAsync_HappyPath_SetsAcceptedAndStampsReviewedAt()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-2),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        var before = DateTime.UtcNow;
        var dto = await sut.AcceptAsync(appeal.Id, profId);
        var after = DateTime.UtcNow;

        Assert.Equal(AppealStatus.Accepted, appeal.Status);
        Assert.NotNull(appeal.ReviewedAt);
        Assert.InRange(appeal.ReviewedAt!.Value, before, after);
        await _appealRepo.Received(1).UpdateAsync(appeal);
        Assert.Equal(AppealStatus.Accepted.ToString(), dto.Status);
    }

    [Fact]
    public async Task AcceptAsync_AppealNotFound_ThrowsKeyNotFound()
    {
        _appealRepo.GetByIdAsync(Arg.Any<Guid>()).Returns((Appeal)null);
        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => sut.AcceptAsync(Guid.NewGuid(), Guid.NewGuid()));
    }

    [Fact]
    public async Task AcceptAsync_StrangerProfessor_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-1));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-1),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() => sut.AcceptAsync(appeal.Id, strangerProfId));
        await _appealRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
    }

    [Fact]
    public async Task AcceptAsync_OverdueAppeal_ThrowsInvalidOperation()
    {
        // PRD §4.5: "A professor cannot accept or deny an overdue appeal."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-10));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-8),  // > 7 days ago → overdue
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.AcceptAsync(appeal.Id, profId));
        await _appealRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
    }

    [Theory]
    [InlineData(AppealStatus.Accepted)]
    [InlineData(AppealStatus.Denied)]
    [InlineData(AppealStatus.Overdue)]
    public async Task AcceptAsync_NonPendingStatus_ThrowsInvalidOperation(AppealStatus status)
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-1));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = status, SubmittedAt = DateTime.UtcNow.AddDays(-1),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.AcceptAsync(appeal.Id, profId));
        await _appealRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
    }

    // ---------- DenyAsync (PRD §4.4) ----------

    [Fact]
    public async Task DenyAsync_HappyPath_SetsDeniedAndFinalizesGrade()
    {
        // PRD §4.4: "The grade is immediately treated as truly final: ECTS counts, student's buttons disappear"
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-1),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);
        _gradeRepo.GetByEnrollmentIdAsync(grade.EnrollmentId).Returns(grade);

        var sut = CreateSut();

        var before = DateTime.UtcNow;
        await sut.DenyAsync(appeal.Id, profId);
        var after = DateTime.UtcNow;

        Assert.Equal(AppealStatus.Denied, appeal.Status);
        Assert.InRange(appeal.ReviewedAt!.Value, before, after);
        Assert.NotNull(grade.FinalizedAt);
        Assert.InRange(grade.FinalizedAt!.Value, before, after);
        await _gradeRepo.Received(1).UpdateGradeAsync(grade);
    }

    [Fact]
    public async Task DenyAsync_OverdueAppeal_ThrowsInvalidOperation()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-10));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-9),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.DenyAsync(appeal.Id, profId));
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    [Fact]
    public async Task DenyAsync_StrangerProfessor_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-1));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-1),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() => sut.DenyAsync(appeal.Id, strangerProfId));
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    // ---------- UndoDenyAsync (PRD §4.4) ----------

    [Fact]
    public async Task UndoDenyAsync_HappyPath_FlipsBackToPendingAndUnfinalizesGrade()
    {
        // PRD §4.4: "Clicking Undo returns the appeal to Pending and un-finalizes the grade (FinalizedAt back to NULL)."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        grade.FinalizedAt = DateTime.UtcNow.AddHours(-1);  // was finalized by Deny
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Denied,
            SubmittedAt = DateTime.UtcNow.AddDays(-1),
            ReviewedAt = DateTime.UtcNow.AddHours(-1),  // denied 1h ago → inside 24h window
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);
        _gradeRepo.GetByEnrollmentIdAsync(grade.EnrollmentId).Returns(grade);

        var sut = CreateSut();

        await sut.UndoDenyAsync(appeal.Id, profId);

        Assert.Equal(AppealStatus.Pending, appeal.Status);
        Assert.Null(appeal.ReviewedAt);
        Assert.Null(grade.FinalizedAt);
        await _gradeRepo.Received(1).UpdateGradeAsync(grade);
    }

    [Theory]
    [InlineData(AppealStatus.Pending)]
    [InlineData(AppealStatus.Accepted)]
    [InlineData(AppealStatus.Overdue)]
    public async Task UndoDenyAsync_NonDeniedStatus_ThrowsInvalidOperation(AppealStatus status)
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = status, SubmittedAt = DateTime.UtcNow.AddDays(-1),
            ReviewedAt = DateTime.UtcNow.AddHours(-1),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.UndoDenyAsync(appeal.Id, profId));
        await _appealRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
    }

    [Fact]
    public async Task UndoDenyAsync_PastTwentyFourHourWindow_ThrowsInvalidOperation()
    {
        // PRD §4.4: "For 24 hours after denial, the professor's dashboard shows an Undo deny button."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-3));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Denied,
            SubmittedAt = DateTime.UtcNow.AddDays(-2),
            ReviewedAt = DateTime.UtcNow.AddHours(-25),  // 25h ago → window closed
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.UndoDenyAsync(appeal.Id, profId));
        await _appealRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default);
        await _gradeRepo.DidNotReceiveWithAnyArgs().UpdateGradeAsync(default);
    }

    [Fact]
    public async Task UndoDenyAsync_StrangerProfessor_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        var appeal = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Denied,
            SubmittedAt = DateTime.UtcNow.AddDays(-1),
            ReviewedAt = DateTime.UtcNow.AddHours(-1),
            Grade = grade,
        };
        _appealRepo.GetByIdAsync(appeal.Id).Returns(appeal);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() => sut.UndoDenyAsync(appeal.Id, strangerProfId));
    }

    // ---------- Status projection: Overdue is computed on read (PRD §4.5) ----------

    [Fact]
    public async Task GetPendingForProfessorAsync_PendingPastSevenDays_IsReportedAsOverdue()
    {
        // PRD §4.5: "Overdue is computed on read — no background job flips rows."
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-10));
        var overdue = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,            // still Pending in DB
            SubmittedAt = DateTime.UtcNow.AddDays(-8),
            Grade = grade,
        };
        _appealRepo.GetPendingByProfessorIdAsync(profId).Returns(new List<Appeal> { overdue });

        var sut = CreateSut();

        var result = (await sut.GetPendingForProfessorAsync(profId)).ToList();

        Assert.Single(result);
        Assert.Equal(AppealStatus.Overdue.ToString(), result[0].Status);
    }

    [Fact]
    public async Task GetPendingForProfessorAsync_PendingWithinWindow_StaysPending()
    {
        var profId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), profId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-2));
        var fresh = new Appeal
        {
            Id = Guid.NewGuid(), GradeId = grade.Id,
            Status = AppealStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddDays(-1),
            Grade = grade,
        };
        _appealRepo.GetPendingByProfessorIdAsync(profId).Returns(new List<Appeal> { fresh });

        var sut = CreateSut();

        var result = (await sut.GetPendingForProfessorAsync(profId)).ToList();

        Assert.Equal(AppealStatus.Pending.ToString(), result[0].Status);
    }

    // ---------- GetByGradeAsync ownership ----------

    [Fact]
    public async Task GetByGradeAsync_StrangerProfessor_ThrowsForbidden()
    {
        var ownerProfId = Guid.NewGuid();
        var strangerProfId = Guid.NewGuid();
        var enrollment = MakeEnrollment(Guid.NewGuid(), ownerProfId);
        var grade = MakeGrade(enrollment.Id, enrollment, DateTime.UtcNow.AddDays(-1));
        _gradeRepo.GetGradeByIdAsync(grade.Id).Returns(grade);

        var sut = CreateSut();

        await Assert.ThrowsAsync<ForbiddenAccessException>(() => sut.GetByGradeAsync(grade.Id, strangerProfId));
    }

    [Fact]
    public async Task GetByGradeAsync_GradeNotFound_ThrowsKeyNotFound()
    {
        _gradeRepo.GetGradeByIdAsync(Arg.Any<Guid>()).Returns((Grade)null);

        var sut = CreateSut();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => sut.GetByGradeAsync(Guid.NewGuid(), Guid.NewGuid()));
    }
}
