import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '../../helpers/renderWithProviders';
import { server } from '../../server';
import { meHandler } from '../../helpers/mswHandlers';
import { seededStudent } from '../../helpers/fixtures/users';
import { useUserStore } from '../../../store/user/useUserStore';
import { APP_ROUTES } from '../../../config/constants';

describe('App bootstrap (Task 13)', () => {
  it('when GET /Account/Me returns 200 then currentUser is hydrated', async () => {
    server.use(meHandler(seededStudent));
    renderApp({ initialEntries: ['/'] });

    await waitFor(() => {
      expect(useUserStore.getState().currentUser?.id).toBe(seededStudent.id);
    });
    expect(useUserStore.getState().isHydrating).toBe(false);
  });

  it('when GET /Account/Me returns 401 and refresh fails then currentUser stays null and public routes render', async () => {
    server.use(meHandler(null));
    // The refresh default returns 204 — but the subsequent Me still 401s, so
    // override refresh to 401 so hydration terminates fast.
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.post('/api/Account/Refresh', () => new HttpResponse(null, { status: 401 }))
    );
    renderApp({ initialEntries: [APP_ROUTES.HOME] });

    expect(
      await screen.findByRole('heading', { name: /Welcome to Student Portal/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(useUserStore.getState().currentUser).toBeNull();
    });
  });

  it('when currentUser becomes null while on a protected route then it navigates to /login', async () => {
    server.use(meHandler(seededStudent));
    const { router } = renderApp({ initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await waitFor(() => {
      expect(useUserStore.getState().currentUser?.id).toBe(seededStudent.id);
    });

    // Simulate session loss.
    useUserStore.setState({ currentUser: null });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(APP_ROUTES.AUTH_LOGIN);
    });
  });
});
