import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderApp } from '../../helpers/renderWithProviders';
import { server } from '../../server';
import { meHandler, studentDashboardHandler } from '../../helpers/mswHandlers';
import { seededStudent } from '../../helpers/fixtures/users';
import { emptyStudentDashboard } from '../../helpers/fixtures/studentDashboard';
import { useUserStore } from '../../../store/user/useUserStore';
import { APP_ROUTES } from '../../../config/constants';

describe('<AuthGuard> (Task 13)', () => {
  it('when unauthenticated access to a protected route then redirects to /login', async () => {
    server.use(meHandler(null));
    const { router } = renderApp({ initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(APP_ROUTES.AUTH_LOGIN);
    });
  });

  it('when authenticated access to a protected route then renders the protected page', async () => {
    server.use(meHandler(seededStudent), studentDashboardHandler(emptyStudentDashboard));
    useUserStore.setState({ currentUser: seededStudent, isHydrating: false });
    const { router } = renderApp({ initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(APP_ROUTES.STUDENT_DASHBOARD);
    });
  });
});
