import type { CreateUser, User, UpdateUser } from "../../../models/UserModel";
import apiClient from "../../../shared/api/axiosClient";
import { API_ROUTES } from "../../../config/constants";

export const getAllUsers = async (): Promise<User[] | null> => {
  try {
    const response = await apiClient.get<User[]>(API_ROUTES.USER);
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
};

export const addUser = async (userData: CreateUser): Promise<User | null> => {
  try {
    const response = await apiClient.post<User>(API_ROUTES.USER, userData);
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
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
