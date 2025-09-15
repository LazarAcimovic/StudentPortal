// src/services/api/authService.ts
import apiClient from "./apiClient";
import type { LoginRequest } from "../../models/LoginRequest";
import type { LoginResponse } from "../../models/LoginResponse";
import type { User } from "../../models/UserModel";
// import { RoleEnum } from "../../models/Enums";

// Funkcija za mapiranje DTO-a sa backenda na frontend model
const mapLoginResponseToUser = (response: LoginResponse): User => {
  // Ovde treba da se mapiraju podaci sa backenda u User model
  // Budući da backend vraća LoginResponseDto, verovatno ima email, ulogu, itd.
  // U zavisnosti od toga šta backend vraća, prilagodi mapiranje
  return {
    Id: 0, // Id se obično ne vraća pri loginu, ali ga možeš dodati ako backend podržava
    FirstName: "", // Ako backend vraća, mapiraj ovde
    LastName: "", // Ako backend vraća, mapiraj ovde
    Email: response.email,
    UserRole: response.UserRole, // Moras da konvertujes u RoleEnum ako backend vraca broj
    IsDeleted: false,
    IndexNumber: null,
  };
};

export const login = async (Email: string, Password: string) => {
  try {
    const loginData: LoginRequest = { Email, Password };
    const response = await apiClient.post<LoginResponse>(
      "/user/login",
      loginData,
      {
        // Uklonimo interceptor za ovaj zahtev, jer token još ne postoji
        headers: { Authorization: undefined },
      }
    );

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
