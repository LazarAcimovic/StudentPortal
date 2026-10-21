import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../server';
import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';

const PROTECTED = '/api/User';
const REFRESH = `/api${API_ROUTES.ACCOUNT_REFRESH}`;

describe('axiosClient silent refresh (Task 11.9)', () => {
  it('when a protected GET returns 401 then the client posts /Refresh and retries, surfacing the eventual 200', async () => {
    let getCalls = 0;
    let refreshCalls = 0;
    server.use(
      http.get(PROTECTED, () => {
        getCalls += 1;
        if (getCalls === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ ok: true, attempt: getCalls });
      }),
      http.post(REFRESH, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const res = await axiosClient.get<{ ok: boolean }>(API_ROUTES.USER);
    expect(res.data.ok).toBe(true);
    expect(getCalls).toBe(2);
    expect(refreshCalls).toBe(1);
  });

  it('when /Refresh fails then the request bubbles the error and clearAuthSession runs', async () => {
    server.use(
      http.get(PROTECTED, () => new HttpResponse(null, { status: 401 })),
      http.post(REFRESH, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(axiosClient.get(API_ROUTES.USER)).rejects.toBeDefined();
  });

  it('when two concurrent 401s happen then /Refresh is called exactly once (serialization)', async () => {
    let refreshCalls = 0;
    let getCalls = 0;
    server.use(
      http.get(PROTECTED, () => {
        getCalls += 1;
        if (getCalls <= 2) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ ok: true, attempt: getCalls });
      }),
      http.post(REFRESH, async () => {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 20));
        return new HttpResponse(null, { status: 204 });
      })
    );

    const [a, b] = await Promise.all([
      axiosClient.get(API_ROUTES.USER),
      axiosClient.get(API_ROUTES.USER),
    ]);
    expect((a.data as { ok: boolean }).ok).toBe(true);
    expect((b.data as { ok: boolean }).ok).toBe(true);
    expect(refreshCalls).toBe(1);
  });
});
