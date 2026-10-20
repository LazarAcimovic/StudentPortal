import { vi } from 'vitest';

export function freezeTime(iso: string): Date {
  const d = new Date(iso);
  vi.useFakeTimers();
  vi.setSystemTime(d);
  return d;
}

export function advance(ms: number): Promise<void> {
  return vi.advanceTimersByTimeAsync(ms);
}

export function unfreezeTime(): void {
  vi.useRealTimers();
}
