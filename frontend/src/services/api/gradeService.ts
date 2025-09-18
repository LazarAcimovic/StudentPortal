//import type { User } from "../../models/UserModel";
//import type { Subject } from "../../models/SubjectModel";
import type { Grade, CreateGrade, UpdateGrade } from "../../models/GradeModel";
import apiClient from "./apiClient";
import axios, { AxiosError } from "axios";

// Funkcija za dohvatanje ocena za specifičnog studenta i predmet
export const getGradesByStudentAndSubject = async (
  studentId: number,
  subjectId: number
): Promise<Grade[]> => {
  try {
    const response = await apiClient.get<Grade[]>(
      `/grade/student/${studentId}/subject/${subjectId}`
    );
    return response.data;
  } catch (error) {
    console.error("Greška pri dohvatanju ocena:", error);
    return [];
  }
};

export const createGrade = async (
  newGrade: CreateGrade
): Promise<Grade | Error> => {
  try {
    const response = await apiClient.post<Grade>("/grade", newGrade);
    return response.data;
  } catch (error: unknown) {
    console.error("Greška pri kreiranju ocene:", error);

    if (error instanceof AxiosError) {
      return new Error(error.response?.data || "Greška pri kreiranju ocene.");
    }

    return new Error("Nepoznata greška pri kreiranju ocene.");
  }
};

// Funkcija za ažuriranje postojeće ocene
export const updateGrade = async (
  gradeId: number,
  updatedData: UpdateGrade
): Promise<Grade | Error> => {
  try {
    const response = await apiClient.put<Grade>(
      `/grade/${gradeId}`,
      updatedData
    );
    return response.data;
  } catch (error: unknown) {
    console.error("Greška pri ažuriranju ocene:", error);

    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data || "Greška pri ažuriranju ocene.");
    }

    return new Error("Nepoznata greška pri ažuriranju ocene.");
  }
};

// Funkcija za brisanje ocene (logičko brisanje)
// Brisanje ocene
export const deleteGrade = async (
  gradeId: number
): Promise<boolean | Error> => {
  try {
    // Backend vraća 204 No Content, tako da provjeravamo status
    const response = await apiClient.delete(`/grade/${gradeId}`);
    return response.status === 204;
  } catch (error: unknown) {
    console.error("Greška pri brisanju ocene:", error);

    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data || "Greška pri brisanju ocene.");
    }

    return new Error("Nepoznata greška pri brisanju ocene.");
  }
};

// Funkcija za potvrđivanje ocene
export const confirmGrade = async (gradeId: number): Promise<Grade | Error> => {
  try {
    const response = await apiClient.put<Grade>(`/grade/${gradeId}/confirm`);
    return response.data;
  } catch (error: unknown) {
    console.error("Greška pri potvrđivanju ocene:", error);

    if (axios.isAxiosError(error)) {
      return new Error(
        error.response?.data || "Greška pri potvrđivanju ocene."
      );
    }

    return new Error("Nepoznata greška pri potvrđivanju ocene.");
  }
};
