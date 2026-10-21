import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderAnonymously } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { loginHandler, meHandler } from '../../helpers/mswHandlers';
import { seededAdmin, seededProfessor, seededStudent } from '../../helpers/fixtures/users';
import { APP_ROUTES } from '../../../config/constants';

describe('LoginPage (§5.2)', () => {
  it('when the submit button is clicked with empty inputs then it shows email + password required errors', async () => {
    const { user } = renderAnonymously(APP_ROUTES.AUTH_LOGIN);

    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/^password$/i);

    await user.click(emailInput);
    await user.tab();
    await user.click(passwordInput);
    await user.tab();

    expect(await screen.findByText(/Email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
  });

  it('when a malformed email is entered then it shows a format error', async () => {
    const { user } = renderAnonymously(APP_ROUTES.AUTH_LOGIN);

    const emailInput = await screen.findByLabelText(/email address/i);
    await user.type(emailInput, 'not-an-email');
    await user.tab();

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });

  it('when the password eye toggle is clicked then the input type flips between password and text', async () => {
    const { user } = renderAnonymously(APP_ROUTES.AUTH_LOGIN);

    const passwordInput = await screen.findByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggle = await screen.findByRole('button', { name: /show password/i });
    await user.click(toggle);
    expect(passwordInput.type).toBe('text');

    const toggleAgain = await screen.findByRole('button', { name: /hide password/i });
    await user.click(toggleAgain);
    expect(passwordInput.type).toBe('password');
  });

  it.each([
    { role: 'admin', fx: seededAdmin, target: APP_ROUTES.ADMIN_DASHBOARD },
    { role: 'professor', fx: seededProfessor, target: APP_ROUTES.PROFESSOR_DASHBOARD },
    { role: 'student', fx: seededStudent, target: APP_ROUTES.STUDENT_DASHBOARD },
  ])('when $role submits valid credentials then it navigates to $target', async ({ fx, target }) => {
    server.use(loginHandler(fx), meHandler(fx));
    const { user, router } = renderAnonymously(APP_ROUTES.AUTH_LOGIN);

    await user.type(await screen.findByLabelText(/email address/i), fx.email);
    await user.type(await screen.findByLabelText(/^password$/i), 'ValidPass!123');
    await user.click(await screen.findByRole('button', { name: /^log in$/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(target);
    });
  });

  it('when the server returns 401 then an error toast appears and the user stays on /login', async () => {
    server.use(loginHandler(null, 401));
    const { user, router } = renderAnonymously(APP_ROUTES.AUTH_LOGIN);

    await user.type(await screen.findByLabelText(/email address/i), 'bad@example.com');
    await user.type(await screen.findByLabelText(/^password$/i), 'whatever123');
    await user.click(await screen.findByRole('button', { name: /^log in$/i }));

    const alert = await screen.findAllByText(/invalid email or password/i);
    expect(alert.length).toBeGreaterThanOrEqual(1);
    expect(router.state.location.pathname).toBe(APP_ROUTES.AUTH_LOGIN);
  });

  it('when a soft-deleted account tries to log in then the same generic error appears', async () => {
    // Backend returns 401 (same code as bad credentials — PRD rule).
    server.use(loginHandler(null, 401));
    const { user } = renderAnonymously(APP_ROUTES.AUTH_LOGIN);

    await user.type(await screen.findByLabelText(/email address/i), 'softdeleted@example.com');
    await user.type(await screen.findByLabelText(/^password$/i), 'CorrectHorseBatteryStaple1!');
    await user.click(await screen.findByRole('button', { name: /^log in$/i }));

    const inline = await screen.findAllByText(/invalid email or password/i);
    expect(inline.length).toBeGreaterThanOrEqual(1);
  });
});
