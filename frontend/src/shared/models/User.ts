import type { UserRole } from "../constants/constants";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  indexNumber?: string | null;
  userRole: UserRole;
  createdAt?: string;
}
