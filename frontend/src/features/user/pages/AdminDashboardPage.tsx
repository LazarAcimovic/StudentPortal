import React, { useState } from "react";
import { useUserStore } from "../../../store/user/useUserStore";
import { USER_ROLES } from "../../../shared/constants/constants";
import UsersTabPanel from "../components/admin/UsersTabPanel";
import SubjectsTabPanel from "../components/admin/SubjectsTabPanel";
import EnrollmentsTabPanel from "../components/admin/EnrollmentsTabPanel";
import EscalationsTab from "../components/admin/EscalationsTab";

const AdminDashboardPage: React.FC = () => {
  const currentUser = useUserStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState("users");

  if (!currentUser || currentUser.userRole !== USER_ROLES.Admin) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Access denied</h3>
          <p>You do not have admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2>Admin Dashboard</h2>
      <h4 className="mb-4">Welcome, {currentUser.firstName}!</h4>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "subjects" ? "active" : ""}`}
            onClick={() => setActiveTab("subjects")}
          >
            Subjects
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "enrollments" ? "active" : ""}`}
            onClick={() => setActiveTab("enrollments")}
          >
            Enrollments
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "escalations" ? "active" : ""}`}
            onClick={() => setActiveTab("escalations")}
          >
            Escalations
          </button>
        </li>
      </ul>
      <div className={activeTab === "users" ? "" : "d-none"}>
        <UsersTabPanel
          currentUserId={currentUser.id}
          callerRole={currentUser.userRole}
        />
      </div>
      <div className={activeTab === "subjects" ? "" : "d-none"}>
        <SubjectsTabPanel />
      </div>
      <div className={activeTab === "enrollments" ? "" : "d-none"}>
        <EnrollmentsTabPanel />
      </div>
      <div className={activeTab === "escalations" ? "" : "d-none"}>
        <EscalationsTab />
      </div>
    </div>
  );
};

export default AdminDashboardPage;
