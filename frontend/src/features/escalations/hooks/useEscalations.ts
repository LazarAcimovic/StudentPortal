import { useState, useEffect } from 'react';
import { getCases } from '../api/escalationService';
import type { EscalatedCase } from '../models/escalation';

export function useEscalations(page: number, pageSize: number) {
  const [cases, setCases] = useState<EscalatedCase[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCases() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getCases(page, pageSize, controller.signal);

        setCases(data.items);
        setTotalCount(data.totalCount);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(loadError instanceof Error ? loadError : new Error('Failed to load cases.'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadCases();

    return () => controller.abort();
  }, [page, pageSize]);

  return { cases, totalCount, isLoading, error };
}
