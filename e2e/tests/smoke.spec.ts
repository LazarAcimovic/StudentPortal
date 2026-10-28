import { test, expect } from '@playwright/test';

// Tag: smoke — the stack is wired and the public home page renders anonymously.
test.describe('smoke', () => {
  test('anonymous visit to / renders the home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /welcome to student portal/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /grade overview/i })).toBeVisible();
    // Logged out: the navbar shows only the Login control, no dashboard link.
    await expect(page.getByRole('link', { name: /^login$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard/i })).toHaveCount(0);
  });
});
