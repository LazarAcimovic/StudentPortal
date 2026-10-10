import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.userRole) {
      case RoleEnum.Admin:
        return "/admin-dashboard";
      case RoleEnum.Professor:
        return "/professor-dashboard";
      case RoleEnum.Student:
        return "/student-dashboard";
      default:
        return "/";
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
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
              {user?.userRole === RoleEnum.Student && (
                <li className="nav-item">
                  <Link className="nav-link" to="/students">
                    Students
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
                  <Link className="btn btn-outline-light" to="/login">
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
