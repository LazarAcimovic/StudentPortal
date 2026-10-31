using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Models.Enums;
using System.Diagnostics;

namespace StudentPortal.Repositories;

public class GradeRepository : IGradeRepository
{
    private readonly StudentPortalApiContext _context;

    public GradeRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Grade>> GetAllGradesAsync()
    {
        return await _context.Grades
                               .Include(g => g.Enrollment)
                               .ThenInclude(e => e.Student)
                               .Include(g => g.Enrollment)
                               .ThenInclude(e => e.Subject)
                               .ToListAsync();
    }

    public async Task<Grade> GetGradeByIdAsync(Guid id)
    {
        return await _context.Grades.AsNoTracking()
                             .Include(g => g.Enrollment)
                              .ThenInclude(e => e.Student)
                               .Include(g => g.Enrollment)
                               .ThenInclude(e => e.Subject)
                             .FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<IEnumerable<Grade>> GetGradeByStudentIdAsync(Guid studentId)
    {
        return await _context.Grades
                             .Include(g => g.Enrollment)
                             .ThenInclude(e => e.Student)
                             .Where(g => g.Enrollment.StudentId == studentId)
                             .ToListAsync();
    }

    public async Task<IEnumerable<Grade>> GetGradesByStudentAndSubjectAsync(Guid studentId, Guid subjectId)
    {
        return await _context.Grades
                             .Include(g => g.Enrollment)
                             .ThenInclude(e => e.Student)
                             .Include(g => g.Enrollment)
                             .ThenInclude(e => e.Subject)
                             .Where(g => g.Enrollment.StudentId == studentId && g.Enrollment.SubjectId == subjectId && !g.IsDeleted)
                             .ToListAsync();
    }

    public async Task<Grade?> GetByEnrollmentIdAsync(Guid enrollmentId)
    {
        return await _context.Grades
            .Include(g => g.Enrollment)
                .ThenInclude(e => e.Subject)
            .Include(g => g.Appeals)
            .FirstOrDefaultAsync(g => g.EnrollmentId == enrollmentId);
    }

    public async Task<Grade> AddGradeAsync(Grade grade)
    {
        await _context.Grades.AddAsync(grade);
        await _context.SaveChangesAsync();

        var createdGrade = await _context.Grades
                                         .Include(g => g.Enrollment) 
                                         .ThenInclude(e => e.Student) 
                                         .Include(g => g.Enrollment) 
                                         .ThenInclude(e => e.Subject) 
                                         .FirstOrDefaultAsync(g => g.Id == grade.Id); 

        return createdGrade;
    }

    public async Task UpdateGradeAsync(Grade grade)
    {
        _context.Grades.Update(grade);
        await _context.SaveChangesAsync();
    }

    public async Task<Grade> ConfirmGradeAsync(Guid id)
    {
        var gradeToConfirm = await _context.Grades.FindAsync(id);
        if (gradeToConfirm != null)
        {
            gradeToConfirm.ConfirmedAt = DateTime.UtcNow;
            _context.Grades.Update(gradeToConfirm);
            await _context.SaveChangesAsync();
            return gradeToConfirm;
        }
        return null;
    }

    public async Task<bool> DeleteGradeAsync(Guid id)
    {
        var gradeToDelete = await _context.Grades.FindAsync(id);
        if (gradeToDelete != null && gradeToDelete.FinalizedAt == null)
        {
            gradeToDelete.IsDeleted = true;
            _context.Grades.Update(gradeToDelete);
            await _context.SaveChangesAsync();
            return true;
        }
        return false;
    }

    public async Task<IEnumerable<Grade>> GetAllWithEscalationDetailsAsync(DateTime now)
    {
        // Candidate grades only (DB §6.3): grades that already have an Escalations row
        // (including resolved, kept for history), OR grades where FinalizedAt IS NULL
        // and at least one escalation trigger condition is met (Scenario A or B).
        // Note: a partial index on Grades WHERE FinalizedAt IS NULL is deferred until
        // EXPLAIN ANALYZE on production-sized data confirms it is needed.
        return await _context.Grades
            .AsSplitQuery()
            .AsNoTracking()
            .Where(g =>
                g.Escalation != null
                || (g.FinalizedAt == null
                    && g.Appeals.Any(a =>
                        a.Status == AppealStatus.Accepted
                        && a.ReviewedAt.HasValue
                        && a.ReviewedAt.Value.AddDays(7) < now))
                || (g.FinalizedAt == null
                    && g.Appeals.Count(a =>
                        a.Status == AppealStatus.Pending
                        && a.SubmittedAt.AddDays(7) < now) >= 2))
            .Include(g => g.Enrollment)
                .ThenInclude(e => e.Student)
            .Include(g => g.Enrollment)
                .ThenInclude(e => e.Subject)
                    .ThenInclude(s => s.Professor)
            .Include(g => g.Appeals)
            .Include(g => g.Escalation)
                .ThenInclude(e => e.Assignments)
                    .ThenInclude(a => a.AssignedProfessor)
            .Include(g => g.Escalation)
                .ThenInclude(e => e.Assignments)
                    .ThenInclude(a => a.AssignedByAdmin)
            .ToListAsync();
    }

    public async Task<Grade?> GetByIdWithEscalationDetailsAsync(Guid id)
    {
        return await _context.Grades
            .AsSplitQuery()
            .Include(g => g.Enrollment)
                .ThenInclude(e => e.Student)
            .Include(g => g.Enrollment)
                .ThenInclude(e => e.Subject)
                    .ThenInclude(s => s.Professor)
            .Include(g => g.Appeals)
            .Include(g => g.Escalation)
                .ThenInclude(e => e.Assignments)
                    .ThenInclude(a => a.AssignedProfessor)
            .Include(g => g.Escalation)
                .ThenInclude(e => e.Assignments)
                    .ThenInclude(a => a.AssignedByAdmin)
            .FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<IEnumerable<Grade>> GetAssignedCasesAsync(Guid professorId)
    {
        return await _context.Grades
            .AsSplitQuery()
            .AsNoTracking()
            .Where(g => g.AssignedProfessorId == professorId && g.FinalizedAt == null)
            .Include(g => g.Enrollment)
                .ThenInclude(e => e.Student)
            .Include(g => g.Enrollment)
                .ThenInclude(e => e.Subject)
            .Include(g => g.Appeals)
            .Include(g => g.Escalation)
            .ToListAsync();
    }
}