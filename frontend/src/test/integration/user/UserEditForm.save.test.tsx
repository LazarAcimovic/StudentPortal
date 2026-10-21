// Component-level test that uses MSW to assert the save-payload semantics
// described in §5.9: self-scope sends only the rendered fields.
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import UserEditForm from '../../../components/ui/UserEditForm';
import { USER_ROLES } from '../../../shared/constants/constants';
import { server } from '../../server';
import { renderAt } from '../../helpers/renderWithProviders';
import type { User as AdminUser } from '../../../models/UserModel';

function u(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: overrides.id ?? 1,
    firstName: overrides.firstName ?? 'Fn',
    lastName: overrides.lastName ?? 'Ln',
    email: overrides.email ?? 'ok@example.com',
    indexNumber: overrides.indexNumber ?? null,
    userRole: overrides.userRole ?? USER_ROLES.Student,
    isDeleted: overrides.isDeleted ?? false,
  };
}

describe('<UserEditForm> save semantics (§5.9)', () => {
  it('self + Student caller → PUT /Account/profile omits Email (field never rendered)', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.put('/api/Account/profile', async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({});
      })
    );

    const { user } = renderAt(
      <UserEditForm
        scope="self"
        callerRole={USER_ROLES.Student}
        user={u({ userRole: USER_ROLES.Student })}
        onSaved={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(receivedBody).not.toBeNull());
    expect(receivedBody).toEqual({ FirstName: 'Fn', LastName: 'Ln' });
    expect(receivedBody).not.toHaveProperty('Email');
  });

  it('self + Admin caller → payload includes Email', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.put('/api/Account/profile', async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({});
      })
    );

    const { user } = renderAt(
      <UserEditForm
        scope="self"
        callerRole={USER_ROLES.Admin}
        user={u({ userRole: USER_ROLES.Admin, email: 'addy@min.io' })}
        onSaved={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(receivedBody).not.toBeNull());
    expect(receivedBody).toMatchObject({ Email: 'addy@min.io' });
  });

  it('admin scope → PUT /User/:id payload includes admin-only fields', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.put('/api/User/:id', async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({});
      })
    );

    const { user } = renderAt(
      <UserEditForm
        scope="admin"
        callerRole={USER_ROLES.Admin}
        user={u({ userRole: USER_ROLES.Student, indexNumber: 'E2/2021' })}
        onSaved={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(receivedBody).not.toBeNull());
    expect(receivedBody).toMatchObject({ IndexNumber: 'E2/2021', IsDeleted: false });
    expect(receivedBody).toHaveProperty('UserRole');
  });

  it('when the server returns 403 then the form shows an inline API error and stays open', async () => {
    server.use(
      http.put('/api/User/:id', () => new HttpResponse(null, { status: 403 }))
    );

    const { user } = renderAt(
      <UserEditForm
        scope="admin"
        callerRole={USER_ROLES.Admin}
        user={u({ userRole: USER_ROLES.Student })}
        onSaved={() => {
          throw new Error('onSaved must not be called on 403');
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/Failed to save changes/i)).toBeInTheDocument();
  });

  it('empty FirstName → inline required error, no network call', async () => {
    let putCount = 0;
    server.use(
      http.put('/api/Account/profile', () => {
        putCount += 1;
        return HttpResponse.json({});
      })
    );

    const { user } = renderAt(
      <UserEditForm
        scope="self"
        callerRole={USER_ROLES.Student}
        user={u({ firstName: '' })}
        onSaved={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/First name is required/i)).toBeInTheDocument();
    expect(putCount).toBe(0);
  });
});
