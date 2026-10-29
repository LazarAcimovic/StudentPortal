import React from 'react';
import type { StudentDashboardData, SubjectStatus } from '../../models/studentDashboard';

export const STUDENT_DASHBOARD_INITIAL_DATA: StudentDashboardData | null = null;
export const STUDENT_DASHBOARD_INITIAL_IS_LOADING = true;
export const STUDENT_DASHBOARD_INITIAL_ERROR: string | null = null;
export const STUDENT_DASHBOARD_INITIAL_REFRESH_KEY = 0;

export const APPEAL_DENIED_STATUS = 'Appeal denied' as const;
export const APPEAL_ACCEPTED_STATUS = 'Appeal accepted' as const;

export const APPEAL_MAX_LENGTH = 1000;
export const APPEAL_MODAL_INITIAL_STATE = null;
export const APPEAL_TEXT_REQUIRED_ERROR = 'Appeal text is required.' as const;
export const APPEAL_SUBMIT_ERROR = 'Failed to submit appeal. Please try again.' as const;

export const CONFIRM_GRADE_MODAL_INITIAL_STATE = null;

export const SUBJECT_ACTION_LAYOUT = {
  TABLE: 'table',
  CARD: 'card',
} as const;

export type SubjectActionLayout =
  (typeof SUBJECT_ACTION_LAYOUT)[keyof typeof SUBJECT_ACTION_LAYOUT];

export const STATUS_BADGE_MAP: Record<SubjectStatus, React.ReactElement> = {
  Passed: React.createElement(
    'span',
    { className: 'badge rounded-pill bg-success' },
    'Passed'
  ),
  Failed: React.createElement(
    'span',
    { className: 'badge rounded-pill bg-danger' },
    'Failed'
  ),
  'Not graded': React.createElement(
    'span',
    { className: 'badge rounded-pill bg-secondary' },
    'Not graded'
  ),
  'Awaiting confirmation': React.createElement(
    'span',
    { className: 'badge rounded-pill bg-warning text-dark' },
    'Awaiting confirmation'
  ),
  'Appeal pending': React.createElement(
    'span',
    { className: 'badge rounded-pill bg-info text-dark' },
    'Appeal pending'
  ),
  'Under admin review': React.createElement(
    'span',
    { className: 'badge rounded-pill text-white', style: { backgroundColor: '#6f42c1' } },
    'Under admin review'
  ),
};
