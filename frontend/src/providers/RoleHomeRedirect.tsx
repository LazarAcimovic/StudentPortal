import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/user/useUserStore';
import { USER_ROLES } from '../shared/constants/constants';
import type { UserRole } from '../shared/constants/constants';
import { APP_ROUTES } from '../config/constants';

// The dashboard each role is sent home to when it lands on a route meant for
// another role. Used as the <RoleGate> fallback on role-restricted routes so a
// mismatched role is redirected to its own dashboard instead of mounting a
// forbidden page and firing requests the backend answers with 403 (per D-030).
const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  [USER_ROLES.Admin]: APP_ROUTES.ADMIN_DASHBOARD,
  [USER_ROLES.Professor]: APP_ROUTES.PROFESSOR_DASHBOARD,
  [USER_ROLES.Student]: APP_ROUTES.STUDENT_DASHBOARD,
};

export default function RoleHomeRedirect() {
  const { currentUser } = useUserStore();
  const target = currentUser
    ? DASHBOARD_BY_ROLE[currentUser.userRole]
    : APP_ROUTES.AUTH_LOGIN;
  return <Navigate to={target} replace />;
}
