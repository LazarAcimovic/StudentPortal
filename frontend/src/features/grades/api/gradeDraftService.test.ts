import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getDraft, saveDraft } from './gradeDraftService';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/mswOverrides';
import { API_ROUTES } from '../../../config/constants';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
});

const draft = {
  midterm1Points: 15,
  midterm2Points: 10,
  attendancePoints: 5,
  practicalPoints: 4,
  examPoints: null,
};

describe('gradeDraftService.getDraft', () => {
  it('returns the draft on 200', async () => {
    server.use(
      http.get(apiUrl(`${API_ROUTES.GRADE_DRAFT}/enr-1`), () => HttpResponse.json(draft))
    );
    const result = await getDraft('enr-1');
    expect(result).toEqual(draft);
  });

  it('returns null on 404', async () => {
    server.use(
      http.get(apiUrl(`${API_ROUTES.GRADE_DRAFT}/enr-404`), () => new HttpResponse(null, { status: 404 }))
    );
    expect(await getDraft('enr-404')).toBeNull();
  });
});

describe('gradeDraftService.saveDraft', () => {
  it('PUTs the draft body to /GradeDraft/:enrollmentId', async () => {
    let body: unknown = null;
    server.use(
      http.put(apiUrl(`${API_ROUTES.GRADE_DRAFT}/enr-1`), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    await saveDraft('enr-1', draft);
    expect(body).toEqual(draft);
  });
});
