import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';
import type { SubmitAppealDto, AppealDto } from '../models/appealModal';
export type { SubmitAppealDto, AppealDto } from '../models/appealModal';

export async function submitAppeal(dto: SubmitAppealDto, signal?: AbortSignal): Promise<void> {
  await axiosClient.post(API_ROUTES.APPEAL, dto, { signal });
}

export async function acceptAppeal(appealId: string, signal?: AbortSignal): Promise<AppealDto> {
  const res = await axiosClient.post<AppealDto>(`${API_ROUTES.APPEAL}/${appealId}/accept`, {}, { signal });
  return res.data;
}

export async function denyAppeal(appealId: string, signal?: AbortSignal): Promise<AppealDto> {
  const res = await axiosClient.post<AppealDto>(`${API_ROUTES.APPEAL}/${appealId}/deny`, {}, { signal });
  return res.data;
}
