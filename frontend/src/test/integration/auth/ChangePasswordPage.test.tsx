import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { APP_ROUTES } from '../../../config/constants';
import { useUserStore } from '../../../store/user/useUserStore';

const validNew = 'NewPassword!1A';

describe('ChangePasswordPage (§5.10)', () => {
  it('when New password is below 12 chars then an inline length error renders', async () => {
    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.CHANGE_PASSWORD],
    });

    await user.type(await screen.findByLabelText(/current password/i), 'old!PwdABC12');
    await user.type(screen.getByLabelText(/^new password$/i), 'Short!1A');
    await user.type(screen.getByLabelText(/confirm new password/i), 'Short!1A');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/at least 12 characters/i)).toBeInTheDocument();
  });

  it('when Confirm new password differs then an inline mismatch error renders', async () => {
    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.CHANGE_PASSWORD],
    });

    await user.type(await screen.findByLabelText(/current password/i), 'old!PwdABC12');
    await user.type(screen.getByLabelText(/^new password$/i), validNew);
    await user.type(screen.getByLabelText(/confirm new password/i), `${validNew}X`);
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it('when the server returns 400 with a message then the field error renders inline', async () => {
    server.use(
      http.post('/api/Account/change-password', () =>
        HttpResponse.json({ message: 'Current password is incorrect.' }, { status: 400 })
      )
    );

    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.CHANGE_PASSWORD],
    });

    await user.type(await screen.findByLabelText(/current password/i), 'wrong!PwdABC');
    await user.type(screen.getByLabelText(/^new password$/i), validNew);
    await user.type(screen.getByLabelText(/confirm new password/i), validNew);
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/Current password is incorrect/i)).toBeInTheDocument();
  });

  it('when 204 returns then clearAuthSession runs and the user is redirected to /login', async () => {
    server.use(
      http.post('/api/Account/change-password', () => new HttpResponse(null, { status: 204 }))
    );

    const { user, router } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.CHANGE_PASSWORD],
    });

    await user.type(await screen.findByLabelText(/current password/i), 'OldOldOld!1A');
    await user.type(screen.getByLabelText(/^new password$/i), validNew);
    await user.type(screen.getByLabelText(/confirm new password/i), validNew);
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(APP_ROUTES.AUTH_LOGIN);
    });
    expect(useUserStore.getState().currentUser).toBeNull();
  });

  it.each([
    { label: /current password/i, name: 'current' },
    { label: /^new password$/i, name: 'new' },
    { label: /confirm new password/i, name: 'confirm' },
  ])('when the $name eye toggle is clicked then that input flips to text', async ({ label }) => {
    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.CHANGE_PASSWORD],
    });

    const input = (await screen.findByLabelText(label)) as HTMLInputElement;
    expect(input.type).toBe('password');
    const toggle = input.parentElement?.querySelector('button[aria-label="Show password"]');
    expect(toggle).not.toBeNull();
    await user.click(toggle as HTMLElement);
    expect(input.type).toBe('text');
  });
});
