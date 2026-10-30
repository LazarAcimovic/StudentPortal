import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnrollmentCreateForm from './EnrollmentCreateForm';
import type { User } from '../../../../shared/models/User';
import type { Subject } from '../../../../features/subjects/models/subject';
import type { Enrollment } from '../../../../features/subjects/models/enrollment';
import { USER_ROLES } from '../../../../shared/constants/constants';
import type { CreateEnrollmentResult } from '../../../subjects/api/enrollmentService';

const students: User[] = [
  { id: 's1', firstName: 'Ana', lastName: 'Anić', userRole: USER_ROLES.Student, isDeleted: false, indexNumber: 'E/1/22' } as unknown as User,
  { id: 's2', firstName: 'Inactive', lastName: 'Student', userRole: USER_ROLES.Student, isDeleted: true, indexNumber: 'E/2/22' } as unknown as User,
];

const subjects: Subject[] = [
  { id: 'sub1', subjectName: 'Databases', subjectCode: 'CS101', ects: 6, professorId: 'p1', professorFirstName: 'P', professorLastName: 'Q', isDeleted: false },
];

const okResult: CreateEnrollmentResult = {
  ok: true,
  enrollment: { id: 'e1', studentId: 's1', studentFirstName: 'Ana', studentLastName: 'Anić', subjectId: 'sub1', subjectName: 'Databases', enrolledAt: new Date(), isDeleted: false },
};

function renderForm(onSave = vi.fn().mockResolvedValue(okResult), enrollments: Enrollment[] = []) {
  render(
    <EnrollmentCreateForm
      students={students}
      subjects={subjects}
      enrollments={enrollments}
      onSave={onSave}
      onCancel={vi.fn()}
    />
  );
  return { onSave };
}

describe('EnrollmentCreateForm', () => {
  it('keeps Create disabled until both student and subject are chosen', async () => {
    const ue = userEvent.setup();
    renderForm();
    const create = screen.getByRole('button', { name: /create/i });
    expect(create).toBeDisabled();

    await ue.selectOptions(screen.getByLabelText(/student/i), ['Ana Anić']);
    await ue.selectOptions(screen.getByLabelText(/subject/i), ['Databases']);
    expect(create).toBeEnabled();
  });

  it('excludes soft-deleted students from the dropdown', () => {
    renderForm();
    expect(screen.getByRole('option', { name: /ana anić/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /inactive student/i })).toBeNull();
  });

  it('submits the selected ids and surfaces a server error inline', async () => {
    const ue = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({
      ok: false,
      message: 'This student is already enrolled in that subject.',
    } satisfies CreateEnrollmentResult);
    renderForm(onSave);

    await ue.selectOptions(screen.getByLabelText(/student/i), ['Ana Anić']);
    await ue.selectOptions(screen.getByLabelText(/subject/i), ['Databases']);
    await ue.click(screen.getByRole('button', { name: /create/i }));

    expect(onSave).toHaveBeenCalledWith({ StudentId: 's1', SubjectId: 'sub1' });
    await waitFor(() =>
      expect(screen.getByText(/already enrolled in that subject/i)).toBeInTheDocument()
    );
  });
});
