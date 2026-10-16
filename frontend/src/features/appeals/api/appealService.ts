import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';

export interface SubmitAppealDto {
  enrollmentId: string;
  text: string;
}

export async function submitAppeal(dto: SubmitAppealDto, signal?: AbortSignal): Promise<void> {
  await axiosClient.post(API_ROUTES.APPEAL, dto, { signal });
}
