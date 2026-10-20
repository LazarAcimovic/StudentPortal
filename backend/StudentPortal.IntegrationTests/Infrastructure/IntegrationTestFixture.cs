using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;

namespace StudentPortal.IntegrationTests.Infrastructure;

public class IntegrationTestFixture : IAsyncLifetime
{
    public static readonly DateTimeOffset InitialFakeTime =
        new DateTimeOffset(2027, 1, 15, 12, 0, 0, TimeSpan.Zero);

    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithImage("postgres:17")
        .WithDatabase("studentportal_tests")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    private Respawner _respawner = null!;
    private string _seedSql = null!;

    public WebApplicationFactory<Program> Factory { get; private set; } = null!;
    public FakeTimeProvider FakeTime { get; private set; } = null!;
    public string ConnectionString { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
        ConnectionString = _dbContainer.GetConnectionString();

        FakeTime = new FakeTimeProvider(InitialFakeTime);

        Factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Development");
                builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);
                // HMAC-SHA512 requires ≥ 64-byte key.
                builder.UseSetting("JwtConfig:Key",
                    "integration-test-signing-key-with-at-least-sixty-four-bytes-of-entropy-xxxxxxxx");
                builder.UseSetting("JwtConfig:Issuer", "https://integration-tests/");
                builder.UseSetting("JwtConfig:Audience", "https://integration-tests");
                builder.UseSetting("JwtConfig:TokenValidityMins", "15");
                builder.UseSetting("Cors:Origins:0", "http://localhost");

                builder.ConfigureServices(services =>
                {
                    var tpDescriptors = services
                        .Where(d => d.ServiceType == typeof(TimeProvider))
                        .ToList();
                    foreach (var d in tpDescriptors) services.Remove(d);
                    services.AddSingleton<TimeProvider>(FakeTime);
                });
            });

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudentPortalApiContext>();
            await db.Database.MigrateAsync();
        }

        var seedPath = ResolveSeedPath();
        _seedSql = await File.ReadAllTextAsync(seedPath);

        await using (var respawnConn = new NpgsqlConnection(ConnectionString))
        {
            await respawnConn.OpenAsync();
            _respawner = await Respawner.CreateAsync(respawnConn, new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                SchemasToInclude = new[] { "public" },
                TablesToIgnore = new[]
                {
                    new Respawn.Graph.Table("__EFMigrationsHistory"),
                },
            });
        }
    }

    public async Task ResetAndSeedAsync()
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        await _respawner.ResetAsync(conn);

        await using var cmd = new NpgsqlCommand(_seedSql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    public StudentPortalApiContext CreateDbContext()
    {
        var scope = Factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<StudentPortalApiContext>();
    }

    public async Task DisposeAsync()
    {
        if (Factory is not null) await Factory.DisposeAsync();
        await _dbContainer.DisposeAsync();
    }

    private static string ResolveSeedPath()
    {
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 10 && dir is not null; i++)
        {
            var candidate = Path.Combine(dir, "StudentPortal", "Migrations", "seed.sql");
            if (File.Exists(candidate)) return candidate;
            var parent = Directory.GetParent(dir);
            if (parent is null) break;
            dir = parent.FullName;
        }
        throw new FileNotFoundException(
            "Could not locate backend/StudentPortal/Migrations/seed.sql relative to the test assembly.");
    }
}

[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<IntegrationTestFixture>
{
}
