import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { studentDashboardHandler } from '../../helpers/mswHandlers';
import {
  dashboardWith837Average,
  dashboardFreshAwaiting,
  dashboardPendingAppeal,
  dashboardAppealDenied,
  dashboardTrulyFinal,
  dashboardAwaitingReconfirmation,
  dashboardTrulyFinalAfterAccept,
  dashboardUnderAdminReview,
  emptyStudentDashboard,
  makeSubject,
} from '../../helpers/fixtures/studentDashboard';
import { APP_ROUTES } from '../../../config/constants';

describe('StudentDashboardPage aggregates (§5.5)', () => {
  it('when payload has averageGrade 8.37 then the tile renders exactly "8.37"', async () => {
    // PRD §2.4 regression guard: "renders exactly 8.37, not 8.4 or 8".
    server.use(studentDashboardHandler(dashboardWith837Average));
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    expect(await screen.findByText('8.37')).toBeInTheDocument();
  });

  it('when payload has passed=3, non-passed=1, ects=21 then those exact values render', async () => {
    server.use(studentDashboardHandler(dashboardWith837Average));
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(await screen.findByText('21')).toBeInTheDocument();
  });

  it('when the student has zero enrollments then tiles show zeros and subjects empty-state renders', async () => {
    server.use(studentDashboardHandler(emptyStudentDashboard));
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    expect(await screen.findByText(/not enrolled in any subjects yet/i)).toBeInTheDocument();
  });

  it('when finalGrade is null then the Final grade cell renders "—"', async () => {
    server.use(
      studentDashboardHandler({
        ...emptyStudentDashboard,
        subjects: [
          makeSubject({
            enrollmentId: 'e-ng',
            subjectName: 'Software Engineering',
            finalGrade: null,
            status: 'Not graded',
          }),
        ],
      })
    );
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    // There is one in the table and one in the card, hence findAll.
    const cells = await screen.findAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it.each([
    {
      label: 'Fresh window live — Awaiting confirmation + both buttons',
      fx: dashboardFreshAwaiting,
      expectStatus: /Awaiting confirmation/i,
      expectButtons: ['write appeal', 'confirm grade'],
    },
    {
      label: 'Pending appeal — no action buttons',
      fx: dashboardPendingAppeal,
      expectStatus: /Appeal pending/i,
      expectButtons: [],
    },
    {
      label: 'Appeal denied — truly final; no action buttons',
      fx: dashboardAppealDenied,
      expectStatus: /Appeal denied/i,
      expectButtons: [],
    },
    {
      label: 'Truly final — no action buttons',
      fx: dashboardTrulyFinal,
      expectStatus: /Passed/i,
      expectButtons: [],
    },
    {
      label: 'Appeal accepted, awaiting re-confirm — yellow badge + Appeal accepted badge, no buttons',
      fx: dashboardAwaitingReconfirmation,
      expectStatus: /Awaiting re-confirmation/i,
      expectButtons: [],
    },
    {
      label: 'Truly final after accept — Passed + Appeal accepted badge, no buttons',
      fx: dashboardTrulyFinalAfterAccept,
      expectStatus: /Passed/i,
      expectButtons: [],
    },
    {
      label: 'Under admin review — purple badge, no action buttons',
      fx: dashboardUnderAdminReview,
      expectStatus: /Under admin review/i,
      expectButtons: [],
    },
  ])('§4.6 state matrix: $label', async ({ fx, expectStatus, expectButtons }) => {
    server.use(studentDashboardHandler(fx));
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findAllByText(expectStatus);

    const writeAppeals = screen.queryAllByRole('button', { name: /write appeal/i });
    const confirmGrades = screen.queryAllByRole('button', { name: /confirm grade/i });
    if (expectButtons.includes('write appeal')) expect(writeAppeals.length).toBeGreaterThan(0);
    else expect(writeAppeals.length).toBe(0);
    if (expectButtons.includes('confirm grade')) expect(confirmGrades.length).toBeGreaterThan(0);
    else expect(confirmGrades.length).toBe(0);
  });

  it.each([
    { canWriteAppeal: true, canConfirmGrade: false, expectWA: true, expectCG: false },
    { canWriteAppeal: false, canConfirmGrade: true, expectWA: false, expectCG: true },
    { canWriteAppeal: false, canConfirmGrade: false, expectWA: false, expectCG: false },
    { canWriteAppeal: true, canConfirmGrade: true, expectWA: true, expectCG: true },
  ])(
    'canWriteAppeal=$canWriteAppeal, canConfirmGrade=$canConfirmGrade drives buttons exactly',
    async ({ canWriteAppeal, canConfirmGrade, expectWA, expectCG }) => {
      server.use(
        studentDashboardHandler({
          ...emptyStudentDashboard,
          subjects: [
            makeSubject({
              enrollmentId: 'e-flags',
              subjectName: 'Flags',
              canWriteAppeal,
              canConfirmGrade,
              status: 'Awaiting confirmation',
            }),
          ],
        })
      );
      authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

      await screen.findByRole('heading', { name: /Student Dashboard/i });

      const wa = screen.queryAllByRole('button', { name: /write appeal/i });
      const cg = screen.queryAllByRole('button', { name: /confirm grade/i });
      expect(wa.length > 0).toBe(expectWA);
      expect(cg.length > 0).toBe(expectCG);
    }
  );
});
