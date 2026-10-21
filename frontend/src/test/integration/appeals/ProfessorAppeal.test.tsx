import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { professorDashboardHandler } from '../../helpers/mswHandlers';
import {
  emptyProfessorDashboard,
  makeAppealRow,
} from '../../helpers/fixtures/professorDashboard';
import { APP_ROUTES } from '../../../config/constants';

// AppealsSection renders table + cards layouts; jsdom shows both. Pick [0].
async function firstButton(name: RegExp) {
  const all = await screen.findAllByRole('button', { name });
  return all[0];
}

describe('Professor appeals section (§5.4 + Task 18.6)', () => {
  it('when there are no appeals then the section renders an empty-state message', async () => {
    server.use(professorDashboardHandler(emptyProfessorDashboard));
    authenticatedRender({ as: 'professor', initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD] });

    expect(await screen.findByText(/No pending or overdue appeals/i)).toBeInTheDocument();
  });

  it('when a Pending appeal is clicked View appeal then Accept and Deny buttons are available', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [
          makeAppealRow({ appealId: 'a-1', status: 'Pending', text: 'The exam was unfair.' }),
        ],
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await firstButton(/view appeal/i));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Accept$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Deny$/i })).toBeInTheDocument();
  });

  it('when an Overdue appeal is viewed then Accept / Deny are not rendered', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [makeAppealRow({ appealId: 'a-ovd', status: 'Overdue' })],
      })
    );
    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await firstButton(/view appeal/i));
    expect(screen.queryByRole('button', { name: /^Accept$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Deny$/i })).toBeNull();
  });

  it('when Deny is clicked then a confirm sub-step appears before the POST fires', async () => {
    let denyCalled = false;
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [makeAppealRow({ appealId: 'a-deny', status: 'Pending' })],
      }),
      http.post('/api/Appeal/a-deny/deny', () => {
        denyCalled = true;
        return HttpResponse.json({ reviewedAt: '2026-10-20T10:00:00Z' });
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await firstButton(/view appeal/i));
    await user.click(screen.getByRole('button', { name: /^Deny$/i }));

    expect(denyCalled).toBe(false);
    expect(await screen.findByText(/Are you sure you want to deny/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm deny/i }));
    await waitFor(() => expect(denyCalled).toBe(true));
  });

  it('when Accept is clicked then POST /Appeal/:id/accept fires', async () => {
    let acceptCalled = false;
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [makeAppealRow({ appealId: 'a-acc', status: 'Pending' })],
      }),
      http.post('/api/Appeal/a-acc/accept', () => {
        acceptCalled = true;
        return HttpResponse.json({});
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await firstButton(/view appeal/i));
    await user.click(screen.getByRole('button', { name: /^Accept$/i }));

    await waitFor(() => expect(acceptCalled).toBe(true));
  });

  it('when an Overdue history entry exists for the same gradeId then it renders with [OVERDUE] prefix', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [
          makeAppealRow({
            appealId: 'a-overdue',
            gradeId: 'g-x',
            status: 'Overdue',
            text: 'Earlier appeal that overdue.',
          }),
          makeAppealRow({
            appealId: 'a-pending',
            gradeId: 'g-x',
            status: 'Pending',
            text: 'My current appeal.',
          }),
        ],
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    // Each row renders twice (table + cards). The Pending row's View button
    // is the 3rd overall when iterating all four.
    const viewButtons = await screen.findAllByRole('button', { name: /view appeal/i });
    // Click one of the Pending row's buttons. The Pending appeal is the
    // second row rendered in each layout, so index [1] is Pending in the
    // table layout.
    await user.click(viewButtons[1]);

    expect(await screen.findByText(/\[OVERDUE\]/)).toBeInTheDocument();
  });
});

describe('Deny-undo countdown time boundaries (Task 18.7, §6.1)', () => {
  it.each([
    { label: 'before expiry — Undo visible', canUndoDeny: true, shouldSee: true },
    { label: 'at/after expiry — Undo gone', canUndoDeny: false, shouldSee: false },
  ])('$label', async ({ canUndoDeny, shouldSee }) => {
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [
          makeAppealRow({
            appealId: 'a-undo',
            status: 'Denied',
            canUndoDeny,
            undoDenyDeadline: canUndoDeny
              ? new Date(Date.now() + 1000).toISOString()
              : null,
          }),
        ],
      })
    );

    authenticatedRender({ as: 'professor', initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD] });

    await screen.findAllByRole('button', { name: /view appeal/i });

    const undos = screen.queryAllByRole('button', { name: /^Undo$/i });
    if (shouldSee) {
      expect(undos.length).toBeGreaterThan(0);
    } else {
      expect(undos.length).toBe(0);
    }
  });

  it('when Undo is clicked then POST /Appeal/:id/undo-deny fires', async () => {
    let undoCalled = false;
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [
          makeAppealRow({
            appealId: 'a-undo-click',
            status: 'Denied',
            canUndoDeny: true,
            undoDenyDeadline: new Date(Date.now() + 60_000).toISOString(),
          }),
        ],
      }),
      http.post('/api/Appeal/a-undo-click/undo-deny', () => {
        undoCalled = true;
        return HttpResponse.json({});
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await firstButton(/^Undo$/i));
    await waitFor(() => expect(undoCalled).toBe(true));
  });
});
