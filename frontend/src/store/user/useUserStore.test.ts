import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from './useUserStore';
import { USER_ROLES } from '../../shared/constants/constants';
import { makeStudent, makeAdmin } from '../../test/factories';

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({ currentUser: null, isHydrating: true });
  });

  it('initial state is null user + isHydrating true', () => {
    useUserStore.setState({ currentUser: null, isHydrating: true });
    const s = useUserStore.getState();
    expect(s.currentUser).toBeNull();
    expect(s.isHydrating).toBe(true);
  });

  it('setCurrentUser stores the user', () => {
    const user = makeStudent();
    useUserStore.getState().setCurrentUser(user);
    expect(useUserStore.getState().currentUser).toEqual(user);
  });

  it('clearCurrentUser resets currentUser to null', () => {
    useUserStore.getState().setCurrentUser(makeAdmin());
    useUserStore.getState().clearCurrentUser();
    expect(useUserStore.getState().currentUser).toBeNull();
  });

  it('setHydrating toggles isHydrating', () => {
    useUserStore.getState().setHydrating(false);
    expect(useUserStore.getState().isHydrating).toBe(false);
    useUserStore.getState().setHydrating(true);
    expect(useUserStore.getState().isHydrating).toBe(true);
  });
});

describe('USER_ROLES constant', () => {
  it('exposes exactly Student, Professor, and Admin', () => {
    expect(Object.keys(USER_ROLES).sort()).toEqual(['Admin', 'Professor', 'Student']);
  });

  it('maps roles to distinct numeric values', () => {
    const values = Object.values(USER_ROLES);
    expect(new Set(values).size).toBe(values.length);
  });
});
