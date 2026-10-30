import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/user/useUserStore";
import { USER_ROLES } from "../../shared/constants/constants";
import { APP_ROUTES } from "../../config/constants";
import { logout } from "../../features/auth/api/authService";

const Navbar: React.FC = () => {
  const { currentUser, clearCurrentUser } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearCurrentUser();
      navigate(APP_ROUTES.AUTH_LOGIN, { replace: true });
    }
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
          <NavLink className="navbar-brand" to={APP_ROUTES.HOME}>
            Student Portal
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {currentUser && (
                <>
                  <li className="nav-item">
                    <NavLink
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                      to={getDashboardLink()}
                    >
                      Dashboard
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                      to={APP_ROUTES.PROFILE}
                    >
                      My Profile
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
            <ul className="navbar-nav">
              {currentUser ? (
                <li className="nav-item dropdown">
                  <button
                    className="btn btn-outline-light dropdown-toggle"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Welcome, {currentUser.firstName}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <button className="dropdown-item" onClick={handleLogout}>
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
              ) : (
                <li className="nav-item">
                  <NavLink
                    className={({ isActive }) =>
                      isActive
                        ? "btn btn-outline-light active"
                        : "btn btn-outline-light"
                    }
                    to={APP_ROUTES.AUTH_LOGIN}
                  >
                    Login
                  </NavLink>
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
