import type { Enrollment } from "../../models/EnrollmentModel";

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    Id: 1,
    StudentId: 2,
    StudentFirstName: "Jovan",
    StudentLastName: "Jovanovic",
    SubjectId: 1,
    SubjectName: "Matematika",
    EnrolledAt: new Date("2025-01-20"),
  },
  {
    Id: 2,
    StudentId: 2,
    StudentFirstName: "Jovan",
    StudentLastName: "Jovanovic",
    SubjectId: 2,
    SubjectName: "Web programiranje",
    EnrolledAt: new Date("2025-01-22"),
  },
  {
    Id: 3,
    StudentId: 2,
    StudentFirstName: "Jovan",
    StudentLastName: "Jovanovic",
    SubjectId: 3,
    SubjectName: "Baze podataka",
    EnrolledAt: new Date("2025-01-25"),
  },
  {
    Id: 4,
    StudentId: 6,
    StudentFirstName: "Jelena",
    StudentLastName: "Jelenić",
    SubjectId: 104,
    SubjectName: "Mobilne aplikacije",
    EnrolledAt: new Date("2025-01-28"),
  },
];
