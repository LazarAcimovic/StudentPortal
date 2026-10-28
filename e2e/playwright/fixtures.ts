import { test as base, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { STORAGE, USERS, PASSWORD, FRONTEND_URL, type Role } from './helpers';

/**
 * Per-role page fixtures. Each opens a fresh browser context primed with the
 * storageState that globalSetup saved after logging that role in, so a spec can
 * land on a protected page already authenticated without re-doing the login UI.
 *
 * Multi-role journeys (e.g. professor confirms → student sees it) don't use these;
 * they create the two contexts explicitly from `browser` + STORAGE (see grading.spec).
 */
type RoleFixtures = {
  adminPage: Page;
  professorPage: Page;
  studentPage: Page;
};

async function withRolePage(browser: Browser, role: Role, use: (p: Page) => Promise<void>) {
  const context = await browser.newContext({ storageState: STORAGE[role] });
  const page = await context.newPage();
  try {
    await use(page);
  } finally {
    await context.close();
  }
}

export const test = base.extend<RoleFixtures>({
  adminPage: async ({ browser }, use) => withRolePage(browser, 'admin', use),
  professorPage: async ({ browser }, use) => withRolePage(browser, 'professor', use),
  studentPage: async ({ browser }, use) => withRolePage(browser, 'student', use),
});

export { expect, USERS, PASSWORD, STORAGE };

/** Drive the real login form (UI §5): fill, submit, land on a dashboard. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
}

/**
 * A fresh browser context already authenticated as `email`, for multi-role journeys
 * (e.g. a professor and a student acting in the same test). Logs in through the
 * frontend origin so the session cookies are attributed to it, exactly like a real user.
 */
export async function loginContext(browser: Browser, email: string, password = PASSWORD): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL: FRONTEND_URL, ignoreHTTPSErrors: true });
  const res = await context.request.post('/api/Account/Login', { data: { email, password } });
  if (!res.ok()) throw new Error(`loginContext(${email}) failed: ${res.status()} ${await res.text()}`);
  return context;
}
