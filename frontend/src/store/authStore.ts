import { create } from "zustand";
import type { User } from "../models/UserModel";
import { login as authServiceLogin } from "../services/api/authService";

interface AuthState {
  user: User | null;
  token: string | null | undefined;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  login: async (email, password) => {
    const result = await authServiceLogin(email, password);

    if (result.success) {
      set({ user: result.user, token: result.token });
      localStorage.setItem("token", result.token || "");
      localStorage.setItem("user", JSON.stringify(result.user));
      return true;
    }
    return false;
  },

  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
}));

// Funkcija za inicijalizaciju stanja iz localStorage-a
const initializeAuth = () => {
  const storedToken = localStorage.getItem("token"); //returns null if not exist
  const storedUser = localStorage.getItem("user");

  if (storedToken && storedUser) {
    useAuthStore.setState({ token: storedToken, user: JSON.parse(storedUser) });
  }
};

initializeAuth();
