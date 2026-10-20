import { describe, it, expect } from 'vitest';
import { updateProfileSchema, changePasswordSchema } from './profileSchemas';

describe('updateProfileSchema', () => {
  it('accepts valid firstName + lastName (self scope: email optional)', () => {
    const r = updateProfileSchema.safeParse({ firstName: 'Ana', lastName: 'Anić' });
    expect(r.success).toBe(true);
  });

  it('accepts valid data with email (admin scope: email present)', () => {
    const r = updateProfileSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Anić',
      email: 'ana@example.com',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty firstName', () => {
    const r = updateProfileSchema.safeParse({ firstName: '', lastName: 'Anić' });
    expect(r.success).toBe(false);
  });

  it('rejects empty lastName', () => {
    const r = updateProfileSchema.safeParse({ firstName: 'Ana', lastName: '' });
    expect(r.success).toBe(false);
  });

  it('rejects firstName > 50 chars', () => {
    const r = updateProfileSchema.safeParse({
      firstName: 'a'.repeat(51),
      lastName: 'Anić',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a malformed email when email is provided', () => {
    const r = updateProfileSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Anić',
      email: 'not-an-email',
    });
    expect(r.success).toBe(false);
  });
});

describe('changePasswordSchema length boundaries', () => {
  const good = { currentPassword: 'OldPass!2024', newPassword: 'NewStrong!2024', confirmNewPassword: 'NewStrong!2024' };

  it('accepts a valid 14-char password that meets all rules', () => {
    const r = changePasswordSchema.safeParse(good);
    expect(r.success).toBe(true);
  });

  it('rejects an 11-char new password (< 12)', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: 'ok',
      newPassword: 'Abcdef1!abc', // 11 chars
      confirmNewPassword: 'Abcdef1!abc',
    });
    expect(r.success).toBe(false);
  });

  it('accepts a 12-char new password meeting all rules', () => {
    const pw = 'Abcdef1!abcd'; // 12 chars
    const r = changePasswordSchema.safeParse({
      currentPassword: 'ok',
      newPassword: pw,
      confirmNewPassword: pw,
    });
    expect(r.success).toBe(true);
  });

  it('accepts a 128-char new password meeting all rules', () => {
    const base = 'Aa1!';
    const pw = (base + 'Aa1!'.repeat(31)).slice(0, 128); // 128 chars with the required classes
    const r = changePasswordSchema.safeParse({
      currentPassword: 'ok',
      newPassword: pw,
      confirmNewPassword: pw,
    });
    expect(pw.length).toBe(128);
    expect(r.success).toBe(true);
  });

  it('rejects a 129-char new password', () => {
    const pw = ('Aa1!' + 'Aa1!'.repeat(32)).slice(0, 129);
    const r = changePasswordSchema.safeParse({
      currentPassword: 'ok',
      newPassword: pw,
      confirmNewPassword: pw,
    });
    expect(pw.length).toBe(129);
    expect(r.success).toBe(false);
  });
});

describe('changePasswordSchema cross-field refinements', () => {
  it('rejects when confirmNewPassword != newPassword', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: 'OldPass!2024',
      newPassword: 'NewStrong!2024',
      confirmNewPassword: 'DifferentPass!99',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('confirmNewPassword');
    }
  });

  it('rejects when new password equals current password', () => {
    const same = 'SamePass!2024';
    const r = changePasswordSchema.safeParse({
      currentPassword: same,
      newPassword: same,
      confirmNewPassword: same,
    });
    expect(r.success).toBe(false);
  });
});
