import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import HomePage from '../pages/HomePage';
import LoginPage from '../features/auth/pages/LoginPage';
import AdminDashboardPage from '../pages/dashboard/AdminDashboardPage';
import ProfessorDashboardPage from '../pages/dashboard/ProfessorDashboardPage';
import StudentDashboardPage from '../pages/dashboard/StudentDashboardPage';
import AuthGuard from './authGuard';
import { APP_ROUTES } from '../config/constants';

export const router = createBrowserRouter([
  {
    path: APP_ROUTES.HOME,
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: APP_ROUTES.AUTH_LOGIN.slice(1),
        element: <LoginPage />,
      },
      {
        element: <AuthGuard />,
        children: [
          {
            path: APP_ROUTES.ADMIN_DASHBOARD.slice(1),
            element: <AdminDashboardPage />,
          },
          {
            path: APP_ROUTES.PROFESSOR_DASHBOARD.slice(1),
            element: <ProfessorDashboardPage />,
          },
          {
            path: APP_ROUTES.STUDENT_DASHBOARD.slice(1),
            element: <StudentDashboardPage />,
          },
        ],
      },
      {
        path: '*',
        element: <h1>404 - Page not found.</h1>,
      },
    ],
  },
]);
