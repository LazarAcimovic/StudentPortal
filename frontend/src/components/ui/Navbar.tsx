import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/user/useUserStore";
import { USER_ROLES } from "../../shared/constants/constants";
import { APP_ROUTES } from "../../config/constants";

const Navbar: React.FC = () => {
  const { currentUser, clearCurrentUser } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearCurrentUser();
    navigate(APP_ROUTES.AUTH_LOGIN);
  };

  const getDashboardLink = () => {
    if (!currentUser) return APP_ROUTES.HOME;
    switch (currentUser.userRole) {
      case USER_ROLES.Admin:
        return APP_ROUTES.ADMIN_DASHBOARD;
      case USER_ROLES.Professor:
        return APP_ROUTES.PROFESSOR_DASHBOARD;
      case USER_ROLES.Student:
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
              {currentUser && (
                <li className="nav-item">
                  <Link className="nav-link" to={getDashboardLink()}>
                    Dashboard
                  </Link>
                </li>
              )}
            </ul>
            <ul className="navbar-nav">
              {currentUser ? (
                <>
                  <li className="nav-item">
                    <span className="nav-link">
                      Welcome, {currentUser.firstName}
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
