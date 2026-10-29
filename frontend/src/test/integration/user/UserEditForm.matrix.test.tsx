// Pure-UI test (§2 permits higher-boundary where HTTP is not the point):
// mounts UserEditForm directly to assert the field-visibility matrix from §5.9.
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import UserEditForm from '../../../components/ui/UserEditForm';
import { USER_ROLES } from '../../../shared/constants/constants';
import { renderAt } from '../../helpers/renderWithProviders';
import type { User as AdminUser } from '../../../shared/models/User';

function u(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: overrides.id ?? 1,
    firstName: overrides.firstName ?? 'Fn',
    lastName: overrides.lastName ?? 'Ln',
    email: overrides.email ?? 'x@y.z',
    indexNumber: overrides.indexNumber ?? null,
    userRole: overrides.userRole ?? USER_ROLES.Student,
    isDeleted: overrides.isDeleted ?? false,
  };
}

describe('<UserEditForm> visibility matrix (§5.9)', () => {
  it('self + Student caller → First/Last visible; Email, IndexNumber, Role, Inactive hidden', () => {
    renderAt(
      <UserEditForm
        scope="self"
        callerRole={USER_ROLES.Student}
        user={u({ userRole: USER_ROLES.Student, indexNumber: 'E2/2021' })}
        onSaved={() => {}}
      />
    );
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
    expect(screen.queryByLabelText(/index number/i)).toBeNull();
    expect(screen.queryByLabelText(/^role$/i)).toBeNull();
    expect(screen.queryByLabelText(/inactive/i)).toBeNull();
  });

  it('self + Admin caller → Email visible; IndexNumber, Role, Inactive hidden', () => {
    renderAt(
      <UserEditForm
        scope="self"
        callerRole={USER_ROLES.Admin}
        user={u({ userRole: USER_ROLES.Admin })}
        onSaved={() => {}}
      />
    );
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/index number/i)).toBeNull();
    expect(screen.queryByLabelText(/^role$/i)).toBeNull();
    expect(screen.queryByLabelText(/inactive/i)).toBeNull();
  });

  it('admin → Student → First/Last/Email/IndexNumber/Role/Inactive all visible', () => {
    renderAt(
      <UserEditForm
        scope="admin"
        callerRole={USER_ROLES.Admin}
        user={u({ userRole: USER_ROLES.Student, indexNumber: 'E2/2021' })}
        onSaved={() => {}}
      />
    );
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/index number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^role$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/inactive/i)).toBeInTheDocument();
  });

  it('admin → Professor → Email/Role/Inactive visible; IndexNumber hidden', () => {
    renderAt(
      <UserEditForm
        scope="admin"
        callerRole={USER_ROLES.Admin}
        user={u({ userRole: USER_ROLES.Professor })}
        onSaved={() => {}}
      />
    );
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/index number/i)).toBeNull();
    expect(screen.getByLabelText(/^role$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/inactive/i)).toBeInTheDocument();
  });

  it('admin → Admin → Email visible; IndexNumber, Role, Inactive hidden', () => {
    renderAt(
      <UserEditForm
        scope="admin"
        callerRole={USER_ROLES.Admin}
        user={u({ userRole: USER_ROLES.Admin })}
        onSaved={() => {}}
      />
    );
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/index number/i)).toBeNull();
    expect(screen.queryByLabelText(/^role$/i)).toBeNull();
    expect(screen.queryByLabelText(/inactive/i)).toBeNull();
  });
});
