import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { professorDashboardHandler, professorStudentsHandler } from '../../helpers/mswHandlers';
import {
  emptyProfessorDashboard,
  makeStudentRow,
  makeSubject,
  makePagedStudents,
  singleSubjectWithStudent,
  singleSubjectStudentsPage,
} from '../../helpers/fixtures/professorDashboard';
import { APP_ROUTES } from '../../../config/constants';
import SubjectsList from '../../../features/user/components/professor/SubjectsList';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';
import { resetUserStore } from '../../helpers/renderWithProviders';
import { makeProfessor } from '../../factories';
import { useUserStore } from '../../../store/user/useUserStore';

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
    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage)
    );

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
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage),
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
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage),
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
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage),
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
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage),
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
    const confirmedStudentsPage = makePagedStudents(
      [makeStudentRow({ enrollmentId: 'e-100', firstName: 'Stud', lastName: 'One', gradeState: 'Confirmed', finalGrade: 9 })],
      { totalCount: 1 }
    );
    server.use(
      professorDashboardHandler({
        subjects: [
          makeSubject({ subjectId: 'sub-DB', subjectName: 'Databases', studentCount: 1 }),
        ],
        appeals: [],
        assignedCases: [],
      }),
      professorStudentsHandler('sub-DB', confirmedStudentsPage),
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

    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBe(5);
      inputs.forEach((i) => expect(i).toBeDisabled());
    });
  });

  it('when a draft exists then the 5 inputs pre-fill from GET /GradeDraft/:id', async () => {
    const draftStudentsPage = makePagedStudents(
      [makeStudentRow({ enrollmentId: 'e-100', firstName: 'Stud', lastName: 'One', gradeState: 'Draft' })],
      { totalCount: 1 }
    );
    server.use(
      professorDashboardHandler({
        subjects: [
          makeSubject({ subjectId: 'sub-DB', subjectName: 'Databases', studentCount: 1 }),
        ],
        appeals: [],
        assignedCases: [],
      }),
      professorStudentsHandler('sub-DB', draftStudentsPage),
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

  it('pagination control appears when the subject has at least one student', async () => {
    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage)
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await screen.findByText(/Stud One/);

    // Subjects column always shows a pagination control; students column adds a second one.
    expect(screen.getAllByText(/Rows per page:/i).length).toBeGreaterThanOrEqual(2);
  });

  it('pagination control is hidden when the selected subject has no students', async () => {
    const emptySubjectDashboard = {
      subjects: [makeSubject({ subjectId: 'sub-DB', subjectName: 'Databases', studentCount: 0 })],
      appeals: [],
      assignedCases: [],
    };
    server.use(
      professorDashboardHandler(emptySubjectDashboard),
      professorStudentsHandler('sub-DB', makePagedStudents([], { totalCount: 0 }))
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    await screen.findByText(/No students enrolled/i);

    // Only the subjects column pagination should be visible; students column should have none.
    expect(screen.getAllByText(/Rows per page:/i).length).toBe(1);
  });

  it('loading spinner shows in column 2 while fetching students', async () => {
    let resolveStudents!: () => void;
    const studentsPromise = new Promise<void>(resolve => { resolveStudents = resolve; });

    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      http.get('/api/Professor/subjects/sub-DB/students', async () => {
        await studentsPromise;
        return HttpResponse.json(singleSubjectStudentsPage);
      })
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));

    expect(await screen.findByRole('status', { name: /Loading students/i })).toBeInTheDocument();

    resolveStudents();
    expect(await screen.findByText(/Stud One/)).toBeInTheDocument();
  });
});

describe('SubjectsList page-jump behaviour (Tech-Frontend §2)', () => {
  it('renders the page that contains the selected subject on first render', () => {
    const subjects = Array.from({ length: 11 }, (_, i) =>
      makeSubject({ subjectId: `sub-${i}`, subjectName: `Subject ${i}` })
    );
    // sub-5 is at index 5 → with default pageSize 5, it is on page 2
    render(
      <SubjectsList
        subjects={subjects}
        selectedSubjectId="sub-5"
        onSubjectClick={() => {}}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items.some(item => item.textContent?.includes('Subject 5'))).toBe(true);
    expect(items.every(item => !item.textContent?.includes('Subject 0'))).toBe(true);
  });

  it('re-rendering with a fresh-but-equal array reference does not loop or exceed the update depth', () => {
    const subject = makeSubject({ subjectId: 'sub-1', subjectName: 'Math' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <SubjectsList
        subjects={[subject]}
        selectedSubjectId="sub-1"
        onSubjectClick={() => {}}
      />
    );

    for (let i = 0; i < 10; i++) {
      rerender(
        <SubjectsList
          subjects={[{ ...subject }]}
          selectedSubjectId="sub-1"
          onSubjectClick={() => {}}
        />
      );
    }

    const maxDepthErrors = errorSpy.mock.calls.filter(([msg]) =>
      typeof msg === 'string' && msg.includes('Maximum update depth exceeded')
    );
    expect(maxDepthErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });
});

describe('Task-29 regression guards', () => {
  it('selecting a subject with students renders the paged list and does not throw', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage)
    );

    const { user } = authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await user.click(await screen.findByText(/Databases/));
    expect(await screen.findByText(/Stud One/)).toBeInTheDocument();
    expect(screen.getAllByText(/Rows per page:/i).length).toBeGreaterThanOrEqual(2);

    const crashErrors = errorSpy.mock.calls.filter(([msg]) =>
      typeof msg === 'string' && msg.includes('Cannot read properties of undefined')
    );
    expect(crashErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });

  it('the dashboard page does not exceed the React update depth when subject data loads', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      professorDashboardHandler(singleSubjectWithStudent),
      professorStudentsHandler('sub-DB', singleSubjectStudentsPage)
    );

    authenticatedRender({
      as: 'professor',
      initialEntries: [APP_ROUTES.PROFESSOR_DASHBOARD],
    });

    await screen.findByText(/Databases/);

    const loopErrors = errorSpy.mock.calls.filter(([msg]) =>
      typeof msg === 'string' && msg.includes('Maximum update depth exceeded')
    );
    expect(loopErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });

  it('a render error shows the error-boundary fallback and keeps the user logged in', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    resetUserStore(makeProfessor());

    const Thrower = (): never => { throw new Error('simulated render crash'); };

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/session is still active/i)).toBeInTheDocument();
    expect(useUserStore.getState().currentUser).not.toBeNull();

    errorSpy.mockRestore();
  });
});
