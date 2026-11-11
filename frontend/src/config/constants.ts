import { USER_ROLES } from '../shared/constants/constants';
import type { UserRole } from '../shared/constants/constants';

export const APP_ROUTES = {
  HOME: '/',
  AUTH_LOGIN: '/login',
  ADMIN_DASHBOARD: '/admin-dashboard',
  PROFESSOR_DASHBOARD: '/professor-dashboard',
  STUDENT_DASHBOARD: '/student-dashboard',
  PROFILE: '/profile',
  CHANGE_PASSWORD: '/profile/change-password',
} as const;

// The dashboard each role is sent to after login or when redirected home.
// Exhaustive by type — a new role becomes a compile error rather than a silent fall-through.
// Each call site keeps its own fallback for the no-user and unrecognised-role cases explicitly.
export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  [USER_ROLES.Admin]: APP_ROUTES.ADMIN_DASHBOARD,
  [USER_ROLES.Professor]: APP_ROUTES.PROFESSOR_DASHBOARD,
  [USER_ROLES.Student]: APP_ROUTES.STUDENT_DASHBOARD,
};

export const API_ROUTES = {
  ACCOUNT_LOGIN: '/Account/Login',
  ACCOUNT_LOGOUT: '/Account/Logout',
  ACCOUNT_REFRESH: '/Account/Refresh',
  ACCOUNT_ME: '/Account/Me',
  ACCOUNT_PROFILE: '/Account/profile',
  ACCOUNT_CHANGE_PASSWORD: '/Account/change-password',
  USER: '/User',
  SUBJECT: '/Subject',
  ENROLLMENT: '/Enrollment',
  GRADE_BY_ENROLLMENT: '/Grade/by-enrollment',
  GRADE_CONFIRM: '/Grade/confirm',
  GRADE_RECONFIRM_EXAM: '/Grade/reconfirm-exam',
  GRADE_STUDENT_CONFIRM: '/Grade/student-confirm',
  GRADE_DRAFT: '/GradeDraft',
  APPEAL: '/Appeal',
  APPEAL_PENDING: '/Appeal/pending',
  STUDENT_ME_DASHBOARD: '/Student/me/dashboard',
  PROFESSOR_ME_DASHBOARD: '/Professor/me/dashboard',
  PROFESSOR_SUBJECT_STUDENTS: '/Professor/subjects',
  ESCALATION: '/Escalation',
  ESCALATION_ELIGIBLE_PROFESSORS: '/Escalation/eligible-professors',
  ESCALATION_ASSIGN: '/Escalation/assign',
  ESCALATION_REASSIGN: '/Escalation/reassign',
} as const;
