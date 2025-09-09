import type { User } from "../../models/UserModel";
import { RoleEnum } from "../../models/Enums";

export const MOCK_ADMIN: User[] = [
  {
    Id: 1,
    FirstName: "Admin",
    LastName: "Administrator",
    Email: "admin@studentportal.com",
    UserPassword: "adminpass",
    IndexNumber: null,
    UserRole: RoleEnum.Admin,
    IsDeleted: false,
    CreatedAt: new Date(),
  },
];
