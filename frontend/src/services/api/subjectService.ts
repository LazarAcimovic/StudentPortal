import apiClient from "./apiClient";
import type { Subject } from "../../models/SubjectModel";

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
