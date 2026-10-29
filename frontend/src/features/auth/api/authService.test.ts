import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { login, logout, me } from './authService';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/helpers/mswHandlers';
import { API_ROUTES } from '../../../config/constants';
import { USER_ROLES } from '../../../shared/constants/constants';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
});

describe('authService.login', () => {
  it('posts { Email, Password } (PascalCase) to /Account/Login and returns the user', async () => {
    let seen: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.ACCOUNT_LOGIN), async ({ request }) => {
        seen = await request.json();
        return HttpResponse.json({
          id: 1,
          firstName: 'Ana',
          lastName: 'Anić',
          email: 'ana@example.com',
          userRole: USER_ROLES.Student,
        });
      })
    );

    const user = await login({ email: 'ana@example.com', password: 'secret' });

    expect(seen).toEqual({ Email: 'ana@example.com', Password: 'secret' });
    expect(user.email).toBe('ana@example.com');
    expect(user.userRole).toBe(USER_ROLES.Student);
  });

  it('surfaces a 401 error to the caller', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.ACCOUNT_LOGIN), () =>
        HttpResponse.json({ title: 'bad creds' }, { status: 401 })
      )
    );
    await expect(login({ email: 'x@y.z', password: 'nope' })).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

describe('authService.logout', () => {
  it('posts to /Account/Logout and resolves on 204', async () => {
    let called = 0;
    server.use(
      http.post(apiUrl(API_ROUTES.ACCOUNT_LOGOUT), () => {
        called += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await expect(logout()).resolves.toBeUndefined();
    expect(called).toBe(1);
  });
});

describe('authService.me', () => {
  it('GETs /Account/Me and returns the user shape (no JS-visible token)', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.ACCOUNT_ME), () =>
        HttpResponse.json({
          id: 7,
          firstName: 'Petar',
          lastName: 'Petrović',
          email: 'petar@example.com',
          userRole: USER_ROLES.Professor,
        })
      )
    );

    const u = await me();
    expect(u).toMatchObject({
      id: 7,
      email: 'petar@example.com',
      userRole: USER_ROLES.Professor,
    });
    expect(u).not.toHaveProperty('token');
    expect(u).not.toHaveProperty('accessToken');
    expect(u).not.toHaveProperty('refreshToken');
  });
});
