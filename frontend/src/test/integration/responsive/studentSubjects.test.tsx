// jsdom does not evaluate CSS media queries, so both the table and the stacked
// cards are always rendered. These tests assert PRESENCE and CONTENT PARITY
// between the two representations, and that the right CSS visibility classes
// are present.
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function makeSubjects(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeSubject({ enrollmentId: `e-${i}`, subjectName: `Subject ${i + 1}` }),
  );
}

describe('Student subjects — pagination (Task 26, UI §6.4)', () => {
  it('Pagination control is absent when the student has 0 subjects', async () => {
    server.use(studentDashboardHandler({ ...emptyStudentDashboard, subjects: [] }));
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findByText(/My Subjects/);
    expect(screen.queryByText(/Total:/)).toBeNull();
    expect(document.querySelector('ul.pagination')).toBeNull();
  });

  it('Pagination control is present when the student has 1 subject', async () => {
    server.use(
      studentDashboardHandler({
        ...emptyStudentDashboard,
        subjects: [makeSubject({ enrollmentId: 'e-one', subjectName: 'Only Subject' })],
      }),
    );
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findByText(/My Subjects/);
    expect(screen.getByText('Total: 1')).toBeInTheDocument();
    expect(document.querySelector('ul.pagination')).not.toBeNull();
  });

  it('shows only page-1 rows (5 per page default) when there are 7 subjects', async () => {
    server.use(
      studentDashboardHandler({ ...emptyStudentDashboard, subjects: makeSubjects(7) }),
    );
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findByText(/My Subjects/);
    // The table wrapper (desktop) is used as an anchor.
    const tableWrap = document.querySelector('.table-responsive') as HTMLElement;
    const rows = within(tableWrap).getAllByRole('row');
    // 1 header row + 5 data rows on page 1
    expect(rows).toHaveLength(6);
    expect(screen.getByText('Total: 7')).toBeInTheDocument();
  });

  it('navigating to page 2 shows the remaining rows', async () => {
    server.use(
      studentDashboardHandler({ ...emptyStudentDashboard, subjects: makeSubjects(7) }),
    );
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findByText(/My Subjects/);
    await userEvent.click(screen.getByRole('button', { name: '2' }));

    const tableWrap = document.querySelector('.table-responsive') as HTMLElement;
    const rows = within(tableWrap).getAllByRole('row');
    // 1 header row + 2 remaining data rows on page 2
    expect(rows).toHaveLength(3);
  });

  it('changing page size re-pages to page 1 and shows more rows', async () => {
    server.use(
      studentDashboardHandler({ ...emptyStudentDashboard, subjects: makeSubjects(7) }),
    );
    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.STUDENT_DASHBOARD] });

    await screen.findByText(/My Subjects/);
    // Navigate to page 2, then change page size — should reset to page 1.
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.selectOptions(screen.getByRole('combobox'), '20');

    const tableWrap = document.querySelector('.table-responsive') as HTMLElement;
    const rows = within(tableWrap).getAllByRole('row');
    // 1 header + all 7 rows visible on one page
    expect(rows).toHaveLength(8);
  });
});
