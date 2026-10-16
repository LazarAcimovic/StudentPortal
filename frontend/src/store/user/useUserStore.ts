import { create } from "zustand";
import type { User } from "../../shared/models/User";

interface UserState {
  currentUser: User | null;
  isHydrating: boolean;
  setCurrentUser: (user: User | null) => void;
  clearCurrentUser: () => void;
  setHydrating: (hydrating: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  isHydrating: true,
  setCurrentUser: (user) => set({ currentUser: user }),
  clearCurrentUser: () => set({ currentUser: null }),
  setHydrating: (hydrating) => set({ isHydrating: hydrating }),
}));
