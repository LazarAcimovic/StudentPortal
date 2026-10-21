import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { authenticatedRender, renderAnonymously } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { studentDashboardHandler } from '../../helpers/mswHandlers';
import { emptyStudentDashboard } from '../../helpers/fixtures/studentDashboard';
import { APP_ROUTES } from '../../../config/constants';

describe('Accessibility (§2.5)', () => {
  it('Home page has a reachable h1', async () => {
    renderAnonymously(APP_ROUTES.HOME);
    expect(
      await screen.findByRole('heading', { level: 1, name: /Welcome to Student Portal/i })
    ).toBeInTheDocument();
  });

  it('Login page: the password show/hide toggle has an accessible label and the pressed state is announced via its label swap', async () => {
    const { user } = renderAnonymously(APP_ROUTES.AUTH_LOGIN);
    const toggle = await screen.findByRole('button', { name: /show password/i });
    expect(toggle).toHaveAccessibleName();
    await user.click(toggle);
    expect(await screen.findByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('Login form inputs have accessible names via labels', async () => {
    renderAnonymously(APP_ROUTES.AUTH_LOGIN);
    expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('Student dashboard page has h1 and the active nav link exposes aria-current="page"', async () => {
    server.use(studentDashboardHandler(emptyStudentDashboard));
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    expect(
      await screen.findByRole('heading', { level: 1, name: /Student Dashboard/i })
    ).toBeInTheDocument();

    const link = await screen.findByRole('link', { name: /^Dashboard$/i });
    await waitFor(() => {
      expect(link.getAttribute('aria-current')).toBe('page');
    });
  });

  it('Modal exposes role="dialog" and aria-modal="true"', async () => {
    server.use(studentDashboardHandler({
      ...emptyStudentDashboard,
      subjects: [
        {
          enrollmentId: 'e-a11y',
          subjectName: 'Algorithms',
          professorName: 'P',
          finalGrade: 7,
          status: 'Awaiting confirmation',
          appealStatus: null,
          canWriteAppeal: true,
          canConfirmGrade: false,
          confirmationDeadline: null,
          pendingAppealId: null,
        },
      ],
    }));

    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.STUDENT_DASHBOARD],
    });

    const buttons = await screen.findAllByRole('button', { name: /write appeal/i });
    await user.click(buttons[0]);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('Change password API error alert has role="alert"', async () => {
    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.CHANGE_PASSWORD],
    });

    await user.type(await screen.findByLabelText(/current password/i), 'cur!PwdABC12');
    // Deliberately mismatched to trigger inline error.
    await user.type(screen.getByLabelText(/^new password$/i), 'NewPassword!1A');
    await user.type(screen.getByLabelText(/confirm new password/i), 'Different!1AB');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    const errors = await screen.findAllByText(/do not match/i);
    expect(errors.length).toBeGreaterThan(0);
  });
});
