export const USER_ROLES = {
  Student: 0,
  Professor: 1,
  Admin: 2,
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const AXIOS_CANCELED_ERROR_NAME = 'CanceledError';
export const AXIOS_CANCELED_ERROR_CODE = 'ERR_CANCELED';
