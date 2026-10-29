import axios from "axios";
import type { CreateUser, User, UpdateUser } from "../../../shared/models/User";
import apiClient from "../../../shared/api/axiosClient";
import { API_ROUTES } from "../../../config/constants";

// Field-keyed messages, PascalCase to match the create form field names and the
// ASP.NET ValidationProblemDetails `errors` map (Email, Password, …).
export type AddUserFieldErrors = Partial<Record<string, string>>;

export type AddUserResult =
  | { ok: true; user: User }
  | { ok: false; fieldErrors?: AddUserFieldErrors; message?: string };

export const getAllUsers = async (): Promise<User[] | null> => {
  try {
    const response = await apiClient.get<User[]>(API_ROUTES.USER);
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
};

export const addUser = async (
  userData: CreateUser
): Promise<AddUserResult> => {
  try {
    const response = await apiClient.post<User>(API_ROUTES.USER, userData);
    return { ok: true, user: response.data };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;

      // Duplicate email → 409 Conflict (body is a plain string message).
      if (status === 409) {
        const message =
          typeof data === "string" && data
            ? data
            : "A user with this email already exists.";
        return { ok: false, fieldErrors: { Email: message } };
      }

      // FluentValidation → 400 with a field-keyed `errors` map.
      if (
        status === 400 &&
        data &&
        typeof data === "object" &&
        "errors" in data
      ) {
        const errors = (data as { errors: Record<string, string[]> }).errors;
        const fieldErrors: AddUserFieldErrors = {};
        for (const [field, messages] of Object.entries(errors)) {
          if (messages?.length) fieldErrors[field] = messages[0];
        }
        return { ok: false, fieldErrors };
      }
    }

    console.error("Error creating user:", error);
    return { ok: false, message: "Failed to create user. Please try again." };
  }
};

export const updateUser = async (
  updatedUser: UpdateUser
): Promise<User | null> => {
  try {
    const dataToSend = {
      Id: updatedUser.Id,
      FirstName: updatedUser.FirstName,
      LastName: updatedUser.LastName,
      Email: updatedUser.Email,
      UserRole: updatedUser.UserRole,
      IsDeleted: updatedUser.IsDeleted,
    };
    const response = await apiClient.put<User>(
      `${API_ROUTES.USER}/${updatedUser.Id}`,
      dataToSend
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    return null;
  }
};

export const deleteUser = async (userId: number): Promise<boolean> => {
  try {
    await apiClient.delete(`${API_ROUTES.USER}/${userId}`);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
};
