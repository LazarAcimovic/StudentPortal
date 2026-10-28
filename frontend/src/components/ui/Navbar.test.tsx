import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { makeAdmin, makeStudent } from '../../test/factories';
import { useUserStore } from '../../store/user/useUserStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

const logoutMock = vi.fn();
vi.mock('../../features/auth/api/authService', () => ({
  logout: () => logoutMock(),
}));

const toastSuccess = vi.fn();
vi.mock('react-toastify', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a) },
}));

import Navbar from './Navbar';

beforeEach(() => {
  mockedNavigate.mockReset();
  logoutMock.mockReset();
  toastSuccess.mockReset();
});

describe('Navbar — logged-out state', () => {
  it('shows only the Login link and no Dashboard or greeting', () => {
    renderWithProviders(<Navbar />, { user: null });
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
  });
});

describe('Navbar — logged-in state', () => {
  it('shows Dashboard, greeting with first name, and no Login button', () => {
    renderWithProviders(<Navbar />, { user: makeStudent({ firstName: 'Ana' }) });
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/welcome, ana/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^login$/i })).not.toBeInTheDocument();
  });

  it('has a My Profile dropdown entry (PRD §19B.5)', () => {
    renderWithProviders(<Navbar />, { user: makeAdmin() });
    expect(screen.getByRole('link', { name: /my profile/i })).toBeInTheDocument();
  });

  it('never renders a Students link anywhere', () => {
    renderWithProviders(<Navbar />, { user: makeAdmin() });
    expect(screen.queryByRole('link', { name: /students/i })).not.toBeInTheDocument();
  });

  it('Logout calls authService.logout, clears the store, and navigates to /login', async () => {
    logoutMock.mockResolvedValueOnce(undefined);
    renderWithProviders(<Navbar />, { user: makeStudent() });

    const ue = userEvent.setup();
    await ue.click(screen.getByRole('button', { name: /logout/i }));

    expect(logoutMock).toHaveBeenCalled();
    expect(useUserStore.getState().currentUser).toBeNull();
    expect(mockedNavigate).toHaveBeenCalledWith('/login');
    // UI §11.5: logout fires no toast (the toast list has no logout entry; removed in dc99eea).
    expect(toastSuccess).not.toHaveBeenCalled();
  });

});
