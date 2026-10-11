using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace StudentPortal.Models.Entities;

public class StudentPortalApiContextFactory : IDesignTimeDbContextFactory<StudentPortalApiContext>
{
    public StudentPortalApiContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .AddUserSecrets<Program>()
            .AddEnvironmentVariables()
            .Build();

        var connectionString = config.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=StudentPortal;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<StudentPortalApiContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new StudentPortalApiContext(options);
    }
}
