import { MOCK_USERS } from "../data/mockData";

export const login = (email: string, password: string) => {
  const user = MOCK_USERS.find(
    (u) => u.Email === email && u.UserPassword === password
  );

  if (user) {
    const token = "mock-jwt-token-for-" + user.Id;
    return { success: true, user, token };
  } else {
    return { success: false, message: "Neispravan email ili lozinka" };
  }
};
