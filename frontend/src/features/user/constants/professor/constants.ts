import React from 'react';

export const PROFESSOR_SELECTED_SUBJECT_ID_INITIAL: string | null = null;
export const PROFESSOR_SELECTED_STUDENT_ROW_INITIAL = null;

export const APPEAL_STATUS_BADGE: Record<string, React.ReactElement> = {
  Pending: React.createElement('span', { className: 'badge rounded-pill bg-info text-dark' }, 'Pending'),
  Overdue: React.createElement('span', { className: 'badge rounded-pill bg-secondary' }, 'Overdue'),
  Denied: React.createElement('span', { className: 'badge rounded-pill bg-danger' }, 'Denied'),
};
