import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/login/LoginPage";
import AdminDashboardPage from "../pages/dashboard/AdminDashboardPage";
import ProfessorDashboardPage from "../pages/dashboard/ProfessorDashboardPage";
import StudentDashboardPage from "../pages/dashboard/StudentDashboardPage";
import ProtectedRoute from "../components/common/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true, // ruta /
        element: <HomePage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "admin-dashboard",
            element: <AdminDashboardPage />,
          },
          {
            path: "professor-dashboard",
            element: <ProfessorDashboardPage />,
          },
          {
            path: "student-dashboard",
            element: <StudentDashboardPage />,
          },
        ],
      },
      {
        path: "*",
        element: <h1>404 - Page not found.</h1>,
      },
    ],
  },
]);
