import { test, expect, loginContext } from '../playwright/fixtures';
import { resetBackend } from '../playwright/helpers';

// Tag: admin — admin management journeys (PRD §5.3, §2.1, UI §8.4).
test.describe('admin', () => {
  test.beforeEach(async () => {
    await resetBackend();
  });

  test('admin creates a student who can then log in to an empty dashboard', async ({ adminPage, browser }) => {
    const email = 'new.student@student.edu';
    const password = 'NewStudent123!';

    await adminPage.goto('/admin-dashboard');
    await adminPage.getByRole('button', { name: /create new user/i }).click();

    await adminPage.getByLabel('First Name').fill('New');
    await adminPage.getByLabel('Last Name').fill('Student');
    await adminPage.getByLabel('Email').fill(email);
    await adminPage.getByLabel('Password', { exact: true }).fill(password);
    await adminPage.getByLabel('Role').selectOption({ label: 'Student' });
    await adminPage.getByLabel('Index Number').fill('NS-999-2024');
    await adminPage.getByRole('button', { name: 'Create', exact: true }).click();

    // The new user shows up (the email renders in both the desktop table and the mobile card).
    await expect(adminPage.getByText(email).first()).toBeVisible();

    // That student can log in and sees an empty dashboard.
    const ctx = await loginContext(browser, email, password);
    const student = await ctx.newPage();
    await student.goto('/student-dashboard');
    await expect(student.getByRole('heading', { name: /student dashboard/i })).toBeVisible();
    await expect(student.getByText(/not enrolled in any subjects/i)).toBeVisible();
    await ctx.close();
  });

  test('admin cannot reach the edit/soft-delete control on their own row', async ({ adminPage }) => {
    await adminPage.goto('/admin-dashboard');

    // Own row (admin@uni.edu): no Edit control (PRD §2.1 — admin cannot act on self).
    const ownRow = adminPage.getByRole('row').filter({ hasText: 'admin@uni.edu' });
    await expect(ownRow).toBeVisible();
    await expect(ownRow.getByRole('button', { name: /edit/i })).toHaveCount(0);

    // Another user's row does expose Edit.
    const otherRow = adminPage.getByRole('row').filter({ hasText: 'john.smith@uni.edu' });
    await expect(otherRow.getByRole('button', { name: /edit/i })).toHaveCount(1);
  });

  test('admin creates a subject with a Subject Code and it persists', async ({ adminPage }) => {
    await adminPage.goto('/admin-dashboard');
    await adminPage.getByRole('button', { name: /^subjects$/i }).click();
    await adminPage.getByRole('button', { name: /create new subject/i }).click();

    await adminPage.getByLabel('Subject Name').fill('E2E Elective');
    await adminPage.getByLabel('Subject Code').fill('E2E-001');
    await adminPage.getByLabel('ECTS').fill('6');
    await adminPage.getByLabel('Professor').selectOption({ label: 'John Smith' });
    await adminPage.getByRole('button', { name: 'Create', exact: true }).click();

    // It persists (rendered in both the desktop table and the mobile card).
    await expect(adminPage.getByText('E2E Elective').first()).toBeVisible();
  });
});
