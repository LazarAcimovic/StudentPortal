import { test, expect, loginContext } from '../playwright/fixtures';
import { resetBackend } from '../playwright/helpers';

// Tag: dashboard — the seeded data binds onto the student and professor dashboards (PRD §5.4 / §5.5).
test.describe('dashboard', () => {
  test.beforeEach(async () => {
    await resetBackend();
  });

  test('student dashboard shows the seeded subjects and grades', async ({ studentPage }) => {
    // The seeded student (Sarah Williams) is enrolled in three subjects.
    await studentPage.goto('/student-dashboard');
    await expect(studentPage.getByRole('heading', { name: /student dashboard/i })).toBeVisible();

    const subjects = studentPage.locator('.card').filter({
      has: studentPage.getByRole('heading', { name: /my subjects/i }),
    });
    await expect(subjects).toContainText('Mathematics I');
    await expect(subjects).toContainText('Programming Fundamentals');
    await expect(subjects).toContainText('Database Systems');
  });

  test('professor dashboard shows own subjects, enrolled students and appeals', async ({ browser }) => {
    // Professor Johnson has subjects with enrolled students and live appeals in the seed.
    const ctx = await loginContext(browser, 'emily.johnson@uni.edu');
    const prof = await ctx.newPage();
    await prof.goto('/professor-dashboard');
    await expect(prof.getByRole('heading', { name: /professor dashboard/i })).toBeVisible();

    const subjects = prof.locator('.card').filter({
      has: prof.getByRole('heading', { name: /my subjects/i }),
    });
    await expect(subjects).toContainText('Programming Fundamentals');

    // Selecting a subject lists its enrolled students.
    await prof.getByRole('listitem').filter({ hasText: 'Programming Fundamentals' }).click();
    const students = prof.locator('.card').filter({
      has: prof.getByRole('heading', { name: /students in programming fundamentals/i }),
    });
    await expect(students).toContainText('James Thompson');

    // The Appeals section lists this professor's pending/overdue appeals.
    const appeals = prof.locator('.card').filter({
      has: prof.getByRole('heading', { name: /^appeals$/i }),
    });
    await expect(appeals).toContainText('James Thompson');

    await ctx.close();
  });
});
