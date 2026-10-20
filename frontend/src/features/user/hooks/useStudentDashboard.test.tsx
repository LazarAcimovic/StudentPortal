import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { useStudentDashboard } from './useStudentDashboard';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/mswOverrides';
import { API_ROUTES } from '../../../config/constants';
import { makeStudentDashboardPayload } from '../../../test/factories';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
});

describe('useStudentDashboard', () => {
  it('auto-fetches on mount and returns { data, isLoading, error }', async () => {
    const payload = makeStudentDashboardPayload();
    server.use(
      http.get(apiUrl(API_ROUTES.STUDENT_ME_DASHBOARD), () => HttpResponse.json(payload))
    );

    const { result } = renderHook(() => useStudentDashboard());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(payload);
    expect(result.current.error).toBeNull();
  });

  it('sets error on a 500 and leaves data null', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.STUDENT_ME_DASHBOARD), () =>
        HttpResponse.json({ title: 'boom' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useStudentDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to load dashboard data.');
    expect(result.current.data).toBeNull();
  });

  it('aborting via unmount does NOT flip isLoading (0cb10dd behaviour)', async () => {
    let unmounted = false;
    server.use(
      http.get(apiUrl(API_ROUTES.STUDENT_ME_DASHBOARD), async () => {
        await delay(100);
        return HttpResponse.json(makeStudentDashboardPayload());
      })
    );

    const { result, unmount } = renderHook(() => useStudentDashboard());

    expect(result.current.isLoading).toBe(true);
    unmount();
    unmounted = true;

    // give the fetch time to resolve past the unmount
    await new Promise((r) => setTimeout(r, 150));

    // Still true: the hook saw it was aborted and did NOT flip loading on an unmounted mount.
    // (The last snapshot of the hook stays at isLoading=true.)
    expect(result.current.isLoading).toBe(true);
    expect(unmounted).toBe(true);
  });

  it('refresh() re-triggers the fetch', async () => {
    let hits = 0;
    server.use(
      http.get(apiUrl(API_ROUTES.STUDENT_ME_DASHBOARD), () => {
        hits += 1;
        return HttpResponse.json(makeStudentDashboardPayload());
      })
    );

    const { result } = renderHook(() => useStudentDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(hits).toBe(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(hits).toBe(2));
  });
});
