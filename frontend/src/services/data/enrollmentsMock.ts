import type { Enrollment } from "../../models/EnrollmentModel";

export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    Id: 1,
    StudentId: 2,
    SubjectId: 1,
    IsDeleted: false,
    EnrolledAt: new Date(),
  },
  {
    Id: 2,
    StudentId: 2,
    SubjectId: 2,
    IsDeleted: false,
    EnrolledAt: new Date(),
  },
  {
    Id: 3,
    StudentId: 4,
    SubjectId: 1,
    IsDeleted: false,
    EnrolledAt: new Date(),
  },
  {
    Id: 4,
    StudentId: 5,
    SubjectId: 3,
    IsDeleted: false,
    EnrolledAt: new Date(),
  },
  {
    Id: 5,
    StudentId: 6,
    SubjectId: 2,
    IsDeleted: false,
    EnrolledAt: new Date(),
  },
  {
    Id: 6,
    StudentId: 6,
    SubjectId: 3,
    IsDeleted: false,
    EnrolledAt: new Date(),
  },
];
