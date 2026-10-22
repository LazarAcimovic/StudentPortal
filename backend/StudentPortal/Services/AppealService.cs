using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Services;

public class AppealService : IAppealService
{
    private readonly IAppealRepository _appealRepository;
    private readonly IGradeRepository _gradeRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly TimeProvider _timeProvider;

    public AppealService(
        IAppealRepository appealRepository,
        IGradeRepository gradeRepository,
        IEnrollmentRepository enrollmentRepository,
        TimeProvider timeProvider)
    {
        _appealRepository = appealRepository;
        _gradeRepository = gradeRepository;
        _enrollmentRepository = enrollmentRepository;
        _timeProvider = timeProvider;
    }

    public async Task<AppealDto> SubmitAsync(Guid callerStudentId, SubmitAppealDto dto)
    {
        var enrollment = await _enrollmentRepository.GetEnrollmentByIdAsync(dto.EnrollmentId);
        if (enrollment == null)
            throw new KeyNotFoundException($"Enrollment {dto.EnrollmentId} not found.");

        if (enrollment.StudentId != callerStudentId)
            throw new ForbiddenAccessException("This enrollment does not belong to you.");

        var grade = await _gradeRepository.GetByEnrollmentIdAsync(dto.EnrollmentId);
        if (grade == null)
            throw new InvalidOperationException("No confirmed grade exists for this enrollment.");

        if (grade.FinalizedAt != null)
            throw new InvalidOperationException("This grade is already finalized.");

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var appeals = await _appealRepository.GetByGradeIdAsync(grade.Id);

        var activePending = appeals.FirstOrDefault(a =>
            a.Status == AppealStatus.Pending &&
            a.SubmittedAt.AddDays(7) >= now);

        if (activePending != null)
            throw new InvalidOperationException("An appeal is already pending for this grade.");

        var acceptedAwaitingReconfirm = appeals.FirstOrDefault(a => a.Status == AppealStatus.Accepted);
        if (acceptedAwaitingReconfirm != null)
            throw new InvalidOperationException("An accepted appeal is awaiting professor re-confirmation.");

        var overdueAppeals = appeals
            .Where(a => a.Status == AppealStatus.Pending && a.SubmittedAt.AddDays(7) < now)
            .OrderByDescending(a => a.SubmittedAt)
            .ToList();

        if (overdueAppeals.Count >= 2)
            throw new InvalidOperationException("No further appeals are allowed. The maximum appeal chain has been reached.");

        var latestOverdue = overdueAppeals.FirstOrDefault();

        if (latestOverdue != null)
        {
            var overdueAt = latestOverdue.SubmittedAt.AddDays(7);
            var windowEnd = overdueAt.AddDays(7);
            if (now > windowEnd)
                throw new InvalidOperationException("The post-overdue appeal window has expired.");
        }
        else
        {
            if (now > grade.ConfirmedAt.AddDays(7))
                throw new InvalidOperationException("The appeal window has expired.");
        }

        var appeal = new Appeal
        {
            Id = Guid.NewGuid(),
            GradeId = grade.Id,
            Text = dto.Text,
            SubmittedAt = now,
            Status = AppealStatus.Pending
        };

        await _appealRepository.AddAsync(appeal);
        return MapToDto(appeal);
    }

    public async Task<IEnumerable<AppealDto>> GetPendingForProfessorAsync(Guid callerProfId)
    {
        var appeals = await _appealRepository.GetPendingByProfessorIdAsync(callerProfId);
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        return appeals.Select(a => MapToDto(a, now)).ToList();
    }

    public async Task<IEnumerable<AppealDto>> GetByGradeAsync(Guid gradeId, Guid callerProfId)
    {
        var grade = await _gradeRepository.GetGradeByIdAsync(gradeId);
        if (grade == null)
            throw new KeyNotFoundException("Grade not found.");

        var isSubjectProfessor = grade.Enrollment.Subject.ProfessorId == callerProfId;
        var isAssignedProfessor = grade.AssignedProfessorId == callerProfId;
        if (!isSubjectProfessor && !isAssignedProfessor)
            throw new ForbiddenAccessException("You do not have access to this grade.");

        var appeals = await _appealRepository.GetByGradeIdAsync(gradeId);
        if (!appeals.Any())
            throw new KeyNotFoundException("No appeals found for this grade.");

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        return appeals.Select(a => MapToDto(a, now)).ToList();
    }

    public async Task<AppealDto> AcceptAsync(Guid appealId, Guid callerProfId)
    {
        var appeal = await _appealRepository.GetByIdAsync(appealId);
        if (appeal == null)
            throw new KeyNotFoundException("Appeal not found.");

        VerifyProfessorWriteAccess(appeal, callerProfId);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var isAssignedProfessor = appeal.Grade?.AssignedProfessorId == callerProfId;
        var isOverdue = appeal.SubmittedAt.AddDays(7) < now;

        if (appeal.Status != AppealStatus.Pending || (isOverdue && !isAssignedProfessor))
            throw new InvalidOperationException("Cannot accept an overdue or non-pending appeal.");

        appeal.Status = AppealStatus.Accepted;
        appeal.ReviewedAt = now;
        await _appealRepository.UpdateAsync(appeal);

        return MapToDto(appeal, now);
    }

    public async Task<AppealDto> DenyAsync(Guid appealId, Guid callerProfId)
    {
        var appeal = await _appealRepository.GetByIdAsync(appealId);
        if (appeal == null)
            throw new KeyNotFoundException("Appeal not found.");

        VerifyProfessorWriteAccess(appeal, callerProfId);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var isAssignedProfessor = appeal.Grade?.AssignedProfessorId == callerProfId;
        var isOverdue = appeal.SubmittedAt.AddDays(7) < now;

        if (appeal.Status != AppealStatus.Pending || (isOverdue && !isAssignedProfessor))
            throw new InvalidOperationException("Cannot deny an overdue or non-pending appeal.");

        appeal.Status = AppealStatus.Denied;
        appeal.ReviewedAt = now;
        await _appealRepository.UpdateAsync(appeal);

        var grade = await _gradeRepository.GetByEnrollmentIdAsync(appeal.Grade.EnrollmentId);
        if (grade != null)
        {
            grade.FinalizedAt = now;
            await _gradeRepository.UpdateGradeAsync(grade);
        }

        return MapToDto(appeal, now);
    }

    public async Task<AppealDto> UndoDenyAsync(Guid appealId, Guid callerProfId)
    {
        var appeal = await _appealRepository.GetByIdAsync(appealId);
        if (appeal == null)
            throw new KeyNotFoundException("Appeal not found.");

        VerifyProfessorWriteAccess(appeal, callerProfId);

        if (appeal.Status != AppealStatus.Denied)
            throw new InvalidOperationException("Only a denied appeal can be undone.");

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        if (appeal.ReviewedAt == null || now >= appeal.ReviewedAt.Value.AddHours(24))
            throw new InvalidOperationException("The 24-hour undo window has expired.");

        appeal.Status = AppealStatus.Pending;
        appeal.ReviewedAt = null;
        await _appealRepository.UpdateAsync(appeal);

        var grade = await _gradeRepository.GetByEnrollmentIdAsync(appeal.Grade.EnrollmentId);
        if (grade != null)
        {
            grade.FinalizedAt = null;
            await _gradeRepository.UpdateGradeAsync(grade);
        }

        return MapToDto(appeal, now);
    }

    private static void VerifyProfessorWriteAccess(Appeal appeal, Guid callerProfId)
    {
        var subjectProfessorId = appeal.Grade?.Enrollment?.Subject?.ProfessorId;
        var assignedProfessorId = appeal.Grade?.AssignedProfessorId;

        if (assignedProfessorId == null)
        {
            if (subjectProfessorId != callerProfId)
                throw new ForbiddenAccessException("You do not teach the subject for this appeal.");
        }
        else
        {
            if (assignedProfessorId != callerProfId)
                throw new ForbiddenAccessException("This grade has been assigned to another professor.");
        }
    }

    private AppealDto MapToDto(Appeal appeal, DateTime? now = null)
    {
        var computedStatus = ComputeStatus(appeal, now ?? _timeProvider.GetUtcNow().UtcDateTime);
        return new AppealDto
        {
            Id = appeal.Id,
            GradeId = appeal.GradeId,
            EnrollmentId = appeal.Grade?.EnrollmentId ?? Guid.Empty,
            Text = appeal.Text,
            SubmittedAt = appeal.SubmittedAt,
            Status = computedStatus.ToString(),
            ReviewedAt = appeal.ReviewedAt,
            StudentFirstName = appeal.Grade?.Enrollment?.Student?.FirstName,
            StudentLastName = appeal.Grade?.Enrollment?.Student?.LastName,
            SubjectName = appeal.Grade?.Enrollment?.Subject?.SubjectName,
        };
    }

    private static AppealStatus ComputeStatus(Appeal appeal, DateTime now)
    {
        if (appeal.Status == AppealStatus.Pending && appeal.SubmittedAt.AddDays(7) < now)
            return AppealStatus.Overdue;

        return appeal.Status;
    }
}
