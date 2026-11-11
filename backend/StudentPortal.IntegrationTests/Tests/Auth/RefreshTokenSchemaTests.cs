using System.Data;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Auth;

/// <summary>
/// Backend-migration test (AGENTS §9): asserts the schema after Migrate().
/// DB §2.7 documents <c>UQ RefreshTokens_TokenHash</c>; the <c>AddRefreshTokenHashUniqueIndex</c>
/// migration creates <c>IX_RefreshTokens_TokenHash</c> as unique so the hash lookup on every
/// /Refresh and /Logout is an index scan rather than a sequential scan.
/// </summary>
public class RefreshTokenSchemaTests : IntegrationTestBase
{
    public RefreshTokenSchemaTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task RefreshTokens_TokenHash_HasUniqueIndex()
    {
        await WithDbAsync(async db =>
        {
            var conn = db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT i.indisunique
                FROM pg_index i
                JOIN pg_class c ON c.oid = i.indexrelid
                WHERE c.relname = 'IX_RefreshTokens_TokenHash'";

            var result = await cmd.ExecuteScalarAsync();

            result.Should().NotBeNull(
                "the AddRefreshTokenHashUniqueIndex migration must create IX_RefreshTokens_TokenHash");
            ((bool)result!).Should().BeTrue(
                "the index on RefreshTokens.TokenHash must be UNIQUE (DB §2.7)");
        });
    }
}
