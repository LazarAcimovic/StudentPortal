import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../store/user/useUserStore';
import { APP_ROUTES } from '../config/constants';

export default function AuthGuard() {
  const currentUser = useUserStore((s) => s.currentUser);
  const isHydrating = useUserStore((s) => s.isHydrating);

  if (isHydrating) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to={APP_ROUTES.AUTH_LOGIN} replace />;
  }

  return <Outlet />;
}
