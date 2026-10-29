import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getAllUsers, addUser, updateUser, deleteUser } from './userService';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/helpers/mswHandlers';
import { API_ROUTES } from '../../../config/constants';
import { USER_ROLES } from '../../../shared/constants/constants';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const studentRow = {
  id: 10,
  firstName: 'Ana',
  lastName: 'Anić',
  email: 'ana@example.com',
  indexNumber: 'E/123/22',
  userRole: USER_ROLES.Student,
  isDeleted: false,
};

const adminRow = {
  id: 1,
  firstName: 'Admin',
  lastName: 'Adminović',
  email: 'admin@example.com',
  indexNumber: null,
  userRole: USER_ROLES.Admin,
  isDeleted: false,
};

describe('userService.getAllUsers', () => {
  it('GETs /User and returns the array on 200', async () => {
    let called = 0;
    server.use(
      http.get(apiUrl(API_ROUTES.USER), () => {
        called += 1;
        return HttpResponse.json([studentRow, adminRow]);
      })
    );

    const result = await getAllUsers();

    expect(called).toBe(1);
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when the server returns one', async () => {
    server.use(http.get(apiUrl(API_ROUTES.USER), () => HttpResponse.json([])));
    expect(await getAllUsers()).toEqual([]);
  });

  it('returns null (and logs) on a server 500', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.USER), () =>
        HttpResponse.json({ title: 'boom' }, { status: 500 })
      )
    );
    const result = await getAllUsers();
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('userService.addUser', () => {
  it('POSTs to /User and returns the created user on 201', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.USER), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(studentRow, { status: 201 });
      })
    );

    const createDto = {
      FirstName: 'Ana',
      LastName: 'Anić',
      Email: 'ana@example.com',
      Password: 'TempPass!2024',
      IndexNumber: 'E/123/22',
      UserRole: USER_ROLES.Student,
    };

    const result = await addUser(createDto);

    expect(body).toEqual(createDto);
    expect(result).toEqual({ ok: true, user: studentRow });
  });

  it('maps a 400 validation error into per-field messages', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.USER), () =>
        HttpResponse.json(
          { errors: { Password: ['Password must be at least 12 characters.'] } },
          { status: 400 }
        )
      )
    );

    const result = await addUser({
      FirstName: 'Ana',
      LastName: 'Anić',
      Email: 'ana@example.com',
      Password: 'short',
      UserRole: USER_ROLES.Student,
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { Password: 'Password must be at least 12 characters.' },
    });
  });

  it('maps a 409 duplicate email onto the Email field', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.USER), () =>
        HttpResponse.json('A user with this email already exists.', { status: 409 })
      )
    );

    const result = await addUser({
      FirstName: 'Ana',
      LastName: 'Anić',
      Email: 'taken@example.com',
      Password: 'TempPass!2024',
      UserRole: USER_ROLES.Student,
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { Email: 'A user with this email already exists.' },
    });
  });

  it('returns a generic message (and logs) on an unexpected 500', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.USER), () =>
        HttpResponse.json({ title: 'boom' }, { status: 500 })
      )
    );

    const result = await addUser({
      FirstName: 'Ana',
      LastName: 'Anić',
      Email: 'ana@example.com',
      Password: 'TempPass!2024',
      UserRole: USER_ROLES.Student,
    });

    expect(result).toEqual({
      ok: false,
      message: 'Failed to create user. Please try again.',
    });
    expect(console.error).toHaveBeenCalled();
  });
});

describe('userService.updateUser', () => {
  it('PUTs to /User/{id} with the full admin DTO (PascalCase keys)', async () => {
    let body: unknown = null;
    let seenPath = '';
    server.use(
      http.put(apiUrl(`${API_ROUTES.USER}/10`), async ({ request }) => {
        body = await request.json();
        seenPath = new URL(request.url).pathname;
        return HttpResponse.json({ ...studentRow, firstName: 'Ana2' });
      })
    );

    const result = await updateUser({
      Id: 10,
      FirstName: 'Ana2',
      LastName: 'Anić',
      Email: 'ana@example.com',
      UserRole: USER_ROLES.Student,
      IsDeleted: false,
    });

    expect(seenPath).toBe('/api/User/10');
    expect(body).toEqual({
      Id: 10,
      FirstName: 'Ana2',
      LastName: 'Anić',
      Email: 'ana@example.com',
      UserRole: USER_ROLES.Student,
      IsDeleted: false,
    });
    expect(result?.firstName).toBe('Ana2');
  });

  it('supports the soft-delete path (IsDeleted: true)', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.put(apiUrl(`${API_ROUTES.USER}/10`), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...studentRow, isDeleted: true });
      })
    );

    const result = await updateUser({
      Id: 10,
      FirstName: 'Ana',
      LastName: 'Anić',
      Email: 'ana@example.com',
      UserRole: USER_ROLES.Student,
      IsDeleted: true,
    });

    expect((body as Record<string, unknown>).IsDeleted).toBe(true);
    expect(result?.isDeleted).toBe(true);
  });

  it('returns null when admin lacks permission (403, e.g. attempted self-demote)', async () => {
    server.use(
      http.put(apiUrl(`${API_ROUTES.USER}/1`), () => new HttpResponse(null, { status: 403 }))
    );

    const result = await updateUser({
      Id: 1,
      FirstName: 'Admin',
      LastName: 'Adminović',
      Email: 'admin@example.com',
      UserRole: USER_ROLES.Student,
      IsDeleted: false,
    });

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('returns null on 404 Not Found', async () => {
    server.use(
      http.put(apiUrl(`${API_ROUTES.USER}/999`), () => new HttpResponse(null, { status: 404 }))
    );

    const result = await updateUser({
      Id: 999,
      FirstName: 'X',
      LastName: 'Y',
      Email: 'x@y.com',
      UserRole: USER_ROLES.Student,
      IsDeleted: false,
    });

    expect(result).toBeNull();
  });
});

describe('userService.deleteUser', () => {
  it('DELETEs /User/{id} and returns true on success', async () => {
    let called = 0;
    let seenPath = '';
    server.use(
      http.delete(apiUrl(`${API_ROUTES.USER}/10`), ({ request }) => {
        called += 1;
        seenPath = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const ok = await deleteUser(10);

    expect(called).toBe(1);
    expect(seenPath).toBe('/api/User/10');
    expect(ok).toBe(true);
  });

  it('returns false (and logs) when the backend refuses the delete (403)', async () => {
    server.use(
      http.delete(apiUrl(`${API_ROUTES.USER}/1`), () => new HttpResponse(null, { status: 403 }))
    );

    const ok = await deleteUser(1);

    expect(ok).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('returns false on 404', async () => {
    server.use(
      http.delete(apiUrl(`${API_ROUTES.USER}/999`), () => new HttpResponse(null, { status: 404 }))
    );

    expect(await deleteUser(999)).toBe(false);
  });
});
