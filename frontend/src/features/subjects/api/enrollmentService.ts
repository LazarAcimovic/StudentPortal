import apiClient from "../../../shared/api/axiosClient";
import type {
  Enrollment,
  CreateEnrollment,
} from "../models/enrollment";
import { API_ROUTES } from "../../../config/constants";

export const getAllEnrollments = async (): Promise<Enrollment[] | null> => {
  try {
    const response = await apiClient.get<Enrollment[]>(API_ROUTES.ENROLLMENT);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching enrollments:", error);
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
      API_ROUTES.ENROLLMENT,
      dataToSend
    );
    return response.data;
  } catch (error) {
    console.error("Error creating enrollment:", error);
    return null;
  }
};
