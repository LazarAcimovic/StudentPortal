import { vi } from 'vitest';

/**
 * Install a window.matchMedia stub that resolves `(max-width: Npx)` queries
 * against the given viewport width.
 *
 * The stub returns a static MediaQueryList-shaped object: no change events fire
 * for the lifetime of the test, which is fine for layout-at-mount tests.
 */
export function mockMatchMedia(width: number): void {
  const impl = vi.fn().mockImplementation((query: string) => {
    const maxMatch = query.match(/\(max-width:\s*(\d+)px\)/);
    const minMatch = query.match(/\(min-width:\s*(\d+)px\)/);
    let matches = false;
    if (maxMatch) matches = width <= Number(maxMatch[1]);
    else if (minMatch) matches = width >= Number(minMatch[1]);
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: impl,
  });
}
