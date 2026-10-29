import type {
  ProfessorAppealRow,
  ProfessorDashboardData,
  ProfessorStudentRow,
  ProfessorSubject,
} from '../../../features/user/models/professor/professorDashboard';

export const emptyProfessorDashboard: ProfessorDashboardData = {
  subjects: [],
  appeals: [],
  assignedCases: [],
};

export function makeStudentRow(
  overrides: Partial<ProfessorStudentRow>
): ProfessorStudentRow {
  return {
    enrollmentId: overrides.enrollmentId ?? 'e-100',
    studentId: overrides.studentId ?? 's-100',
    firstName: overrides.firstName ?? 'Stud',
    lastName: overrides.lastName ?? 'One',
    indexNumber: overrides.indexNumber ?? 'E2/2021',
    gradeState: overrides.gradeState ?? 'NotGraded',
    finalGrade: overrides.finalGrade ?? null,
    hasActiveAppeal: overrides.hasActiveAppeal ?? false,
  };
}

export function makeSubject(
  overrides: Partial<ProfessorSubject>
): ProfessorSubject {
  return {
    subjectId: overrides.subjectId ?? 'sub-100',
    subjectName: overrides.subjectName ?? 'Databases',
    ects: overrides.ects ?? 7,
    students: overrides.students ?? [],
  };
}

export function makeAppealRow(
  overrides: Partial<ProfessorAppealRow>
): ProfessorAppealRow {
  return {
    appealId: overrides.appealId ?? 'app-1',
    gradeId: overrides.gradeId ?? 'g-1',
    enrollmentId: overrides.enrollmentId ?? 'e-100',
    studentFirstName: overrides.studentFirstName ?? 'Stud',
    studentLastName: overrides.studentLastName ?? 'One',
    subjectName: overrides.subjectName ?? 'Databases',
    text: overrides.text ?? 'Please review my grade.',
    submittedAt: overrides.submittedAt ?? '2026-10-19T10:00:00.000Z',
    status: overrides.status ?? 'Pending',
    reviewedAt: overrides.reviewedAt ?? null,
    canUndoDeny: overrides.canUndoDeny ?? false,
    undoDenyDeadline: overrides.undoDenyDeadline ?? null,
  };
}

export const singleSubjectWithStudent: ProfessorDashboardData = {
  subjects: [
    makeSubject({
      subjectId: 'sub-DB',
      subjectName: 'Databases',
      students: [makeStudentRow({ enrollmentId: 'e-100', firstName: 'Stud', lastName: 'One' })],
    }),
  ],
  appeals: [],
  assignedCases: [],
};
