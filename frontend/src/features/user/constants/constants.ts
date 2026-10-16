import React from 'react';
import type { StudentDashboardData, SubjectStatus } from '../models/studentDashboard';

export const STUDENT_DASHBOARD_INITIAL_DATA: StudentDashboardData | null = null;
export const STUDENT_DASHBOARD_INITIAL_IS_LOADING = true;
export const STUDENT_DASHBOARD_INITIAL_ERROR: string | null = null;
export const STUDENT_DASHBOARD_INITIAL_REFRESH_KEY = 0;

export const APPEAL_DENIED_STATUS = 'Appeal denied' as const;

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
};
