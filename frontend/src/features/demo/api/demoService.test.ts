import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { API_ROUTES } from '../../../config/constants';
import { getDemoStatus, resetDemoData } from './demoService';

describe('demoService — getDemoStatus (per D-049)', () => {
  it('resolves when demo mode is on', async () => {
    server.use(
      http.get(`/api${API_ROUTES.DEMO_STATUS}`, () => HttpResponse.json({ enabled: true }))
    );

    await expect(getDemoStatus()).resolves.toBeUndefined();
  });

  it('rejects with 404 when the route is not mapped (any non-demo deployment)', async () => {
    // test/server.ts already defaults this route to 404 — the same answer a normal
    // deployment gives, because Program.cs never maps it there.
    await expect(getDemoStatus()).rejects.toMatchObject({ response: { status: 404 } });
  });
});

describe('demoService — resetDemoData', () => {
  it('resolves on 204', async () => {
    server.use(
      http.post(`/api${API_ROUTES.DEMO_RESET}`, () => new HttpResponse(null, { status: 204 }))
    );

    await expect(resetDemoData()).resolves.toBeUndefined();
  });

  it('rejects with 409 when a reset is already running', async () => {
    server.use(
      http.post(`/api${API_ROUTES.DEMO_RESET}`, () =>
        HttpResponse.json({ message: 'A demo reset is already running' }, { status: 409 })
      )
    );

    await expect(resetDemoData()).rejects.toMatchObject({ response: { status: 409 } });
  });
});
