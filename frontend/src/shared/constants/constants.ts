export const USER_ROLES = {
  Student: 0,
  Professor: 1,
  Admin: 2,
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.Student]: 'Student',
  [USER_ROLES.Professor]: 'Professor',
  [USER_ROLES.Admin]: 'Admin',
};

export const AXIOS_CANCELED_ERROR_NAME = 'CanceledError';
export const AXIOS_CANCELED_ERROR_CODE = 'ERR_CANCELED';
