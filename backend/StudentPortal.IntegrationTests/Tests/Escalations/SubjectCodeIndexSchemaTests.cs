using System.Data;
using StudentPortal.IntegrationTests.Infrastructure;

namespace StudentPortal.IntegrationTests.Tests.Escalations;

/// <summary>
/// Backend-migration test (AGENTS §9): asserts the schema after Migrate().
/// DB §2.2 documents <c>IX Subjects_SubjectCode (SubjectCode)</c>; the
/// <c>AddSubjectCodeIndex</c> migration creates it so the eligible-professor
/// lookup (DB §6.3) hits an index scan instead of a sequential scan.
/// </summary>
public class SubjectCodeIndexSchemaTests : IntegrationTestBase
{
    public SubjectCodeIndexSchemaTests(IntegrationTestFixture fixture) : base(fixture) { }

    [Fact]
    public async Task Subjects_SubjectCode_HasIndex()
    {
        await WithDbAsync(async db =>
        {
            var conn = db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT i.indexrelid
                FROM pg_index i
                JOIN pg_class c ON c.oid = i.indexrelid
                WHERE c.relname = 'IX_Subjects_SubjectCode'";

            var result = await cmd.ExecuteScalarAsync();

            result.Should().NotBeNull(
                "the AddSubjectCodeIndex migration must create IX_Subjects_SubjectCode (DB §2.2)");
        });
    }
}
