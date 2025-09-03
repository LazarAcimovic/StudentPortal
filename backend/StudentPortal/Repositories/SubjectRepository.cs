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

    public async Task<IEnumerable<Subject>> GetAllSubjectAsync()
    {
        return await _context.Subjects.AsNoTracking().ToListAsync();
    }

    public async Task<Subject> GetSubjectByIdAsync(int id)
    {
        return await _context.Subjects.AsNoTracking()
                             .Include(s => s.Professor) //to include professor
                             .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task AddSubjectAsync(Subject subject)
    {
        await _context.Subjects.AddAsync(subject);
        await _context.SaveChangesAsync();
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
}