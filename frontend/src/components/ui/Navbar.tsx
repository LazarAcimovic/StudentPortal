import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";
import { APP_ROUTES } from "../../config/constants";

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(APP_ROUTES.AUTH_LOGIN);
  };

  const getDashboardLink = () => {
    if (!user) return APP_ROUTES.HOME;
    switch (user.userRole) {
      case RoleEnum.Admin:
        return APP_ROUTES.ADMIN_DASHBOARD;
      case RoleEnum.Professor:
        return APP_ROUTES.PROFESSOR_DASHBOARD;
      case RoleEnum.Student:
        return APP_ROUTES.STUDENT_DASHBOARD;
      default:
        return APP_ROUTES.HOME;
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <Link className="navbar-brand" to={APP_ROUTES.HOME}>
            Student Portal
          </Link>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {user && (
                <li className="nav-item">
                  <Link className="nav-link" to={getDashboardLink()}>
                    Dashboard
                  </Link>
                </li>
              )}
            </ul>
            <ul className="navbar-nav">
              {user ? (
                <>
                  <li className="nav-item">
                    <span className="nav-link">
                      Welcome, {user.firstName}
                    </span>
                  </li>
                  <li className="nav-item">
                    <button
                      className="btn btn-outline-light"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li className="nav-item">
                  <Link className="btn btn-outline-light" to={APP_ROUTES.AUTH_LOGIN}>
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
