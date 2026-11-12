using Microsoft.EntityFrameworkCore;
using StudentPortal.Dtos;
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

    public async Task<Subject> GetSubjectByIdAsync(Guid id)
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

    public async Task DeleteSubjectAsync(Guid id)
    {
        var subjectToDelete = await _context.Subjects.FindAsync(id);
        if (subjectToDelete != null)
        {
            subjectToDelete.IsDeleted = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<Subject>> GetSubjectsByProfessorIdAsync(Guid professorId)
    {
        return await _context.Subjects
            .Where(s => s.ProfessorId == professorId)
            .Include(s => s.Professor)
            .ToListAsync();
    }

    public async Task<IEnumerable<UserSearchResultDto>> GetStudentsBySubjectIdAsync(Guid subjectId)
    {
        return await _context.Enrollments
            .Where(e => e.SubjectId == subjectId && !e.IsDeleted)
            .Select(e => new UserSearchResultDto
            {
                Id = e.Student.Id,
                FirstName = e.Student.FirstName,
                LastName = e.Student.LastName,
                IndexNumber = e.Student.IndexNumber,
            })
            .ToListAsync();
    }

    public async Task<(IReadOnlyList<Subject> Items, int TotalCount)> GetPagedAsync(int page, int pageSize)
    {
        var baseQuery = _context.Subjects.AsNoTracking();
        var totalCount = await baseQuery.CountAsync();
        var items = await baseQuery
            .Include(s => s.Professor)
            .OrderBy(s => s.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<Subject> Items, int TotalCount)> SearchAsync(
        string? query, int page, int pageSize)
    {
        var q = _context.Subjects
            .AsNoTracking()
            .Where(s => !s.IsDeleted);

        if (!string.IsNullOrEmpty(query))
            q = q.Where(s => EF.Functions.ILike(s.SubjectName, $"%{query}%")
                          || EF.Functions.ILike(s.SubjectCode, $"%{query}%"));

        var totalCount = await q.CountAsync();
        var items = await q
            .OrderBy(s => s.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (items, totalCount);
    }
}