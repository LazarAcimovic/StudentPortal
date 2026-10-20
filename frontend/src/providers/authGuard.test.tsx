import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthGuard from './authGuard';
import { useUserStore } from '../store/user/useUserStore';
import { makeStudent } from '../test/factories';
import { APP_ROUTES } from '../config/constants';

function renderGuardAt(route = '/protected') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={APP_ROUTES.AUTH_LOGIN} element={<div>login-page</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/protected" element={<div>protected-content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  it('renders nothing while isHydrating=true (no navigate)', () => {
    useUserStore.setState({ currentUser: null, isHydrating: true });
    renderGuardAt();
    expect(screen.queryByText('login-page')).not.toBeInTheDocument();
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated and not hydrating', () => {
    useUserStore.setState({ currentUser: null, isHydrating: false });
    renderGuardAt();
    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument();
  });

  it('renders the protected outlet when authenticated', () => {
    useUserStore.setState({ currentUser: makeStudent(), isHydrating: false });
    renderGuardAt();
    expect(screen.getByText('protected-content')).toBeInTheDocument();
  });
});
