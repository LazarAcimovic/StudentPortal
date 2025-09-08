import React from "react";
import { useAuthStore } from "../../store/authStore";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute: React.FC = () => {
  const { user, token } = useAuthStore();
  const isAuthenticated = !!token && !!user;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
