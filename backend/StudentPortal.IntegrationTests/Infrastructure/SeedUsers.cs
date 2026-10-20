namespace StudentPortal.IntegrationTests.Infrastructure;

/// <summary>
/// Mirror of the credentials and GUIDs seeded by seed.sql — the auth cast.
/// Tests sign in as these users to drive the system through real endpoints.
/// </summary>
public static class SeedUsers
{
    public const string Password = "Password123!";

    public static readonly SeedUser Admin = new(
        new Guid("10000000-0000-0000-0000-000000000001"),
        "admin@uni.edu", "Admin", "Admin", null, RoleEnum.Admin);

    public static readonly SeedUser ProfessorSmith = new(
        new Guid("10000000-0000-0000-0000-000000000002"),
        "john.smith@uni.edu", "John", "Smith", null, RoleEnum.Professor);

    public static readonly SeedUser ProfessorJohnson = new(
        new Guid("10000000-0000-0000-0000-000000000003"),
        "emily.johnson@uni.edu", "Emily", "Johnson", null, RoleEnum.Professor);

    public static readonly SeedUser ProfessorDavis = new(
        new Guid("10000000-0000-0000-0000-000000000004"),
        "michael.davis@uni.edu", "Michael", "Davis", null, RoleEnum.Professor);

    public static readonly SeedUser ProfessorWilson = new(
        new Guid("10000000-0000-0000-0000-000000000005"),
        "laura.wilson@uni.edu", "Laura", "Wilson", null, RoleEnum.Professor);

    public static readonly SeedUser StudentSarah = new(
        new Guid("10000000-0000-0000-0000-000000000006"),
        "sarah.williams@student.edu", "Sarah", "Williams", "SW-001-2024", RoleEnum.Student);

    public static readonly SeedUser StudentDavid = new(
        new Guid("10000000-0000-0000-0000-000000000007"),
        "david.brown@student.edu", "David", "Brown", "SW-002-2024", RoleEnum.Student);

    public static readonly SeedUser StudentJessica = new(
        new Guid("10000000-0000-0000-0000-000000000008"),
        "jessica.taylor@student.edu", "Jessica", "Taylor", "SW-003-2024", RoleEnum.Student);

    public static readonly SeedUser StudentDaniel = new(
        new Guid("10000000-0000-0000-0000-000000000009"),
        "daniel.anderson@student.edu", "Daniel", "Anderson", "SW-004-2024", RoleEnum.Student);

    public static readonly SeedUser StudentOlivia = new(
        new Guid("10000000-0000-0000-0000-00000000000a"),
        "olivia.martin@student.edu", "Olivia", "Martin", "SW-005-2024", RoleEnum.Student);

    public static readonly SeedUser StudentJames = new(
        new Guid("10000000-0000-0000-0000-00000000000b"),
        "james.thompson@student.edu", "James", "Thompson", "SW-006-2024", RoleEnum.Student);

    public static readonly SeedUser StudentEmma = new(
        new Guid("10000000-0000-0000-0000-00000000000c"),
        "emma.garcia@student.edu", "Emma", "Garcia", "SW-007-2024", RoleEnum.Student);

    public static readonly SeedUser StudentNoah = new(
        new Guid("10000000-0000-0000-0000-00000000000d"),
        "noah.martinez@student.edu", "Noah", "Martinez", "SW-008-2024", RoleEnum.Student);

    public static readonly SeedUser StudentSophia = new(
        new Guid("10000000-0000-0000-0000-00000000000e"),
        "sophia.robinson@student.edu", "Sophia", "Robinson", "SW-009-2024", RoleEnum.Student);

    public static readonly SeedUser StudentLiam = new(
        new Guid("10000000-0000-0000-0000-00000000000f"),
        "liam.clark@student.edu", "Liam", "Clark", "SW-010-2024", RoleEnum.Student);
}

public sealed record SeedUser(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string IndexNumber,
    RoleEnum Role);
