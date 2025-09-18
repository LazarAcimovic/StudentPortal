using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
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

    public async Task<Grade> GetGradeByIdAsync(int id)
    {
        return await _context.Grades.AsNoTracking()
                             .Include(g => g.Enrollment)
                              .ThenInclude(e => e.Student)
                               .Include(g => g.Enrollment)
                               .ThenInclude(e => e.Subject)
                             .FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<IEnumerable<Grade>> GetGradeByStudentIdAsync(int studentId)
    {
        return await _context.Grades
                             .Include(g => g.Enrollment)
                             .ThenInclude(e => e.Student)
                             .Where(g => g.Enrollment.StudentId == studentId)
                             .ToListAsync();
    }

    public async Task<IEnumerable<Grade>> GetGradesByStudentAndSubjectAsync(int studentId, int subjectId)
    {
        return await _context.Grades
                             .Include(g => g.Enrollment)
                             .ThenInclude(e => e.Student)
                             .Include(g => g.Enrollment)
                             .ThenInclude(e => e.Subject)
                             .Where(g => g.Enrollment.StudentId == studentId && g.Enrollment.SubjectId == subjectId && !g.IsDeleted)
                             .ToListAsync();
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

    public async Task<Grade> ConfirmGradeAsync(int id)
    {
        var gradeToConfirm = await _context.Grades.FindAsync(id);
        if (gradeToConfirm != null)
        {
            gradeToConfirm.IsConfirmed = true;
            _context.Grades.Update(gradeToConfirm);
            await _context.SaveChangesAsync();
            return gradeToConfirm;
        }
        return null;
    }

    public async Task<bool> DeleteGradeAsync(int id)
    {
        var gradeToDelete = await _context.Grades.FindAsync(id);
        if (gradeToDelete != null && !gradeToDelete.IsConfirmed)
        {
            gradeToDelete.IsDeleted = true;
            _context.Grades.Update(gradeToDelete);
            await _context.SaveChangesAsync();
            return true;
        }
        return false;
    }
}