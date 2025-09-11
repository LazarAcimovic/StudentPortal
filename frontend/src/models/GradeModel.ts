// Entitetski model

export interface Grade {
  Id: number;
  EnrollmentId: number;
  StudentGrade: number;
  StudentFirstName: string;
  StudentLastName: string;
  SubjectName: string;
  Comment: string;
  IsConfirmed: boolean;
  IsDeleted: boolean;
}

export interface CreateGrade {
  EnrollmentId: number;
  Grade: number;
  Comment?: string;
}

export interface UpdateGrade {
  EnrollmentId: number;
  StudentGrade: number;
  Comment?: string;
}
