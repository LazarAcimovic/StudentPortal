import type { RoleEnum } from "./Enums";

export interface User {
  Id: number;
  FirstName: string;
  LastName: string;
  Email: string;
  UserPassword: string;
  IndexNumber?: string;
  UserRole: RoleEnum;
  IsDeleted: boolean;
  CreatedAt?: Date;
}
