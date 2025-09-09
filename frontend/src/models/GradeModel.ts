// Entitetski model
export interface Grade {
  Id: number;
  EnrollmentId: number;
  StudentGrade: number;
  Comment?: string;
  CreatedAt?: Date;
}

export interface GradeDto {
  Id: number;
  StudentGrade: number;
  StudentFirstName: string;
  StudentLastName: string;
  SubjectName: string;
  Comment: string;
}

export interface CreateGradeDto {
  EnrollmentId: number;
  Grade: number;
  Comment?: string;
}

// DTO za ažuriranje
export interface UpdateGradeDto {
  EnrollmentId: number;
  StudentGrade: number;
  Comment?: string;
}
