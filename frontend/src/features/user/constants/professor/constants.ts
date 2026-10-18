import React from 'react';
import type { FormValues } from '../../models/professor/gradePanel';

export const PROFESSOR_SELECTED_SUBJECT_ID_INITIAL: string | null = null;
export const PROFESSOR_SELECTED_STUDENT_ROW_INITIAL = null;

export const APPEAL_STATUS_BADGE: Record<string, React.ReactElement> = {
  Pending: React.createElement('span', { className: 'badge rounded-pill bg-info text-dark' }, 'Pending'),
  Overdue: React.createElement('span', { className: 'badge rounded-pill bg-secondary' }, 'Overdue'),
  Denied: React.createElement('span', { className: 'badge rounded-pill bg-danger' }, 'Denied'),
};

export const EMPTY_FORM: FormValues = {
  midterm1: '',
  midterm2: '',
  attendance: '',
  practical: '',
  exam: '',
};

export const FIELDS: { key: keyof FormValues; label: string; max: number }[] = [
  { key: 'midterm1', label: 'First midterm', max: 30 },
  { key: 'midterm2', label: 'Second midterm', max: 30 },
  { key: 'attendance', label: 'Lecture attendance', max: 5 },
  { key: 'practical', label: 'Practical participation', max: 5 },
  { key: 'exam', label: 'Exam', max: 30 },
];
