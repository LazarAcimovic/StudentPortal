import type { User } from "../../models/UserModel";
import { USER_ROLES } from "../../shared/constants/constants";

export const MOCK_ADMIN: User[] = [
  {
    Id: 1,
    FirstName: "Admin",
    LastName: "Administrator",
    Email: "admin@studentportal.com",
    UserPassword: "adminpass",
    IndexNumber: null,
    UserRole: USER_ROLES.Admin,
    IsDeleted: false,
    CreatedAt: new Date(),
  },
];
