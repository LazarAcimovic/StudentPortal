using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using StudentPortal.Services;

namespace StudentPortal.Tests.Services;

public class EscalationServiceTests
{
    private readonly IGradeRepository _gradeRepo = Substitute.For<IGradeRepository>();
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IEscalationRepository _escalationRepo = Substitute.For<IEscalationRepository>();
    private readonly IEscalationAssignmentRepository _assignmentRepo = Substitute.For<IEscalationAssignmentRepository>();

    private EscalationService CreateSut() =>
        new(_gradeRepo, _userRepo, _escalationRepo, _assignmentRepo);

    private static readonly DateTime T0 = new(2025, 6, 1, 12, 0, 0, DateTimeKind.Utc);

    // ─── Domain helpers ───────────────────────────────────────────────────

    private static Grade MakeGrade(
        Guid? professorId = null,
        List<Appeal>? appeals = null,
        Escalation? escalation = null)
    {
        var profId = professorId ?? Guid.NewGuid();
        var subject = new Subject
        {
            Id = Guid.NewGuid(),
            ProfessorId = profId,
            SubjectName = "Math",
            SubjectCode = "MATH-101",
            Professor = new User { Id = profId, FirstName = "Original", LastName = "Prof" }
        };
        var enrollment = new Enrollment
        {
            Id = Guid.NewGuid(),
            Subject = subject,
            Student = new User { Id = Guid.NewGuid(), FirstName = "Stu", LastName = "Dent" }
        };
        return new Grade
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollment.Id,
            FinalGrade = 8,
            FinalizedAt = null,
            Enrollment = enrollment,
            Appeals = appeals ?? new List<Appeal>(),
            Escalation = escalation
        };
    }

    private static Appeal MakeAcceptedAppeal(DateTime reviewedAt) => new()
    {
        Id = Guid.NewGuid(),
        GradeId = Guid.NewGuid(),
        Text = "test",
        SubmittedAt = reviewedAt.AddDays(-3),
        Status = AppealStatus.Accepted,
        ReviewedAt = reviewedAt
    };

    private static Appeal MakePendingAppeal(DateTime submittedAt) => new()
    {
        Id = Guid.NewGuid(),
        GradeId = Guid.NewGuid(),
        Text = "test",
        SubmittedAt = submittedAt,
        Status = AppealStatus.Pending
    };

    // ─── Scenario A — accepted but not re-graded ──────────────────────────

    [Fact]
    public async Task GetAllCasesAsync_ScenarioA_AtExactlyDeadline_NotEscalated()
    {
        // ReviewedAt + 7d == now  →  boundary condition is < now (exclusive)  →  no trigger
        var appeal = MakeAcceptedAppeal(T0.AddDays(-7));
        var grade = MakeGrade(appeals: new List<Appeal> { appeal });
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0)).ToList();

        Assert.Empty(cases);
    }

    [Fact]
    public async Task GetAllCasesAsync_ScenarioA_OneDayBefore_NotEscalated()
    {
        // ReviewedAt + 6d < now (6 days old accept, only 6d since review)
        var appeal = MakeAcceptedAppeal(T0.AddDays(-6));
        var grade = MakeGrade(appeals: new List<Appeal> { appeal });
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0)).ToList();

        Assert.Empty(cases);
    }

    [Fact]
    public async Task GetAllCasesAsync_ScenarioA_OneSecondPastDeadline_Escalated()
    {
        var appeal = MakeAcceptedAppeal(T0.AddDays(-7));
        var grade = MakeGrade(appeals: new List<Appeal> { appeal });
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var now = T0.AddSeconds(1);
        var cases = (await sut.GetAllCasesAsync(now)).ToList();

        Assert.Single(cases);
        Assert.Equal(EscalationReason.AcceptedUnresolved.ToString(), cases[0].Reason);
        Assert.Equal("NeedsAssignment", cases[0].EscalationStatus);
    }

    // ─── Scenario B — chain exhausted ─────────────────────────────────────

    [Fact]
    public async Task GetAllCasesAsync_ScenarioB_OneOverdueAppeal_NotEscalated()
    {
        // PRD §4.8: a single overdue appeal does not escalate
        var appeal = MakePendingAppeal(T0.AddDays(-8));
        var grade = MakeGrade(appeals: new List<Appeal> { appeal });
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0)).ToList();

        Assert.Empty(cases);
    }

    [Fact]
    public async Task GetAllCasesAsync_ScenarioB_SecondAppealAtExactDeadline_NotEscalated()
    {
        // second SubmittedAt + 7d == T0  →  not strictly past  →  no trigger
        var a1 = MakePendingAppeal(T0.AddDays(-8));
        var a2 = MakePendingAppeal(T0.AddDays(-7));
        var grade = MakeGrade(appeals: new List<Appeal> { a1, a2 });
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0)).ToList();

        Assert.Empty(cases);
    }

    [Fact]
    public async Task GetAllCasesAsync_ScenarioB_TwoOverdueAppeals_Escalated()
    {
        var a1 = MakePendingAppeal(T0.AddDays(-8));
        var a2 = MakePendingAppeal(T0.AddDays(-7));
        var grade = MakeGrade(appeals: new List<Appeal> { a1, a2 });
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var now = T0.AddSeconds(1);
        var cases = (await sut.GetAllCasesAsync(now)).ToList();

        Assert.Single(cases);
        Assert.Equal(EscalationReason.ChainExhausted.ToString(), cases[0].Reason);
        Assert.Equal("NeedsAssignment", cases[0].EscalationStatus);
    }

    // ─── Four status derivations ──────────────────────────────────────────

    [Fact]
    public async Task GetAllCasesAsync_EscalationStatus_NeedsAssignment_WhenNoRecord()
    {
        var a1 = MakePendingAppeal(T0.AddDays(-8));
        var a2 = MakePendingAppeal(T0.AddDays(-8));
        var grade = MakeGrade(appeals: new List<Appeal> { a1, a2 });
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0.AddSeconds(1))).ToList();

        Assert.Equal("NeedsAssignment", cases[0].EscalationStatus);
    }

    [Fact]
    public async Task GetAllCasesAsync_EscalationStatus_Assigned_WhenInsideWindow()
    {
        var assignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            AssignedAt = T0.AddDays(-3), // 3d into 7d window
            AssignedProfessor = new User { FirstName = "A", LastName = "P" },
            AssignedByAdmin = new User { FirstName = "Ad", LastName = "Min" }
        };
        var escalation = new Escalation
        {
            Id = Guid.NewGuid(),
            Reason = EscalationReason.ChainExhausted,
            ResolvedAt = null,
            Assignments = new List<EscalationAssignment> { assignment }
        };
        var grade = MakeGrade(escalation: escalation);
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0)).ToList();

        Assert.Equal("Assigned", cases[0].EscalationStatus);
    }

    [Fact]
    public async Task GetAllCasesAsync_EscalationStatus_NeedsReassignment_WhenWindowExpired()
    {
        var assignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            AssignedAt = T0.AddDays(-8), // 8d ago → window expired
            AssignedProfessor = new User { FirstName = "A", LastName = "P" },
            AssignedByAdmin = new User { FirstName = "Ad", LastName = "Min" }
        };
        var escalation = new Escalation
        {
            Id = Guid.NewGuid(),
            Reason = EscalationReason.ChainExhausted,
            ResolvedAt = null,
            Assignments = new List<EscalationAssignment> { assignment }
        };
        var grade = MakeGrade(escalation: escalation);
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0)).ToList();

        Assert.Equal("NeedsReassignment", cases[0].EscalationStatus);
    }

    [Fact]
    public async Task GetAllCasesAsync_EscalationStatus_Resolved_WhenResolvedAtSet()
    {
        var assignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            AssignedAt = T0.AddDays(-10),
            AssignedProfessor = new User { FirstName = "A", LastName = "P" },
            AssignedByAdmin = new User { FirstName = "Ad", LastName = "Min" }
        };
        var escalation = new Escalation
        {
            Id = Guid.NewGuid(),
            Reason = EscalationReason.AcceptedUnresolved,
            ResolvedAt = T0.AddDays(-1),
            Assignments = new List<EscalationAssignment> { assignment }
        };
        var grade = MakeGrade(escalation: escalation);
        _gradeRepo.GetAllWithEscalationDetailsAsync(Arg.Any<DateTime>()).Returns(new List<Grade> { grade });

        var sut = CreateSut();
        var cases = (await sut.GetAllCasesAsync(T0)).ToList();

        Assert.Equal("Resolved", cases[0].EscalationStatus);
        Assert.NotNull(cases[0].ResolvedAt);
    }

    // ─── Eligibility ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetEligibleProfessorsAsync_ExcludesOriginalProfessor()
    {
        var originalProfId = Guid.NewGuid();
        var grade = MakeGrade(professorId: originalProfId);
        _gradeRepo.GetByIdWithEscalationDetailsAsync(grade.Id).Returns(grade);
        _userRepo.GetProfessorsBySubjectCodeAsync(Arg.Any<string>(), Arg.Any<IEnumerable<Guid>>())
            .Returns(new List<User>());

        var sut = CreateSut();
        await sut.GetEligibleProfessorsAsync(grade.Id);

        await _userRepo.Received(1).GetProfessorsBySubjectCodeAsync(
            Arg.Any<string>(),
            Arg.Is<IEnumerable<Guid>>(ids => ids.Contains(originalProfId)));
    }

    [Fact]
    public async Task GetEligibleProfessorsAsync_ExcludesPriorAssignees()
    {
        var originalProfId = Guid.NewGuid();
        var priorAssigneeId = Guid.NewGuid();
        var escalation = new Escalation
        {
            Id = Guid.NewGuid(),
            Reason = EscalationReason.ChainExhausted,
            Assignments = new List<EscalationAssignment>
            {
                new() { AssignedProfessorId = priorAssigneeId, AssignedAt = T0.AddDays(-10), SupersededAt = T0.AddDays(-3) }
            }
        };
        var grade = MakeGrade(professorId: originalProfId, escalation: escalation);
        _gradeRepo.GetByIdWithEscalationDetailsAsync(grade.Id).Returns(grade);
        _userRepo.GetProfessorsBySubjectCodeAsync(Arg.Any<string>(), Arg.Any<IEnumerable<Guid>>())
            .Returns(new List<User>());

        var sut = CreateSut();
        await sut.GetEligibleProfessorsAsync(grade.Id);

        await _userRepo.Received(1).GetProfessorsBySubjectCodeAsync(
            Arg.Any<string>(),
            Arg.Is<IEnumerable<Guid>>(ids => ids.Contains(originalProfId) && ids.Contains(priorAssigneeId)));
    }

    [Fact]
    public async Task GetEligibleProfessorsAsync_ReturnsMappedUsers()
    {
        var grade = MakeGrade();
        var eligibleProf = new User
        {
            Id = Guid.NewGuid(),
            FirstName = "Eligible",
            LastName = "Prof",
            Email = "e@uni.edu",
            UserRole = RoleEnum.Professor,
            CreatedAt = T0
        };
        _gradeRepo.GetByIdWithEscalationDetailsAsync(grade.Id).Returns(grade);
        _userRepo.GetProfessorsBySubjectCodeAsync(Arg.Any<string>(), Arg.Any<IEnumerable<Guid>>())
            .Returns(new List<User> { eligibleProf });

        var sut = CreateSut();
        var result = (await sut.GetEligibleProfessorsAsync(grade.Id)).ToList();

        Assert.Single(result);
        Assert.Equal(eligibleProf.Id, result[0].Id);
    }

    // ─── Reassignment rejection before deadline ───────────────────────────

    [Fact]
    public async Task ReassignProfessorAsync_BeforeDeadline_ThrowsInvalidOperation()
    {
        var grade = MakeGrade();
        var escalation = new Escalation
        {
            Id = Guid.NewGuid(),
            Reason = EscalationReason.ChainExhausted,
            ResolvedAt = null
        };
        var activeAssignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            EscalationId = escalation.Id,
            AssignedAt = T0.AddDays(-3) // only 3 days — window is 7
        };
        _gradeRepo.GetByIdWithEscalationDetailsAsync(grade.Id).Returns(grade);
        _escalationRepo.GetByGradeIdAsync(grade.Id).Returns(escalation);
        _assignmentRepo.GetActiveByEscalationIdAsync(escalation.Id).Returns(activeAssignment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.ReassignProfessorAsync(grade.Id, Guid.NewGuid(), Guid.NewGuid(), T0));
    }

    [Fact]
    public async Task ReassignProfessorAsync_AtExactlyDeadline_ThrowsInvalidOperation()
    {
        // AssignedAt + 7d == now  →  condition is >= now  →  still rejected
        var grade = MakeGrade();
        var escalation = new Escalation { Id = Guid.NewGuid(), Reason = EscalationReason.ChainExhausted, ResolvedAt = null };
        var activeAssignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            EscalationId = escalation.Id,
            AssignedAt = T0.AddDays(-7)
        };
        _gradeRepo.GetByIdWithEscalationDetailsAsync(grade.Id).Returns(grade);
        _escalationRepo.GetByGradeIdAsync(grade.Id).Returns(escalation);
        _assignmentRepo.GetActiveByEscalationIdAsync(escalation.Id).Returns(activeAssignment);

        var sut = CreateSut();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.ReassignProfessorAsync(grade.Id, Guid.NewGuid(), Guid.NewGuid(), T0));
    }

    [Fact]
    public async Task ReassignProfessorAsync_AfterDeadline_SupersedesOldAndAddsNew()
    {
        var newProfId = Guid.NewGuid();
        var grade = MakeGrade();
        var escalation = new Escalation { Id = Guid.NewGuid(), Reason = EscalationReason.ChainExhausted, ResolvedAt = null };
        var activeAssignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            EscalationId = escalation.Id,
            AssignedAt = T0.AddDays(-8) // 8d ago → window expired by 1 day
        };
        var updatedGrade = MakeGrade();
        updatedGrade.Escalation = new Escalation
        {
            Id = escalation.Id,
            Reason = EscalationReason.ChainExhausted,
            ResolvedAt = null,
            Assignments = new List<EscalationAssignment>()
        };

        _gradeRepo.GetByIdWithEscalationDetailsAsync(grade.Id).Returns(grade, updatedGrade);
        _escalationRepo.GetByGradeIdAsync(grade.Id).Returns(escalation);
        _assignmentRepo.GetActiveByEscalationIdAsync(escalation.Id).Returns(activeAssignment);
        _userRepo.GetProfessorsBySubjectCodeAsync(Arg.Any<string>(), Arg.Any<IEnumerable<Guid>>())
            .Returns(new List<User> { new() { Id = newProfId } });
        _assignmentRepo.AddAsync(Arg.Any<EscalationAssignment>())
            .Returns(ci => ci.Arg<EscalationAssignment>());

        var sut = CreateSut();
        await sut.ReassignProfessorAsync(grade.Id, newProfId, Guid.NewGuid(), T0);

        await _assignmentRepo.Received(1).UpdateAsync(Arg.Is<EscalationAssignment>(a => a.SupersededAt == T0));
        await _assignmentRepo.Received(1).AddAsync(Arg.Is<EscalationAssignment>(a => a.AssignedProfessorId == newProfId));
    }

    // ─── CloseIfEscalatedAsync idempotency ────────────────────────────────

    [Fact]
    public async Task CloseIfEscalatedAsync_NoEscalation_UpdateNotCalled()
    {
        _escalationRepo.GetByGradeIdAsync(Arg.Any<Guid>()).Returns((Escalation?)null);

        var sut = CreateSut();
        await sut.CloseIfEscalatedAsync(Guid.NewGuid(), T0);

        await _escalationRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default!);
    }

    [Fact]
    public async Task CloseIfEscalatedAsync_AlreadyResolved_UpdateNotCalled()
    {
        var escalation = new Escalation { Id = Guid.NewGuid(), ResolvedAt = T0.AddDays(-1) };
        _escalationRepo.GetByGradeIdAsync(Arg.Any<Guid>()).Returns(escalation);

        var sut = CreateSut();
        await sut.CloseIfEscalatedAsync(Guid.NewGuid(), T0);

        await _escalationRepo.DidNotReceiveWithAnyArgs().UpdateAsync(default!);
    }

    [Fact]
    public async Task CloseIfEscalatedAsync_OpenEscalation_StampsResolvedAt()
    {
        var escalation = new Escalation { Id = Guid.NewGuid(), ResolvedAt = null };
        _escalationRepo.GetByGradeIdAsync(Arg.Any<Guid>()).Returns(escalation);

        var sut = CreateSut();
        await sut.CloseIfEscalatedAsync(Guid.NewGuid(), T0);

        await _escalationRepo.Received(1).UpdateAsync(
            Arg.Is<Escalation>(e => e.ResolvedAt == T0));
    }

    [Fact]
    public async Task CloseIfEscalatedAsync_Idempotent_SecondCallSkipsUpdate()
    {
        var escalation = new Escalation { Id = Guid.NewGuid(), ResolvedAt = null };
        _escalationRepo.GetByGradeIdAsync(Arg.Any<Guid>()).Returns(escalation);
        _escalationRepo.When(r => r.UpdateAsync(Arg.Any<Escalation>()))
            .Do(_ => escalation.ResolvedAt = T0);

        var sut = CreateSut();
        var gradeId = Guid.NewGuid();
        await sut.CloseIfEscalatedAsync(gradeId, T0);

        // Second call: escalation.ResolvedAt is now set, so the branch is skipped
        _escalationRepo.GetByGradeIdAsync(gradeId).Returns(escalation);
        await sut.CloseIfEscalatedAsync(gradeId, T0);

        await _escalationRepo.Received(1).UpdateAsync(Arg.Any<Escalation>());
    }
}
