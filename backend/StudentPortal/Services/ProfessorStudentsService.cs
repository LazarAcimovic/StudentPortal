using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Services;

public class ProfessorStudentsService : IProfessorStudentsService
{
    private readonly ISubjectRepository _subjectRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly TimeProvider _timeProvider;

    public ProfessorStudentsService(
        ISubjectRepository subjectRepository,
        IEnrollmentRepository enrollmentRepository,
        TimeProvider timeProvider)
    {
        _subjectRepository = subjectRepository;
        _enrollmentRepository = enrollmentRepository;
        _timeProvider = timeProvider;
    }

    public async Task<PagedResultDto<ProfessorStudentRowDto>> GetPagedStudentsAsync(
        Guid subjectId, Guid professorId, int page, int pageSize)
    {
        var subject = await _subjectRepository.GetSubjectByIdAsync(subjectId);
        if (subject == null || subject.IsDeleted || subject.ProfessorId != professorId)
            throw new UnauthorizedAccessException();

        var (enrollments, totalCount) = await _enrollmentRepository
            .GetPagedStudentsForSubjectAsync(subjectId, page, pageSize);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var items = enrollments.Select(e => BuildStudentRow(e, now)).ToList();

        return new PagedResultDto<ProfessorStudentRowDto> { Items = items, TotalCount = totalCount };
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

        if (grade.FinalizedAt != null)
            return "Finalized";

        if (grade.Appeals.Any(a => a.Status == AppealStatus.Accepted))
            return "ReconfirmNeeded";

        if (!grade.Appeals.Any() && grade.ConfirmedAt.AddDays(7) < now)
            return "Finalized";

        return "Confirmed";
    }
}
