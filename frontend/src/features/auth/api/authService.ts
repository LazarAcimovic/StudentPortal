import axiosClient from "../../../shared/api/axiosClient";
import { API_ROUTES } from "../../../config/constants";
import type { LoginFormValues } from "../models/schemas/loginSchema";
import type { User } from "../../../shared/models/User";

export const login = async (
  dto: LoginFormValues,
  signal?: AbortSignal
): Promise<User> => {
  const response = await axiosClient.post<User>(
    API_ROUTES.ACCOUNT_LOGIN,
    { Email: dto.email, Password: dto.password },
    { signal }
  );
  return response.data;
};

export const logout = async (signal?: AbortSignal): Promise<void> => {
  await axiosClient.post(API_ROUTES.ACCOUNT_LOGOUT, null, { signal });
};

export const me = async (signal?: AbortSignal): Promise<User> => {
  const response = await axiosClient.get<User>(API_ROUTES.ACCOUNT_ME, {
    signal,
  });
  return response.data;
};
