import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { useUserStore } from '../store/user/useUserStore';
import type { User } from '../shared/models/User';

export interface RenderOptionsEx extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  user?: User | null;
  isHydrating?: boolean;
}

export function resetUserStore(user: User | null = null, isHydrating = false): void {
  useUserStore.setState({
    currentUser: user,
    isHydrating,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', user = null, isHydrating = false, ...options }: RenderOptionsEx = {}
): RenderResult {
  resetUserStore(user, isHydrating);
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
    options
  );
}
