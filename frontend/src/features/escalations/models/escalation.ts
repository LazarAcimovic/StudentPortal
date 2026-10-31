export type EscalationStatus = 'NeedsAssignment' | 'Assigned' | 'NeedsReassignment' | 'Resolved';

export type EscalationReason = 'AcceptedUnresolved' | 'ChainExhausted';

export interface EscalationAppeal {
  id: string;
  gradeId: string;
  enrollmentId: string;
  text: string;
  submittedAt: string;
  status: string;
  reviewedAt: string | null;
}

export interface AssignmentHistoryEntry {
  assignedProfessorName: string;
  assignedByAdminName: string;
  assignedAt: string;
  supersededAt: string | null;
}

export interface EscalatedCase {
  gradeId: string;
  enrollmentId: string;
  subjectName: string;
  subjectCode: string;
  studentFirstName: string;
  studentLastName: string;
  originalProfessorId: string;
  originalProfessorFirstName: string;
  originalProfessorLastName: string;
  finalGrade: number;
  reason: EscalationReason;
  escalationStatus: EscalationStatus;
  escalatedSince: string;
  resolvedAt: string | null;
  appeals: EscalationAppeal[];
  assignmentHistory: AssignmentHistoryEntry[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface EligibleProfessor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}
