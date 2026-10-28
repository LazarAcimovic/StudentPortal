import apiClient from "../../../shared/api/axiosClient";
import type {
  Subject,
  CreateSubject,
  UpdateSubject,
} from "../../../models/SubjectModel";
import { API_ROUTES } from "../../../config/constants";

export const getAllSubjects = async (): Promise<Subject[] | null> => {
  try {
    const response = await apiClient.get<Subject[]>(API_ROUTES.SUBJECT);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return null;
  }
};

export const createSubject = async (
  newSubject: CreateSubject
): Promise<Subject | null> => {
  try {
    const dataToSend = {
      subjectName: newSubject.SubjectName,
      subjectCode: newSubject.SubjectCode,
      ects: newSubject.ECTS,
      professorId: newSubject.ProfessorId,
    };

    const response = await apiClient.post<Subject>(API_ROUTES.SUBJECT, dataToSend);
    return response.data;
  } catch (error) {
    console.error("Error creating subject:", error);
    return null;
  }
};

export const updateSubject = async (
  updatedSubject: UpdateSubject
): Promise<Subject | null> => {
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
    return response.data;
  } catch (error) {
    console.error("Error updating subject:", error);
    return null;
  }
};
