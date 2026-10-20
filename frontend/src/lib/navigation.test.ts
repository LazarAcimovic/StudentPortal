import { describe, it, expect, vi } from 'vitest';

describe('navigation singleton', () => {
  it('navigates via registered function when it is registered', async () => {
    vi.resetModules();
    const mod = await import('./navigation');
    const fn = vi.fn();
    mod.registerNavigate(fn);

    mod.navigate('/foo', { replace: true });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('/foo', { replace: true });
  });

  it('falls back to window.location.href when nothing is registered yet', async () => {
    vi.resetModules();
    const mod = await import('./navigation');

    const originalLocation = window.location;
    const hrefSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() { return originalLocation.href; },
        set href(v: string) { hrefSetter(v); },
      },
    });

    try {
      mod.navigate('/login');
      expect(hrefSetter).toHaveBeenCalledWith('/login');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('reuses the most recently registered navigate function', async () => {
    vi.resetModules();
    const mod = await import('./navigation');
    const first = vi.fn();
    const second = vi.fn();
    mod.registerNavigate(first);
    mod.registerNavigate(second);

    mod.navigate('/dashboard');
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
