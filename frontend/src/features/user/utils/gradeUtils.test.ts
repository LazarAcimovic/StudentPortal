import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeFinalGrade, validateField, parseField, formatCountdown } from './gradeUtils';

describe('computeFinalGrade — PRD §3 bucket boundaries', () => {
  it.each([
    [0, 5], [50, 5],
    [51, 6], [60, 6],
    [61, 7], [70, 7],
    [71, 8], [80, 8],
    [81, 9], [90, 9],
    [91, 10], [100, 10],
  ])('sum=%s → final=%s', (sum, expected) => {
    expect(computeFinalGrade(sum)).toBe(expected);
  });
});

describe('validateField — point-field validation (step 0.5, min 0, max)', () => {
  it.each([
    ['midterm max 30', 30, 30, null],
    ['midterm 0', 30, 0, null],
    ['midterm 15.5', 30, 15.5, null],
    ['midterm 30.5 (over max)', 30, 30.5, 'Maximum value is 30.'],
    ['midterm -0.5 (negative)', 30, -0.5, 'Minimum value is 0.'],
    ['midterm 0.3 (not step aligned)', 30, 0.3, 'Must be a multiple of 0.5.'],
    ['attendance 5 (max)', 5, 5, null],
    ['attendance 5.5 (over)', 5, 5.5, 'Maximum value is 5.'],
    ['exam 30 (max)', 30, 30, null],
  ])('%s', (_, max, value, expected) => {
    expect(validateField(String(value), max)).toBe(expected);
  });

  it('returns null for an empty string (field is empty, not invalid)', () => {
    expect(validateField('', 30)).toBeNull();
  });
});

describe('parseField', () => {
  it('returns null for an empty string', () => {
    expect(parseField('')).toBeNull();
  });
  it('returns null for a non-number string', () => {
    expect(parseField('abc')).toBeNull();
  });
  it('parses a plain integer', () => {
    expect(parseField('15')).toBe(15);
  });
  it('parses a decimal', () => {
    expect(parseField('15.5')).toBe(15.5);
  });
});

describe('formatCountdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Expired" when the deadline is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    expect(formatCountdown('2026-01-01T00:00:00Z')).toBe('Expired');
  });

  it('formats remaining time as "Xh Ym"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    // 2h 30m later
    const future = new Date('2026-01-01T02:30:00Z').toISOString();
    expect(formatCountdown(future)).toBe('2h 30m');
  });
});
