// Pure-UI test: RoleGate against the real useUserStore.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoleGate from '../../../components/shared/RoleGate';
import { useUserStore } from '../../../store/user/useUserStore';
import { USER_ROLES } from '../../../shared/constants/constants';
import { seededStudent, seededAdmin } from '../../helpers/fixtures/users';

describe('<RoleGate>', () => {
  it('when currentUser is null then fallback renders', () => {
    useUserStore.setState({ currentUser: null, isHydrating: false });
    render(
      <RoleGate allowed={USER_ROLES.Student} fallback={<div>no access</div>}>
        <div>secret</div>
      </RoleGate>
    );
    expect(screen.getByText('no access')).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('when currentUser matches allowed role then children render', () => {
    useUserStore.setState({ currentUser: seededStudent, isHydrating: false });
    render(
      <RoleGate allowed={USER_ROLES.Student}>
        <div>secret</div>
      </RoleGate>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('when currentUser does NOT match allowed role then fallback renders', () => {
    useUserStore.setState({ currentUser: seededStudent, isHydrating: false });
    render(
      <RoleGate allowed={USER_ROLES.Admin} fallback={<div>no access</div>}>
        <div>secret</div>
      </RoleGate>
    );
    expect(screen.getByText('no access')).toBeInTheDocument();
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('when allowed is an array and the user is one of them then children render', () => {
    useUserStore.setState({ currentUser: seededAdmin, isHydrating: false });
    render(
      <RoleGate allowed={[USER_ROLES.Admin, USER_ROLES.Professor]}>
        <div>admin or prof</div>
      </RoleGate>
    );
    expect(screen.getByText('admin or prof')).toBeInTheDocument();
  });
});
