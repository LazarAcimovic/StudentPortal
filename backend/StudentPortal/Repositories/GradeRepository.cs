using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

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
        return await _context.Grades.AsNoTracking().ToListAsync();
    }

    public async Task<Grade> GetGradeByIdAsync(int id)
    {
        return await _context.Grades.AsNoTracking()
                             .Include(g => g.Enrollment)
                             .FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<IEnumerable<Grade>> GetGradeByStudentIdAsync(int studentId)
    {
        return await _context.Grades
                             .Include(g => g.Enrollment)
                             .Where(g => g.Enrollment.StudentId == studentId)
                             .Include(g => g.Student) 
                             .Include(g => g.Subject) 
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

    public async Task DeleteGradeAsync(int id)
    {
        var gradeToDelete = await _context.Grades.FindAsync(id);
        if (gradeToDelete != null)
        {
            _context.Grades.Remove(gradeToDelete);
            await _context.SaveChangesAsync();
        }
    }
}