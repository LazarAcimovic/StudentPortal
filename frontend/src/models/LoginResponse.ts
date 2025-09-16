export interface LoginResponse {
  accessToken: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresIn: number;
  userRole: number;
}
