export function parseField(value: string): number | null {
  if (value.trim() === '') return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return n;
}

export function validateField(value: string, max: number): string | null {
  const n = parseField(value);
  if (n === null) return null;
  if (n < 0) return `Minimum value is 0.`;
  if (n > max) return `Maximum value is ${max}.`;
  if ((n * 2) % 1 !== 0) return `Must be a multiple of 0.5.`;
  return null;
}

export function computeFinalGrade(sum: number): number {
  if (sum <= 50) return 5;
  if (sum <= 60) return 6;
  if (sum <= 70) return 7;
  if (sum <= 80) return 8;
  if (sum <= 90) return 9;
  return 10;
}
