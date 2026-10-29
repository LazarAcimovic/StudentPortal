export interface Enrollment {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  subjectId: string;
  subjectName: string;
  enrolledAt: Date;
  isDeleted?: boolean;
}

export interface CreateEnrollment {
  StudentId: string; // GUID — never coerce with Number()
  SubjectId: string; // GUID — never coerce with Number()
}
