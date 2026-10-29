import { USER_ROLES } from '../../../shared/constants/constants';
import type { User as StoreUser } from '../../../shared/models/User';

export const seededStudent: StoreUser = {
  id: '101',
  firstName: 'Stu',
  lastName: 'Dent',
  email: 'stu.dent@example.com',
  indexNumber: 'E2/2021',
  userRole: USER_ROLES.Student,
  isDeleted: false,
};

export const seededProfessor: StoreUser = {
  id: '201',
  firstName: 'Pro',
  lastName: 'Fessor',
  email: 'pro.fessor@example.com',
  indexNumber: null,
  userRole: USER_ROLES.Professor,
  isDeleted: false,
};

export const seededAdmin: StoreUser = {
  id: '301',
  firstName: 'Addy',
  lastName: 'Min',
  email: 'addy.min@example.com',
  indexNumber: null,
  userRole: USER_ROLES.Admin,
  isDeleted: false,
};

export type SeedRole = 'student' | 'professor' | 'admin';

export function pickSeeded(role: SeedRole): StoreUser {
  switch (role) {
    case 'student':
      return seededStudent;
    case 'professor':
      return seededProfessor;
    case 'admin':
      return seededAdmin;
  }
}
