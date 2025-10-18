import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-5 bg-light">
      <div className="container">
        <h1 className="display-4 fw-bold text-primary">
          Dobrodošli na Studentski Portal!
        </h1>
        <p className="lead mt-4 mb-5">
          Vaša centralna tačka za praćenje akademskog napretka, ocena i svih
          važnih obaveštenja.
        </p>
        <button
          className="btn btn-primary btn-lg rounded-pill shadow-sm"
          onClick={() => navigate("/login")}
        >
          Prijavi se
        </button>
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
};

export default HomePage;
