import type { User } from "../../models/UserModel";
import { RoleEnum } from "../../models/Enums";

export const MOCK_PROFESSORS: User[] = [
  {
    Id: 3,
    FirstName: "Petar",
    LastName: "Petrovic",
    Email: "petar.petrovic@professor.com",
    UserPassword: "professorpass",
    UserRole: RoleEnum.Professor,
    IsDeleted: false,
  },
  {
    Id: 7,
    FirstName: "Stefan",
    LastName: "Stefanovic",
    Email: "stefan.stefanovic@professor.com",
    UserPassword: "professorpass",
    UserRole: RoleEnum.Professor,
    IsDeleted: false,
  },
];
