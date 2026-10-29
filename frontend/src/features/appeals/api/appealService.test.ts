import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { submitAppeal, acceptAppeal, denyAppeal, undoDenyAppeal } from './appealService';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/helpers/mswHandlers';
import { API_ROUTES } from '../../../config/constants';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
});

describe('appealService.submitAppeal', () => {
  it('POSTs { enrollmentId, text } to /Appeal and resolves on success', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.APPEAL), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    await submitAppeal({ enrollmentId: 'enr-1', text: 'please review' });
    expect(body).toEqual({ enrollmentId: 'enr-1', text: 'please review' });
  });

  it('surfaces 403 to the caller (ownership check failed)', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.APPEAL), () => new HttpResponse(null, { status: 403 }))
    );
    await expect(
      submitAppeal({ enrollmentId: 'enr-1', text: 'x' })
    ).rejects.toMatchObject({ response: { status: 403 } });
  });
});

describe('appealService.acceptAppeal / denyAppeal / undoDenyAppeal', () => {
  it.each([
    ['accept', acceptAppeal, 'accept'],
    ['deny', denyAppeal, 'deny'],
    ['undo-deny', undoDenyAppeal, 'undo-deny'],
  ] as const)('%s posts to /Appeal/:id/%s and returns the dto', async (_label, fn, suffix) => {
    const id = 'app-1';
    let called = 0;
    server.use(
      http.post(apiUrl(`${API_ROUTES.APPEAL}/${id}/${suffix}`), () => {
        called += 1;
        return HttpResponse.json({
          id,
          gradeId: 'g-1',
          text: 'x',
          submittedAt: '2026-01-01T00:00:00Z',
          status: 'Accepted',
          reviewedAt: '2026-01-01T01:00:00Z',
        });
      })
    );

    const res = await fn(id);
    expect(called).toBe(1);
    expect(res.id).toBe(id);
  });
});
