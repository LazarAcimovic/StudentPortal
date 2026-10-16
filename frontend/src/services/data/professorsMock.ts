import type { User } from "../../models/UserModel";
import { USER_ROLES } from "../../shared/constants/constants";

export const MOCK_PROFESSORS: User[] = [
  {
    Id: 3,
    FirstName: "Petar",
    LastName: "Petrovic",
    Email: "petar.petrovic@professor.com",
    UserPassword: "professorpass",
    UserRole: USER_ROLES.Professor,
    IsDeleted: false,
  },
  {
    Id: 7,
    FirstName: "Stefan",
    LastName: "Stefanovic",
    Email: "stefan.stefanovic@professor.com",
    UserPassword: "professorpass",
    UserRole: USER_ROLES.Professor,
    IsDeleted: false,
  },
];
