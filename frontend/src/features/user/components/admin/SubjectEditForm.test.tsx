import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubjectEditForm from './SubjectEditForm';
import type { Subject } from '../../../../features/subjects/models/subject';
import * as userService from '../../api/userService';

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

beforeEach(() => {
  vi.mocked(userService.searchUsers).mockResolvedValue({
    items: [{ id: 'prof-new', firstName: 'New', lastName: 'Professor' }],
    totalCount: 1,
  });
});

const subject: Subject = {
  id: '42',
  subjectName: 'Databases',
  subjectCode: 'CS101',
  ects: 6,
  professorId: '7',
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
      onSave={onSave}
      onCancel={onCancel}
    />
  );
  return { onSave, onCancel };
}

describe('SubjectEditForm — professor seed item (UI §8.4)', () => {
  it('always shows the current professor in the dropdown even when absent from search results', async () => {
    const ue = userEvent.setup();
    // Default mock returns prof-new only — the current professor (id: '7') is absent
    renderForm();
    const professorInput = screen.getByLabelText(/professor/i);
    await ue.click(professorInput);
    expect(await screen.findByRole('button', { name: 'Petar Petrović' })).toBeInTheDocument();
  });
});

describe('SubjectEditForm — correct id on submit after combobox selection (UI §8.4)', () => {
  it('submits the newly selected professor id, not the original or the query text', async () => {
    const ue = userEvent.setup();
    vi.mocked(userService.searchUsers).mockResolvedValue({
      items: [{ id: 'prof-99', firstName: 'New', lastName: 'Professor' }],
      totalCount: 1,
    });
    const { onSave } = renderForm();

    const professorInput = screen.getByLabelText(/professor/i);
    await ue.click(professorInput);
    const option = await screen.findByRole('button', { name: 'New Professor' });
    await ue.click(option);

    await ue.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ ProfessorId: 'prof-99' });
  });
});

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

  it('disables Save Changes once a required field is cleared', async () => {
    const ue = userEvent.setup();
    renderForm();
    const save = screen.getByRole('button', { name: /save changes/i });
    expect(save).toBeEnabled();
    const input = screen.getByLabelText(/subject code/i);
    await ue.tripleClick(input);
    await ue.keyboard('{Delete}');
    expect(save).toBeDisabled();
  });

  it('pre-populates the professor combobox from the subject prop', () => {
    renderForm();
    // The combobox input shows the current professor label before any interaction
    const professorInput = screen.getByLabelText(/professor/i);
    expect(professorInput).toHaveValue('Petar Petrović');
  });
});
