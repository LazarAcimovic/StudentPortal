import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodFieldErrors } from './zodFieldErrors';

// Mirrors the shape of the real schemas: several rules per field, ordered so the
// first one is the message a user should see.
const schema = z.object({
  Email: z
    .string()
    .min(1, 'Email is required.')
    .email('Email must be a valid email address.'),
  Password: z
    .string()
    .min(12, 'Password must be at least 12 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*).'),
});

describe('zodFieldErrors (per D-050)', () => {
  it('keeps the FIRST broken rule per field', () => {
    const result = schema.safeParse({ Email: '', Password: 'd' });
    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = zodFieldErrors(result.error);

    expect(errors.Email).toBe('Email is required.');
    expect(errors.Password).toBe('Password must be at least 12 characters.');
  });

  it('differs from Object.fromEntries, which kept the last and caused the bug', () => {
    const result = schema.safeParse({ Email: '', Password: 'd' });
    if (result.success) throw new Error('expected a validation failure');

    const lastWins = Object.fromEntries(
      result.error.issues.map((i) => [String(i.path[0]), i.message])
    );

    // The old behaviour: the least relevant rule won.
    expect(lastWins.Email).toBe('Email must be a valid email address.');
    expect(zodFieldErrors(result.error).Email).toBe('Email is required.');
  });

  it('passes a single issue through unchanged', () => {
    const result = schema.safeParse({ Email: 'not-an-email', Password: 'Abcdefghijk!2' });
    if (result.success) throw new Error('expected a validation failure');

    expect(zodFieldErrors(result.error)).toEqual({
      Email: 'Email must be a valid email address.',
    });
  });

  it('ignores form-level issues that carry no field path', () => {
    const formLevel = z
      .object({ a: z.string() })
      .refine(() => false, { message: 'form is invalid' });
    const result = formLevel.safeParse({ a: 'x' });
    if (result.success) throw new Error('expected a validation failure');

    expect(zodFieldErrors(result.error)).toEqual({});
  });

  it('keeps a field-scoped refine message when it is that field\'s only issue', () => {
    const withRefine = z
      .object({ IndexNumber: z.string() })
      .refine((v) => v.IndexNumber.length > 0, {
        message: 'Index number is required.',
        path: ['IndexNumber'],
      });
    const result = withRefine.safeParse({ IndexNumber: '' });
    if (result.success) throw new Error('expected a validation failure');

    expect(zodFieldErrors(result.error)).toEqual({
      IndexNumber: 'Index number is required.',
    });
  });
});
