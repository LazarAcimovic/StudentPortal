import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import {
  pagedUsersHandler,
  pagedSubjectsHandler,
  pagedEnrollmentsHandler,
} from '../../helpers/mswHandlers';
import { APP_ROUTES } from '../../../config/constants';
import { USER_ROLES } from '../../../shared/constants/constants';

function makeUser(overrides: {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  userRole?: string;
  isDeleted?: boolean;
} = {}) {
  return {
    id: overrides.id ?? 'user-0001',
    firstName: overrides.firstName ?? 'Alice',
    lastName: overrides.lastName ?? 'Smith',
    email: overrides.email ?? 'alice.smith@example.com',
    indexNumber: null,
    userRole: overrides.userRole ?? USER_ROLES.Student,
    isDeleted: overrides.isDeleted ?? false,
  };
}

function makeSubject(overrides: {
  id?: string;
  subjectName?: string;
  subjectCode?: string;
  ects?: number;
  professorId?: string;
  professorFirstName?: string;
  professorLastName?: string;
  isDeleted?: boolean;
} = {}) {
  return {
    id: overrides.id ?? 'subj-0001',
    subjectName: overrides.subjectName ?? 'Databases',
    subjectCode: overrides.subjectCode ?? 'DB101',
    ects: overrides.ects ?? 6,
    professorId: overrides.professorId ?? 'prof-0001',
    professorFirstName: overrides.professorFirstName ?? 'Bob',
    professorLastName: overrides.professorLastName ?? 'Jones',
    isDeleted: overrides.isDeleted ?? false,
  };
}

function makeEnrollment(overrides: {
  id?: string;
  studentId?: string;
  studentFirstName?: string;
  studentLastName?: string;
  subjectId?: string;
  subjectName?: string;
  enrolledAt?: string;
} = {}) {
  return {
    id: overrides.id ?? 'enroll-0001',
    studentId: overrides.studentId ?? 'user-0001',
    studentFirstName: overrides.studentFirstName ?? 'Alice',
    studentLastName: overrides.studentLastName ?? 'Smith',
    subjectId: overrides.subjectId ?? 'subj-0001',
    subjectName: overrides.subjectName ?? 'Databases',
    enrolledAt: overrides.enrolledAt ?? '2026-09-01T00:00:00Z',
    isDeleted: false,
  };
}

function emptyPaged() {
  return { items: [], totalCount: 0 };
}

function mountAdminDashboard() {
  return authenticatedRender({ as: 'admin', initialEntries: [APP_ROUTES.ADMIN_DASHBOARD] });
}

describe('AdminDashboardPage — server-side pagination (26.7)', () => {
  describe('Users tab', () => {
    it('renders user rows from the paged API response', async () => {
      server.use(
        pagedUsersHandler({ items: [makeUser({ firstName: 'Zara', id: 'u1' })], totalCount: 1 }),
        pagedSubjectsHandler(emptyPaged()),
        pagedEnrollmentsHandler(emptyPaged()),
      );
      mountAdminDashboard();
      expect(await screen.findByText('Zara')).toBeInTheDocument();
    });

    it('shows <Pagination> when totalCount >= 1', async () => {
      server.use(
        pagedUsersHandler({ items: [makeUser()], totalCount: 30 }),
        pagedSubjectsHandler(emptyPaged()),
        pagedEnrollmentsHandler(emptyPaged()),
      );
      mountAdminDashboard();
      expect(await screen.findByText('Total: 30')).toBeInTheDocument();
    });

    it('hides <Pagination> when totalCount is 0', async () => {
      server.use(
        pagedUsersHandler(emptyPaged()),
        pagedSubjectsHandler(emptyPaged()),
        pagedEnrollmentsHandler(emptyPaged()),
      );
      mountAdminDashboard();
      await screen.findByText('Manage Users');
      expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
    });

    it('pagination row-count select has options 15, 20, 50', async () => {
      server.use(
        pagedUsersHandler({ items: [makeUser()], totalCount: 100 }),
        pagedSubjectsHandler(emptyPaged()),
        pagedEnrollmentsHandler(emptyPaged()),
      );
      mountAdminDashboard();
      await screen.findByText('Total: 100');

      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
      expect(options).toEqual(expect.arrayContaining(['15', '20', '50']));
    });
  });

  describe('Subjects tab', () => {
    it('renders subject rows and pagination from paged API', async () => {
      server.use(
        pagedUsersHandler(emptyPaged()),
        pagedSubjectsHandler({ items: [makeSubject({ subjectName: 'Algorithms' })], totalCount: 18 }),
        pagedEnrollmentsHandler(emptyPaged()),
      );
      const { user } = mountAdminDashboard();
      await screen.findByText('Manage Users');

      await user.click(screen.getByRole('button', { name: /^subjects$/i }));

      expect((await screen.findAllByText('Algorithms')).length).toBeGreaterThan(0);
      expect(await screen.findByText('Total: 18')).toBeInTheDocument();
    });

    it('hides pagination on subjects tab when totalCount is 0', async () => {
      server.use(
        pagedUsersHandler(emptyPaged()),
        pagedSubjectsHandler(emptyPaged()),
        pagedEnrollmentsHandler(emptyPaged()),
      );
      const { user } = mountAdminDashboard();
      await screen.findByText('Manage Users');

      await user.click(screen.getByRole('button', { name: /^subjects$/i }));
      await screen.findByText('Manage Subjects');
      expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
    });
  });

  describe('Enrollments tab', () => {
    it('renders enrollment rows and pagination from paged API', async () => {
      server.use(
        pagedUsersHandler(emptyPaged()),
        pagedSubjectsHandler(emptyPaged()),
        pagedEnrollmentsHandler({
          items: [makeEnrollment({ studentFirstName: 'Carlos', subjectName: 'Algorithms' })],
          totalCount: 22,
        }),
      );
      const { user } = mountAdminDashboard();
      await screen.findByText('Manage Users');

      await user.click(screen.getByRole('button', { name: /^enrollments$/i }));

      expect((await screen.findAllByText(/Carlos Smith/)).length).toBeGreaterThan(0);
      expect(await screen.findByText('Total: 22')).toBeInTheDocument();
    });

    it('hides pagination on enrollments tab when totalCount is 0', async () => {
      server.use(
        pagedUsersHandler(emptyPaged()),
        pagedSubjectsHandler(emptyPaged()),
        pagedEnrollmentsHandler(emptyPaged()),
      );
      const { user } = mountAdminDashboard();
      await screen.findByText('Manage Users');

      await user.click(screen.getByRole('button', { name: /^enrollments$/i }));
      await screen.findByText('Student Enrollments');
      expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
    });
  });
});
