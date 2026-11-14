import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';
import { makeAdmin, makeStudent } from '../../test/factories';

const logoutMock = vi.fn();
vi.mock('../../features/auth/api/authService', () => ({
  logout: () => logoutMock(),
}));

const clearAuthSessionMock = vi.fn();
vi.mock('../../lib/auth', () => ({
  clearAuthSession: (...a: unknown[]) => clearAuthSessionMock(...a),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-toastify', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

// The navbar hosts <ResetDemoButton>, which probes GET /api/Demo/status on mount.
// Component tests mock the service module (Tech-Frontend §7); the button's own
// behaviour is covered in ResetDemoButton.test.tsx.
const getDemoStatusMock = vi.fn();
vi.mock('../../features/demo/api/demoService', () => ({
  getDemoStatus: (...a: unknown[]) => getDemoStatusMock(...a),
  resetDemoData: vi.fn(),
}));

import Navbar from './Navbar';

beforeEach(() => {
  logoutMock.mockReset();
  clearAuthSessionMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  // Default: not a demo deployment, so the button stays hidden.
  getDemoStatusMock.mockReset();
  getDemoStatusMock.mockRejectedValue({ response: { status: 404 } });
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

  it('never renders a Reset demo button on a normal deployment (UI §3)', async () => {
    renderWithProviders(<Navbar />, { user: makeAdmin() });
    await waitFor(() => expect(getDemoStatusMock).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /reset demo/i })).not.toBeInTheDocument();
  });

  it('renders the Reset demo button on a demo deployment (UI §3, per D-049)', async () => {
    getDemoStatusMock.mockReset();
    getDemoStatusMock.mockResolvedValue(undefined);

    renderWithProviders(<Navbar />, { user: makeAdmin() });

    expect(await screen.findByRole('button', { name: /^reset demo$/i })).toBeInTheDocument();
  });

  it('Logout calls authService.logout then clearAuthSession with redirectToLogin', async () => {
    logoutMock.mockResolvedValueOnce(undefined);
    renderWithProviders(<Navbar />, { user: makeStudent() });

    const ue = userEvent.setup();
    await ue.click(screen.getByRole('button', { name: /logout/i }));

    expect(logoutMock).toHaveBeenCalled();
    expect(clearAuthSessionMock).toHaveBeenCalledWith({ redirectToLogin: true });
    // UI §11.5: logout fires no toast (the toast list has no logout entry; removed in dc99eea).
    expect(toastSuccess).not.toHaveBeenCalled();
  });

});
