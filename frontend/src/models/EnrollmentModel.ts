export interface Enrollment {
  Id: number;
  StudentId: number;
  StudentFirstName: string;
  StudentLastName: string;
  SubjectId: number;
  SubjectName: string;
  EnrolledAt?: Date;
}

export interface CreateEnrollment {
  StudentId: number;
  SubjectId: number;
}
