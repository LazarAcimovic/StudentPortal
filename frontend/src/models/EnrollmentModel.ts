export interface Enrollment {
  Id: number;
  StudentId: number;
  StudentFirstName: string;
  StudentLastName: string;
  SubjectId: number;
  SubjectName: string;
  EnrolledAt: Date;
  IsDeleted?: boolean;
}

export interface CreateEnrollment {
  StudentId: number;
  SubjectId: number;
  IsDeleted: boolean;
}
