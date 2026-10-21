import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderApp } from '../../helpers/renderWithProviders';
import { server } from '../../server';
import { meHandler, studentDashboardHandler } from '../../helpers/mswHandlers';
import { seededStudent } from '../../helpers/fixtures/users';
import { emptyStudentDashboard } from '../../helpers/fixtures/studentDashboard';
import { useUserStore } from '../../../store/user/useUserStore';
import { APP_ROUTES } from '../../../config/constants';

describe('Navbar (§5.7)', () => {
  it('when logged out then only the Login link renders (no Dashboard, no Students)', async () => {
    server.use(meHandler(null));
    renderApp({ initialEntries: [APP_ROUTES.HOME] });

    await screen.findByRole('heading', { name: /Welcome to Student Portal/i });
    expect(screen.getByRole('link', { name: /^Login$/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Dashboard$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Students$/i })).toBeNull();
  });

  it('when logged in then it renders Dashboard, the first-name greeting and no Students link', async () => {
    server.use(meHandler(seededStudent), studentDashboardHandler(emptyStudentDashboard));
    useUserStore.setState({ currentUser: seededStudent, isHydrating: false });

    renderApp({ initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    expect(await screen.findByRole('link', { name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/Welcome, Stu/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Students$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Login$/i })).toBeNull();
  });

  it('when on the dashboard then the Dashboard NavLink has aria-current="page" and .active', async () => {
    server.use(meHandler(seededStudent), studentDashboardHandler(emptyStudentDashboard));
    useUserStore.setState({ currentUser: seededStudent, isHydrating: false });

    renderApp({ initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    const dashboardLink = await screen.findByRole('link', { name: /^Dashboard$/i });
    await waitFor(() => {
      expect(dashboardLink).toHaveClass('active');
      expect(dashboardLink.getAttribute('aria-current')).toBe('page');
    });
  });

  it('when the My Profile dropdown is open then its item routes to /profile', async () => {
    server.use(meHandler(seededStudent), studentDashboardHandler(emptyStudentDashboard));
    useUserStore.setState({ currentUser: seededStudent, isHydrating: false });

    renderApp({ initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    // Bootstrap dropdowns need the data-bs-* API to open visually, but the
    // menu is present in the DOM; just assert the My Profile link's target.
    const link = await screen.findByRole('link', { name: /^My Profile$/i });
    expect(link).toHaveAttribute('href', APP_ROUTES.PROFILE);
  });

  it('when there is a Students link anywhere then the suite fails (regression guard, Task 17.5)', async () => {
    server.use(meHandler(seededStudent), studentDashboardHandler(emptyStudentDashboard));
    useUserStore.setState({ currentUser: seededStudent, isHydrating: false });

    renderApp({ initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    // Any <a>/<button> whose accessible name is just "Students" is forbidden.
    await screen.findByRole('link', { name: /^Dashboard$/i });
    const nav = screen.getByRole('navigation');
    expect(within(nav).queryByRole('link', { name: /^Students$/i })).toBeNull();
  });
});
