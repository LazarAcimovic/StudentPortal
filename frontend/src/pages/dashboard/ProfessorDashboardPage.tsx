import React from "react";

const ProfessorDashboardPage: React.FC = () => {
  return (
    <div className="container mt-4">
      <div className="alert alert-info text-center">
        <h2>Profesor Dashboard</h2>
        <p>
          Dobrodošli na profesorski panel. Ovde možete pregledati svoje predmete
          i raditi sa ocenama studenata.
        </p>
      </div>
    </div>
  );
};

export default ProfessorDashboardPage;
