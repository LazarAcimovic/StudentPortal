using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;

namespace StudentPortal.Services;

public class SubjectService : ISubjectService
{
    private readonly ISubjectRepository _subjectRepository;
    private readonly IUserRepository _userRepository; 
    private readonly IMapper _mapper;

    public SubjectService(ISubjectRepository subjectRepository, IUserRepository userRepository, IMapper mapper)
    {
        _subjectRepository = subjectRepository;
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<SubjectDto>> GetAllSubjectsAsync()
    {
        var subjects = await _subjectRepository.GetAllSubjectsAsync();
        return _mapper.Map<IEnumerable<SubjectDto>>(subjects);
    }

    public async Task<SubjectDto> GetSubjectByIdAsync(int id)
    {
        var subject = await _subjectRepository.GetSubjectByIdAsync(id);
        if (subject == null) return null;

        return _mapper.Map<SubjectDto>(subject);
    }

    public async Task<SubjectDto> AddSubjectAsync(SubjectCreateDto subjectDto)
    {
      
        var professorExists = await _userRepository.GetUserByIdAsync(subjectDto.ProfessorId);
        if (professorExists == null)
        {
            return null;
        }

        var subject = _mapper.Map<Subject>(subjectDto);

        var createdSubject = await _subjectRepository.AddSubjectAsync(subject);
        return _mapper.Map<SubjectDto>(createdSubject);
    }

    public async Task<SubjectDto> UpdateSubjectAsync(int id, SubjectUpdateDto subjectDto)
    {
        var subjectToUpdate = await _subjectRepository.GetSubjectByIdAsync(id);
        if (subjectToUpdate == null)
        {
            return null;
        }

        _mapper.Map(subjectDto, subjectToUpdate);

        await _subjectRepository.UpdateSubjectAsync(subjectToUpdate);
        var updatedSubject = await _subjectRepository.GetSubjectByIdAsync(id);

        // Mapiramo ažurirani entitet u DTO pre nego što ga vratimo
        return _mapper.Map<SubjectDto>(updatedSubject);
    }

    public async Task<bool> DeleteSubjectAsync(int id)
    {
        var subjectToDelete = await _subjectRepository.GetSubjectByIdAsync(id);
        if (subjectToDelete == null) return false;

        await _subjectRepository.DeleteSubjectAsync(id); 
        return true;
    }

    public async Task<IEnumerable<SubjectDto>> GetSubjectsByProfessorIdAsync(int professorId)
    {
        var subjects = await _subjectRepository.GetSubjectsByProfessorIdAsync(professorId);
        return _mapper.Map<IEnumerable<SubjectDto>>(subjects);
    }

    public async Task<IEnumerable<UserDto>> GetStudentsBySubjectIdAsync(int subjectId)
    {
        var students = await _subjectRepository.GetStudentsBySubjectIdAsync(subjectId);
        return _mapper.Map<IEnumerable<UserDto>>(students);
    }
}