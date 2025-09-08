import { RoleEnum } from "../../models/Enums";
import type { User } from "../../models/Entities";

export const MOCK_USERS: User[] = [
  {
    Id: 1,
    FirstName: "Admin",
    LastName: "Administrator",
    Email: "admin@studentportal.com",
    UserPassword: "adminpass",
    UserRole: RoleEnum.Admin,
    IsDeleted: false,
  },
  {
    Id: 2,
    FirstName: "Jovan",
    LastName: "Jovanovic",
    Email: "jovan.jovanovic@student.com",
    UserPassword: "studentpass",
    IndexNumber: "IT 35/2021",
    UserRole: RoleEnum.Student,
    IsDeleted: false,
  },
  {
    Id: 3,
    FirstName: "Petar",
    LastName: "Petrovic",
    Email: "petar.petrovic@professor.com",
    UserPassword: "professorpass",
    UserRole: RoleEnum.Professor,
    IsDeleted: false,
  },
];
