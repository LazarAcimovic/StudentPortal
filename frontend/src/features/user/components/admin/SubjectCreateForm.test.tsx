import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubjectCreateForm from './SubjectCreateForm';
import * as userService from '../../api/userService';

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
    unobserve() {}
  });
});

const mockProfessors = [
  { id: 'prof-1', firstName: 'Ana', lastName: 'Anić' },
  { id: 'prof-2', firstName: 'Inactive', lastName: 'Prof' },
];

vi.mock('../../api/userService', async (importOriginal) => {
  const original = await importOriginal<typeof userService>();
  return {
    ...original,
    searchUsers: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(userService.searchUsers).mockResolvedValue({
    items: mockProfessors,
    totalCount: mockProfessors.length,
  });
});

function renderForm() {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<SubjectCreateForm onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel };
}

describe('SubjectCreateForm — correct id on submit (UI §8.4)', () => {
  it('submits the selected professor id, not the display label', async () => {
    const ue = userEvent.setup();
    const { onSave } = renderForm();

    await ue.type(screen.getByLabelText(/subject name/i), 'Databases');
    await ue.type(screen.getByLabelText(/subject code/i), 'CS101');

    const professorInput = screen.getByLabelText(/professor/i);
    await ue.click(professorInput);
    await screen.findByText('Ana Anić');
    await ue.click(screen.getByText('Ana Anić'));

    await ue.click(screen.getByRole('button', { name: /create/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ ProfessorId: 'prof-1' });
  });
});

describe('SubjectCreateForm — SubjectCode field (UI §8.4)', () => {
  it('renders a "Subject Code" label and input', () => {
    renderForm();
    expect(screen.getByLabelText(/subject code/i)).toBeInTheDocument();
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

  it('shows a required error when field is blurred empty', async () => {
    const ue = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/subject code/i);
    await ue.click(input);
    await ue.tab();
    expect(await screen.findByText(/subject code is required/i)).toBeInTheDocument();
  });

  it('shows max-length error when value exceeds 20 characters', async () => {
    const ue = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(/subject code/i);
    await ue.type(input, 'A'.repeat(21));
    await ue.tab();
    expect(
      await screen.findByText(/at most 20 characters/i)
    ).toBeInTheDocument();
  });

  it('calls onSave with subjectCode included in the payload', async () => {
    const ue = userEvent.setup();
    const { onSave } = renderForm();

    await ue.type(screen.getByLabelText(/subject name/i), 'Databases');
    await ue.type(screen.getByLabelText(/subject code/i), 'CS101');
    await ue.clear(screen.getByLabelText(/ects/i));
    await ue.type(screen.getByLabelText(/ects/i), '6');

    // Open professor combobox and select
    const professorInput = screen.getByLabelText(/professor/i);
    await ue.click(professorInput);
    const option = await screen.findByText('Ana Anić');
    await ue.click(option);

    await ue.click(screen.getByRole('button', { name: /create/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ SubjectCode: 'CS101' });
  });

  it('does not call onSave when SubjectCode is empty on submit', async () => {
    const ue = userEvent.setup();
    const { onSave } = renderForm();

    await ue.type(screen.getByLabelText(/subject name/i), 'Databases');
    // SubjectCode intentionally left empty
    await ue.click(screen.getByRole('button', { name: /create/i }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps the Create button disabled until the form is valid', async () => {
    const ue = userEvent.setup();
    renderForm();

    const createBtn = screen.getByRole('button', { name: /create/i });
    expect(createBtn).toBeDisabled();

    await ue.type(screen.getByLabelText(/subject name/i), 'Databases');
    await ue.type(screen.getByLabelText(/subject code/i), 'CS101');
    // ECTS defaults to 6; professor not yet chosen — still disabled
    expect(createBtn).toBeDisabled();

    const professorInput = screen.getByLabelText(/professor/i);
    await ue.click(professorInput);
    await screen.findByText('Ana Anić');
    await ue.click(screen.getByText('Ana Anić'));
    expect(createBtn).toBeEnabled();
  });

  it('shows an ECTS required error when the field is cleared', async () => {
    const ue = userEvent.setup();
    renderForm();

    await ue.clear(screen.getByLabelText(/ects/i));
    await ue.tab();

    expect(await screen.findByText(/ects is required/i)).toBeInTheDocument();
  });
});
