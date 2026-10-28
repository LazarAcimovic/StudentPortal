export type GradeState = 'NotGraded' | 'Draft' | 'Confirmed' | 'ReconfirmNeeded' | 'Finalized';

export type AppealStatus = 'Pending' | 'Overdue' | 'Denied';

export interface ProfessorStudentRow {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  indexNumber: string | null;
  gradeState: GradeState;
  finalGrade: number | null;
  hasActiveAppeal: boolean;
}

export interface ProfessorSubject {
  subjectId: string;
  subjectName: string;
  ects: number;
  students: ProfessorStudentRow[];
}

export interface ProfessorAppealRow {
  appealId: string;
  gradeId: string;
  enrollmentId: string;
  studentFirstName: string;
  studentLastName: string;
  subjectName: string;
  text: string;
  submittedAt: string;
  status: AppealStatus;
  reviewedAt: string | null;
  canUndoDeny: boolean;
  undoDenyDeadline: string | null;
}

export type EscalationReason = 'AcceptedUnresolved' | 'ChainExhausted';

export interface AssignedCaseAppeal {
  id: string;
  gradeId: string;
  enrollmentId: string;
  text: string;
  submittedAt: string;
  status: string;
  reviewedAt: string | null;
}

export interface AssignedCase {
  enrollmentId: string;
  gradeId: string;
  subjectName: string;
  studentFirstName: string;
  studentLastName: string;
  midterm1Points: number;
  midterm2Points: number;
  attendancePoints: number;
  practicalPoints: number;
  examPoints: number;
  finalGrade: number;
  reason: EscalationReason;
  appeals: AssignedCaseAppeal[];
}

export interface ProfessorDashboardData {
  subjects: ProfessorSubject[];
  appeals: ProfessorAppealRow[];
  assignedCases: AssignedCase[];
}

export interface UseProfessorDashboardResult {
  data: ProfessorDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface AppealsSectionProps {
  appeals: ProfessorAppealRow[];
  onRefresh: () => void;
}

export interface ViewAppealModalProps {
  appeal: ProfessorAppealRow | null;
  allAppeals: ProfessorAppealRow[];
  open: boolean;
  onClose: () => void;
  onActionDone: () => void;
}

export interface AssignedCasesSectionProps {
  assignedCases: AssignedCase[];
  onRefresh: () => void;
}

export interface ScenarioPanelProps {
  assignedCase: AssignedCase;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onAccepted?: () => void;
}
