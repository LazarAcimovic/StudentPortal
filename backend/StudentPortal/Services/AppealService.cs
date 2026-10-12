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

    public AppealService(
        IAppealRepository appealRepository,
        IGradeRepository gradeRepository,
        IEnrollmentRepository enrollmentRepository)
    {
        _appealRepository = appealRepository;
        _gradeRepository = gradeRepository;
        _enrollmentRepository = enrollmentRepository;
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

        var now = DateTime.UtcNow;
        var appeals = await _appealRepository.GetByGradeIdAsync(grade.Id);

        var activePending = appeals.FirstOrDefault(a =>
            a.Status == AppealStatus.Pending &&
            a.SubmittedAt.AddDays(7) >= now);

        if (activePending != null)
            throw new InvalidOperationException("An appeal is already pending for this grade.");

        var latestOverdue = appeals
            .Where(a => a.Status == AppealStatus.Pending && a.SubmittedAt.AddDays(7) < now)
            .OrderByDescending(a => a.SubmittedAt)
            .FirstOrDefault();

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
        var now = DateTime.UtcNow;
        return appeals.Select(a => MapToDto(a, now)).ToList();
    }

    public async Task<IEnumerable<AppealDto>> GetByGradeAsync(Guid gradeId, Guid callerProfId)
    {
        var appeals = await _appealRepository.GetByGradeIdAsync(gradeId);
        if (!appeals.Any())
            return Enumerable.Empty<AppealDto>();

        // Verify professor owns this grade's subject via the first appeal, or load grade directly
        var grade = await _gradeRepository.GetByEnrollmentIdAsync(
            (await _gradeRepository.GetGradeByIdAsync(gradeId))?.EnrollmentId ?? Guid.Empty);

        if (grade == null)
            throw new KeyNotFoundException("Grade not found.");

        if (grade.Enrollment.Subject.ProfessorId != callerProfId)
            throw new ForbiddenAccessException("You do not teach the subject for this grade.");

        var now = DateTime.UtcNow;
        return appeals.Select(a => MapToDto(a, now)).ToList();
    }

    public async Task<AppealDto> AcceptAsync(Guid appealId, Guid callerProfId)
    {
        var appeal = await _appealRepository.GetByIdAsync(appealId);
        if (appeal == null)
            throw new KeyNotFoundException("Appeal not found.");

        VerifyProfessorOwnsAppeal(appeal, callerProfId);

        var now = DateTime.UtcNow;
        if (appeal.Status != AppealStatus.Pending || appeal.SubmittedAt.AddDays(7) < now)
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

        VerifyProfessorOwnsAppeal(appeal, callerProfId);

        var now = DateTime.UtcNow;
        if (appeal.Status != AppealStatus.Pending || appeal.SubmittedAt.AddDays(7) < now)
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

        VerifyProfessorOwnsAppeal(appeal, callerProfId);

        if (appeal.Status != AppealStatus.Denied)
            throw new InvalidOperationException("Only a denied appeal can be undone.");

        if (appeal.ReviewedAt == null || DateTime.UtcNow > appeal.ReviewedAt.Value.AddHours(24))
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

        return MapToDto(appeal, DateTime.UtcNow);
    }

    private static void VerifyProfessorOwnsAppeal(Appeal appeal, Guid callerProfId)
    {
        if (appeal.Grade?.Enrollment?.Subject?.ProfessorId != callerProfId)
            throw new ForbiddenAccessException("You do not teach the subject for this appeal.");
    }

    private static AppealDto MapToDto(Appeal appeal, DateTime? now = null)
    {
        var computedStatus = ComputeStatus(appeal, now ?? DateTime.UtcNow);
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
