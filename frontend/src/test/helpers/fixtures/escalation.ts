import type { EscalatedCase, EligibleProfessor } from '../../../features/escalations/models/escalation';

export const PROF_A_ID = 'prof-aaaa-0000-0000-000000000001';
export const PROF_B_ID = 'prof-bbbb-0000-0000-000000000002';

export const eligibleProfB: EligibleProfessor = {
  id: PROF_B_ID,
  firstName: 'Bob',
  lastName: 'Smith',
  email: 'bob.smith@example.com',
};

export function makeEscalatedCase(overrides: Partial<EscalatedCase> = {}): EscalatedCase {
  return {
    gradeId: overrides.gradeId ?? 'grade-1111-0000-0000-000000000001',
    enrollmentId: overrides.enrollmentId ?? 'enroll-1111-0000-0000-000000000001',
    subjectName: overrides.subjectName ?? 'Databases',
    subjectCode: overrides.subjectCode ?? 'DB101',
    studentFirstName: overrides.studentFirstName ?? 'Alice',
    studentLastName: overrides.studentLastName ?? 'Johnson',
    originalProfessorId: overrides.originalProfessorId ?? PROF_A_ID,
    originalProfessorFirstName: overrides.originalProfessorFirstName ?? 'Ann',
    originalProfessorLastName: overrides.originalProfessorLastName ?? 'Adams',
    finalGrade: overrides.finalGrade ?? 5,
    reason: overrides.reason ?? 'AcceptedUnresolved',
    escalationStatus: overrides.escalationStatus ?? 'NeedsAssignment',
    escalatedSince: overrides.escalatedSince ?? '2026-10-20T10:00:00Z',
    resolvedAt: overrides.resolvedAt ?? null,
    appeals: overrides.appeals ?? [
      {
        id: 'appeal-1',
        gradeId: 'grade-1111-0000-0000-000000000001',
        enrollmentId: 'enroll-1111-0000-0000-000000000001',
        text: 'My exam was graded incorrectly.',
        submittedAt: '2026-10-10T10:00:00Z',
        status: 'Accepted',
        reviewedAt: '2026-10-13T10:00:00Z',
      },
    ],
    assignmentHistory: overrides.assignmentHistory ?? [],
  };
}
