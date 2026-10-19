import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import HomePage from '../pages/HomePage';
import LoginPage from '../features/auth/pages/LoginPage';
import AdminDashboardPage from '../features/user/pages/AdminDashboardPage';
import ProfessorDashboardPage from '../features/user/pages/ProfessorDashboardPage';
import StudentDashboardPage from '../features/user/pages/StudentDashboardPage';
import MyProfilePage from '../features/user/pages/MyProfilePage';
import ChangePasswordPage from '../features/user/pages/ChangePasswordPage';
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
          {
            path: APP_ROUTES.PROFILE.slice(1),
            element: <MyProfilePage />,
          },
          {
            path: APP_ROUTES.CHANGE_PASSWORD.slice(1),
            element: <ChangePasswordPage />,
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
