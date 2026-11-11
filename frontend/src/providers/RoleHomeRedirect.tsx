import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/user/useUserStore';
import { APP_ROUTES, DASHBOARD_BY_ROLE } from '../config/constants';

export default function RoleHomeRedirect() {
  const currentUser = useUserStore((s) => s.currentUser);
  const target = currentUser
    ? DASHBOARD_BY_ROLE[currentUser.userRole]
    : APP_ROUTES.AUTH_LOGIN;
  return <Navigate to={target} replace />;
}
