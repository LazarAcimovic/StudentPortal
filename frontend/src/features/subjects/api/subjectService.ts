import axios from "axios";
import apiClient from "../../../shared/api/axiosClient";
import type {
  Subject,
  CreateSubject,
  UpdateSubject,
} from "../models/subject";
import { API_ROUTES } from "../../../config/constants";

// Field-keyed messages, PascalCase to match the create form field names and the
// ASP.NET ValidationProblemDetails `errors` map (SubjectName, SubjectCode, …).
export type CreateSubjectFieldErrors = Partial<Record<string, string>>;

export type CreateSubjectResult =
  | { ok: true; subject: Subject }
  | { ok: false; fieldErrors?: CreateSubjectFieldErrors; message?: string };

export type UpdateSubjectResult =
  | { ok: true; subject: Subject }
  | { ok: false; fieldErrors?: CreateSubjectFieldErrors; message?: string };

export const getAllSubjects = async (): Promise<Subject[] | null> => {
  try {
    const response = await apiClient.get<Subject[]>(API_ROUTES.SUBJECT);
    return response.data;
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return null;
  }
};

export const createSubject = async (
  newSubject: CreateSubject
): Promise<CreateSubjectResult> => {
  try {
    const dataToSend = {
      subjectName: newSubject.SubjectName,
      subjectCode: newSubject.SubjectCode,
      ects: newSubject.ECTS,
      professorId: newSubject.ProfessorId,
    };

    const response = await apiClient.post<Subject>(API_ROUTES.SUBJECT, dataToSend);
    return { ok: true, subject: response.data };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;

      // FluentValidation → 400 with a field-keyed `errors` map.
      if (
        status === 400 &&
        data &&
        typeof data === "object" &&
        "errors" in data
      ) {
        const errors = (data as { errors: Record<string, string[]> }).errors;
        const fieldErrors: CreateSubjectFieldErrors = {};
        for (const [field, messages] of Object.entries(errors)) {
          if (messages?.length) fieldErrors[field] = messages[0];
        }
        return { ok: false, fieldErrors };
      }

      // Other 400s (e.g. unknown or inactive professor) carry a plain message.
      if (status === 400) {
        const message =
          typeof data === "string" && data
            ? data
            : "Subject could not be created. Please check the provided data.";
        return { ok: false, message };
      }
    }

    console.error("Error creating subject:", error);
    return { ok: false, message: "Failed to create subject. Please try again." };
  }
};

export const updateSubject = async (
  updatedSubject: UpdateSubject
): Promise<UpdateSubjectResult> => {
  try {
    const dataToSend = {
      id: updatedSubject.Id,
      subjectName: updatedSubject.SubjectName,
      subjectCode: updatedSubject.SubjectCode,
      ects: updatedSubject.ECTS,
      professorId: updatedSubject.ProfessorId,
      isDeleted: updatedSubject.IsDeleted,
    };

    const response = await apiClient.put<Subject>(
      `${API_ROUTES.SUBJECT}/${updatedSubject.Id}`,
      dataToSend
    );
    return { ok: true, subject: response.data };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;

      if (
        status === 400 &&
        data &&
        typeof data === "object" &&
        "errors" in data
      ) {
        const errors = (data as { errors: Record<string, string[]> }).errors;
        const fieldErrors: CreateSubjectFieldErrors = {};
        for (const [field, messages] of Object.entries(errors)) {
          if (messages?.length) fieldErrors[field] = messages[0];
        }
        return { ok: false, fieldErrors };
      }

      // 400 (e.g. inactive professor) and 404 carry a plain string message.
      if (status === 400 || status === 404) {
        const message =
          typeof data === "string" && data
            ? data
            : "Subject could not be updated. Please check the provided data.";
        return { ok: false, message };
      }
    }

    console.error("Error updating subject:", error);
    return { ok: false, message: "Failed to update subject. Please try again." };
  }
};
