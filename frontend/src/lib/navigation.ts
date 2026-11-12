import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

let _navigate: NavigateFunction | null = null;

export function registerNavigate(navigate: NavigateFunction): void {
  _navigate = navigate;
}

export function navigate(to: To, options?: NavigateOptions): void {
  if (_navigate) {
    _navigate(to, options);
  } else if (typeof to === 'string') {
    window.location.href = to;
  } else if (import.meta.env.DEV) {
    throw new Error(`navigate() called before router was ready with a non-string To: ${JSON.stringify(to)}`);
  } else {
    window.location.href = '/';
  }
}
