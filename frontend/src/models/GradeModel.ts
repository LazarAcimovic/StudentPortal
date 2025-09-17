// Entitetski model

export interface Grade {
  id: number;
  enrollmentId: number;
  studentGrade: number;
  studentFirstName: string;
  studentLastName: string;
  subjectName: string;
  comment: string;
  isConfirmed: boolean;
  isDeleted: boolean;
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
