import type { RoleEnum } from "./Enums";

export interface User {
  Id: number;
  FirstName: string;
  LastName: string;
  Email: string;
  UserPassword: string;
  IndexNumber?: string | null;
  UserRole: RoleEnum;
  IsDeleted: boolean;
  CreatedAt?: Date;
}

export interface UserDto {
  Id: number;
  FirstName: string;
  LastName: string;
  Email: string;
  IndexNumber?: string;
  UserRole: RoleEnum;
  IsDeleted: boolean;
  CreatedAt: Date;
}

export interface CreateUserDto {
  FirstName: string;
  LastName: string;
  Email: string;
  UserPassword: string;
  IndexNumber?: string;
  UserRole: RoleEnum;
}

export interface UpdateUserDto {
  FirstName: string;
  LastName: string;
  UserRole: RoleEnum;
  Email: string;
  IsDeleted: boolean;
}
