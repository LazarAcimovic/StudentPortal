using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;

namespace StudentPortal.Services;

public class GradeService : IGradeService
{
    private readonly IGradeRepository _gradeRepository;
    private readonly IGradeDraftRepository _draftRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;

    public GradeService(
        IGradeRepository gradeRepository,
        IGradeDraftRepository draftRepository,
        IEnrollmentRepository enrollmentRepository)
    {
        _gradeRepository = gradeRepository;
        _draftRepository = draftRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    public async Task<GradeDto?> GetByEnrollmentAsync(Guid enrollmentId, Guid callerProfId)
    {
        await VerifyOwnershipAsync(enrollmentId, callerProfId);

        var grade = await _gradeRepository.GetByEnrollmentIdAsync(enrollmentId);
        return grade == null ? null : MapToDto(grade);
    }

    public async Task<GradeDto> ConfirmGradeAsync(Guid enrollmentId, Guid callerProfId)
    {
        await VerifyOwnershipAsync(enrollmentId, callerProfId);

        var draft = await _draftRepository.GetByEnrollmentIdAsync(enrollmentId);
        if (draft == null)
            throw new InvalidOperationException("No draft exists for this enrollment.");

        if (draft.Midterm1Points == null || draft.Midterm2Points == null ||
            draft.AttendancePoints == null || draft.PracticalPoints == null ||
            draft.ExamPoints == null)
            throw new InvalidOperationException("All five point fields must be filled before confirming.");

        var existingGrade = await _gradeRepository.GetByEnrollmentIdAsync(enrollmentId);
        if (existingGrade != null)
            throw new InvalidOperationException("A grade already exists for this enrollment.");

        var sum = draft.Midterm1Points.Value + draft.Midterm2Points.Value +
                  draft.AttendancePoints.Value + draft.PracticalPoints.Value +
                  draft.ExamPoints.Value;

        var grade = new Grade
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollmentId,
            Midterm1Points = draft.Midterm1Points.Value,
            Midterm2Points = draft.Midterm2Points.Value,
            AttendancePoints = draft.AttendancePoints.Value,
            PracticalPoints = draft.PracticalPoints.Value,
            ExamPoints = draft.ExamPoints.Value,
            FinalGrade = ComputeFinalGrade(sum),
            ConfirmedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _gradeRepository.AddGradeAsync(grade);
        await _draftRepository.DeleteAsync(draft);

        var saved = await _gradeRepository.GetByEnrollmentIdAsync(enrollmentId);
        return MapToDto(saved!);
    }

    public async Task<GradeDto> ReconfirmExamAsync(Guid enrollmentId, Guid callerProfId, decimal examPoints)
    {
        await VerifyOwnershipAsync(enrollmentId, callerProfId);

        var grade = await _gradeRepository.GetByEnrollmentIdAsync(enrollmentId);
        if (grade == null)
            throw new KeyNotFoundException("No confirmed grade exists for this enrollment.");

        var acceptedAppeal = grade.Appeals
            .FirstOrDefault(a => a.Status == AppealStatus.Accepted);

        if (acceptedAppeal == null)
            throw new InvalidOperationException("Re-confirm is only allowed after an appeal has been accepted.");

        var sum = grade.Midterm1Points + grade.Midterm2Points +
                  grade.AttendancePoints + grade.PracticalPoints + examPoints;

        grade.ExamPoints = examPoints;
        grade.FinalGrade = ComputeFinalGrade(sum);
        grade.ConfirmedAt = DateTime.UtcNow;
        grade.FinalizedAt = DateTime.UtcNow;

        await _gradeRepository.UpdateGradeAsync(grade);

        var saved = await _gradeRepository.GetByEnrollmentIdAsync(enrollmentId);
        return MapToDto(saved!);
    }

    private async Task VerifyOwnershipAsync(Guid enrollmentId, Guid callerProfId)
    {
        var enrollment = await _enrollmentRepository.GetEnrollmentByIdAsync(enrollmentId);
        if (enrollment == null)
            throw new KeyNotFoundException($"Enrollment {enrollmentId} not found.");

        if (enrollment.Subject.ProfessorId != callerProfId)
            throw new ForbiddenAccessException("You do not teach the subject for this enrollment.");
    }

    private static int ComputeFinalGrade(decimal sum)
    {
        if (sum <= 50) return 5;
        if (sum <= 60) return 6;
        if (sum <= 70) return 7;
        if (sum <= 80) return 8;
        if (sum <= 90) return 9;
        return 10;
    }

    private static GradeDto MapToDto(Grade grade) => new()
    {
        Id = grade.Id,
        EnrollmentId = grade.EnrollmentId,
        Midterm1Points = grade.Midterm1Points,
        Midterm2Points = grade.Midterm2Points,
        AttendancePoints = grade.AttendancePoints,
        PracticalPoints = grade.PracticalPoints,
        ExamPoints = grade.ExamPoints,
        FinalGrade = grade.FinalGrade,
        ConfirmedAt = grade.ConfirmedAt,
        StudentConfirmedAt = grade.StudentConfirmedAt,
        FinalizedAt = grade.FinalizedAt,
        StudentFirstName = grade.Enrollment?.Student?.FirstName,
        StudentLastName = grade.Enrollment?.Student?.LastName,
        SubjectName = grade.Enrollment?.Subject?.SubjectName,
    };
}
