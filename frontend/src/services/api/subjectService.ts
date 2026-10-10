import apiClient from "./apiClient";
import type {
  Subject,
  CreateSubject,
  UpdateSubject,
} from "../../models/SubjectModel";

export const getAllSubjects = async (): Promise<Subject[] | null> => {
  try {
    const response = await apiClient.get<Subject[]>("/subject");
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
      ects: newSubject.ECTS,
      professorId: newSubject.ProfessorId,
    };

    const response = await apiClient.post<Subject>("/subject", dataToSend);
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
      ects: updatedSubject.ECTS,
      professorId: updatedSubject.ProfessorId,
      isDeleted: updatedSubject.IsDeleted,
    };

    const response = await apiClient.put<Subject>(
      `/subject/${updatedSubject.Id}`,
      dataToSend
    );
    return response.data;
  } catch (error) {
    console.error("Error updating subject:", error);
    return null;
  }
};
