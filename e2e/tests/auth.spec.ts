import { test, expect, loginContext } from '../playwright/fixtures';
import { resetBackend, USERS, PASSWORD } from '../playwright/helpers';

// Tag: auth — login and the change-password sign-out-everywhere guarantee (PRD §5.2, §5.10, §6).
test.describe('auth', () => {
  test.beforeEach(async () => {
    await resetBackend();
  });

  test('login happy path lands on the dashboard; a wrong password shows the generic error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(USERS.admin);
    await page.getByLabel(/^password$/i).fill(PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/admin-dashboard/);
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

    // Wrong password → inline alert, no toast, still on /login (UI §5, PRD §6).
    // Clear the session first, or /login redirects an authenticated user to the dashboard.
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(USERS.admin);
    await page.getByLabel(/^password$/i).fill('definitely-wrong');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test('password fields use PasswordInput with a working show/hide toggle (task 24, UI §11.2)', async ({ page }) => {
    await page.goto('/login');
    const pwd = page.getByLabel(/^password$/i);
    await pwd.fill('secret-pass');
    await expect(pwd).toHaveAttribute('type', 'password'); // masked by default
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(pwd).toHaveAttribute('type', 'text');      // revealed
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(pwd).toHaveAttribute('type', 'password');  // masked again
  });

  test('changing the password signs the user out of every session', async ({ page, browser }) => {
    // Two live sessions for the same student (two devices).
    const other = await loginContext(browser, USERS.student);
    const otherPage = await other.newPage();
    await otherPage.goto('/student-dashboard');
    await expect(otherPage.getByRole('heading', { name: /student dashboard/i })).toBeVisible();

    // Session one changes the password.
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(USERS.student);
    await page.getByLabel(/^password$/i).fill(PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/student-dashboard/);

    await page.goto('/profile/change-password');
    await page.getByLabel(/current password/i).fill(PASSWORD);
    await page.getByLabel(/^new password$/i).fill('BrandNewPass123!');
    await page.getByLabel(/confirm new password/i).fill('BrandNewPass123!');
    await page.getByRole('button', { name: /change password/i }).click();

    // The changer is redirected to login.
    await expect(page).toHaveURL(/login/);

    // The other session's refresh token was revoked by the change. The short-lived access
    // JWT is real-time based (not the fake clock), so simulate its expiry by dropping the
    // access cookie: the app then tries a silent refresh, which now fails, and bounces the
    // session to /login (PRD §6 — change-password revokes all refresh tokens, everywhere).
    await other.clearCookies({ name: 'sp_access' });
    await otherPage.goto('/student-dashboard');
    await expect(otherPage).toHaveURL(/login/);

    await other.close();
  });
});
