import '@testing-library/jest-dom/vitest';
import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { server } from './server';
import { useUserStore } from '../store/user/useUserStore';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(() => {
  // The Modal component portals into #modal-root; AuthGuard reads from document body.
  if (!document.getElementById('modal-root')) {
    const el = document.createElement('div');
    el.id = 'modal-root';
    document.body.appendChild(el);
  }
  if (!document.getElementById('root')) {
    const el = document.createElement('div');
    el.id = 'root';
    document.body.appendChild(el);
  }

  // Reset the Zustand user store (initial values live in useUserStore.ts).
  useUserStore.setState(
    {
      currentUser: null,
      isHydrating: true,
    },
    false
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  // Clean up portal roots so a stray modal from a previous test does not leak.
  document.getElementById('modal-root')?.remove();
  document.getElementById('root')?.remove();
});

afterAll(() => server.close());
