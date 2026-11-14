import type { ZodError } from 'zod';

/**
 * Collapses a {@link ZodError} into one message per field, keeping the **first** rule
 * each field broke.
 *
 * Zod reports *every* broken rule for a field, in schema declaration order. An empty
 * `Email` breaks both `.min(1)` and `.email()`; a one-character `Password` breaks the
 * length rule and three character-class rules. Our schemas are written so the first
 * rule is the one worth showing the user.
 *
 * The three forms that needed this previously built the map with `Object.fromEntries`,
 * which keeps the **last** value for a repeated key — so an empty email was reported as
 * "Email must be a valid email address" and a one-character password as "must contain at
 * least one special character", hiding the real problem in both cases (per D-050).
 */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    // Form-level issues (a `.refine` with no `path`) belong to no field — skip them.
    if (key === undefined) continue;

    const field = String(key);
    if (!(field in fieldErrors)) fieldErrors[field] = issue.message;
  }

  return fieldErrors;
}
