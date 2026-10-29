export interface GradeDto {
  id: string;
  enrollmentId: string;
  midterm1Points: number;
  midterm2Points: number;
  attendancePoints: number;
  practicalPoints: number;
  examPoints: number;
  finalGrade: number;
  confirmedAt: string;
  studentConfirmedAt: string | null;
  finalizedAt: string | null;
}

export interface ProfessorConfirmGradeDto {
  enrollmentId: string;
  midterm1Points: number;
  midterm2Points: number;
  attendancePoints: number;
  practicalPoints: number;
  examPoints: number;
}

export interface StudentConfirmGradeDto {
  enrollmentId: string;
}

export interface ReconfirmExamDto {
  enrollmentId: string;
  examPoints: number;
}

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
  StudentGrade: number;
  Comment?: string;
}

export interface UpdateGrade {
  EnrollmentId: number;
  StudentGrade: number;
  Comment?: string;
}
