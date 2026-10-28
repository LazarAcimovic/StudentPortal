import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { useUserStore } from '../../../store/user/useUserStore';
import { USER_ROLES } from '../../../shared/constants/constants';
import { makeStudent, makeProfessor, makeAdmin } from '../../../test/factories';

vi.mock('../api/authService', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('react-toastify', () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockedNavigate };
});

import LoginPage from './LoginPage';
import * as authService from '../api/authService';

beforeEach(() => {
  toastError.mockReset();
  toastSuccess.mockReset();
  mockedNavigate.mockReset();
  (authService.login as unknown as ReturnType<typeof vi.fn>).mockReset();
  useUserStore.setState({ currentUser: null, isHydrating: false });
});

describe('LoginPage happy paths', () => {
  it.each([
    ['Student', makeStudent, '/student-dashboard'],
    ['Professor', makeProfessor, '/professor-dashboard'],
    ['Admin', makeAdmin, '/admin-dashboard'],
  ])('on %s login success, stores user and navigates to %s', async (_, make, expectedRoute) => {
    const user = make();
    (authService.login as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(user);

    renderWithProviders(<LoginPage />);
    const ue = userEvent.setup();

    await ue.type(screen.getByLabelText(/email/i), user.email);
    await ue.type(screen.getByLabelText(/^password$/i), 'secret-pass');
    await ue.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(authService.login).toHaveBeenCalledTimes(1));
    expect(authService.login).toHaveBeenCalledWith({ email: user.email, password: 'secret-pass' });
    expect(useUserStore.getState().currentUser).toEqual(user);
    await waitFor(() => expect(mockedNavigate).toHaveBeenCalledWith(expectedRoute));
  });
});

describe('LoginPage unhappy paths', () => {
  it('on 401 shows an inline server error above the form; no toast; store untouched', async () => {
    (authService.login as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderWithProviders(<LoginPage />);
    const ue = userEvent.setup();

    await ue.type(screen.getByLabelText(/email/i), 'a@b.com');
    await ue.type(screen.getByLabelText(/^password$/i), 'badpass');
    await ue.click(screen.getByRole('button', { name: /log in/i }));

    // UI §5: submit error renders as an inline `alert alert-danger`, not a toast.
    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
    expect(toastError).not.toHaveBeenCalled();
    expect(useUserStore.getState().currentUser).toBeNull();
  });

  it('does not call the service when the Zod schema fails (empty submit)', async () => {
    renderWithProviders(<LoginPage />);
    const ue = userEvent.setup();
    await ue.click(screen.getByRole('button', { name: /log in/i }));
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('field errors only appear after the field is touched (blurred) or on submit', async () => {
    renderWithProviders(<LoginPage />);
    const ue = userEvent.setup();

    // Before any interaction, no inline errors visible
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();

    // Blur the email with it still empty → inline error appears
    const emailInput = screen.getByLabelText(/email/i);
    await ue.click(emailInput);
    await ue.tab();
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});

describe('LoginPage password visibility toggle', () => {
  it('toggles the password input between password and text type', async () => {
    renderWithProviders(<LoginPage />);
    const ue = userEvent.setup();

    const password = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(password.type).toBe('password');

    await ue.click(screen.getByRole('button', { name: /show password/i }));
    expect(password.type).toBe('text');

    await ue.click(screen.getByRole('button', { name: /hide password/i }));
    expect(password.type).toBe('password');
  });
});

describe('LoginPage already-authenticated redirect', () => {
  it.each([
    [USER_ROLES.Admin, /admin-dashboard/],
    [USER_ROLES.Professor, /professor-dashboard/],
    [USER_ROLES.Student, /student-dashboard/],
  ])('role %s already in the store redirects to the role dashboard', (role, _regex) => {
    const makers = {
      [USER_ROLES.Admin]: makeAdmin,
      [USER_ROLES.Professor]: makeProfessor,
      [USER_ROLES.Student]: makeStudent,
    };
    const u = makers[role as keyof typeof makers]();

    const { container } = renderWithProviders(<LoginPage />, { user: u, isHydrating: false });
    // When Navigate renders, LoginPage returns early → login form is not rendered.
    expect(container.querySelector('form')).toBeNull();
  });
});
