// jsdom does not evaluate CSS media queries, so both the table and the stacked
// cards are always rendered. These tests assert PRESENCE and CONTENT PARITY
// between the two representations, and that the right CSS visibility classes
// are present.
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { studentDashboardHandler } from '../../helpers/mswHandlers';
import {
  emptyStudentDashboard,
  makeSubject,
} from '../../helpers/fixtures/studentDashboard';
import { APP_ROUTES } from '../../../config/constants';

describe('Student subjects — responsive (Task 20, §5.5)', () => {
  it('table layout uses d-none d-sm-block and card layout uses d-sm-none', async () => {
    server.use(
      studentDashboardHandler({
        ...emptyStudentDashboard,
        subjects: [
          makeSubject({
            enrollmentId: 'e-r',
            subjectName: 'Operating Systems',
            professorName: 'OS Prof',
            finalGrade: 7,
            status: 'Passed',
          }),
        ],
      })
    );
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findByText(/My Subjects/);

    // The table wrapper and the card wrapper live inside #root; find by class.
    const tableWrap = document.querySelector('.table-responsive.d-none.d-sm-block');
    const cardWrap = document.querySelector('.d-sm-none');
    expect(tableWrap).not.toBeNull();
    expect(cardWrap).not.toBeNull();
  });

  it('every column (Subject, Professor, Final grade, Status) also appears inside the card', async () => {
    server.use(
      studentDashboardHandler({
        ...emptyStudentDashboard,
        subjects: [
          makeSubject({
            enrollmentId: 'e-c',
            subjectName: 'Networks',
            professorName: 'Net Prof',
            finalGrade: 8,
            status: 'Passed',
          }),
        ],
      })
    );
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findByText(/My Subjects/);
    const cardWrap = document.querySelector('.d-sm-none') as HTMLElement;
    expect(cardWrap).not.toBeNull();

    // Subject name, professor name, and final grade all appear inside the card.
    expect(cardWrap.textContent).toContain('Networks');
    expect(cardWrap.textContent).toContain('Net Prof');
    expect(cardWrap.textContent).toContain('8');
    expect(cardWrap.textContent).toContain('Passed');
  });
});
