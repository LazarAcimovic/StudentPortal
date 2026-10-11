using AutoMapper;
using StudentPortal.Dtos;
using StudentPortal.Models.Entities;

namespace StudentPortal.Profiles;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<User, UserDto>();
        CreateMap<AdminCreateUserDto, User>()
            .ForMember(dest => dest.UserPassword, opt => opt.MapFrom(src => src.Password))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

        CreateMap<AdminUpdateUserDto, User>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.UserPassword, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

        CreateMap<UpdateProfileDto, User>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.UserPassword, opt => opt.Ignore())
            .ForMember(dest => dest.UserRole, opt => opt.Ignore())
            .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.IndexNumber, opt => opt.Ignore())
            .ForMember(dest => dest.Enrollments, opt => opt.Ignore())
            .ForMember(dest => dest.Subjects, opt => opt.Ignore());


        CreateMap<Subject, SubjectDto>()
            .ForMember(dest => dest.ProfessorFirstName, opt => opt.MapFrom(src => src.Professor.FirstName))
            .ForMember(dest => dest.ProfessorLastName, opt => opt.MapFrom(src => src.Professor.LastName));

        CreateMap<SubjectCreateDto, Subject>();
        CreateMap<SubjectUpdateDto, Subject>();

        CreateMap<Enrollment, EnrollmentDto>()
            .ForMember(dest => dest.StudentFirstName, opt => opt.MapFrom(src => src.Student.FirstName))
            .ForMember(dest => dest.StudentLastName, opt => opt.MapFrom(src => src.Student.LastName))
            .ForMember(dest => dest.SubjectName, opt => opt.MapFrom(src => src.Subject.SubjectName));
        CreateMap<EnrollmentCreateDto, Enrollment>();


        CreateMap<Grade, GradeDto>()
            .ForMember(dest => dest.StudentFirstName, opt => opt.MapFrom(src => src.Enrollment.Student.FirstName))
            .ForMember(dest => dest.StudentLastName, opt => opt.MapFrom(src => src.Enrollment.Student.LastName))
            .ForMember(dest => dest.SubjectName, opt => opt.MapFrom(src => src.Enrollment.Subject.SubjectName));

        CreateMap<GradeCreateDto, Grade>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.FinalGrade, opt => opt.Ignore())
            .ForMember(dest => dest.ConfirmedAt, opt => opt.Ignore())
            .ForMember(dest => dest.StudentConfirmedAt, opt => opt.Ignore())
            .ForMember(dest => dest.FinalizedAt, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
            .ForMember(dest => dest.Enrollment, opt => opt.Ignore());

        CreateMap<GradeUpdateDto, Grade>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.FinalGrade, opt => opt.Ignore())
            .ForMember(dest => dest.ConfirmedAt, opt => opt.Ignore())
            .ForMember(dest => dest.StudentConfirmedAt, opt => opt.Ignore())
            .ForMember(dest => dest.FinalizedAt, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
            .ForMember(dest => dest.Enrollment, opt => opt.Ignore());
    }
}