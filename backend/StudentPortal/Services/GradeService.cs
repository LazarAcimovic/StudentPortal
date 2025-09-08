using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Repositories;

namespace StudentPortal.Services;

public class GradeService : IGradeService
{
    private readonly IGradeRepository _gradeRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IMapper _mapper;

    public GradeService(IGradeRepository gradeRepository, IEnrollmentRepository enrollmentRepository, IMapper mapper)
    {
        _gradeRepository = gradeRepository;
        _enrollmentRepository = enrollmentRepository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<GradeDto>> GetAllGradesAsync()
    {
        var grades = await _gradeRepository.GetAllGradesAsync();
        return _mapper.Map<IEnumerable<GradeDto>>(grades);
    }

    public async Task<IEnumerable<GradeDto>> GetGradesByStudentIdAsync(int studentId)
    {
        var grades = await _gradeRepository.GetGradeByStudentIdAsync(studentId);
        return _mapper.Map<IEnumerable<GradeDto>>(grades);
    }

    public async Task<GradeDto> GetGradeByIdAsync(int id)
    {
        var grade = await _gradeRepository.GetGradeByIdAsync(id);
        if (grade== null) return null;

        return _mapper.Map<GradeDto>(grade);
    }

    public async Task<GradeDto> AddGradeAsync(GradeCreateDto gradeDto)
    {
        // only applied if student is enrolled
        var enrollment = await _enrollmentRepository.GetEnrollmentByStudentAndSubjectIdAsync(gradeDto.StudentId, gradeDto.SubjectId);
        if (enrollment != null)
        {
            var grade = _mapper.Map<Grade>(gradeDto);
            var createdGrade = await _gradeRepository.AddGradeAsync(grade);

            return _mapper.Map<GradeDto>(createdGrade);
        }
        else
        {
            return null;
        }

      
    }

    public async Task<GradeDto> UpdateGradeAsync(int id, GradeUpdateDto gradeDto)
    {
        var gradeToUpdate = await _gradeRepository.GetGradeByIdAsync(id);
        if (gradeToUpdate == null) return null;

        _mapper.Map(gradeDto, gradeToUpdate);

        await _gradeRepository.UpdateGradeAsync(gradeToUpdate);

        var updatedGrade = await _gradeRepository.GetGradeByIdAsync(gradeToUpdate.Id);
        return _mapper.Map<GradeDto>(updatedGrade);
    }

    public async Task<bool> DeleteGradeAsync(int id)
    {
        var gradeToDelete = await _gradeRepository.GetGradeByIdAsync(id);
        if (gradeToDelete == null) return false;

        await _gradeRepository.DeleteGradeAsync(id);
        return true;
    }
}