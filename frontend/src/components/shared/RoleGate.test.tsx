import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import RoleGate from './RoleGate';
import { renderWithProviders } from '../../test/helpers/renderWithProviders';
import { USER_ROLES } from '../../shared/constants/constants';
import { makeAdmin, makeProfessor, makeStudent } from '../../test/factories';

describe('RoleGate', () => {
  it('renders children when the current user has the allowed role', () => {
    renderWithProviders(
      <RoleGate allowed={USER_ROLES.Admin}>
        <p>secret</p>
      </RoleGate>,
      { user: makeAdmin() }
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('renders fallback (default null) when the role mismatches', () => {
    const { container } = renderWithProviders(
      <RoleGate allowed={USER_ROLES.Admin}>
        <p>secret</p>
      </RoleGate>,
      { user: makeStudent() }
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('renders fallback element when provided and role mismatches', () => {
    renderWithProviders(
      <RoleGate allowed={USER_ROLES.Admin} fallback={<p>no access</p>}>
        <p>secret</p>
      </RoleGate>,
      { user: makeStudent() }
    );
    expect(screen.getByText('no access')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders fallback when there is no current user', () => {
    renderWithProviders(
      <RoleGate allowed={USER_ROLES.Student} fallback={<p>guest</p>}>
        <p>secret</p>
      </RoleGate>,
      { user: null }
    );
    expect(screen.getByText('guest')).toBeInTheDocument();
  });

  it('accepts an array of allowed roles', () => {
    renderWithProviders(
      <RoleGate allowed={[USER_ROLES.Admin, USER_ROLES.Professor]}>
        <p>staff only</p>
      </RoleGate>,
      { user: makeProfessor() }
    );
    expect(screen.getByText('staff only')).toBeInTheDocument();
  });
});
