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

  const HomePageContent = () => (
    <div className="text-center py-5 bg-light">
      <div className="container">
        <h1 className="display-4 fw-bold text-primary">
          Dobrodošli na Studentski Portal!
        </h1>
        <p className="lead mt-4 mb-5">
          Vaša centralna tačka za praćenje akademskog napretka, ocena i svih
          važnih obaveštenja.
        </p>
        <Link
          to="/login"
          className="btn btn-primary btn-lg rounded-pill shadow-sm"
        >
          Prijavi se
        </Link>
      </div>

      <div className="container mt-5 pt-5">
        <div className="row text-start g-4">
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-4">
              <div className="d-flex align-items-center mb-3">
                <span className="text-primary me-2 display-6">📖</span>
                <h4 className="card-title mb-0">Pregled Ocena</h4>
              </div>
              <p className="card-text text-muted">
                Pratite sve svoje ocene na jednom mestu. Od preliminarnih do
                konačnih, sve je transparentno i dostupno.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-4">
              <div className="d-flex align-items-center mb-3">
                <span className="text-primary me-2 display-6">📚</span>
                <h4 className="card-title mb-0">Svi Predmeti</h4>
              </div>
              <p className="card-text text-muted">
                Pristupite informacijama o svim predmetima na koje ste upisani,
                uključujući podatke o profesorima i ESPB.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-4">
              <div className="d-flex align-items-center mb-3">
                <span className="text-primary me-2 display-6">📈</span>
                <h4 className="card-title mb-0">Statistike</h4>
              </div>
              <p className="card-text text-muted">
                Analizirajte svoj akademski napredak kroz interaktivne
                statistike, kao što su prosečna ocena i osvojeni ESPB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            Studentski Portal
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
                    Studenti
                  </Link>
                </li>
              )}
            </ul>
            <ul className="navbar-nav">
              {user ? (
                <>
                  <li className="nav-item">
                    <span className="nav-link">
                      Dobrodošao, {user.firstName}
                    </span>
                  </li>
                  <li className="nav-item">
                    <button
                      className="btn btn-outline-light"
                      onClick={handleLogout}
                    >
                      Odjava
                    </button>
                  </li>
                </>
              ) : (
                <li className="nav-item">
                  <Link className="btn btn-outline-light" to="/login">
                    Prijava
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
      {!user && <HomePageContent />}
    </>
  );
};

export default Navbar;
