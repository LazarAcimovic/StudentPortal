using Microsoft.EntityFrameworkCore;
using StudentPortal.Models.Entities;
using StudentPortal.Interfaces;

namespace StudentPortal.Repositories;

public class EnrollmentRepository : IEnrollmentRepository
{
    private readonly StudentPortalApiContext _context;

    public EnrollmentRepository(StudentPortalApiContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Enrollment>> GetAllEnrollmentsAsync()
    {
        return await _context.Enrollments
                             .AsNoTracking()
                             .Include(e => e.Student)  
                             .Include(e => e.Subject)  
                             .ToListAsync();
    }

    public async Task<Enrollment> GetEnrollmentByIdAsync(int id)
    {
        return await _context.Enrollments
                             .AsNoTracking()
                             .Include(e => e.Student)
                             .Include(e => e.Subject)
                             .FirstOrDefaultAsync(e => e.Id == id);
    }

    // Dodatna metoda za poslovnu logiku
    public async Task<Enrollment> GetEnrollmentByStudentAndSubjectIdAsync(int studentId, int subjectId)
    {
        return await _context.Enrollments
                             .AsNoTracking()
                             .FirstOrDefaultAsync(e => e.StudentId == studentId && e.SubjectId == subjectId);
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

        if (enrollmentToDelete!= null)
        {
            _context.Enrollments.Remove(enrollmentToDelete);
            await _context.SaveChangesAsync();
        }
   
        
    }
}