export type SubjectStatus =
  | 'Not graded'
  | 'Awaiting confirmation'
  | 'Appeal pending'
  | 'Awaiting re-confirmation'
  | 'Under admin review'
  | 'Passed'
  | 'Failed';

export interface StudentProfile {
  firstName: string;
  lastName: string;
  email: string;
  indexNumber: string | null;
}

export interface StudentDashboardSubject {
  enrollmentId: string;
  subjectName: string;
  professorName: string;
  finalGrade: number | null;
  status: SubjectStatus;
  isEscalated: boolean;
  appealStatus: string | null;
  canWriteAppeal: boolean;
  canConfirmGrade: boolean;
  confirmationDeadline: string | null;
  pendingAppealId: string | null;
}

export interface StudentDashboardStats {
  averageGrade: number;
  passedExams: number;
  nonPassedExams: number;
  earnedEcts: number;
}

export interface StudentDashboardData {
  profile: StudentProfile;
  stats: StudentDashboardStats;
  subjects: StudentDashboardSubject[];
}

export interface UseStudentDashboardResult {
  data: StudentDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
