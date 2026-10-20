import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import App from '../../App';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../features/auth/pages/LoginPage';
import AdminDashboardPage from '../../features/user/pages/AdminDashboardPage';
import ProfessorDashboardPage from '../../features/user/pages/ProfessorDashboardPage';
import StudentDashboardPage from '../../features/user/pages/StudentDashboardPage';
import MyProfilePage from '../../features/user/pages/MyProfilePage';
import ChangePasswordPage from '../../features/user/pages/ChangePasswordPage';
import AuthGuard from '../../providers/authGuard';
import { APP_ROUTES } from '../../config/constants';
import type { ReactElement } from 'react';

export interface RenderOptions {
  initialEntries?: string[];
}

export interface RenderWithProvidersResult extends RenderResult {
  user: UserEvent;
  router: ReturnType<typeof createMemoryRouter>;
}

/**
 * Mounts the real App shell with a MemoryRouter so AuthGuard, Navbar, the
 * axios client interceptor, the Zustand store, and the ToastContainer are all
 * live. MSW serves the HTTP boundary.
 */
export function renderApp(options: RenderOptions = {}): RenderWithProvidersResult {
  const router = createMemoryRouter(
    [
      {
        path: APP_ROUTES.HOME,
        element: <App />,
        children: [
          { index: true, element: <HomePage /> },
          { path: APP_ROUTES.AUTH_LOGIN.slice(1), element: <LoginPage /> },
          {
            element: <AuthGuard />,
            children: [
              { path: APP_ROUTES.ADMIN_DASHBOARD.slice(1), element: <AdminDashboardPage /> },
              { path: APP_ROUTES.PROFESSOR_DASHBOARD.slice(1), element: <ProfessorDashboardPage /> },
              { path: APP_ROUTES.STUDENT_DASHBOARD.slice(1), element: <StudentDashboardPage /> },
              { path: APP_ROUTES.PROFILE.slice(1), element: <MyProfilePage /> },
              { path: APP_ROUTES.CHANGE_PASSWORD.slice(1), element: <ChangePasswordPage /> },
            ],
          },
          { path: '*', element: <h1>404 - Page not found.</h1> },
        ],
      },
    ],
    { initialEntries: options.initialEntries ?? [APP_ROUTES.HOME] }
  );

  const user = userEvent.setup();
  const result = render(<RouterProvider router={router} />);
  return { ...result, user, router };
}

/**
 * Mounts a specific ReactElement at the given path inside a MemoryRouter.
 * Use when a test targets a single component or route in isolation (no App
 * shell, no hydration call).
 */
export function renderAt(
  element: ReactElement,
  path: string = '/'
): RenderWithProvidersResult {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            {element}
            <ToastContainer position="top-right" autoClose={4000} />
          </>
        ),
        children: [{ path: '*', element: null }],
      },
    ],
    { initialEntries: [path] }
  );

  const user = userEvent.setup();
  const result = render(<RouterProvider router={router} />);
  return { ...result, user, router };
}
