import type {
  StudentDashboardData,
  StudentDashboardSubject,
} from '../../../features/user/models/studentDashboard';

export const emptyStudentDashboard: StudentDashboardData = {
  profile: {
    firstName: 'Stu',
    lastName: 'Dent',
    email: 'stu.dent@example.com',
    indexNumber: 'E2/2021',
  },
  stats: {
    averageGrade: 0,
    passedExams: 0,
    nonPassedExams: 0,
    earnedEcts: 0,
  },
  subjects: [],
};

export function makeSubject(
  overrides: Partial<StudentDashboardSubject>
): StudentDashboardSubject {
  return {
    enrollmentId: overrides.enrollmentId ?? 'e-1',
    subjectName: overrides.subjectName ?? 'Algorithms',
    professorName: overrides.professorName ?? 'P. Rof',
    finalGrade: overrides.finalGrade ?? null,
    status: overrides.status ?? 'Not graded',
    appealStatus: overrides.appealStatus ?? null,
    canWriteAppeal: overrides.canWriteAppeal ?? false,
    canConfirmGrade: overrides.canConfirmGrade ?? false,
    confirmationDeadline: overrides.confirmationDeadline ?? null,
    pendingAppealId: overrides.pendingAppealId ?? null,
  };
}

// Precise-decimal regression guard (PRD §2.4 — "8.37" must stay "8.37", not "8.4").
export const dashboardWith837Average: StudentDashboardData = {
  ...emptyStudentDashboard,
  stats: {
    averageGrade: 8.37,
    passedExams: 3,
    nonPassedExams: 1,
    earnedEcts: 21,
  },
  subjects: [
    makeSubject({
      enrollmentId: 'e-pass',
      subjectName: 'Databases',
      professorName: 'Dr. DB',
      finalGrade: 9,
      status: 'Passed',
    }),
  ],
};

export const dashboardFreshAwaiting: StudentDashboardData = {
  ...emptyStudentDashboard,
  subjects: [
    makeSubject({
      enrollmentId: 'e-fresh',
      subjectName: 'Operating Systems',
      professorName: 'OS Prof',
      finalGrade: 7,
      status: 'Awaiting confirmation',
      canWriteAppeal: true,
      canConfirmGrade: true,
    }),
  ],
};

export const dashboardPendingAppeal: StudentDashboardData = {
  ...emptyStudentDashboard,
  subjects: [
    makeSubject({
      enrollmentId: 'e-pending',
      subjectName: 'Networks',
      professorName: 'Net Prof',
      finalGrade: 6,
      status: 'Appeal pending',
      canWriteAppeal: false,
      canConfirmGrade: false,
    }),
  ],
};

export const dashboardAppealDenied: StudentDashboardData = {
  ...emptyStudentDashboard,
  subjects: [
    makeSubject({
      enrollmentId: 'e-denied',
      subjectName: 'Compilers',
      professorName: 'Comp Prof',
      finalGrade: 6,
      status: 'Passed',
      appealStatus: 'Appeal denied',
      canWriteAppeal: false,
      canConfirmGrade: false,
    }),
  ],
};

export const dashboardTrulyFinal: StudentDashboardData = {
  ...emptyStudentDashboard,
  subjects: [
    makeSubject({
      enrollmentId: 'e-final',
      subjectName: 'Linear Algebra',
      professorName: 'LA Prof',
      finalGrade: 8,
      status: 'Passed',
      canWriteAppeal: false,
      canConfirmGrade: false,
    }),
  ],
};
