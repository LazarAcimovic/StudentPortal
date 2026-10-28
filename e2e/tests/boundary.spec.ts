import { test, expect, loginContext } from '../playwright/fixtures';
import { resetBackend, advanceClock, DAY_SECONDS } from '../playwright/helpers';
import type { Page } from '@playwright/test';

// Tag: boundary — appeal/escalation time boundaries driven by the clock endpoint (PRD §4.4–§4.6, §4.8).
const SMITH = 'john.smith@uni.edu';
const WILSON = 'laura.wilson@uni.edu';     // shares MATH-CALC with Smith → eligible for Math I
const SOPHIA = 'sophia.robinson@student.edu'; // Mathematics II is ungraded in the seed
const NOAH = 'noah.martinez@student.edu';     // Mathematics I has only a partial draft in the seed

const PAST_BOUNDARY = 7 * DAY_SECONDS + 3600; // a safe margin past the 7-day line

async function confirmGrade(prof: Page, subject: string, studentName: string) {
  await prof.goto('/professor-dashboard');
  await prof.getByText(subject, { exact: true }).click();
  await prof.getByText(studentName, { exact: true }).click();
  const panel = prof.locator('.card').filter({
    has: prof.getByRole('heading', { name: new RegExp(`Grade for ${studentName}`, 'i') }),
  });
  const inputs = panel.locator('input[type="number"]');
  await inputs.nth(0).fill('24');
  await inputs.nth(1).fill('24');
  await inputs.nth(2).fill('5');
  await inputs.nth(3).fill('5');
  await inputs.nth(4).fill('24');
  await panel.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(panel.getByText(/final grade/i)).toBeVisible();
}

async function writeAppeal(student: Page, subject: string, text: string) {
  await student.goto('/student-dashboard');
  const row = student.getByRole('row').filter({ hasText: subject });
  await row.getByRole('button', { name: /write appeal/i }).click();
  await student.getByLabel(/describe your appeal/i).fill(text);
  await student.getByRole('button', { name: /submit appeal/i }).click();
  await expect(student.getByRole('heading', { name: /write appeal/i })).toHaveCount(0);
}

function appealsCard(prof: Page) {
  return prof.locator('.card').filter({ has: prof.getByRole('heading', { name: /^appeals$/i }) });
}

test.describe('boundary', () => {
  test.beforeEach(async () => {
    await resetBackend();
  });

  test('an appeal flips to Overdue exactly at the 7-day boundary', async ({ browser }) => {
    const profCtx = await loginContext(browser, SMITH);
    const studCtx = await loginContext(browser, SOPHIA);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    await confirmGrade(prof, 'Mathematics II', 'Sophia Robinson');
    await writeAppeal(student, 'Mathematics II', 'Requesting re-evaluation of my exam.');

    await prof.goto('/professor-dashboard');
    await expect(appealsCard(prof)).toContainText('Pending');

    await advanceClock(7 * DAY_SECONDS - 3600); // just before the line
    await prof.reload();
    await expect(appealsCard(prof)).toContainText('Pending');

    await advanceClock(2 * 3600); // cross the line
    await prof.reload();
    await expect(appealsCard(prof)).toContainText('Overdue');

    await profCtx.close();
    await studCtx.close();
  });

  test('the student may submit a second appeal once the first is overdue', async ({ browser }) => {
    const profCtx = await loginContext(browser, SMITH);
    const studCtx = await loginContext(browser, SOPHIA);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    await confirmGrade(prof, 'Mathematics II', 'Sophia Robinson');
    await writeAppeal(student, 'Mathematics II', 'First appeal.');

    await advanceClock(PAST_BOUNDARY); // first appeal goes overdue → fresh window opens

    await writeAppeal(student, 'Mathematics II', 'Second appeal after the first went overdue.');
    await expect(student.getByText(/appeal submitted/i)).toBeVisible();

    await profCtx.close();
    await studCtx.close();
  });

  test('the 24-hour deny-undo window closes exactly on time', async ({ browser }) => {
    const profCtx = await loginContext(browser, SMITH);
    const studCtx = await loginContext(browser, SOPHIA);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    await confirmGrade(prof, 'Mathematics II', 'Sophia Robinson');
    await writeAppeal(student, 'Mathematics II', 'Please reconsider.');

    await prof.goto('/professor-dashboard');
    await appealsCard(prof).getByRole('row').filter({ hasText: 'Sophia Robinson' })
      .getByRole('button', { name: /view appeal/i }).click();
    await prof.getByRole('button', { name: /^deny$/i }).click();
    await prof.getByRole('button', { name: /confirm deny/i }).click();
    // Within the 24 h window the denied appeal offers an inline Undo in the list.
    await expect(appealsCard(prof).getByRole('button', { name: /^undo$/i })).toBeVisible();

    await advanceClock(DAY_SECONDS + 3600); // past the 24 h undo window
    await prof.goto('/professor-dashboard');
    // The denied appeal is now truly final: it drops off the list and no undo remains.
    await expect(prof.getByRole('button', { name: /^undo$/i })).toHaveCount(0);

    await profCtx.close();
    await studCtx.close();
  });

  test('the initial window auto-finalizes on day 8 (D-002)', async ({ browser }) => {
    const profCtx = await loginContext(browser, SMITH);
    const studCtx = await loginContext(browser, SOPHIA);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    await confirmGrade(prof, 'Mathematics II', 'Sophia Robinson');

    await advanceClock(8 * DAY_SECONDS); // silent expiry of the initial 7-day window
    await student.goto('/student-dashboard');
    const row = student.getByRole('row').filter({ hasText: 'Mathematics II' });
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: /confirm grade/i })).toHaveCount(0);
    await expect(row.getByRole('button', { name: /write appeal/i })).toHaveCount(0);

    await profCtx.close();
    await studCtx.close();
  });

  test('Scenario B: two overdue appeals escalate, admin assigns an eligible professor, who denies and resolves it', async ({ browser, adminPage }) => {
    const profCtx = await loginContext(browser, SMITH);
    const studCtx = await loginContext(browser, NOAH);
    const prof = await profCtx.newPage();
    const student = await studCtx.newPage();

    // Smith grades Noah in Mathematics I (code MATH-CALC — Wilson is an eligible professor).
    await confirmGrade(prof, 'Mathematics I', 'Noah Martinez');

    // Appeal #1 → overdue.
    await writeAppeal(student, 'Mathematics I', 'First appeal.');
    await advanceClock(PAST_BOUNDARY);
    // Appeal #2 (fresh window) → overdue. Two consecutive overdue appeals ⇒ escalation.
    await writeAppeal(student, 'Mathematics I', 'Second appeal.');
    await advanceClock(PAST_BOUNDARY);

    // Admin sees the escalated case and assigns the eligible professor (Wilson).
    await adminPage.goto('/admin-dashboard');
    await adminPage.getByRole('button', { name: /^escalations$/i }).click();
    const caseRow = adminPage.getByRole('row').filter({ hasText: 'Noah Martinez' });
    await expect(caseRow).toContainText(/two overdue appeals/i);
    await caseRow.getByRole('button', { name: /assign professor/i }).click();

    const assignModal = adminPage.locator('.modal, [role="dialog"]').filter({ hasText: /assign professor/i });
    await assignModal.getByText(/Laura Wilson/i).click();
    await assignModal.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(caseRow).toContainText(/assigned/i);

    // Wilson resolves the case by denying the latest appeal → grade finalizes.
    const wilsonCtx = await loginContext(browser, WILSON);
    const wilson = await wilsonCtx.newPage();
    await wilson.goto('/professor-dashboard');
    const assigned = wilson.locator('.card').filter({ has: wilson.getByRole('heading', { name: /assigned cases/i }) });
    await assigned.getByRole('row').filter({ hasText: 'Noah Martinez' }).getByRole('button', { name: /resolve/i }).click();
    await wilson.getByRole('button', { name: /^deny$/i }).click();
    await wilson.getByRole('button', { name: /confirm deny/i }).click();

    // Admin now sees the case as Resolved.
    await adminPage.reload();
    await adminPage.getByRole('button', { name: /^escalations$/i }).click();
    await expect(adminPage.getByRole('row').filter({ hasText: 'Noah Martinez' })).toContainText(/resolved/i);

    await profCtx.close();
    await studCtx.close();
    await wilsonCtx.close();
  });
});
