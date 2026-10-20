import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import axiosClient from './axiosClient';
import { server } from '../../test/server';
import { apiUrl } from '../../test/mswOverrides';
import { API_ROUTES } from '../../config/constants';
import * as authLib from '../../lib/auth';
import * as navLib from '../../lib/navigation';

const PROTECTED_PATH = '/Protected/thing';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
});

describe('axiosClient interceptor — happy path', () => {
  it('passes 2xx responses through unchanged', async () => {
    server.use(
      http.get(apiUrl(PROTECTED_PATH), () =>
        HttpResponse.json({ ok: true })
      )
    );
    const res = await axiosClient.get(PROTECTED_PATH);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
  });

  it('does not attach an Authorization header (cookies only)', async () => {
    let seenAuth: string | null = null;
    server.use(
      http.get(apiUrl(PROTECTED_PATH), ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      })
    );
    await axiosClient.get(PROTECTED_PATH);
    expect(seenAuth).toBeNull();
  });
});

describe('axiosClient interceptor — silent 401 refresh', () => {
  it('on 401 refreshes once and retries the original request successfully', async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;

    server.use(
      http.get(apiUrl(PROTECTED_PATH), () => {
        protectedCalls += 1;
        if (protectedCalls === 1) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl(API_ROUTES.ACCOUNT_REFRESH), () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const res = await axiosClient.get(PROTECTED_PATH);

    expect(res.data).toEqual({ ok: true });
    expect(protectedCalls).toBe(2);
    expect(refreshCalls).toBe(1);
  });

  it('serializes concurrent 401s into a single refresh call (single-flight)', async () => {
    let callsA = 0;
    let callsB = 0;
    let refreshCalls = 0;

    server.use(
      http.get(apiUrl('/A'), () => {
        callsA += 1;
        if (callsA === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ which: 'A' });
      }),
      http.get(apiUrl('/B'), () => {
        callsB += 1;
        if (callsB === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ which: 'B' });
      }),
      http.post(apiUrl(API_ROUTES.ACCOUNT_REFRESH), async () => {
        refreshCalls += 1;
        // small delay to encourage overlap
        await new Promise((r) => setTimeout(r, 10));
        return new HttpResponse(null, { status: 204 });
      })
    );

    const [resA, resB] = await Promise.all([
      axiosClient.get('/A'),
      axiosClient.get('/B'),
    ]);

    expect(resA.data).toEqual({ which: 'A' });
    expect(resB.data).toEqual({ which: 'B' });
    expect(refreshCalls).toBe(1);
  });

  it('on refresh failure calls clearAuthSession and rejects', async () => {
    const clearSpy = vi.spyOn(authLib, 'clearAuthSession');

    server.use(
      http.get(apiUrl(PROTECTED_PATH), () => new HttpResponse(null, { status: 401 })),
      http.post(apiUrl(API_ROUTES.ACCOUNT_REFRESH), () => new HttpResponse(null, { status: 401 }))
    );

    await expect(axiosClient.get(PROTECTED_PATH)).rejects.toBeDefined();
    expect(clearSpy).toHaveBeenCalledWith({ redirectToLogin: true });
  });
});

describe('axiosClient interceptor — 403 and other errors', () => {
  it('on 403 calls clearAuthSession and rejects', async () => {
    const clearSpy = vi.spyOn(authLib, 'clearAuthSession');

    server.use(
      http.get(apiUrl(PROTECTED_PATH), () => new HttpResponse(null, { status: 403 }))
    );

    await expect(axiosClient.get(PROTECTED_PATH)).rejects.toBeDefined();
    expect(clearSpy).toHaveBeenCalledWith({ redirectToLogin: true });
  });

  it('rethrows non-401/403 errors unchanged (e.g. 500)', async () => {
    const clearSpy = vi.spyOn(authLib, 'clearAuthSession');

    server.use(
      http.get(apiUrl(PROTECTED_PATH), () =>
        HttpResponse.json({ title: 'boom' }, { status: 500 })
      )
    );

    await expect(axiosClient.get(PROTECTED_PATH)).rejects.toMatchObject({
      response: { status: 500 },
    });
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('rethrows a 400 (validation) unchanged', async () => {
    server.use(
      http.get(apiUrl(PROTECTED_PATH), () =>
        HttpResponse.json({ errors: { field: ['bad'] } }, { status: 400 })
      )
    );

    await expect(axiosClient.get(PROTECTED_PATH)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});
