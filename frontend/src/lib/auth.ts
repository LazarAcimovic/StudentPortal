import { APP_ROUTES } from '../config/constants';
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

export function clearAuthSession(options: ClearAuthSessionOptions = {}): void {
  for (const cb of _clearCallbacks) {
    cb();
  }
  if (options.redirectToLogin) {
    navigate(APP_ROUTES.AUTH_LOGIN, { replace: true });
  } 
}

export function getRedirectTarget(role: string): string {
  switch (role) {
    case 'Admin':
      return APP_ROUTES.ADMIN_DASHBOARD;
    case 'Professor':
      return APP_ROUTES.PROFESSOR_DASHBOARD;
    case 'Student':
      return APP_ROUTES.STUDENT_DASHBOARD;
    default:
      return APP_ROUTES.HOME;
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
      clearAuthSession({ redirectToLogin: true });
      return null;
    }
    throw error;
  }
}
