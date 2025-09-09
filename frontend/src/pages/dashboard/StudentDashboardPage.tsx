import React from "react";

const StudentDashboardPage: React.FC = () => {
  return (
    <div className="container mt-4">
      <div className="alert alert-info text-center">
        <h2>Student Dashboard</h2>
        <p>
          Dobrodošli na studentski panel. Ovde možete pratiti svoj akademski
          uspeh i statistike.
        </p>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
