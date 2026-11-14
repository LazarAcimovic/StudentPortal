import React from "react";
import { NavLink } from "react-router-dom";
import { useUserStore } from "../../store/user/useUserStore";
import { APP_ROUTES, DASHBOARD_BY_ROLE } from "../../config/constants";
import { logout } from "../../features/auth/api/authService";
import { clearAuthSession } from "../../lib/auth";
import ResetDemoButton from "./ResetDemoButton";

const Navbar: React.FC = () => {
  const currentUser = useUserStore((s) => s.currentUser);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthSession({ redirectToLogin: true });
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
                      to={DASHBOARD_BY_ROLE[currentUser.userRole] ?? APP_ROUTES.HOME}
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
            <ul className="navbar-nav align-items-lg-center">
              {/* Renders itself only on a demo deployment; null everywhere else (UI §3). */}
              <ResetDemoButton />
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
