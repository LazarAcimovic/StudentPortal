using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Services;

public class StudentDashboardService : IStudentDashboardService
{
    private readonly IUserRepository _userRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;

    public StudentDashboardService(IUserRepository userRepository, IEnrollmentRepository enrollmentRepository)
    {
        _userRepository = userRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    public async Task<StudentDashboardDto> GetDashboardAsync(Guid studentId)
    {
        var student = await _userRepository.GetUserByIdAsync(studentId);
        if (student == null)
            throw new KeyNotFoundException("Student not found.");

        var enrollments = (await _enrollmentRepository.GetStudentEnrollmentsForDashboardAsync(studentId)).ToList();
        var now = DateTime.UtcNow;

        var subjectRows = enrollments.Select(e => BuildSubjectRow(e, now)).ToList();

        var passedRows = subjectRows.Where(r => r.Status == "Passed").ToList();
        var averageGrade = passedRows.Count > 0
            ? Math.Round(passedRows.Average(r => (double)r.FinalGrade!.Value), 2)
            : 0.0;

        var earnedEcts = subjectRows.Where(r => r.Status == "Passed").Sum(r => r.Ects);

        return new StudentDashboardDto
        {
            Profile = new StudentProfileDto
            {
                FirstName = student.FirstName,
                LastName = student.LastName,
                Email = student.Email,
                IndexNumber = student.IndexNumber,
            },
            Stats = new StudyStatsDto
            {
                AverageGrade = averageGrade,
                PassedExams = passedRows.Count,
                NonPassedExams = subjectRows.Count - passedRows.Count,
                EarnedEcts = earnedEcts,
            },
            Subjects = subjectRows,
        };
    }

    private static SubjectRowDto BuildSubjectRow(Enrollment enrollment, DateTime now)
    {
        var subject = enrollment.Subject;
        var professor = subject.Professor;
        var grade = enrollment.Grade;

        var row = new SubjectRowDto
        {
            SubjectId = subject.Id,
            EnrollmentId = enrollment.Id,
            SubjectName = subject.SubjectName,
            ProfessorName = $"{professor.FirstName} {professor.LastName}",
            Ects = subject.ECTS,
        };

        if (grade == null)
        {
            row.Status = "Not graded";
            return row;
        }

        row.FinalGrade = grade.FinalGrade;
        var appeals = grade.Appeals.OrderBy(a => a.SubmittedAt).ToList();

        if (IsGradeTrulyFinal(grade, appeals, now))
        {
            row.Status = grade.FinalGrade >= 6 ? "Passed" : "Failed";
            if (appeals.Any(a => a.Status == AppealStatus.Denied))
                row.AppealStatus = "Appeal denied";
            return row;
        }

        // Active pending appeal (not overdue)
        var activePending = appeals.FirstOrDefault(a =>
            a.Status == AppealStatus.Pending && a.SubmittedAt.AddDays(7) >= now);
        if (activePending != null)
        {
            row.Status = "Appeal pending";
            row.PendingAppealId = activePending.Id;
            return row;
        }

        // Accepted appeal awaiting re-confirm
        var acceptedAppeal = appeals.FirstOrDefault(a => a.Status == AppealStatus.Accepted);
        if (acceptedAppeal != null)
        {
            row.Status = "Appeal pending";
            row.PendingAppealId = acceptedAppeal.Id;
            return row;
        }

        // Overdue appeals
        var overdueAppeals = appeals
            .Where(a => a.Status == AppealStatus.Pending && a.SubmittedAt.AddDays(7) < now)
            .OrderByDescending(a => a.SubmittedAt)
            .ToList();

        if (overdueAppeals.Count > 0)
        {
            var latestOverdue = overdueAppeals[0];
            var overdueAt = latestOverdue.SubmittedAt.AddDays(7);
            var windowEnd = overdueAt.AddDays(7);

            row.Status = "Awaiting confirmation";

            // One overdue appeal means student gets a fresh window; two means chain exhausted
            if (overdueAppeals.Count < 2 && now <= windowEnd)
            {
                row.CanWriteAppeal = true;
                row.ConfirmationDeadline = windowEnd;
            }
            return row;
        }

        // Initial 7-day window
        var initialDeadline = grade.ConfirmedAt.AddDays(7);
        row.Status = "Awaiting confirmation";
        if (now <= initialDeadline)
        {
            row.ConfirmationDeadline = initialDeadline;
            row.CanWriteAppeal = true;
            row.CanConfirmGrade = true;
        }

        return row;
    }

    private static bool IsGradeTrulyFinal(Grade grade, IList<Appeal> appeals, DateTime now)
    {
        if (grade.FinalizedAt != null) return true;
        // Auto-finalize: initial window expired with no appeals ever submitted
        if (!appeals.Any() && grade.ConfirmedAt.AddDays(7) < now) return true;
        return false;
    }
}
