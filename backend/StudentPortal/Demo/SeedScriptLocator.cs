namespace StudentPortal.Demo;

/// <summary>
/// Locates the SQL fixture files under <c>Migrations/</c> at runtime, by file name.
///
/// Two callers, deliberately different (per D-049):
/// <list type="bullet">
///   <item>test-mode reset (e2e) replays ONLY <see cref="BaseSeed"/>;</item>
///   <item>demo reset replays <see cref="DemoScripts"/>, all three, in order.</item>
/// </list>
/// Sharing one execution path would be a bug: the two <c>seed-dev-*.sql</c> fixtures add rows
/// the integration suite asserts against — <c>seed-dev-pagination.sql</c> alone takes the
/// active-student count from 10 to 30, which <c>AdminUserSearchTests</c> would fail on. Each
/// dev file's header states the same rule.
///
/// A published deployment ships only the copies the csproj places beside the assembly, so the
/// source-tree walk in <see cref="Resolve"/> is a developer convenience that is ABSENT in
/// production. <see cref="VerifyAll"/> exists precisely for that asymmetry: Program.cs calls it
/// at boot when demo mode is on, so a missing csproj copy rule fails the server loudly at
/// startup instead of on a visitor's first click.
/// </summary>
public static class SeedScriptLocator
{
    /// <summary>The base fixture: wipes every table children-first, then reinserts the anchor cast.</summary>
    public const string BaseSeed = "seed.sql";

    /// <summary>
    /// What a demo reset replays, in this exact order. <see cref="BaseSeed"/> must run first
    /// because it deletes everything; the two dev fixtures then layer their own rows on top.
    /// Order between the last two does not matter — they touch disjoint subjects and disjoint
    /// fixed-GUID ranges.
    /// </summary>
    public static readonly string[] DemoScripts =
    {
        BaseSeed,
        "seed-dev-escalations.sql",
        "seed-dev-pagination.sql",
    };

    /// <summary>
    /// Resolves one fixture to an absolute path.
    /// </summary>
    /// <exception cref="FileNotFoundException">
    /// The file is neither beside the assembly nor in the source tree above it.
    /// </exception>
    public static string Resolve(string fileName)
    {
        // The csproj copies the fixtures next to the assembly; prefer the output copy, because
        // it is the only one that exists in a published deployment.
        var direct = Path.Combine(AppContext.BaseDirectory, "Migrations", fileName);
        if (File.Exists(direct)) return direct;

        // Fallback: walk up the source tree (handy when run straight from the project dir).
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 12 && dir is not null; i++)
        {
            var candidate = Path.Combine(dir, "StudentPortal", "Migrations", fileName);
            if (File.Exists(candidate)) return candidate;
            var parent = Directory.GetParent(dir);
            if (parent is null) break;
            dir = parent.FullName;
        }

        throw new FileNotFoundException(
            $"Could not locate Migrations/{fileName}. In a published deployment the only copy is " +
            $"the one StudentPortal.csproj writes to the output directory — check that the file " +
            $"has a <None Update=\"Migrations\\{fileName}\"> copy rule.",
            fileName);
    }

    /// <summary>
    /// Resolves every name given, throwing on the first miss. Called at boot so a packaging gap
    /// surfaces at startup rather than on first use (per D-049).
    /// </summary>
    public static IReadOnlyList<string> VerifyAll(IEnumerable<string> fileNames)
        => fileNames.Select(Resolve).ToList();
}
