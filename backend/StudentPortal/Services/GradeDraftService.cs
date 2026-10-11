using StudentPortal.Dtos;
using StudentPortal.Exceptions;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Services;

public class GradeDraftService : IGradeDraftService
{
    private readonly IGradeDraftRepository _draftRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;

    public GradeDraftService(IGradeDraftRepository draftRepository, IEnrollmentRepository enrollmentRepository)
    {
        _draftRepository = draftRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    public async Task<GradeDraftDto?> GetDraftAsync(Guid enrollmentId, Guid callerProfId)
    {
        await VerifyOwnershipAsync(enrollmentId, callerProfId);

        var draft = await _draftRepository.GetByEnrollmentIdAsync(enrollmentId);
        if (draft == null)
            return null;

        return MapToDto(draft);
    }

    public async Task<GradeDraftDto> SaveDraftAsync(Guid enrollmentId, Guid callerProfId, decimal? midterm1Points, decimal? midterm2Points, decimal? attendancePoints, decimal? practicalPoints, decimal? examPoints)
    {
        await VerifyOwnershipAsync(enrollmentId, callerProfId);

        var existing = await _draftRepository.GetByEnrollmentIdAsync(enrollmentId);

        if (existing == null)
        {
            var draft = new GradeDraft
            {
                Id = Guid.NewGuid(),
                EnrollmentId = enrollmentId,
                Midterm1Points = midterm1Points,
                Midterm2Points = midterm2Points,
                AttendancePoints = attendancePoints,
                PracticalPoints = practicalPoints,
                ExamPoints = examPoints,
                LastEditedAt = DateTime.UtcNow
            };
            await _draftRepository.AddAsync(draft);
            return MapToDto(draft);
        }
        else
        {
            existing.Midterm1Points = midterm1Points;
            existing.Midterm2Points = midterm2Points;
            existing.AttendancePoints = attendancePoints;
            existing.PracticalPoints = practicalPoints;
            existing.ExamPoints = examPoints;
            existing.LastEditedAt = DateTime.UtcNow;
            await _draftRepository.UpdateAsync(existing);
            return MapToDto(existing);
        }
    }

    private async Task VerifyOwnershipAsync(Guid enrollmentId, Guid callerProfId)
    {
        var enrollment = await _enrollmentRepository.GetEnrollmentByIdAsync(enrollmentId);
        if (enrollment == null)
            throw new KeyNotFoundException($"Enrollment {enrollmentId} not found.");

        if (enrollment.Subject.ProfessorId != callerProfId)
            throw new ForbiddenAccessException("You do not teach the subject for this enrollment.");
    }

    private static GradeDraftDto MapToDto(GradeDraft draft) => new()
    {
        EnrollmentId = draft.EnrollmentId,
        Midterm1Points = draft.Midterm1Points,
        Midterm2Points = draft.Midterm2Points,
        AttendancePoints = draft.AttendancePoints,
        PracticalPoints = draft.PracticalPoints,
        ExamPoints = draft.ExamPoints,
        LastEditedAt = draft.LastEditedAt
    };
}
