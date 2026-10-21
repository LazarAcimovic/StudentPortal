import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { studentDashboardHandler } from '../../helpers/mswHandlers';
import { dashboardFreshAwaiting } from '../../helpers/fixtures/studentDashboard';
import { APP_ROUTES } from '../../../config/constants';

// SubjectsCard renders table + cards layouts simultaneously (Bootstrap hides
// one by media class); jsdom has no CSS, so both are in the DOM. Pick [0].
async function firstButton(name: RegExp) {
  const all = await screen.findAllByRole('button', { name });
  return all[0];
}

describe('Student appeals (§5.5 + §5.8)', () => {
  it('when Write appeal is clicked then the modal opens with a textarea capped at 1000 chars', async () => {
    server.use(studentDashboardHandler(dashboardFreshAwaiting));

    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.STUDENT_DASHBOARD],
    });

    await user.click(await firstButton(/write appeal/i));
    const textarea = await screen.findByRole('textbox');
    expect(textarea).toHaveAttribute('maxLength', '1000');
  });

  it('when Submit appeal is clicked then POST /Appeal body carries enrollmentId + text', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      studentDashboardHandler(dashboardFreshAwaiting),
      http.post('/api/Appeal', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.STUDENT_DASHBOARD],
    });

    await user.click(await firstButton(/write appeal/i));
    const textarea = await screen.findByRole('textbox');
    await user.type(textarea, 'Please review my grade.');
    await user.click(screen.getByRole('button', { name: /submit appeal/i }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({
      enrollmentId: 'e-fresh',
      text: 'Please review my grade.',
    });
  });

  it('when the textarea is empty then the Submit appeal button is disabled', async () => {
    server.use(studentDashboardHandler(dashboardFreshAwaiting));
    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.STUDENT_DASHBOARD],
    });

    await user.click(await firstButton(/write appeal/i));
    expect(screen.getByRole('button', { name: /submit appeal/i })).toBeDisabled();
  });

  it('when Confirm grade is clicked then POST /Grade/student-confirm body carries enrollmentId', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      studentDashboardHandler(dashboardFreshAwaiting),
      http.post('/api/Grade/student-confirm', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { user } = authenticatedRender({
      as: 'student',
      initialEntries: [APP_ROUTES.STUDENT_DASHBOARD],
    });

    await user.click(await firstButton(/confirm grade/i));
    await user.click(await screen.findByRole('button', { name: /yes, confirm/i }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ enrollmentId: 'e-fresh' });
  });
});
