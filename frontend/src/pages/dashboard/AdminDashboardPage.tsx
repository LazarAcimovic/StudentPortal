import React from "react";

const AdminDashboardPage: React.FC = () => {
  return (
    <div className="container mt-4">
      <div className="alert alert-info text-center">
        <h2>Admin Dashboard</h2>
        <p>
          Dobrodošli na administratorski panel. Ovde možete upravljati svim
          korisnicima i predmetima.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
