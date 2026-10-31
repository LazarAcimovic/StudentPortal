import { useState, useCallback } from 'react';
import type { ProfessorStudentRow } from '../../user/models/professor/professorDashboard';
import { getPagedStudents } from '../api/professorStudentsService';

const PAGE_SIZE_OPTIONS = [5, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 5;

export interface UseProfessorStudentsResult {
  items: ProfessorStudentRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  isLoading: boolean;
  error: string | null;
  loadPage: (subjectId: string, page: number, pageSize: number, signal?: AbortSignal) => Promise<void>;
}

export function useProfessorStudents(): UseProfessorStudentsResult {
  const [items, setItems] = useState<ProfessorStudentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (
    subjectId: string,
    requestedPage: number,
    requestedPageSize: number,
    signal?: AbortSignal
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getPagedStudents(subjectId, requestedPage, requestedPageSize, signal);

      if (!signal?.aborted) {
        setItems(result.items);
        setTotalCount(result.totalCount);
        setPage(result.page);
        setPageSize(result.pageSize);
      }
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : 'Failed to load students.');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  return { items, totalCount, page, pageSize, pageSizeOptions: PAGE_SIZE_OPTIONS, isLoading, error, loadPage };
}
