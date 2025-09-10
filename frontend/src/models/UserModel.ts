import type { RoleEnum } from "./Enums";

//User = UserDto
export interface User {
  Id: number;
  FirstName: string;
  LastName: string;
  Email: string;
  IndexNumber?: string | null;
  UserPassword?: string;
  UserRole: RoleEnum;
  IsDeleted: boolean;
  CreatedAt?: Date;
}

export interface CreateUser {
  FirstName: string;
  LastName: string;
  Email: string;
  UserPassword: string;
  IndexNumber?: string;
  UserRole: RoleEnum;
}

export interface UpdateUser {
  FirstName: string;
  LastName: string;
  UserRole: RoleEnum;
  Email: string;
  IsDeleted: boolean;
}
