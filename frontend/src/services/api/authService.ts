// src/services/api/authService.ts
import apiClient from "./apiClient";
import type { LoginRequest } from "../../models/LoginRequest";
import type { LoginResponse } from "../../models/LoginResponse";
import type { User } from "../../models/UserModel";
// import { RoleEnum } from "../../models/Enums";

// Funkcija za mapiranje DTO-a sa backenda na frontend model
const mapLoginResponseToUser = (response: LoginResponse): User => {
  console.log(response);
  // Budući da backend vraća LoginResponseDto, verovatno ima email, ulogu, itd.
  // U zavisnosti od toga šta backend vraća, prilagodi mapiranje
  return {
    id: response.id,
    firstName: response.firstName, // Ako backend vraća, mapiraj ovde
    lastName: response.lastName, // Ako backend vraća, mapiraj ovde
    indexNumber: response.indexNumber,
    email: response.email,
    userRole: response.userRole, // Moras da konvertujes u RoleEnum ako backend vraca broj
    isDeleted: false,
  };
};

export const login = async (Email: string, Password: string) => {
  try {
    const loginData: LoginRequest = { Email, Password };
    const response = await apiClient.post<LoginResponse>(
      "/User/Login",
      loginData,
      {
        headers: { Authorization: undefined },
      }
    );
    // console.log(response.data);

    if (response.status === 200 && response.data.accessToken) {
      const user = mapLoginResponseToUser(response.data);
      return { success: true, user, token: response.data.accessToken };
    }

    return { success: false, user: null, token: null };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, user: null, token: null };
  }
};
