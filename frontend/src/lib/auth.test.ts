import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearAuthSession, getRedirectTarget, withAuthRedirect, registerClearCallback } from './auth';
import * as navModule from './navigation';
import { APP_ROUTES } from '../config/constants';

describe('getRedirectTarget', () => {
  it.each([
    ['Admin', APP_ROUTES.ADMIN_DASHBOARD],
    ['Professor', APP_ROUTES.PROFESSOR_DASHBOARD],
    ['Student', APP_ROUTES.STUDENT_DASHBOARD],
  ])('returns %s dashboard', (role, expected) => {
    expect(getRedirectTarget(role)).toBe(expected);
  });

  it('falls back to HOME for unknown roles', () => {
    expect(getRedirectTarget('Guest')).toBe(APP_ROUTES.HOME);
  });
});

describe('clearAuthSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes every registered clear callback', () => {
    const cb = vi.fn();
    registerClearCallback(cb);

    clearAuthSession();

    expect(cb).toHaveBeenCalled();
  });

  it('navigates to /login when redirectToLogin=true', () => {
    const navSpy = vi.spyOn(navModule, 'navigate').mockImplementation(() => {});

    clearAuthSession({ redirectToLogin: true });

    expect(navSpy).toHaveBeenCalledWith(APP_ROUTES.AUTH_LOGIN);
  });

  it('does not navigate when redirectToLogin is omitted', () => {
    const navSpy = vi.spyOn(navModule, 'navigate').mockImplementation(() => {});

    clearAuthSession();

    expect(navSpy).not.toHaveBeenCalled();
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
    expect(navSpy).toHaveBeenCalledWith(APP_ROUTES.AUTH_LOGIN);
  });

  it('re-throws non-401 errors', async () => {
    await expect(
      withAuthRedirect(async () => {
        throw { response: { status: 500 } };
      })
    ).rejects.toMatchObject({ response: { status: 500 } });
  });
});
