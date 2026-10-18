import { useState, useEffect } from 'react';
import axiosClient from '../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../config/constants';
import type { StudentDashboardData, UseStudentDashboardResult } from '../models/studentDashboard';
import {
  STUDENT_DASHBOARD_INITIAL_DATA,
  STUDENT_DASHBOARD_INITIAL_IS_LOADING,
  STUDENT_DASHBOARD_INITIAL_ERROR,
  STUDENT_DASHBOARD_INITIAL_REFRESH_KEY,
} from '../constants/student/constants';
import {
  AXIOS_CANCELED_ERROR_NAME,
  AXIOS_CANCELED_ERROR_CODE,
} from '../../../shared/constants/constants';

export function useStudentDashboard(): UseStudentDashboardResult {
  const [data, setData] = useState<StudentDashboardData | null>(STUDENT_DASHBOARD_INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(STUDENT_DASHBOARD_INITIAL_IS_LOADING);
  const [error, setError] = useState<string | null>(STUDENT_DASHBOARD_INITIAL_ERROR);
  const [refreshKey, setRefreshKey] = useState(STUDENT_DASHBOARD_INITIAL_REFRESH_KEY);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await axiosClient.get<StudentDashboardData>(
          API_ROUTES.STUDENT_ME_DASHBOARD,
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
