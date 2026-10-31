import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { professorDashboardHandler, professorStudentsHandler } from '../../helpers/mswHandlers';
import {
  emptyProfessorDashboard,
  makeAppealRow,
  makePagedStudents,
  makeStudentRow,
  makeSubject,
} from '../../helpers/fixtures/professorDashboard';
import { APP_ROUTES } from '../../../config/constants';

describe('ProfessorDashboardPage UI binding (§5.4)', () => {
  it('when zero subjects then three empty columns + empty Appeals section render', async () => {
    server.use(professorDashboardHandler(emptyProfessorDashboard));
    authenticatedRender({ as: 'professor', initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD] });

    expect(await screen.findByText(/No subjects assigned/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a subject to see its students/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a student to view or enter their grade/i)).toBeInTheDocument();
    expect(screen.getByText(/No pending or overdue appeals/i)).toBeInTheDocument();
  });

  it('when subjects list carries multiple subjects then they all render', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [
          makeSubject({ subjectId: 's1', subjectName: 'Algorithms' }),
          makeSubject({ subjectId: 's2', subjectName: 'Linear Algebra' }),
          makeSubject({ subjectId: 's3', subjectName: 'Operating Systems' }),
        ],
        appeals: [],
      })
    );
    authenticatedRender({ as: 'professor', initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD] });

    expect(await screen.findByText(/Algorithms/)).toBeInTheDocument();
    expect(await screen.findByText(/Linear Algebra/)).toBeInTheDocument();
    expect(await screen.findByText(/Operating Systems/)).toBeInTheDocument();
  });

  it('when Appeals list carries Pending and Overdue then both render; Denied inside the undo window must appear too', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [
          makeAppealRow({ appealId: 'p1', status: 'Pending', text: 'pending text' }),
          makeAppealRow({ appealId: 'o1', status: 'Overdue', text: 'overdue text' }),
          makeAppealRow({ appealId: 'd1', status: 'Denied', canUndoDeny: true, text: 'denied text' }),
        ],
      })
    );
    authenticatedRender({ as: 'professor', initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD] });

    const viewButtons = await screen.findAllByRole('button', { name: /view appeal/i });
    // Each row renders in table + cards layouts, so 3 appeals → 6 buttons.
    expect(viewButtons.length).toBe(6);
  });

  it('selecting a subject shows that subject\'s students (binding only, no computation)', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [
          makeSubject({ subjectId: 's1', subjectName: 'Databases', studentCount: 2 }),
        ],
        appeals: [],
      }),
      professorStudentsHandler('s1', makePagedStudents(
        [
          makeStudentRow({ enrollmentId: 'e1', firstName: 'Ana', lastName: 'A' }),
          makeStudentRow({ enrollmentId: 'e2', firstName: 'Bruno', lastName: 'B' }),
        ],
        { totalCount: 2 }
      ))
    );
    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    expect(await screen.findByText(/Ana A/)).toBeInTheDocument();
    expect(await screen.findByText(/Bruno B/)).toBeInTheDocument();
  });
});
