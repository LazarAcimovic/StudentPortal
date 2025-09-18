export interface LoginResponse {
  id: number;
  indexNumber: string;
  accessToken: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresIn: number;
  userRole: number;
}
