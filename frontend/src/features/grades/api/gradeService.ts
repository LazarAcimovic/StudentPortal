import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';
import type { GradeDto, ProfessorConfirmGradeDto, StudentConfirmGradeDto } from '../models/grade';

export type { GradeDto, ProfessorConfirmGradeDto, StudentConfirmGradeDto };

export async function getGradeByEnrollment(enrollmentId: string, signal?: AbortSignal): Promise<GradeDto | null> {
  try {
    const res = await axiosClient.get<GradeDto>(
      `${API_ROUTES.GRADE_BY_ENROLLMENT}/${enrollmentId}`,
      { signal }
    );
    return res.data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function studentConfirmGrade(dto: StudentConfirmGradeDto, signal?: AbortSignal): Promise<void> {
  await axiosClient.post(API_ROUTES.GRADE_STUDENT_CONFIRM, dto, { signal });
}

export async function professorConfirmGrade(dto: ProfessorConfirmGradeDto, signal?: AbortSignal): Promise<void> {
  await axiosClient.post(API_ROUTES.GRADE_CONFIRM, dto, { signal });
}
