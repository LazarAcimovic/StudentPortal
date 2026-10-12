using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Services;

public class ProfessorDashboardService : IProfessorDashboardService
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IAppealRepository _appealRepository;

    public ProfessorDashboardService(
        IEnrollmentRepository enrollmentRepository,
        IAppealRepository appealRepository)
    {
        _enrollmentRepository = enrollmentRepository;
        _appealRepository = appealRepository;
    }

    public async Task<ProfessorDashboardDto> GetDashboardAsync(Guid professorId)
    {
        var enrollments = (await _enrollmentRepository.GetEnrollmentsForProfessorDashboardAsync(professorId)).ToList();
        var appeals = (await _appealRepository.GetAppealsByProfessorIdForDashboardAsync(professorId)).ToList();

        var now = DateTime.UtcNow;

        var subjects = enrollments
            .GroupBy(e => e.Subject.Id)
            .Select(g =>
            {
                var subject = g.First().Subject;
                return new ProfessorSubjectDto
                {
                    SubjectId = subject.Id,
                    SubjectName = subject.SubjectName,
                    Ects = subject.ECTS,
                    Students = g.Select(e => BuildStudentRow(e, now)).ToList(),
                };
            })
            .OrderBy(s => s.SubjectName)
            .ToList();

        var appealRows = appeals.Select(a => BuildAppealRow(a, now)).ToList();

        return new ProfessorDashboardDto
        {
            Subjects = subjects,
            Appeals = appealRows,
        };
    }

    private static ProfessorStudentRowDto BuildStudentRow(Enrollment enrollment, DateTime now)
    {
        var student = enrollment.Student;
        var grade = enrollment.Grade;
        var draft = enrollment.GradeDraft;

        return new ProfessorStudentRowDto
        {
            EnrollmentId = enrollment.Id,
            StudentId = student.Id,
            FirstName = student.FirstName,
            LastName = student.LastName,
            IndexNumber = student.IndexNumber,
            GradeState = ComputeGradeState(grade, draft, now),
            FinalGrade = grade?.FinalGrade,
            HasActiveAppeal = grade != null && grade.Appeals.Any(a =>
                a.Status == AppealStatus.Pending ||
                a.Status == AppealStatus.Accepted),
        };
    }

    private static string ComputeGradeState(Grade? grade, GradeDraft? draft, DateTime now)
    {
        if (grade == null)
            return draft != null ? "Draft" : "NotGraded";

        if (grade.Appeals.Any(a => a.Status == AppealStatus.Accepted))
            return "ReconfirmNeeded";

        if (grade.FinalizedAt != null)
            return "Finalized";

        // Auto-finalize: initial window expired with no appeals
        if (!grade.Appeals.Any() && grade.ConfirmedAt.AddDays(7) < now)
            return "Finalized";

        return "Confirmed";
    }

    private static ProfessorAppealRowDto BuildAppealRow(Appeal appeal, DateTime now)
    {
        var enrollment = appeal.Grade.Enrollment;
        var isOverdue = appeal.Status == AppealStatus.Pending && appeal.SubmittedAt.AddDays(7) < now;
        var canUndoDeny = appeal.Status == AppealStatus.Denied &&
                          appeal.ReviewedAt != null &&
                          now <= appeal.ReviewedAt.Value.AddHours(24);

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
