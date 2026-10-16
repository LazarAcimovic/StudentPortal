import type { UserRole } from "../shared/constants/constants";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  indexNumber?: string | null;
  userRole: UserRole;
  isDeleted: boolean;
  createdAt?: Date;
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
  Id: number;
  FirstName: string;
  LastName: string;
  UserRole: UserRole;
  Email: string;
  IsDeleted: boolean;
}
