import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubjectEditForm from './SubjectEditForm';
import type { Subject } from '../../../../features/subjects/models/subject';
import type { User } from '../../../../shared/models/User';
import { USER_ROLES } from '../../../../shared/constants/constants';

const professors: User[] = [
  {
    id: 7,
    firstName: 'Petar',
    lastName: 'Petrović',
    email: 'petar@test.com',
    userRole: USER_ROLES.Professor,
    isDeleted: false,
    indexNumber: null,
  } as unknown as User,
];

const subject: Subject = {
  id: 42,
  subjectName: 'Databases',
  subjectCode: 'CS101',
  ects: 6,
  professorId: 7,
  professorFirstName: 'Petar',
  professorLastName: 'Petrović',
  isDeleted: false,
};

function renderForm(overrides?: Partial<Subject>) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(
    <SubjectEditForm
      subject={{ ...subject, ...overrides }}
      professors={professors}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
  return { onSave, onCancel };
}

describe('SubjectEditForm — SubjectCode field (UI §8.4)', () => {
  it('renders a "Subject Code" label and input', () => {
    renderForm();
    expect(screen.getByLabelText(/subject code/i)).toBeInTheDocument();
  });

  it('pre-populates the Subject Code from the subject prop', () => {
    renderForm();
    expect(screen.getByLabelText(/subject code/i)).toHaveValue('CS101');
  });

  it('renders the help text', () => {
    renderForm();
    expect(
      screen.getByText(/subjects sharing a code are the same course/i)
    ).toBeInTheDocument();
  });

  it('shows no error before the field is touched', () => {
    renderForm();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a required error when field is cleared and blurred', async () => {
    const ue = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/subject code/i);
    await ue.tripleClick(input);
    await ue.keyboard('{Delete}');
    await ue.tab();
    expect(await screen.findByText(/subject code is required/i)).toBeInTheDocument();
  });

  it('calls onSave with subjectCode included in the payload', async () => {
    const ue = userEvent.setup();
    const { onSave } = renderForm();
    await ue.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ SubjectCode: 'CS101' });
  });

  it('does not call onSave when SubjectCode is cleared on submit', async () => {
    const ue = userEvent.setup();
    const { onSave } = renderForm();
    const input = screen.getByLabelText(/subject code/i);
    await ue.tripleClick(input);
    await ue.keyboard('{Delete}');
    await ue.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
