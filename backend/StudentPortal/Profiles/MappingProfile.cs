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
    }
}