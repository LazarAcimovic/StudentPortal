import { render, type RenderResult, type RenderOptions as RTLRenderOptions } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
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
import { useUserStore } from '../../store/user/useUserStore';
import type { ReactElement } from 'react';
import type { User } from '../../shared/models/User';

// ── renderApp / renderAt (integration tests) ──────────────────────────────────

export interface AppRenderOptions {
  initialEntries?: string[];
}

export interface RenderWithProvidersResult extends RenderResult {
  user: UserEvent;
  router: ReturnType<typeof createMemoryRouter>;
}

export function renderApp(options: AppRenderOptions = {}): RenderWithProvidersResult {
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

// ── renderWithProviders / resetUserStore (unit tests) ────────────────────────

export interface RenderOptionsEx extends Omit<RTLRenderOptions, 'wrapper'> {
  route?: string;
  user?: User | null;
  isHydrating?: boolean;
}

export function resetUserStore(user: User | null = null, isHydrating = false): void {
  useUserStore.setState({
    currentUser: user,
    isHydrating,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', user = null, isHydrating = false, ...options }: RenderOptionsEx = {}
): RenderResult {
  resetUserStore(user, isHydrating);
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
    options
  );
}
