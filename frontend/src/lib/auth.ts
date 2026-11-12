import { APP_ROUTES, API_ROUTES } from '../config/constants';
import { navigate } from './navigation';

export interface ClearAuthSessionOptions {
  redirectToLogin?: boolean;
}

type ClearCallback = () => void;
const _clearCallbacks: ClearCallback[] = [];

// Called by the user store at Task 12 to register its clearCurrentUser action.
export function registerClearCallback(cb: ClearCallback): void {
  _clearCallbacks.push(cb);
}

export async function clearAuthSession(options: ClearAuthSessionOptions = {}): Promise<void> {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';
    await fetch(`${baseURL}${API_ROUTES.ACCOUNT_LOGOUT}`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // best-effort — always clear regardless
  }
  for (const cb of _clearCallbacks) {
    cb();
  }
  if (options.redirectToLogin) {
    navigate(APP_ROUTES.AUTH_LOGIN, { replace: true });
  }
}

// Runs fn(); on a 401 response, clears the session and redirects to login.
export async function withAuthRedirect<T>(
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number } };
    if (axiosError?.response?.status === 401) {
      await clearAuthSession({ redirectToLogin: true });
      return null;
    }
    throw error;
  }
}
