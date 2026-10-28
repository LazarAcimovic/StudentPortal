import { useState, useCallback } from 'react';
import { getEligibleProfessors } from '../api/escalationService';
import type { EligibleProfessor } from '../models/escalation';

export function useEligibleProfessors() {
  const [professors, setProfessors] = useState<EligibleProfessor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadProfessors = useCallback(
    async (gradeId: string, signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getEligibleProfessors(gradeId, signal);

        if (!signal?.aborted) setProfessors(data);
      } catch (loadError) {
        if (signal?.aborted) return;

        setError(loadError instanceof Error ? loadError : new Error('Failed to load eligible professors.'));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    []
  );

  return { professors, isLoading, error, loadProfessors };
}
