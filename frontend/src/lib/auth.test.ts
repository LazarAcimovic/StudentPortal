import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { clearAuthSession, withAuthRedirect, registerClearCallback } from './auth';
import * as navModule from './navigation';
import { APP_ROUTES, API_ROUTES } from '../config/constants';
import { server } from '../test/server';
import { useUserStore } from '../store/user/useUserStore';

describe('clearAuthSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes every registered clear callback', async () => {
    const cb = vi.fn();
    registerClearCallback(cb);

    await clearAuthSession();

    expect(cb).toHaveBeenCalled();
  });

  it('navigates to /login when redirectToLogin=true', async () => {
    const navSpy = vi.spyOn(navModule, 'navigate').mockImplementation(() => {});

    await clearAuthSession({ redirectToLogin: true });

    expect(navSpy).toHaveBeenCalledWith(APP_ROUTES.AUTH_LOGIN, { replace: true });
  });

  it('does not navigate when redirectToLogin is omitted', async () => {
    const navSpy = vi.spyOn(navModule, 'navigate').mockImplementation(() => {});

    await clearAuthSession();

    expect(navSpy).not.toHaveBeenCalled();
  });

  it('calls POST /Account/Logout so the server revokes the refresh row', async () => {
    let logoutCalled = 0;
    server.use(
      http.post(`/api${API_ROUTES.ACCOUNT_LOGOUT}`, () => {
        logoutCalled += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await clearAuthSession();

    expect(logoutCalled).toBe(1);
  });

  it('still clears the store and redirects when the logout request fails', async () => {
    const navSpy = vi.spyOn(navModule, 'navigate').mockImplementation(() => {});
    useUserStore.setState({
      currentUser: {
        id: '1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        userRole: 2,
        isDeleted: false,
      },
      isHydrating: false,
    });

    server.use(
      http.post(`/api${API_ROUTES.ACCOUNT_LOGOUT}`, () => HttpResponse.error())
    );

    await clearAuthSession({ redirectToLogin: true });

    expect(useUserStore.getState().currentUser).toBeNull();
    expect(navSpy).toHaveBeenCalledWith(APP_ROUTES.AUTH_LOGIN, { replace: true });
  });
});

describe('withAuthRedirect (401 wrapper)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the resolved value for a successful call', async () => {
    const result = await withAuthRedirect(async () => 42);
    expect(result).toBe(42);
  });

  it('on 401 clears session, redirects, and returns null', async () => {
    const navSpy = vi.spyOn(navModule, 'navigate').mockImplementation(() => {});

    const result = await withAuthRedirect(async () => {
      throw { response: { status: 401 } };
    });

    expect(result).toBeNull();
    expect(navSpy).toHaveBeenCalledWith(APP_ROUTES.AUTH_LOGIN, { replace: true });
  });

  it('re-throws non-401 errors', async () => {
    await expect(
      withAuthRedirect(async () => {
        throw { response: { status: 500 } };
      })
    ).rejects.toMatchObject({ response: { status: 500 } });
  });
});
