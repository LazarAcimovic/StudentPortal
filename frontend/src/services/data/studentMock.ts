import type { User } from "../../models/UserModel";
import { USER_ROLES } from "../../shared/constants/constants";

export const MOCK_STUDENTS: User[] = [
  {
    Id: 2,
    FirstName: "Jovan",
    LastName: "Jovanovic",
    Email: "jovan.jovanovic@student.com",
    UserPassword: "jovanpass",
    IndexNumber: "IT 35/2021",
    UserRole: USER_ROLES.Student,
    IsDeleted: false,
  },
  {
    Id: 4,
    FirstName: "Marko",
    LastName: "Markovic",
    Email: "marko.markovic@student.com",
    UserPassword: "markopass",
    IndexNumber: "IT 42/2021",
    UserRole: USER_ROLES.Student,
    IsDeleted: false,
  },
  {
    Id: 5,
    FirstName: "Ana",
    LastName: "Anic",
    Email: "ana.anic@student.com",
    UserPassword: "anapass",
    IndexNumber: "IT 11/2022",
    UserRole: USER_ROLES.Student,
    IsDeleted: false,
  },
  {
    Id: 6,
    FirstName: "Ivan",
    LastName: "Ilic",
    Email: "ivan.ilic@student.com",
    UserPassword: "ivanpass",
    IndexNumber: "IT 12/2022",
    UserRole: USER_ROLES.Student,
    IsDeleted: false,
  },
];
