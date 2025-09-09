import { MOCK_STUDENTS } from "../data/studentMock";
import { MOCK_PROFESSORS } from "../data/professorsMock";
import { MOCK_ADMIN } from "../data/adminMock.ts";
import type { User } from "../../models/UserModel";

// Spajanje svih korisnika u jedan niz za autentifikaciju
const ALL_MOCK_USERS: User[] = [
  ...MOCK_ADMIN,
  ...MOCK_PROFESSORS,
  ...MOCK_STUDENTS,
];

export const login = (email: string, password: string) => {
  const user = ALL_MOCK_USERS.find(
    (u) => u.Email === email && u.UserPassword === password
  );

  if (user) {
    const token = "mock-jwt-token-for-" + user.Id;
    return { success: true, user, token };
  } else {
    return { success: false, message: "Neispravan email ili lozinka" };
  }
};
