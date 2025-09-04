using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Models.Entities;

namespace StudentPortal.Profiles;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // USER mapiranja
        CreateMap<User, UserDto>();
        CreateMap<UserCreateDto, User>();
        CreateMap<UserUpdateDto, User>();

        //Subject mapiranja

        CreateMap<Subject, SubjectDto>()
            .ForMember(dest => dest.ProfessorFirstName, opt => opt.MapFrom(src => src.Professor.FirstName))
            .ForMember(dest => dest.ProfessorLastName, opt => opt.MapFrom(src => src.Professor.LastName));

        CreateMap<SubjectCreateDto, Subject>();
        CreateMap<SubjectUpdateDto, Subject>();

        // ENROLLMENT mapiranja
        CreateMap<Enrollment, EnrollmentDto>()
            .ForMember(dest => dest.StudentFirstName, opt => opt.MapFrom(src => src.Student.FirstName))
            .ForMember(dest => dest.StudentLastName, opt => opt.MapFrom(src => src.Student.LastName))
            .ForMember(dest => dest.SubjectName, opt => opt.MapFrom(src => src.Subject.SubjectName));
        CreateMap<EnrollmentCreateDto, Enrollment>();
    }
}