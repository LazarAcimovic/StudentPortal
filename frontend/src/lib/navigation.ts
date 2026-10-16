import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

let _navigate: NavigateFunction | null = null;

export function registerNavigate(navigate: NavigateFunction): void {
  _navigate = navigate;
}

export function navigate(to: To, options?: NavigateOptions): void {
  if (_navigate) {
    _navigate(to, options);
  } else {
    window.location.href = typeof to === 'string' ? to : '/';
  }
}
