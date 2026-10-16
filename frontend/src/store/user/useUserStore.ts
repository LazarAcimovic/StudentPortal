import { create } from "zustand";
import type { UserRole } from "../../shared/constants/constants";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  indexNumber?: string | null;
  userRole: UserRole;
  createdAt?: string;
}

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
