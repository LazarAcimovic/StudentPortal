import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RoleHomeRedirect from './RoleHomeRedirect';
import RoleGate from '../components/shared/RoleGate';
import { useUserStore } from '../store/user/useUserStore';
import { USER_ROLES } from '../shared/constants/constants';
import { APP_ROUTES } from '../config/constants';
import { makeStudent, makeProfessor, makeAdmin } from '../test/factories';

function renderAt(route: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={route} element={element} />
        <Route path={APP_ROUTES.AUTH_LOGIN} element={<div>login-page</div>} />
        <Route path={APP_ROUTES.ADMIN_DASHBOARD} element={<div>admin-home</div>} />
        <Route path={APP_ROUTES.PROFESSOR_DASHBOARD} element={<div>professor-home</div>} />
        <Route path={APP_ROUTES.STUDENT_DASHBOARD} element={<div>student-home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('<RoleHomeRedirect>', () => {
  it('sends a student to the student dashboard', () => {
    useUserStore.setState({ currentUser: makeStudent(), isHydrating: false });
    renderAt('/x', <RoleHomeRedirect />);
    expect(screen.getByText('student-home')).toBeInTheDocument();
  });

  it('sends a professor to the professor dashboard', () => {
    useUserStore.setState({ currentUser: makeProfessor(), isHydrating: false });
    renderAt('/x', <RoleHomeRedirect />);
    expect(screen.getByText('professor-home')).toBeInTheDocument();
  });

  it('sends an admin to the admin dashboard', () => {
    useUserStore.setState({ currentUser: makeAdmin(), isHydrating: false });
    renderAt('/x', <RoleHomeRedirect />);
    expect(screen.getByText('admin-home')).toBeInTheDocument();
  });

  it('sends an unauthenticated user to login', () => {
    useUserStore.setState({ currentUser: null, isHydrating: false });
    renderAt('/x', <RoleHomeRedirect />);
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });
});

// Stands in for a role-restricted page; throws if it is ever mounted, proving
// the gate short-circuits before the forbidden page (and its fetches) run.
function ForbiddenPage(): never {
  throw new Error('forbidden page was mounted');
}

describe('RoleGate on a role-restricted route', () => {
  it('redirects a student away from the admin dashboard to their own dashboard, without mounting it', () => {
    useUserStore.setState({ currentUser: makeStudent(), isHydrating: false });
    renderAt(
      '/x',
      <RoleGate allowed={USER_ROLES.Admin} fallback={<RoleHomeRedirect />}>
        <ForbiddenPage />
      </RoleGate>
    );
    expect(screen.getByText('student-home')).toBeInTheDocument();
  });

  it('renders the admin dashboard for an admin', () => {
    useUserStore.setState({ currentUser: makeAdmin(), isHydrating: false });
    renderAt(
      '/x',
      <RoleGate allowed={USER_ROLES.Admin} fallback={<RoleHomeRedirect />}>
        <div>admin-dashboard-content</div>
      </RoleGate>
    );
    expect(screen.getByText('admin-dashboard-content')).toBeInTheDocument();
  });
});
