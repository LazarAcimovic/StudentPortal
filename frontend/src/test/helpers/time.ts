import { vi } from 'vitest';

export function pinNow(iso: string): void {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(new Date(iso));
}

export async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}
