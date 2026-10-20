import { useUserStore } from '../../store/user/useUserStore';
import { server } from '../server';
import { pickSeeded, type SeedRole } from './fixtures/users';
import { meHandler } from './mswHandlers';
import { renderApp, type RenderWithProvidersResult } from './renderWithProviders';

export interface AuthenticatedRenderOptions {
  as: SeedRole;
  initialEntries?: string[];
}

/**
 * Primes useUserStore with a seeded user (so <AuthGuard> lets the test through
 * before App's hydrate resolves) AND installs a GET /api/Account/Me handler
 * returning the same user, so App's hydrate resolves consistently.
 */
export function authenticatedRender(
  options: AuthenticatedRenderOptions
): RenderWithProvidersResult {
  const user = pickSeeded(options.as);

  useUserStore.setState(
    { currentUser: user, isHydrating: false },
    false
  );

  server.use(meHandler(user));

  return renderApp({ initialEntries: options.initialEntries ?? ['/'] });
}

/**
 * Mounts App anonymously: useUserStore stays empty, Me returns 401.
 */
export function renderAnonymously(path: string = '/'): RenderWithProvidersResult {
  server.use(meHandler(null));
  return renderApp({ initialEntries: [path] });
}
