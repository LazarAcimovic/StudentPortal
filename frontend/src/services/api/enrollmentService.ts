import apiClient from "./apiClient";
import type {
  Enrollment,
  CreateEnrollment,
} from "../../models/EnrollmentModel";

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

export const createEnrollment = async (
  newEnrollment: CreateEnrollment
): Promise<Enrollment | null> => {
  try {
    const dataToSend = {
      studentId: newEnrollment.StudentId,
      subjectId: newEnrollment.SubjectId,
    };

    const response = await apiClient.post<Enrollment>(
      `/enrollment`,
      dataToSend
    );
    return response.data;
  } catch (error) {
    console.error("Greška pri kreiranju upisa:", error);
    return null;
  }
};

// export const deleteEnrollment = async (
//   enrollmentId: number
// ): Promise<boolean> => {
//   try {
//     await apiClient.delete(`/enrollment/${enrollmentId}`);
//     return true;
//   } catch (error) {
//     console.error(`Greška pri brisanju upisa sa ID ${enrollmentId}:`, error);
//     return false;
//   }
// };
