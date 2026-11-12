import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import HomePage from '../pages/HomePage';
import { LoginPage } from '../features/auth';
import {
  AdminDashboardPage,
  ProfessorDashboardPage,
  StudentDashboardPage,
  MyProfilePage,
  ChangePasswordPage,
} from '../features/user';
import AuthGuard from './authGuard';
import RoleGate from '../components/shared/RoleGate';
import RoleHomeRedirect from './RoleHomeRedirect';
import { APP_ROUTES } from '../config/constants';
import { USER_ROLES } from '../shared/constants/constants';

export const router = createBrowserRouter([
  {
    path: APP_ROUTES.HOME,
    element: <App />,
    errorElement: <ErrorBoundary />,
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
            element: (
              <RoleGate allowed={USER_ROLES.Admin} fallback={<RoleHomeRedirect />}>
                <AdminDashboardPage />
              </RoleGate>
            ),
          },
          {
            path: APP_ROUTES.PROFESSOR_DASHBOARD.slice(1),
            element: (
              <RoleGate allowed={USER_ROLES.Professor} fallback={<RoleHomeRedirect />}>
                <ProfessorDashboardPage />
              </RoleGate>
            ),
          },
          {
            path: APP_ROUTES.STUDENT_DASHBOARD.slice(1),
            element: (
              <RoleGate allowed={USER_ROLES.Student} fallback={<RoleHomeRedirect />}>
                <StudentDashboardPage />
              </RoleGate>
            ),
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
