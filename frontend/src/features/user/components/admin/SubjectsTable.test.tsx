import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubjectsTable from './SubjectsTable';
import type { Subject } from '../../../../features/subjects/models/subject';

const subjects: Subject[] = [
  {
    id: 1,
    subjectName: 'Databases',
    subjectCode: 'CS101',
    ects: 6,
    professorId: 7,
    professorFirstName: 'Petar',
    professorLastName: 'Petrović',
    isDeleted: false,
  },
];

function renderTable() {
  const onStartEdit = vi.fn();
  render(<SubjectsTable subjects={subjects} onStartEdit={onStartEdit} />);
  return { onStartEdit };
}

describe('SubjectsTable — Subject Code column (UI §8.4)', () => {
  it('renders a "Subject Code" column header', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: /subject code/i })).toBeInTheDocument();
  });

  it('renders the subject code value in the row', () => {
    renderTable();
    expect(screen.getByText('CS101')).toBeInTheDocument();
  });
});
