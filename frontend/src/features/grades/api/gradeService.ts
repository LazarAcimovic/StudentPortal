import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';

export interface StudentConfirmGradeDto {
  enrollmentId: string;
}

export async function studentConfirmGrade(dto: StudentConfirmGradeDto, signal?: AbortSignal): Promise<void> {
  await axiosClient.post(API_ROUTES.GRADE_STUDENT_CONFIRM, dto, { signal });
}

export interface ProfessorConfirmGradeDto {
  enrollmentId: string;
}

export async function professorConfirmGrade(dto: ProfessorConfirmGradeDto, signal?: AbortSignal): Promise<void> {
  await axiosClient.post(API_ROUTES.GRADE_CONFIRM, dto, { signal });
}
