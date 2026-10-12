using AutoMapper;
using Microsoft.Extensions.Logging.Abstractions;
using StudentPortal.Profiles;

namespace StudentPortal.Tests;

/// <summary>Builds a real AutoMapper instance using the production MappingProfile.</summary>
internal static class TestMapper
{
    public static IMapper Create()
    {
        var expr = new MapperConfigurationExpression();
        expr.AddProfile<MappingProfile>();
        return new MapperConfiguration(expr, NullLoggerFactory.Instance).CreateMapper();
    }
}
