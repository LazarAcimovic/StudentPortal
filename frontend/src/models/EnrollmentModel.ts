export interface Enrollment {
  id: number;
  studentId: number;
  studentFirstName: string;
  studentLastName: string;
  subjectId: number;
  subjectName: string;
  enrolledAt: Date;
  isDeleted?: boolean;
}

export interface CreateEnrollment {
  StudentId: number;
  SubjectId: number;
}
