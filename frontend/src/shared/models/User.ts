import type { UserRole } from "../constants/constants";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  indexNumber?: string | null;
  userRole: UserRole;
  isDeleted: boolean;
  createdAt?: string;
}

export interface CreateUser {
  FirstName: string;
  LastName: string;
  Email: string;
  Password: string;
  IndexNumber?: string;
  UserRole: UserRole;
}

// Role is intentionally absent: a user's role is fixed at creation and cannot be
// changed through the admin edit flow (deferred to a later MVP, per D-048).
export interface UpdateUser {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  IsDeleted: boolean;
  IndexNumber?: string;
}
