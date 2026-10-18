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
