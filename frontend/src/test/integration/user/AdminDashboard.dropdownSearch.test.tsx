import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import {
  pagedUsersHandler,
  pagedSubjectsHandler,
  pagedEnrollmentsHandler,
  userSearchHandler,
  subjectSearchHandler,
} from '../../helpers/mswHandlers';
import { APP_ROUTES, API_ROUTES } from '../../../config/constants';
import * as userServiceModule from '../../../features/user';
import * as subjectServiceModule from '../../../features/subjects';

function emptyPaged() {
  return { items: [], totalCount: 0 };
}

function mountAdminDashboard() {
  return authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });
}

// Give a debounce (300 ms) comfortable room to fire under real timers.
const DEBOUNCE_SETTLE_MS = 350;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// jsdom has no IntersectionObserver; the combobox builds one when it opens.
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(_cb: IntersectionObserverCallback) {}
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('AdminDashboardPage — dropdowns never fetch whole collections (30.5)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 30.5 box 1: no collection fetch for the form dropdowns on page load ─────

  it('admin page load triggers no search fetch for the professor/student/subject dropdowns', async () => {
    server.use(
      pagedUsersHandler(emptyPaged()),
      pagedSubjectsHandler(emptyPaged()),
      pagedEnrollmentsHandler(emptyPaged()),
      userSearchHandler(emptyPaged()),
      subjectSearchHandler(emptyPaged()),
    );
    const searchUsersSpy = vi.spyOn(userServiceModule, 'searchUsers');
    const searchSubjectsSpy = vi.spyOn(subjectServiceModule, 'searchSubjects');

    mountAdminDashboard();
    await screen.findByText('Manage Users');

    // The dropdowns are server-search-backed; nothing should be fetched for them
    // until the admin opens a form and types. A page load that touched them would
    // be the old full-collection prefetch this task removed.
    expect(searchUsersSpy).not.toHaveBeenCalled();
    expect(searchSubjectsSpy).not.toHaveBeenCalled();
  });

  // ── 30.5 box 2: newest query wins when a request is still in flight ─────────

  it('changing the query mid-flight yields the newest results with no stale duplicates', async () => {
    server.use(
      pagedUsersHandler(emptyPaged()),
      pagedSubjectsHandler(emptyPaged()),
      pagedEnrollmentsHandler(emptyPaged()),
      subjectSearchHandler(emptyPaged()),
      // Stale query hangs so, absent a guard, its late response could clobber the
      // newer one; the fresh query answers immediately.
      http.get(`/api${API_ROUTES.USER}/search`, async ({ request }) => {
        const query = new URL(request.url).searchParams.get('query') ?? '';
        if (query === '') {
          return HttpResponse.json({ items: [], totalCount: 0 });
        }
        if (query === 'sta') {
          await delay(100000);
          return HttpResponse.json({
            items: [{ id: 'stale-1', firstName: 'Stale', lastName: 'Person', indexNumber: null }],
            totalCount: 1,
          });
        }
        return HttpResponse.json({
          items: [{ id: 'fresh-1', firstName: 'Fresh', lastName: 'Person', indexNumber: null }],
          totalCount: 1,
        });
      }),
    );

    const { user } = mountAdminDashboard();
    await screen.findByText('Manage Users');

    await user.click(screen.getByRole('button', { name: /^enrollments$/i }));
    await screen.findByText('Student Enrollments');
    await user.click(screen.getByRole('button', { name: /create new enrollment/i }));
    await screen.findByRole('heading', { name: /create new enrollment/i });

    const studentInput = screen.getByLabelText('Student');
    fireEvent.focus(studentInput);

    // First query — slow; its request stays in flight.
    fireEvent.change(studentInput, { target: { value: 'sta' } });
    await wait(DEBOUNCE_SETTLE_MS);

    // Second query before the first resolves — must abort the first and win.
    fireEvent.change(studentInput, { target: { value: 'fresh' } });
    await wait(DEBOUNCE_SETTLE_MS);

    const fresh = await screen.findByText('Fresh Person');
    expect(fresh).toBeInTheDocument();
    expect(screen.queryByText('Stale Person')).not.toBeInTheDocument();
    expect(screen.getAllByText('Fresh Person')).toHaveLength(1);

    // The stale response never lands even if it eventually "arrives".
    await waitFor(() => {
      expect(screen.queryByText('Stale Person')).not.toBeInTheDocument();
    });
  });
});
