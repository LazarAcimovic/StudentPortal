import { test, expect, loginContext } from '../playwright/fixtures';
import { resetBackend } from '../playwright/helpers';
import type { Page } from '@playwright/test';

// Tag: grading — the full grading loop across professor and student (PRD §3, §4.1).
// Professor Smith grades Sophia Robinson in Mathematics II, which the seed leaves ungraded.
const PROFESSOR = 'john.smith@uni.edu';
const STUDENT = 'sophia.robinson@student.edu';
const SUBJECT = 'Mathematics II';
const STUDENT_NAME = 'Sophia Robinson';

/** Select the subject + student and enter+confirm all five point fields (sum 85 → grade 9). */
async function confirmFreshGrade(prof: Page) {
  await prof.goto('/professor-dashboard');
  await prof.getByRole('listitem').filter({ hasText: SUBJECT }).click();
  await prof.getByRole('listitem').filter({ hasText: STUDENT_NAME }).click();

  const panel = gradePanel(prof);
  const inputs = panel.locator('input[type="number"]');
  await inputs.nth(0).fill('25'); // First midterm (max 30)
  await inputs.nth(1).fill('25'); // Second midterm (max 30)
  await inputs.nth(2).fill('5');  // Lecture attendance (max 5)
  await inputs.nth(3).fill('5');  // Practical participation (max 5)
  await inputs.nth(4).fill('25'); // Exam (max 30)
  await panel.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(panel.getByText(/final grade/i)).toBeVisible();
}

function gradePanel(prof: Page) {
  return prof.locator('.card').filter({ has: prof.getByRole('heading', { name: new RegExp(`Grade for ${STUDENT_NAME}`, 'i') }) });
}

function appealsCard(prof: Page) {
  return prof.locator('.card').filter({ has: prof.getByRole('heading', { name: /^appeals$/i }) });
}

async function writeAppeal(student: Page, text: string) {
  await student.goto('/student-dashboard');
  const row = student.getByRole('row').filter({ hasText: SUBJECT });
  await row.getByRole('button', { name: /write appeal/i }).click();
  await student.getByLabel(/describe your appeal/i).fill(text);
  await student.getByRole('button', { name: /submit appeal/i }).click();
  await expect(student.getByRole('heading', { name: /write appeal/i })).toHaveCount(0);
}

test.describe('grading', () => {
  test.beforeEach(async () => {
    await resetBackend();
  });

  test('professor confirms → student sees it → student confirms', async ({ browser }) => {
    const profCtx = await loginContext(browser, PROFESSOR);
    const studCtx = await loginContext(browser, STUDENT);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    await confirmFreshGrade(prof);

    await student.goto('/student-dashboard');
    const row = student.getByRole('row').filter({ hasText: SUBJECT });
    await expect(row).toContainText('9');
    await row.getByRole('button', { name: /confirm grade/i }).click();
    await student.getByRole('button', { name: /yes, confirm/i }).click();

    // Truly final: no more confirm/appeal actions on that row.
    await expect(row.getByRole('button', { name: /confirm grade/i })).toHaveCount(0);
    await expect(row.getByRole('button', { name: /write appeal/i })).toHaveCount(0);

    await profCtx.close();
    await studCtx.close();
  });

  test('professor confirms → student appeals → professor accepts → reconfirm exam', async ({ browser }) => {
    const profCtx = await loginContext(browser, PROFESSOR);
    const studCtx = await loginContext(browser, STUDENT);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    await confirmFreshGrade(prof);
    await writeAppeal(student, 'My exam answers were correct and deserved more credit.');

    // Accept the appeal.
    await prof.goto('/professor-dashboard');
    await appealsCard(prof).getByRole('row').filter({ hasText: STUDENT_NAME })
      .getByRole('button', { name: /view appeal/i }).click();
    await prof.getByRole('button', { name: /^accept$/i }).click();
    await expect(prof.getByRole('heading', { name: /^appeal$/i })).toHaveCount(0);

    // Re-grade the exam and re-confirm.
    await prof.getByRole('listitem').filter({ hasText: SUBJECT }).click();
    await prof.getByRole('listitem').filter({ hasText: STUDENT_NAME }).click();
    const panel = gradePanel(prof);
    await panel.locator('input[type="number"]').first().fill('28');
    await panel.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(panel.getByText(/final grade/i)).toBeVisible();

    await profCtx.close();
    await studCtx.close();
  });

  test('professor confirms → student appeals → professor denies', async ({ browser }) => {
    const profCtx = await loginContext(browser, PROFESSOR);
    const studCtx = await loginContext(browser, STUDENT);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    await confirmFreshGrade(prof);
    await writeAppeal(student, 'Please re-evaluate — I believe the grade is too low.');

    await prof.goto('/professor-dashboard');
    await appealsCard(prof).getByRole('row').filter({ hasText: STUDENT_NAME })
      .getByRole('button', { name: /view appeal/i }).click();
    await prof.getByRole('button', { name: /^deny$/i }).click();
    await prof.getByRole('button', { name: /confirm deny/i }).click();

    // Denying closes the modal and refetches; the appeal now reads Denied in the list
    // with an inline Undo while inside the 24 h window.
    const deniedRow = appealsCard(prof).getByRole('row').filter({ hasText: STUDENT_NAME });
    await expect(deniedRow).toContainText('Denied');
    await expect(deniedRow.getByRole('button', { name: /^undo$/i })).toBeVisible();

    await profCtx.close();
    await studCtx.close();
  });
});
