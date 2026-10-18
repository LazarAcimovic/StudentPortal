import type { ProfessorStudentRow } from './professorDashboard';

export interface FormValues {
  midterm1: string;
  midterm2: string;
  attendance: string;
  practical: string;
  exam: string;
}

export interface GradePanelProps {
  selectedStudentRow: ProfessorStudentRow | null;
  onGradeChanged: () => void;
}
