import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';

export interface GradeDraftDto {
  midterm1Points: number | null;
  midterm2Points: number | null;
  attendancePoints: number | null;
  practicalPoints: number | null;
  examPoints: number | null;
}

export async function getDraft(enrollmentId: string, signal?: AbortSignal): Promise<GradeDraftDto | null> {
  try {
    const res = await axiosClient.get<GradeDraftDto>(`${API_ROUTES.GRADE_DRAFT}/${enrollmentId}`, { signal });
    return res.data;
  } catch (err: unknown) {
    if ((err as { response?: { status?: number } }).response?.status === 404) return null;
    throw err;
  }
}

export async function saveDraft(enrollmentId: string, dto: GradeDraftDto, signal?: AbortSignal): Promise<void> {
  await axiosClient.put(`${API_ROUTES.GRADE_DRAFT}/${enrollmentId}`, dto, { signal });
}
