import type { Enrollment } from "../../models/EnrollmentModel";

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    Id: 1,
    StudentId: 3,
    StudentFirstName: "Marko",
    StudentLastName: "Markovic",
    SubjectId: 1,
    SubjectName: "Matematika",
    EnrolledAt: new Date("2025-01-20"),
  },
  {
    Id: 2,
    StudentId: 4,
    StudentFirstName: "Marko",
    StudentLastName: "Marković",
    SubjectId: 1,
    SubjectName: "Web programiranje",
    EnrolledAt: new Date("2025-01-22"),
  },
  {
    Id: 3,
    StudentId: 5,
    StudentFirstName: "Ivan",
    StudentLastName: "Ivanović",
    SubjectId: 103,
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
