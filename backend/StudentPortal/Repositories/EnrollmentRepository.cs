using Microsoft.EntityFrameworkCore;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Repositories;

public class EnrollmentRepository : IEnrollmentRepository
{
    private readonly StudentPortalApiContext _context;

    public EnrollmentRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Enrollment>> GetAllEnrollmentAsync()
    {
        return await _context.Enrollments.AsNoTracking().ToListAsync();
    }

    public async Task<Enrollment> GetEnrollmentByIdAsync(int id)
    {
        return await _context.Enrollments.AsNoTracking()
                             .Include(e => e.Student)
                             .Include(e => e.Subject)
                             .FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task AddEnrollmentAsync(Enrollment enrollment)
    {
        await _context.Enrollments.AddAsync(enrollment);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateEnrollmentAsync(Enrollment enrollment)
    {
        _context.Enrollments.Update(enrollment);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteEnrollmentAsync(int id)
    {
        var enrollmentToDelete = await _context.Enrollments.FindAsync(id);
        if (enrollmentToDelete != null)
        {
            _context.Enrollments.Remove(enrollmentToDelete);
            await _context.SaveChangesAsync();
        }
    }
}