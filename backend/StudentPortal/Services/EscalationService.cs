using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Services;

public class EscalationService : IEscalationService
{
    private readonly IGradeRepository _gradeRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEscalationRepository _escalationRepository;
    private readonly IEscalationAssignmentRepository _assignmentRepository;

    public EscalationService(
        IGradeRepository gradeRepository,
        IUserRepository userRepository,
        IEscalationRepository escalationRepository,
        IEscalationAssignmentRepository assignmentRepository)
    {
        _gradeRepository = gradeRepository;
        _userRepository = userRepository;
        _escalationRepository = escalationRepository;
        _assignmentRepository = assignmentRepository;
    }

    public async Task<IEnumerable<EscalatedCaseDto>> GetAllCasesAsync(DateTime now)
    {
        var grades = await _gradeRepository.GetAllWithEscalationDetailsAsync(now);
        var result = new List<EscalatedCaseDto>();

        foreach (var grade in grades)
        {
            var dto = BuildCaseDto(grade, now);
            if (dto != null)
                result.Add(dto);
        }

        return result;
    }

    public async Task<IEnumerable<UserDto>> GetEligibleProfessorsAsync(Guid gradeId)
    {
        var grade = await _gradeRepository.GetByIdWithEscalationDetailsAsync(gradeId);
        if (grade == null)
            throw new KeyNotFoundException($"Grade {gradeId} not found.");

        var subjectCode = grade.Enrollment?.Subject?.SubjectCode ?? string.Empty;
        var excludeIds = BuildExcludeIds(grade);
        var professors = await _userRepository.GetProfessorsBySubjectCodeAsync(subjectCode, excludeIds);
        return professors.Select(MapUserToDto).ToList();
    }

    public async Task<EscalatedCaseDto> AssignProfessorAsync(Guid gradeId, Guid assignedProfessorId, Guid adminId, DateTime now)
    {
        var grade = await _gradeRepository.GetByIdWithEscalationDetailsAsync(gradeId);
        if (grade == null)
            throw new KeyNotFoundException($"Grade {gradeId} not found.");

        if (grade.FinalizedAt != null)
            throw new InvalidOperationException("Grade is already finalized.");

        var existingEscalation = await _escalationRepository.GetByGradeIdAsync(gradeId);
        if (existingEscalation != null && existingEscalation.ResolvedAt == null)
            throw new InvalidOperationException("An open escalation already exists for this grade.");

        var subjectCode = grade.Enrollment?.Subject?.SubjectCode ?? string.Empty;
        var excludeIds = BuildExcludeIds(grade);
        var eligibleProfessors = await _userRepository.GetProfessorsBySubjectCodeAsync(subjectCode, excludeIds);
        if (!eligibleProfessors.Any(p => p.Id == assignedProfessorId))
            throw new InvalidOperationException("Professor is not eligible for this subject.");

        var reason = DetermineReason(grade, now);

        var escalation = new Escalation
        {
            Id = Guid.NewGuid(),
            GradeId = gradeId,
            Reason = reason
        };
        await _escalationRepository.AddAsync(escalation);

        var assignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            EscalationId = escalation.Id,
            AssignedProfessorId = assignedProfessorId,
            AssignedByAdminId = adminId,
            AssignedAt = now
        };
        await _assignmentRepository.AddAsync(assignment);

        grade.AssignedProfessorId = assignedProfessorId;
        await _gradeRepository.UpdateGradeAsync(grade);

        var updatedGrade = await _gradeRepository.GetByIdWithEscalationDetailsAsync(gradeId);
        return BuildCaseDto(updatedGrade!, now)!;
    }

    public async Task<EscalatedCaseDto> ReassignProfessorAsync(Guid gradeId, Guid newProfessorId, Guid adminId, DateTime now)
    {
        var grade = await _gradeRepository.GetByIdWithEscalationDetailsAsync(gradeId);
        if (grade == null)
            throw new KeyNotFoundException($"Grade {gradeId} not found.");

        var escalation = await _escalationRepository.GetByGradeIdAsync(gradeId);
        if (escalation == null || escalation.ResolvedAt != null)
            throw new InvalidOperationException("No open escalation exists for this grade.");

        var activeAssignment = await _assignmentRepository.GetActiveByEscalationIdAsync(escalation.Id);
        if (activeAssignment == null)
            throw new InvalidOperationException("No active assignment found.");

        if (activeAssignment.AssignedAt.AddDays(7) >= now)
            throw new InvalidOperationException("Reassignment is not yet due. The 7-day assignment window has not expired.");

        var subjectCode = grade.Enrollment?.Subject?.SubjectCode ?? string.Empty;
        var excludeIds = BuildExcludeIds(grade);
        var eligibleProfessors = await _userRepository.GetProfessorsBySubjectCodeAsync(subjectCode, excludeIds);
        if (!eligibleProfessors.Any(p => p.Id == newProfessorId))
            throw new InvalidOperationException("Professor is not eligible for this subject.");

        activeAssignment.SupersededAt = now;
        await _assignmentRepository.UpdateAsync(activeAssignment);

        var newAssignment = new EscalationAssignment
        {
            Id = Guid.NewGuid(),
            EscalationId = escalation.Id,
            AssignedProfessorId = newProfessorId,
            AssignedByAdminId = adminId,
            AssignedAt = now
        };
        await _assignmentRepository.AddAsync(newAssignment);

        grade.AssignedProfessorId = newProfessorId;
        await _gradeRepository.UpdateGradeAsync(grade);

        var updatedGrade = await _gradeRepository.GetByIdWithEscalationDetailsAsync(gradeId);
        return BuildCaseDto(updatedGrade!, now)!;
    }

    public async Task CloseIfEscalatedAsync(Guid gradeId, DateTime now)
    {
        var escalation = await _escalationRepository.GetByGradeIdAsync(gradeId);
        if (escalation != null && escalation.ResolvedAt == null)
        {
            escalation.ResolvedAt = now;
            await _escalationRepository.UpdateAsync(escalation);
        }
    }

    private static EscalatedCaseDto? BuildCaseDto(Grade grade, DateTime now)
    {
        var appeals = grade.Appeals?.ToList() ?? new List<Appeal>();
        var escalation = grade.Escalation;

        bool isScenarioA = grade.FinalizedAt == null
            && appeals.Any(a => a.Status == AppealStatus.Accepted && a.ReviewedAt.HasValue && a.ReviewedAt.Value.AddDays(7) < now);

        bool isScenarioB = grade.FinalizedAt == null
            && appeals.Count(a => a.Status == AppealStatus.Pending && a.SubmittedAt.AddDays(7) < now) >= 2;

        if (escalation == null && !isScenarioA && !isScenarioB)
            return null;

        string escalationStatus;
        DateTime escalatedSince;

        if (escalation == null)
        {
            escalationStatus = "NeedsAssignment";
            if (isScenarioA)
            {
                var acceptedAppeal = appeals.First(a => a.Status == AppealStatus.Accepted && a.ReviewedAt.HasValue && a.ReviewedAt.Value.AddDays(7) < now);
                escalatedSince = acceptedAppeal.ReviewedAt!.Value.AddDays(7);
            }
            else
            {
                var overdueAppeals = appeals
                    .Where(a => a.Status == AppealStatus.Pending && a.SubmittedAt.AddDays(7) < now)
                    .OrderBy(a => a.SubmittedAt)
                    .ToList();
                escalatedSince = overdueAppeals[1].SubmittedAt.AddDays(7);
            }
        }
        else if (escalation.ResolvedAt != null)
        {
            escalationStatus = "Resolved";
            var allAssignments = escalation.Assignments?.OrderBy(a => a.AssignedAt).ToList() ?? new List<EscalationAssignment>();
            escalatedSince = allAssignments.FirstOrDefault()?.AssignedAt ?? escalation.ResolvedAt.Value;
        }
        else
        {
            var activeAssignment = escalation.Assignments?.FirstOrDefault(a => a.SupersededAt == null);
            if (activeAssignment == null)
            {
                escalationStatus = "NeedsAssignment";
                escalatedSince = now;
            }
            else if (activeAssignment.AssignedAt.AddDays(7) >= now)
            {
                escalationStatus = "Assigned";
                escalatedSince = activeAssignment.AssignedAt;
            }
            else
            {
                escalationStatus = "NeedsReassignment";
                escalatedSince = activeAssignment.AssignedAt;
            }
        }

        var subject = grade.Enrollment?.Subject;
        var student = grade.Enrollment?.Student;
        var originalProf = subject?.Professor;

        var reason = escalation != null
            ? escalation.Reason.ToString()
            : (isScenarioA ? EscalationReason.AcceptedUnresolved.ToString() : EscalationReason.ChainExhausted.ToString());

        var assignmentHistory = escalation?.Assignments?
            .OrderBy(a => a.AssignedAt)
            .Select(a => new EscalationAssignmentHistoryDto
            {
                AssignedProfessorName = $"{a.AssignedProfessor?.FirstName} {a.AssignedProfessor?.LastName}".Trim(),
                AssignedByAdminName = $"{a.AssignedByAdmin?.FirstName} {a.AssignedByAdmin?.LastName}".Trim(),
                AssignedAt = a.AssignedAt,
                SupersededAt = a.SupersededAt
            })
            .ToList() ?? new List<EscalationAssignmentHistoryDto>();

        var appealDtos = appeals.Select(a => new AppealDto
        {
            Id = a.Id,
            GradeId = a.GradeId,
            EnrollmentId = grade.EnrollmentId,
            Text = a.Text,
            SubmittedAt = a.SubmittedAt,
            Status = ComputeAppealStatus(a, now).ToString(),
            ReviewedAt = a.ReviewedAt,
            StudentFirstName = student?.FirstName,
            StudentLastName = student?.LastName,
            SubjectName = subject?.SubjectName
        }).ToList();

        return new EscalatedCaseDto
        {
            GradeId = grade.Id,
            EnrollmentId = grade.EnrollmentId,
            SubjectName = subject?.SubjectName ?? string.Empty,
            SubjectCode = subject?.SubjectCode ?? string.Empty,
            StudentFirstName = student?.FirstName ?? string.Empty,
            StudentLastName = student?.LastName ?? string.Empty,
            OriginalProfessorId = originalProf?.Id ?? Guid.Empty,
            OriginalProfessorFirstName = originalProf?.FirstName ?? string.Empty,
            OriginalProfessorLastName = originalProf?.LastName ?? string.Empty,
            FinalGrade = grade.FinalGrade,
            Reason = reason,
            EscalationStatus = escalationStatus,
            EscalatedSince = escalatedSince,
            ResolvedAt = escalation?.ResolvedAt,
            Appeals = appealDtos,
            AssignmentHistory = assignmentHistory
        };
    }

    private static HashSet<Guid> BuildExcludeIds(Grade grade)
    {
        var ids = new HashSet<Guid>();
        var originalProfId = grade.Enrollment?.Subject?.ProfessorId ?? Guid.Empty;
        if (originalProfId != Guid.Empty)
            ids.Add(originalProfId);
        if (grade.Escalation?.Assignments != null)
            foreach (var a in grade.Escalation.Assignments)
                ids.Add(a.AssignedProfessorId);
        return ids;
    }

    private static EscalationReason DetermineReason(Grade grade, DateTime now)
    {
        var appeals = grade.Appeals?.ToList() ?? new List<Appeal>();

        bool isScenarioA = appeals.Any(a =>
            a.Status == AppealStatus.Accepted &&
            a.ReviewedAt.HasValue &&
            a.ReviewedAt.Value.AddDays(7) < now);

        return isScenarioA ? EscalationReason.AcceptedUnresolved : EscalationReason.ChainExhausted;
    }

    private static AppealStatus ComputeAppealStatus(Appeal appeal, DateTime now)
    {
        if (appeal.Status == AppealStatus.Pending && appeal.SubmittedAt.AddDays(7) < now)
            return AppealStatus.Overdue;
        return appeal.Status;
    }

    private static UserDto MapUserToDto(User user) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        UserRole = user.UserRole,
        IndexNumber = user.IndexNumber,
        CreatedAt = user.CreatedAt ?? DateTime.MinValue
    };
}
