import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-5 bg-light">
      <div className="container">
        <h1 className="display-4 fw-bold text-primary">
          Welcome to Student Portal!
        </h1>
        <p className="lead mt-4 mb-5">
          Your central hub for tracking academic progress, grades, and all
          important announcements.
        </p>
        <button
          className="btn btn-primary btn-lg rounded-pill shadow-sm"
          onClick={() => navigate("/login")}
        >
          Log in
        </button>
      </div>

      <div className="container mt-5 pt-5">
        <div className="row text-start g-4">
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-4">
              <div className="d-flex align-items-center mb-3">
                <span className="text-primary me-2 display-6">📖</span>
                <h4 className="card-title mb-0">Grade Overview</h4>
              </div>
              <p className="card-text text-muted">
                Track all your grades in one place. From preliminary to
                final, everything is transparent and accessible.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-4">
              <div className="d-flex align-items-center mb-3">
                <span className="text-primary me-2 display-6">📚</span>
                <h4 className="card-title mb-0">All Subjects</h4>
              </div>
              <p className="card-text text-muted">
                Access information about all subjects you are enrolled in,
                including professor details and ECTS credits.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm p-4">
              <div className="d-flex align-items-center mb-3">
                <span className="text-primary me-2 display-6">📈</span>
                <h4 className="card-title mb-0">Statistics</h4>
              </div>
              <p className="card-text text-muted">
                Analyze your academic progress through interactive
                statistics, such as average grade and earned ECTS credits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
