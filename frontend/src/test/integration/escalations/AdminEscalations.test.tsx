import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { escalationCasesHandler, eligibleProfessorsHandler } from '../../helpers/mswHandlers';
import { makeEscalatedCase, eligibleProfB } from '../../helpers/fixtures/escalation';
import { APP_ROUTES, API_ROUTES } from '../../../config/constants';

// The admin page also fetches users, subjects and enrollments on mount.
// These handlers silence those requests so the test stays focused on escalations.
const adminBaseHandlers = [
  http.get(`/api${API_ROUTES.USER}`, () => HttpResponse.json([])),
  http.get(`/api${API_ROUTES.SUBJECT}`, () => HttpResponse.json([])),
  http.get(`/api${API_ROUTES.ENROLLMENT}`, () => HttpResponse.json([])),
];

async function openEscalationsTab(user: ReturnType<typeof authenticatedRender>['user']) {
  const tab = await screen.findByRole('button', { name: /escalations/i });
  await user.click(tab);
}

describe('Admin Escalations tab (UI §8.6 / PRD §4.8)', () => {
  it('shows the Escalations tab button in the admin dashboard', async () => {
    server.use(...adminBaseHandlers, escalationCasesHandler([]));
    authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    expect(await screen.findByRole('button', { name: /escalations/i })).toBeInTheDocument();
  });

  it('clicking Escalations tab shows the empty-state message when no cases', async () => {
    server.use(...adminBaseHandlers, escalationCasesHandler([]));
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    expect(await screen.findByText(/no escalated cases/i)).toBeInTheDocument();
  });

  it('a NeedsAssignment case renders the danger badge and Assign professor button', async () => {
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([makeEscalatedCase({ escalationStatus: 'NeedsAssignment' })])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    // Table and card both render in jsdom — use findAll
    expect((await screen.findAllByText(/needs assignment/i)).length).toBeGreaterThan(0);
    const buttons = await screen.findAllByRole('button', { name: /assign professor/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('a NeedsReassignment case renders the warning badge and Reassign professor button', async () => {
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([makeEscalatedCase({ escalationStatus: 'NeedsReassignment' })])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    expect((await screen.findAllByText(/needs reassignment/i)).length).toBeGreaterThan(0);
    const buttons = await screen.findAllByRole('button', { name: /reassign professor/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('an Assigned case renders the info badge and no action button', async () => {
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([makeEscalatedCase({ escalationStatus: 'Assigned' })])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    expect((await screen.findAllByText(/^assigned$/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /assign professor/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reassign professor/i })).toBeNull();
  });

  it('a Resolved case renders the success badge and no action button', async () => {
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([
        makeEscalatedCase({ escalationStatus: 'Resolved', resolvedAt: '2026-10-27T12:00:00Z' }),
      ])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    expect((await screen.findAllByText(/^resolved/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /assign professor/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reassign professor/i })).toBeNull();
  });

  it('clicking Assign professor opens the modal with case detail and appeal history', async () => {
    const c = makeEscalatedCase({ escalationStatus: 'NeedsAssignment' });
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([c]),
      eligibleProfessorsHandler([eligibleProfB])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    const buttons = await screen.findAllByRole('button', { name: /assign professor/i });
    await user.click(buttons[0]);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/assign professor/i, { selector: '[id^="modal-title"]' })).toBeInTheDocument();
    // Case detail
    expect(within(dialog).getByText(c.subjectName)).toBeInTheDocument();
    // Appeal history
    expect(within(dialog).getByText(c.appeals[0].text)).toBeInTheDocument();
  });

  it('when the eligible professor list is empty, Confirm is disabled', async () => {
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([makeEscalatedCase({ escalationStatus: 'NeedsAssignment' })]),
      eligibleProfessorsHandler([])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    const assignButtons = await screen.findAllByRole('button', { name: /assign professor/i });
    await user.click(assignButtons[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/no eligible professors available/i)).toBeInTheDocument();
    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('when an eligible professor is selected and Confirm clicked, POST /assign fires and row updates in place', async () => {
    const c = makeEscalatedCase({ escalationStatus: 'NeedsAssignment' });
    const updated = { ...c, escalationStatus: 'Assigned' as const };
    let assignCalled = false;

    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([c]),
      eligibleProfessorsHandler([eligibleProfB]),
      http.post(`/api${API_ROUTES.ESCALATION_ASSIGN}`, () => {
        assignCalled = true;
        return HttpResponse.json(updated);
      })
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    const assignButtons = await screen.findAllByRole('button', { name: /assign professor/i });
    await user.click(assignButtons[0]);

    const dialog = await screen.findByRole('dialog');
    const radioOption = within(dialog).getByRole('radio', { name: new RegExp(eligibleProfB.firstName, 'i') });
    await user.click(radioOption);

    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
    await user.click(confirmBtn);

    await waitFor(() => expect(assignCalled).toBe(true));
    // Modal closes
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Row updated to Assigned badge
    expect((await screen.findAllByText(/^assigned$/i)).length).toBeGreaterThan(0);
  });

  it('assignment history table is hidden when there is no assignment history', async () => {
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([makeEscalatedCase({ escalationStatus: 'NeedsAssignment', assignmentHistory: [] })]),
      eligibleProfessorsHandler([eligibleProfB])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    const buttons = await screen.findAllByRole('button', { name: /assign professor/i });
    await user.click(buttons[0]);

    await screen.findByRole('dialog');
    expect(screen.queryByText(/assignment history/i)).toBeNull();
  });

  it('assignment history table is shown when there is history', async () => {
    server.use(
      ...adminBaseHandlers,
      escalationCasesHandler([
        makeEscalatedCase({
          escalationStatus: 'NeedsReassignment',
          assignmentHistory: [
            {
              assignedProfessorName: 'Bob Smith',
              assignedByAdminName: 'Addy Min',
              assignedAt: '2026-10-21T10:00:00Z',
              supersededAt: '2026-10-28T10:00:00Z',
            },
          ],
        }),
      ]),
      eligibleProfessorsHandler([eligibleProfB])
    );
    const { user } = authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });

    await openEscalationsTab(user);

    const buttons = await screen.findAllByRole('button', { name: /reassign professor/i });
    await user.click(buttons[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/assignment history/i)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Bob Smith/i).length).toBeGreaterThan(0);
  });
});
