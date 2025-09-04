using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Models.Entities;
using StudentPortal.Interfaces;

namespace StudentPortal.Services;

public class EnrollmentService : IEnrollmentService
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IUserRepository _userRepository;
    private readonly ISubjectRepository _subjectRepository;
    private readonly IMapper _mapper;

    public EnrollmentService(IEnrollmentRepository enrollmentRepository, IUserRepository userRepository, ISubjectRepository subjectRepository, IMapper mapper)
    {
        _enrollmentRepository = enrollmentRepository;
        _userRepository = userRepository;
        _subjectRepository = subjectRepository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<EnrollmentDto>> GetAllEnrollmentsAsync()
    {
        var enrollments = await _enrollmentRepository.GetAllEnrollmentsAsync();
        return _mapper.Map<IEnumerable<EnrollmentDto>>(enrollments);
    }

    public async Task<IEnumerable<EnrollmentDto>> GetEnrollmentsByStudentIdAsync(int studentId)
    {
        var enrollments = await _enrollmentRepository.GetEnrollmentByIdAsync(studentId);
        return _mapper.Map<IEnumerable<EnrollmentDto>>(enrollments);
    }

    public async Task<EnrollmentDto> AddEnrollmentAsync(EnrollmentCreateDto enrollmentDto)
    {
     
        var student = await _userRepository.GetUserByIdAsync(enrollmentDto.StudentId);
        if (student == null || student.IsDeleted)
        {
            return null;
        }

        
        var subject = await _subjectRepository.GetSubjectByIdAsync(enrollmentDto.SubjectId);
        if (subject == null || subject.IsDeleted)
        {
            return null;
        }

     
        var existingEnrollment = await _enrollmentRepository.GetEnrollmentByStudentAndSubjectIdAsync(enrollmentDto.StudentId, enrollmentDto.SubjectId);
        if (existingEnrollment != null)
        {
            return null; 
        }

        var newEnrollment = _mapper.Map<Enrollment>(enrollmentDto);

        await _enrollmentRepository.AddEnrollmentAsync(newEnrollment);

        var createdEnrollment = await _enrollmentRepository.GetEnrollmentByIdAsync(newEnrollment.Id);

        return _mapper.Map<EnrollmentDto>(createdEnrollment);
    }

    public async Task<bool> DeleteEnrollmentAsync(int enrollmentId)
    {
        var enrollmentToDelete = await _enrollmentRepository.GetEnrollmentByIdAsync(enrollmentId);
        if (enrollmentToDelete == null) return false;

        await _enrollmentRepository.DeleteEnrollmentAsync(enrollmentId);
        return true;
    }
}