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

export interface UpdateUser {
  Id: string;
  FirstName: string;
  LastName: string;
  UserRole: UserRole;
  Email: string;
  IsDeleted: boolean;
  IndexNumber?: string;
}
