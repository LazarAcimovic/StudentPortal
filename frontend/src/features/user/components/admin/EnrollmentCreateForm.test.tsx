import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnrollmentCreateForm from './EnrollmentCreateForm';
import * as userService from '../../api/userService';
import * as subjectService from '../../../subjects/api/subjectService';
import type { CreateEnrollmentResult } from '../../../subjects/api/enrollmentService';

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
    unobserve() {}
  });
});

vi.mock('../../api/userService', async (importOriginal) => {
  const original = await importOriginal<typeof userService>();
  return {
    ...original,
    searchUsers: vi.fn(),
  };
});

vi.mock('../../../subjects/api/subjectService', async (importOriginal) => {
  const original = await importOriginal<typeof subjectService>();
  return {
    ...original,
    searchSubjects: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(userService.searchUsers).mockResolvedValue({
    items: [{ id: 's1', firstName: 'Ana', lastName: 'Anić', indexNumber: 'E/1/22' }],
    totalCount: 1,
  });
  vi.mocked(subjectService.searchSubjects).mockResolvedValue({
    items: [{ id: 'sub1', subjectName: 'Databases', subjectCode: 'CS101' }],
    totalCount: 1,
  });
});

const okResult: CreateEnrollmentResult = {
  ok: true,
  enrollment: {
    id: 'e1',
    studentId: 's1',
    studentFirstName: 'Ana',
    studentLastName: 'Anić',
    subjectId: 'sub1',
    subjectName: 'Databases',
    enrolledAt: new Date(),
    isDeleted: false,
  },
};

function renderForm(onSave = vi.fn().mockResolvedValue(okResult)) {
  render(
    <EnrollmentCreateForm
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

    // Pick student
    await ue.click(screen.getByLabelText(/student/i));
    await screen.findByText(/Ana Anić/);
    await ue.click(screen.getByText(/Ana Anić/));
    expect(create).toBeDisabled();

    // Pick subject
    await ue.click(screen.getByLabelText(/subject/i));
    await screen.findByText(/Databases/);
    await ue.click(screen.getByText(/Databases \(CS101\)/));
    expect(create).toBeEnabled();
  });

  it('submits the selected ids and surfaces a server error inline', async () => {
    const ue = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({
      ok: false,
      message: 'This student is already enrolled in that subject.',
    } satisfies CreateEnrollmentResult);
    renderForm(onSave);

    await ue.click(screen.getByLabelText(/student/i));
    await screen.findByText(/Ana Anić/);
    await ue.click(screen.getByText(/Ana Anić/));

    await ue.click(screen.getByLabelText(/subject/i));
    await screen.findByText(/Databases/);
    await ue.click(screen.getByText(/Databases \(CS101\)/));

    await ue.click(screen.getByRole('button', { name: /create/i }));

    expect(onSave).toHaveBeenCalledWith({ StudentId: 's1', SubjectId: 'sub1' });
    await waitFor(() =>
      expect(screen.getByText(/already enrolled in that subject/i)).toBeInTheDocument()
    );
  });
});
