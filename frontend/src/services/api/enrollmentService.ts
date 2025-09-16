import apiClient from "./apiClient";
import type { Enrollment } from "../../models/EnrollmentModel";

export const getAllEnrollments = async (): Promise<Enrollment[] | null> => {
  try {
    const response = await apiClient.get<Enrollment[]>("/enrollment");
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Greška pri dohvatanju upisa:", error);
    return null;
  }
};
