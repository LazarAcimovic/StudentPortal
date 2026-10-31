import axios from "axios";
import apiClient from "../../../shared/api/axiosClient";
import type {
  Enrollment,
  CreateEnrollment,
} from "../models/enrollment";
import type { PagedResult } from "../../../shared/models/pagedResult";
import { API_ROUTES } from "../../../config/constants";

export type CreateEnrollmentFieldErrors = Partial<Record<string, string>>;

export type CreateEnrollmentResult =
  | { ok: true; enrollment: Enrollment }
  | { ok: false; fieldErrors?: CreateEnrollmentFieldErrors; message?: string };

export const getAllEnrollments = async (
  page: number,
  pageSize: number
): Promise<PagedResult<Enrollment> | null> => {
  try {
    const response = await apiClient.get<PagedResult<Enrollment>>(API_ROUTES.ENROLLMENT, {
      params: { page, pageSize },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return null;
  }
};

export const createEnrollment = async (
  newEnrollment: CreateEnrollment
): Promise<CreateEnrollmentResult> => {
  try {
    const dataToSend = {
      studentId: newEnrollment.StudentId,
      subjectId: newEnrollment.SubjectId,
    };

    const response = await apiClient.post<Enrollment>(
      API_ROUTES.ENROLLMENT,
      dataToSend
    );
    return { ok: true, enrollment: response.data };
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
        const fieldErrors: CreateEnrollmentFieldErrors = {};
        for (const [field, messages] of Object.entries(errors)) {
          if (messages?.length) fieldErrors[field] = messages[0];
        }
        return { ok: false, fieldErrors };
      }

      // Domain failures (duplicate, inactive student/subject) carry a plain message.
      if (status === 400) {
        const message =
          typeof data === "string" && data
            ? data
            : "Enrollment could not be created. Please check the provided data.";
        return { ok: false, message };
      }
    }

    console.error("Error creating enrollment:", error);
    return {
      ok: false,
      message: "Failed to create enrollment. Please try again.",
    };
  }
};
