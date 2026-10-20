namespace StudentPortal.IntegrationTests.Infrastructure;

/// <summary>
/// Deterministic enrollment and subject GUIDs from seed.sql.
/// Only the "shape" (student X owns enrollment Y on subject Z taught by prof P)
/// is leaned on — never any seeded Grade/Draft/Appeal rows per §4a.
/// </summary>
public static class SeedIds
{
    public static class Subjects
    {
        public static readonly Guid MathI = new("20000000-0000-0000-0000-000000000001");
        public static readonly Guid MathII = new("20000000-0000-0000-0000-000000000002");
        public static readonly Guid LinearAlgebra = new("20000000-0000-0000-0000-000000000003");
        public static readonly Guid Calculus = new("20000000-0000-0000-0000-000000000004");
        public static readonly Guid ProgrammingFundamentals = new("20000000-0000-0000-0000-000000000005");
        public static readonly Guid DataStructures = new("20000000-0000-0000-0000-000000000006");
        public static readonly Guid SoftwareEngineering = new("20000000-0000-0000-0000-000000000007");
        public static readonly Guid WebDevelopment = new("20000000-0000-0000-0000-000000000008");
        public static readonly Guid OperatingSystems = new("20000000-0000-0000-0000-000000000009");
        public static readonly Guid ComputerNetworks = new("20000000-0000-0000-0000-00000000000a");
        public static readonly Guid DistributedSystems = new("20000000-0000-0000-0000-00000000000b");
        public static readonly Guid ComputerArchitecture = new("20000000-0000-0000-0000-00000000000c");
        public static readonly Guid DatabaseSystems = new("20000000-0000-0000-0000-00000000000d");
        public static readonly Guid Algorithms = new("20000000-0000-0000-0000-00000000000e");
        public static readonly Guid DiscreteMathematics = new("20000000-0000-0000-0000-00000000000f");
    }

    public static class Enrollments
    {
        // Sarah (ProfessorSmith's MathI, ProfessorJohnson's ProgFund, ProfessorWilson's DB Systems)
        public static readonly Guid Sarah_MathI = new("30000000-0000-0000-0000-000000000001");
        public static readonly Guid Sarah_ProgFund = new("30000000-0000-0000-0000-000000000002");
        public static readonly Guid Sarah_DB = new("30000000-0000-0000-0000-000000000003");

        public static readonly Guid David_MathII = new("30000000-0000-0000-0000-000000000004");
        public static readonly Guid David_DataStructures = new("30000000-0000-0000-0000-000000000005");
        public static readonly Guid David_OperatingSystems = new("30000000-0000-0000-0000-000000000006");

        public static readonly Guid Jessica_LinearAlgebra = new("30000000-0000-0000-0000-000000000007");
        public static readonly Guid Jessica_SoftwareEng = new("30000000-0000-0000-0000-000000000008");
        public static readonly Guid Jessica_ComputerNetworks = new("30000000-0000-0000-0000-000000000009");

        public static readonly Guid Sophia_MathII = new("30000000-0000-0000-0000-000000000019");
        public static readonly Guid Sophia_SoftwareEng = new("30000000-0000-0000-0000-00000000001a");
        public static readonly Guid Sophia_DistSys = new("30000000-0000-0000-0000-00000000001b");

        public static readonly Guid Liam_LinearAlgebra = new("30000000-0000-0000-0000-00000000001c");
        public static readonly Guid Liam_ComputerNetworks = new("30000000-0000-0000-0000-00000000001d");
        public static readonly Guid Liam_Algorithms = new("30000000-0000-0000-0000-00000000001e");
    }
}
