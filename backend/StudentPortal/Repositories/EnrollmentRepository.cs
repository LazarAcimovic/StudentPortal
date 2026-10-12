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

    public async Task<Enrollment> GetEnrollmentByIdAsync(Guid id)
    {
        return await _context.Enrollments
                             .AsNoTracking()
                             .Include(e => e.Student)
                             .Include(e => e.Subject)
                             .FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task<Enrollment> GetByIdAsync(Guid id)
    {
        return await _context.Enrollments
                             .AsNoTracking()
                             .FirstOrDefaultAsync(e => e.Id == id);
    }

    //to check if student is already enrolled
    public async Task<Enrollment> GetEnrollmentByStudentAndSubjectIdAsync(Guid studentId, Guid subjectId)
    {
        return await _context.Enrollments
                             .AsNoTracking()
                             .FirstOrDefaultAsync(e => e.StudentId == studentId && e.SubjectId == subjectId);
    }

    public async Task<Enrollment> AddEnrollmentAsync(Enrollment enrollment)
    {
        _context.Users.Any(x => x.Id == enrollment.StudentId && !x.IsDeleted);

        await _context.Enrollments.AddAsync(enrollment);
        await _context.SaveChangesAsync();

        var createdEnrollment = await _context.Enrollments
             .Include(e => e.Student)
             .Include(e => e.Subject)
             .FirstOrDefaultAsync(e => e.SubjectId == enrollment.SubjectId && e.StudentId == enrollment.StudentId);

        return createdEnrollment;

    }

    public async Task UpdateEnrollmentAsync(Enrollment enrollment)
    {
        _context.Enrollments.Update(enrollment);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteEnrollmentAsync(Guid id)
    {
        var enrollmentToDelete = await _context.Enrollments.FindAsync(id);

        if (enrollmentToDelete!= null)
        {
            _context.Enrollments.Remove(enrollmentToDelete);
            await _context.SaveChangesAsync();
        }
   
        
    }

    public async Task<IEnumerable<Enrollment>> GetStudentEnrollmentsWithDetailsAsync(Guid studentId)
    {
        return await _context.Enrollments
            .Where(e => e.StudentId == studentId)
            .Include(e => e.Subject)
            .Include(e => e.Grade)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IEnumerable<Enrollment>> GetStudentEnrollmentsForDashboardAsync(Guid studentId)
    {
        return await _context.Enrollments
            .Where(e => e.StudentId == studentId && !e.IsDeleted)
            .Include(e => e.Subject)
                .ThenInclude(s => s.Professor)
            .Include(e => e.Grade)
                .ThenInclude(g => g!.Appeals)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IEnumerable<Enrollment>> GetEnrollmentsForProfessorDashboardAsync(Guid professorId)
    {
        return await _context.Enrollments
            .Where(e => !e.IsDeleted && e.Subject.ProfessorId == professorId && !e.Subject.IsDeleted)
            .Include(e => e.Subject)
            .Include(e => e.Student)
            .Include(e => e.Grade)
                .ThenInclude(g => g!.Appeals)
            .Include(e => e.GradeDraft)
            .AsNoTracking()
            .OrderBy(e => e.Subject.SubjectName)
                .ThenBy(e => e.Student.LastName)
                .ThenBy(e => e.Student.FirstName)
            .ToListAsync();
    }
}