import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';
import type { EscalatedCase, EligibleProfessor } from '../models/escalation';

export async function getCases(signal?: AbortSignal): Promise<EscalatedCase[]> {
  try {
    const res = await axiosClient.get<EscalatedCase[]>(API_ROUTES.ESCALATION, { signal });
    return res.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to load escalation cases.');
  }
}

export async function getEligibleProfessors(
  gradeId: string,
  signal?: AbortSignal
): Promise<EligibleProfessor[]> {
  try {
    const res = await axiosClient.get<EligibleProfessor[]>(API_ROUTES.ESCALATION_ELIGIBLE_PROFESSORS, {
      params: { gradeId },
      signal,
    });
    return res.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to load eligible professors.');
  }
}

export async function assign(
  gradeId: string,
  assignedProfessorId: string,
  signal?: AbortSignal
): Promise<EscalatedCase> {
  try {
    const res = await axiosClient.post<EscalatedCase>(
      API_ROUTES.ESCALATION_ASSIGN,
      { gradeId, assignedProfessorId },
      { signal }
    );
    return res.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to assign professor.');
  }
}

export async function reassign(
  gradeId: string,
  newProfessorId: string,
  signal?: AbortSignal
): Promise<EscalatedCase> {
  try {
    const res = await axiosClient.post<EscalatedCase>(
      API_ROUTES.ESCALATION_REASSIGN,
      { gradeId, newProfessorId },
      { signal }
    );
    return res.data;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Failed to reassign professor.');
  }
}
