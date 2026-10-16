export type SubjectStatus =
  | 'Not graded'
  | 'Awaiting confirmation'
  | 'Appeal pending'
  | 'Passed'
  | 'Failed';

export interface StudentDashboardSubject {
  enrollmentId: number;
  subjectName: string;
  professorName: string;
  finalGrade: number | null;
  status: SubjectStatus;
  appealStatus: string | null;
  canWriteAppeal: boolean;
  canConfirmGrade: boolean;
  confirmationDeadline: string | null;
  pendingAppealId: number | null;
}

export interface StudentDashboardStats {
  averageGrade: number;
  passedExams: number;
  nonPassedExams: number;
  earnedEcts: number;
}

export interface StudentDashboardData {
  firstName: string;
  lastName: string;
  email: string;
  indexNumber: string | null;
  stats: StudentDashboardStats;
  subjects: StudentDashboardSubject[];
}

export interface UseStudentDashboardResult {
  data: StudentDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
