import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { APP_ROUTES } from '../config/constants';

export default function AuthGuard() {
  const { user, token } = useAuthStore();
  const isAuthenticated = !!token && !!user;

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.AUTH_LOGIN} replace />;
  }

  return <Outlet />;
}
