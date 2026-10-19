import axiosClient from "../../../shared/api/axiosClient";
import { API_ROUTES } from "../../../config/constants";
import type { User } from "../../../shared/models/User";
import type { UpdateProfileFormValues, ChangePasswordFormValues } from "../utils/profileSchemas";

export const getMe = async (signal?: AbortSignal): Promise<User> => {
  const response = await axiosClient.get<User>(API_ROUTES.ACCOUNT_ME, {
    signal,
  });
  return response.data;
};

export const updateProfile = async (
  dto: UpdateProfileFormValues,
  signal?: AbortSignal
): Promise<User> => {
  const payload: Record<string, string> = {
    FirstName: dto.firstName,
    LastName: dto.lastName,
  };
  if (dto.email !== undefined) payload.Email = dto.email;

  const response = await axiosClient.put<User>(
    API_ROUTES.ACCOUNT_PROFILE,
    payload,
    { signal }
  );
  return response.data;
};

export const changePassword = async (
  dto: Pick<ChangePasswordFormValues, 'currentPassword' | 'newPassword'>,
  signal?: AbortSignal
): Promise<void> => {
  await axiosClient.post(
    API_ROUTES.ACCOUNT_CHANGE_PASSWORD,
    { CurrentPassword: dto.currentPassword, NewPassword: dto.newPassword },
    { signal }
  );
};
