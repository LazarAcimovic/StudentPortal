using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Repositories;

public class SubjectRepository : ISubjectRepository
{
    private readonly StudentPortalApiContext _context;

    public SubjectRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    // Include() se koristi za sve predmete
    public async Task<IEnumerable<Subject>> GetAllSubjectsAsync()
    {
        return await _context.Subjects
            .Include(s => s.Professor)
            .ToListAsync();
    }

    public async Task<Subject> GetSubjectByIdAsync(int id)
    {
        return await _context.Subjects
                             .Include(s => s.Professor) 
                             .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<Subject> AddSubjectAsync(Subject subject)
    {
        await _context.Subjects.AddAsync(subject);
        await _context.SaveChangesAsync();

        var createdSubject = await _context.Subjects
    .Include(s => s.Professor)
    .FirstOrDefaultAsync(s => s.Id == subject.Id);
        return createdSubject;
    }

    public async Task UpdateSubjectAsync(Subject subject)
    {
        _context.Subjects.Update(subject);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteSubjectAsync(int id)
    {
        var subjectToDelete = await _context.Subjects.FindAsync(id);
        if (subjectToDelete != null)
        {
            _context.Subjects.Remove(subjectToDelete);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<Subject>> GetSubjectsByProfessorIdAsync(int professorId)
    {
        return await _context.Subjects
            .Where(s => s.ProfessorId == professorId)
            .Include(s => s.Professor)
            .ToListAsync();
    }

    public async Task<IEnumerable<User>> GetStudentsBySubjectIdAsync(int subjectId)
    {
        return await _context.Enrollments
            .Where(e => e.SubjectId == subjectId)
            .Select(e => e.Student)
            .Include(s => s.UserRole)
            .ToListAsync();
    }
}