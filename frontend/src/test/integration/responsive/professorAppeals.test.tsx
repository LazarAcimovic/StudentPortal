import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { professorDashboardHandler } from '../../helpers/mswHandlers';
import { makeAppealRow } from '../../helpers/fixtures/professorDashboard';
import { APP_ROUTES } from '../../../config/constants';

describe('Professor appeals section — responsive (Task 20, §5.4)', () => {
  it('table (d-none d-sm-block) and card (d-sm-none) representations both render with the same appeal row data', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [],
        appeals: [
          makeAppealRow({
            appealId: 'r1',
            studentFirstName: 'Mia',
            studentLastName: 'Markov',
            subjectName: 'Compilers',
            status: 'Pending',
          }),
        ],
      })
    );
    authenticatedRender({ as: 'professor', initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD] });

    await screen.findAllByText(/Compilers/);
    const tableWrap = document.querySelector('.table-responsive.d-none.d-sm-block');
    const cardWrap = document.querySelector('.d-sm-none');
    expect(tableWrap).not.toBeNull();
    expect(cardWrap).not.toBeNull();
    expect(tableWrap!.textContent).toContain('Mia Markov');
    expect(cardWrap!.textContent).toContain('Mia Markov');
  });
});
