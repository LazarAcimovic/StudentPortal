import { USER_ROLES } from '../shared/constants/constants';
import type { User } from '../shared/models/User';
import type {
  StudentDashboardData,
  StudentDashboardSubject,
} from '../features/user/models/studentDashboard';

let id = 1;
const nextId = () => id++;

export function makeStudent(overrides: Partial<User> = {}): User {
  return {
    id: String(nextId()),
    firstName: 'Ana',
    lastName: 'Anić',
    email: 'ana@example.com',
    indexNumber: 'E/123/22',
    userRole: USER_ROLES.Student,
    isDeleted: false,
    ...overrides,
  };
}

export function makeProfessor(overrides: Partial<User> = {}): User {
  return {
    id: String(nextId()),
    firstName: 'Petar',
    lastName: 'Petrović',
    email: 'petar@example.com',
    indexNumber: null,
    userRole: USER_ROLES.Professor,
    isDeleted: false,
    ...overrides,
  };
}

export function makeAdmin(overrides: Partial<User> = {}): User {
  return {
    id: String(nextId()),
    firstName: 'Admin',
    lastName: 'Adminović',
    email: 'admin@example.com',
    indexNumber: null,
    userRole: USER_ROLES.Admin,
    isDeleted: false,
    ...overrides,
  };
}

export function makeStudentDashboardSubject(
  overrides: Partial<StudentDashboardSubject> = {}
): StudentDashboardSubject {
  return {
    enrollmentId: 'enr-1',
    subjectName: 'Programming 1',
    professorName: 'Petar Petrović',
    finalGrade: null,
    status: 'Not graded',
    isEscalated: false,
    appealStatus: null,
    canWriteAppeal: false,
    canConfirmGrade: false,
    confirmationDeadline: null,
    pendingAppealId: null,
    ...overrides,
  };
}

export function makeStudentDashboardPayload(
  overrides: Partial<StudentDashboardData> = {}
): StudentDashboardData {
  return {
    profile: {
      firstName: 'Ana',
      lastName: 'Anić',
      email: 'ana@example.com',
      indexNumber: 'E/123/22',
    },
    stats: {
      averageGrade: 0,
      passedExams: 0,
      nonPassedExams: 0,
      earnedEcts: 0,
    },
    subjects: [],
    ...overrides,
  };
}
