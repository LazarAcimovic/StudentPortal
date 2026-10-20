import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getMe, updateProfile, changePassword } from './profileService';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/mswOverrides';
import { API_ROUTES } from '../../../config/constants';
import { USER_ROLES } from '../../../shared/constants/constants';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
});

describe('profileService.getMe', () => {
  it('returns the current user shape', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.ACCOUNT_ME), () =>
        HttpResponse.json({
          id: 1,
          firstName: 'Ana',
          lastName: 'Anić',
          email: 'ana@example.com',
          userRole: USER_ROLES.Student,
        })
      )
    );
    const u = await getMe();
    expect(u.email).toBe('ana@example.com');
  });
});

describe('profileService.updateProfile', () => {
  it('self scope sends only FirstName and LastName when email is omitted', async () => {
    let body: unknown = null;
    server.use(
      http.put(apiUrl(API_ROUTES.ACCOUNT_PROFILE), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: 1,
          firstName: 'Ana2',
          lastName: 'A',
          email: 'ana@example.com',
          userRole: USER_ROLES.Student,
        });
      })
    );

    await updateProfile({ firstName: 'Ana2', lastName: 'A' });

    expect(body).toEqual({ FirstName: 'Ana2', LastName: 'A' });
    expect((body as Record<string, unknown>).Email).toBeUndefined();
  });

  it('admin scope sends FirstName, LastName and Email', async () => {
    let body: unknown = null;
    server.use(
      http.put(apiUrl(API_ROUTES.ACCOUNT_PROFILE), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: 1,
          firstName: 'A',
          lastName: 'B',
          email: 'c@d.com',
          userRole: USER_ROLES.Admin,
        });
      })
    );

    await updateProfile({ firstName: 'A', lastName: 'B', email: 'c@d.com' });

    expect(body).toEqual({ FirstName: 'A', LastName: 'B', Email: 'c@d.com' });
  });

  it('surfaces 403 when a non-admin tries to change Email (backend contract)', async () => {
    server.use(
      http.put(apiUrl(API_ROUTES.ACCOUNT_PROFILE), () => new HttpResponse(null, { status: 403 }))
    );
    await expect(
      updateProfile({ firstName: 'A', lastName: 'B', email: 'new@x.com' })
    ).rejects.toMatchObject({ response: { status: 403 } });
  });
});

describe('profileService.changePassword', () => {
  it('posts { CurrentPassword, NewPassword } and resolves on 204', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.ACCOUNT_CHANGE_PASSWORD), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );

    await expect(
      changePassword({ currentPassword: 'OldPass!2024', newPassword: 'NewPass!2024ABC' })
    ).resolves.toBeUndefined();
    expect(body).toEqual({ CurrentPassword: 'OldPass!2024', NewPassword: 'NewPass!2024ABC' });
  });

  it('surfaces 400 when current password is wrong', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.ACCOUNT_CHANGE_PASSWORD), () =>
        HttpResponse.json({ message: 'Current password is incorrect.' }, { status: 400 })
      )
    );
    await expect(
      changePassword({ currentPassword: 'wrong', newPassword: 'NewPass!2024ABC' })
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});
