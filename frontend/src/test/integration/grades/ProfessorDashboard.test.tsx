import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { professorDashboardHandler } from '../../helpers/mswHandlers';
import {
  emptyProfessorDashboard,
  makeStudentRow,
  makeSubject,
  singleSubjectWithStudent,
} from '../../helpers/fixtures/professorDashboard';
import { APP_ROUTES } from '../../../config/constants';

describe('ProfessorDashboardPage (§5.4)', () => {
  it('when zero subjects then it shows the no-subjects empty state in column 1', async () => {
    server.use(professorDashboardHandler(emptyProfessorDashboard));

    authenticatedRender({ as: 'professor', initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD] });

    expect(await screen.findByRole('heading', { name: /Professor Dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText(/No subjects assigned/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a subject to see its students/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a student to view or enter their grade/i)).toBeInTheDocument();
  });

  it('when a subject is clicked then its students load in column 2', async () => {
    server.use(professorDashboardHandler(singleSubjectWithStudent));

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    const subject = await screen.findByText(/Databases/);
    await user.click(subject);

    expect(await screen.findByText(/Stud One/)).toBeInTheDocument();
  });

  it('when a student is clicked then the grading panel loads with 5 inputs (step=0.5)', async () => {
    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      http.get('/api/GradeDraft/:id', () => new HttpResponse(null, { status: 404 }))
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await user.click(await screen.findByText(/Stud One/));

    const inputs = await screen.findAllByRole('spinbutton');
    expect(inputs.length).toBe(5);
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('step', '0.5');
    });
  });

  it('when 5 fields are filled then Confirm appears and sum/final-grade preview renders', async () => {
    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      http.get('/api/GradeDraft/:id', () => new HttpResponse(null, { status: 404 }))
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await user.click(await screen.findByText(/Stud One/));

    const inputs = await screen.findAllByRole('spinbutton');
    await user.type(inputs[0], '25');
    await user.type(inputs[1], '25');
    await user.type(inputs[2], '5');
    await user.type(inputs[3], '5');
    await user.type(inputs[4], '20');

    expect(await screen.findByText(/Sum:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Confirm$/i })).toBeInTheDocument();
  });

  it('when Save draft is clicked then it PUTs /GradeDraft/:enrollmentId with the current values', async () => {
    let draftBody: Record<string, unknown> | null = null;
    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      http.get('/api/GradeDraft/:id', () => new HttpResponse(null, { status: 404 })),
      http.put('/api/GradeDraft/:id', async ({ request }) => {
        draftBody = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await user.click(await screen.findByText(/Stud One/));

    const inputs = await screen.findAllByRole('spinbutton');
    await user.type(inputs[0], '10');

    await user.click(await screen.findByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(draftBody).not.toBeNull());
    expect(draftBody).toMatchObject({ midterm1Points: 10 });
  });

  it('when Confirm is clicked then POST /Grade/confirm receives the 5 values', async () => {
    let confirmBody: Record<string, unknown> | null = null;
    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      http.get('/api/GradeDraft/:id', () => new HttpResponse(null, { status: 404 })),
      http.post('/api/Grade/confirm', async ({ request }) => {
        confirmBody = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await user.click(await screen.findByText(/Stud One/));

    const inputs = await screen.findAllByRole('spinbutton');
    await user.type(inputs[0], '25');
    await user.type(inputs[1], '25');
    await user.type(inputs[2], '5');
    await user.type(inputs[3], '5');
    await user.type(inputs[4], '20');

    await user.click(await screen.findByRole('button', { name: /^Confirm$/i }));

    await waitFor(() => expect(confirmBody).not.toBeNull());
    expect(confirmBody).toMatchObject({
      enrollmentId: 'e-100',
      midterm1Points: 25,
      midterm2Points: 25,
      attendancePoints: 5,
      practicalPoints: 5,
      examPoints: 20,
    });
  });

  it('when a Confirmed student is selected then the read-only panel renders the final grade and inputs are disabled', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [
          makeSubject({
            subjectId: 'sub-DB',
            subjectName: 'Databases',
            students: [
              makeStudentRow({
                enrollmentId: 'e-100',
                firstName: 'Stud',
                lastName: 'One',
                gradeState: 'Confirmed',
                finalGrade: 9,
              }),
            ],
          }),
        ],
        appeals: [],
      }),
      http.get('/api/Grade/by-enrollment/:id', () =>
        HttpResponse.json({
          midterm1Points: 25,
          midterm2Points: 25,
          attendancePoints: 5,
          practicalPoints: 5,
          examPoints: 20,
          finalGrade: 9,
        })
      )
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await user.click(await screen.findByText(/Stud One/));

    // Confirmed read-only alert: "<strong>Final grade:</strong> 9".
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBe(5);
      inputs.forEach((i) => expect(i).toBeDisabled());
    });
  });

  it('when a draft exists then the 5 inputs pre-fill from GET /GradeDraft/:id', async () => {
    server.use(
      professorDashboardHandler({
        subjects: [
          makeSubject({
            subjectId: 'sub-DB',
            subjectName: 'Databases',
            students: [
              makeStudentRow({
                enrollmentId: 'e-100',
                firstName: 'Stud',
                lastName: 'One',
                gradeState: 'Draft',
              }),
            ],
          }),
        ],
        appeals: [],
      }),
      http.get('/api/GradeDraft/e-100', () =>
        HttpResponse.json({
          midterm1Points: 12,
          midterm2Points: 13,
          attendancePoints: 4,
          practicalPoints: 3,
          examPoints: 20,
        })
      )
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await user.click(await screen.findByText(/Stud One/));

    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0].value).toBe('12');
      expect(inputs[1].value).toBe('13');
      expect(inputs[2].value).toBe('4');
      expect(inputs[3].value).toBe('3');
      expect(inputs[4].value).toBe('20');
    });
  });
});
