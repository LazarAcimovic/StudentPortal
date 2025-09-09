export interface Enrollment {
  Id: number;
  StudentId: number;
  SubjectId: number;
  IsDeleted: boolean;
  EnrolledAt?: Date;
}

export interface EnrollmentDto {
  Id: number;
  StudentId: number;
  StudentFirstName: string;
  StudentLastName: string;
  SubjectId: number;
  SubjectName: number;
  EnrolledAt?: Date;
}

export interface CreateEnrollmentDto {
  StudentId: number;
  SubjectId: number;
}
