import type { RoleEnum } from "./Enums";

//User = UserDto
export interface User {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  indexNumber?: string | null;
  userRole: RoleEnum;
  isDeleted: boolean; //izbaciti iz beka
  createdAt?: Date;
}

export interface CreateUser {
  FirstName: string;
  LastName: string;
  Email: string;
  Password: string; //UserPassword na beku
  IndexNumber?: string;
  UserRole: RoleEnum;
}

export interface UpdateUser {
  Id: number;
  FirstName: string;
  LastName: string;
  UserRole: RoleEnum;
  Email: string;
  IsDeleted: boolean;
}
