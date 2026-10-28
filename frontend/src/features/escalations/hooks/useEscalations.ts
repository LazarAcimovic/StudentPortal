import { useState, useEffect } from 'react';
import { getCases } from '../api/escalationService';
import type { EscalatedCase } from '../models/escalation';

export function useEscalations() {
  const [cases, setCases] = useState<EscalatedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCases() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getCases(controller.signal);

        setCases(data);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(loadError instanceof Error ? loadError : new Error('Failed to load cases.'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadCases();

    return () => controller.abort();
  }, []);

  return { cases, isLoading, error };
}
