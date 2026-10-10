import type { CreateUser, User, UpdateUser } from "../../models/UserModel";
import { MOCK_STUDENTS } from "../data/studentMock";
import { RoleEnum } from "../../models/Enums";
import apiClient from "./apiClient";

export const getAllUsers = async (): Promise<User[] | null> => {
  try {
    const response = await apiClient.get<User[]>("/user");
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
};

// Funkcija za kreiranje novog korisnika na backendu
export const addUser = async (userData: CreateUser): Promise<User | null> => {
  try {
    const response = await apiClient.post<User>("/user", userData);
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
      `/user/${updatedUser.Id}`,
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
    await apiClient.delete(`/user/${userId}`);
    return true; 
  } catch (error) {
    console.error("Error deleting user:", error);
    return false; 
  }
};

export const createStudent = (newUser: CreateUser): User | Error => {
  const existingUser = MOCK_STUDENTS.find((u) => u.Email === newUser.Email);
  if (existingUser) {
    return new Error("A user with that email already exists.");
  }

  const newUserId =
    MOCK_STUDENTS.length > 0
      ? Math.max(...MOCK_STUDENTS.map((u) => u.Id)) + 1
      : 1;

  const student: User = {
    Id: newUserId,
    FirstName: newUser.FirstName,
    LastName: newUser.LastName,
    Email: newUser.Email,
    UserPassword: newUser.UserPassword,
    IndexNumber: newUser.IndexNumber,
    UserRole: RoleEnum.Student,
    IsDeleted: false,
    CreatedAt: new Date(),
  };

  // const student1: User ={
  //   ...newUser,
  //   Id: newUserId,
  //   IsDeleted: false,
  //   CreatedAt: new Date(),
  // }

  MOCK_STUDENTS.push(student); // Dodajemo novog studenta u mock niz

  return student;
};
