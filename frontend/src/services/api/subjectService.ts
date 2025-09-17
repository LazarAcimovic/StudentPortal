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
    console.error("Greška pri dohvatanju predmeta:", error);
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
    console.error("Greška pri kreiranju predmeta:", error);
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

    // Šaljemo PUT zahtev sa ID-jem u URL-u i ažuriranim podacima
    const response = await apiClient.put<Subject>(
      `/subject/${updatedSubject.Id}`,
      dataToSend
    );
    return response.data;
  } catch (error) {
    console.error("Greška pri ažuriranju predmeta:", error);
    return null;
  }
};
