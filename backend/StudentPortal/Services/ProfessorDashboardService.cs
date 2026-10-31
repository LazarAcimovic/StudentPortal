using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Services;

public class ProfessorDashboardService : IProfessorDashboardService
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IAppealRepository _appealRepository;
    private readonly IGradeRepository _gradeRepository;
    private readonly ISubjectRepository _subjectRepository;
    private readonly TimeProvider _timeProvider;

    public ProfessorDashboardService(
        IEnrollmentRepository enrollmentRepository,
        IAppealRepository appealRepository,
        IGradeRepository gradeRepository,
        ISubjectRepository subjectRepository,
        TimeProvider timeProvider)
    {
        _enrollmentRepository = enrollmentRepository;
        _appealRepository = appealRepository;
        _gradeRepository = gradeRepository;
        _subjectRepository = subjectRepository;
        _timeProvider = timeProvider;
    }

    public async Task<ProfessorDashboardDto> GetDashboardAsync(Guid professorId)
    {
        var enrollments = (await _enrollmentRepository.GetEnrollmentsForProfessorDashboardAsync(professorId)).ToList();
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var appeals = (await _appealRepository.GetAppealsByProfessorIdForDashboardAsync(professorId, now)).ToList();
        var assignedGrades = (await _gradeRepository.GetAssignedCasesAsync(professorId)).ToList();

        // The dashboard is subject-driven: every subject the professor teaches
        // appears, even one with no enrolled students yet (the original bug —
        // grouping by enrollment hid student-less subjects).
        var professorSubjects = (await _subjectRepository.GetSubjectsByProfessorIdAsync(professorId))
            .Where(s => !s.IsDeleted)
            .ToList();

        var enrollmentsBySubject = enrollments
            .GroupBy(e => e.Subject.Id)
            .ToDictionary(g => g.Key, g => g.ToList());

        var subjectsById = new Dictionary<Guid, Subject>();
        foreach (var subject in professorSubjects)
            subjectsById[subject.Id] = subject;
        // Fallback: include any subject seen only through an enrollment.
        foreach (var group in enrollmentsBySubject)
            if (!subjectsById.ContainsKey(group.Key))
                subjectsById[group.Key] = group.Value[0].Subject;

        var subjects = subjectsById.Values
            .Select(subject => new ProfessorSubjectDto
            {
                SubjectId = subject.Id,
                SubjectName = subject.SubjectName,
                Ects = subject.ECTS,
                StudentCount = enrollmentsBySubject.TryGetValue(subject.Id, out var rows) ? rows.Count : 0,
            })
            .OrderBy(s => s.SubjectName)
            .ToList();

        var appealRows = appeals.Select(a => BuildAppealRow(a, now)).ToList();
        var assignedCases = assignedGrades.Select(g => BuildAssignedCaseRow(g, now)).ToList();

        return new ProfessorDashboardDto
        {
            Subjects = subjects,
            Appeals = appealRows,
            AssignedCases = assignedCases,
        };
    }

    private static AssignedCaseDto BuildAssignedCaseRow(Grade grade, DateTime now)
    {
        var enrollment = grade.Enrollment;
        var hasAcceptedAwaitingReconfirm = grade.Appeals.Any(a => a.Status == AppealStatus.Accepted);
        var reason = hasAcceptedAwaitingReconfirm
            ? "AcceptedUnresolved"
            : grade.Escalation?.Reason switch
            {
                EscalationReason.AcceptedUnresolved => "AcceptedUnresolved",
                EscalationReason.ChainExhausted => "ChainExhausted",
                _ => "AcceptedUnresolved",
            };

        var appealDtos = grade.Appeals
            .OrderBy(a => a.SubmittedAt)
            .Select(a => new AppealDto
            {
                Id = a.Id,
                GradeId = a.GradeId,
                EnrollmentId = enrollment.Id,
                Text = a.Text,
                SubmittedAt = a.SubmittedAt,
                Status = a.Status == AppealStatus.Pending && a.SubmittedAt.AddDays(7) < now
                    ? "Overdue"
                    : a.Status.ToString(),
                ReviewedAt = a.ReviewedAt,
            })
            .ToList();

        return new AssignedCaseDto
        {
            EnrollmentId = enrollment.Id,
            GradeId = grade.Id,
            SubjectName = enrollment.Subject.SubjectName,
            StudentFirstName = enrollment.Student.FirstName,
            StudentLastName = enrollment.Student.LastName,
            Midterm1Points = grade.Midterm1Points,
            Midterm2Points = grade.Midterm2Points,
            AttendancePoints = grade.AttendancePoints,
            PracticalPoints = grade.PracticalPoints,
            ExamPoints = grade.ExamPoints,
            FinalGrade = grade.FinalGrade,
            Reason = reason,
            Appeals = appealDtos,
        };
    }

    private static ProfessorAppealRowDto BuildAppealRow(Appeal appeal, DateTime now)
    {
        var enrollment = appeal.Grade.Enrollment;
        var isOverdue = appeal.Status == AppealStatus.Pending && appeal.SubmittedAt.AddDays(7) < now;
        var canUndoDeny = appeal.Status == AppealStatus.Denied &&
                          appeal.ReviewedAt != null &&
                          now <= appeal.ReviewedAt.Value.AddHours(24) &&
                          appeal.Grade?.AssignedProfessorId == null;

        return new ProfessorAppealRowDto
        {
            AppealId = appeal.Id,
            GradeId = appeal.GradeId,
            EnrollmentId = enrollment.Id,
            StudentFirstName = enrollment.Student.FirstName,
            StudentLastName = enrollment.Student.LastName,
            SubjectName = enrollment.Subject.SubjectName,
            Text = appeal.Text,
            SubmittedAt = appeal.SubmittedAt,
            Status = isOverdue ? "Overdue" : (appeal.Status == AppealStatus.Denied ? "Denied" : "Pending"),
            ReviewedAt = appeal.ReviewedAt,
            CanUndoDeny = canUndoDeny,
            UndoDenyDeadline = canUndoDeny ? appeal.ReviewedAt!.Value.AddHours(24) : null,
        };
    }
}
