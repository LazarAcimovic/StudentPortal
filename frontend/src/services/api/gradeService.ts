//import type { User } from "../../models/UserModel";
//import type { Subject } from "../../models/SubjectModel";
import type { Grade, CreateGrade, UpdateGrade } from "../../models/GradeModel";
import apiClient from "./apiClient";
import axios, { AxiosError } from "axios";

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
    console.error("Error fetching grades:", error);
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
    console.error("Error creating grade:", error);

    if (error instanceof AxiosError) {
      return new Error(error.response?.data || "Error creating grade.");
    }

    return new Error("Unknown error creating grade.");
  }
};

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
    console.error("Error updating grade:", error);

    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data || "Error updating grade.");
    }

    return new Error("Unknown error updating grade.");
  }
};

export const deleteGrade = async (
  gradeId: number
): Promise<boolean | Error> => {
  try {
    const response = await apiClient.delete(`/grade/${gradeId}`);
    return response.status === 204;
  } catch (error: unknown) {
    console.error("Error deleting grade:", error);

    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data || "Error deleting grade.");
    }

    return new Error("Unknown error deleting grade.");
  }
};

export const confirmGrade = async (gradeId: number): Promise<Grade | Error> => {
  try {
    const response = await apiClient.put<Grade>(`/grade/${gradeId}/confirm`);
    return response.data;
  } catch (error: unknown) {
    console.error("Error confirming grade:", error);

    if (axios.isAxiosError(error)) {
      return new Error(
        error.response?.data || "Error confirming grade."
      );
    }

    return new Error("Unknown error confirming grade.");
  }
};
