import React from "react";
import { useAuthStore } from "../../store/authStore";
import { Navigate, Outlet } from "react-router-dom";
import { APP_ROUTES } from "../../config/constants";

const ProtectedRoute: React.FC = () => {
  const { user, token } = useAuthStore();
  const isAuthenticated = !!token && !!user;

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.AUTH_LOGIN} replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
