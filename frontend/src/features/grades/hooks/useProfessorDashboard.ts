import { useState, useEffect } from 'react';
import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';
import type { ProfessorDashboardData, UseProfessorDashboardResult } from '../models/professorDashboard';
import {
  PROFESSOR_DASHBOARD_INITIAL_DATA,
  PROFESSOR_DASHBOARD_INITIAL_IS_LOADING,
  PROFESSOR_DASHBOARD_INITIAL_ERROR,
  PROFESSOR_DASHBOARD_INITIAL_REFRESH_KEY,
} from '../constants/constants';
import {
  AXIOS_CANCELED_ERROR_NAME,
  AXIOS_CANCELED_ERROR_CODE,
} from '../../../shared/constants/constants';

export function useProfessorDashboard(): UseProfessorDashboardResult {
  const [data, setData] = useState<ProfessorDashboardData | null>(PROFESSOR_DASHBOARD_INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(PROFESSOR_DASHBOARD_INITIAL_IS_LOADING);
  const [error, setError] = useState<string | null>(PROFESSOR_DASHBOARD_INITIAL_ERROR);
  const [refreshKey, setRefreshKey] = useState(PROFESSOR_DASHBOARD_INITIAL_REFRESH_KEY);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await axiosClient.get<ProfessorDashboardData>(
          API_ROUTES.PROFESSOR_ME_DASHBOARD,
          { signal: controller.signal }
        );
        setData(res.data);
      } catch (err: unknown) {
        const axiosErr = err as { name?: string; code?: string };
        if (
          axiosErr?.name === AXIOS_CANCELED_ERROR_NAME ||
          axiosErr?.code === AXIOS_CANCELED_ERROR_CODE
        ) {
          return;
        }
        setError('Failed to load dashboard data.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  return { data, isLoading, error, refresh };
}
