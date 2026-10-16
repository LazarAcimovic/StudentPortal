import axios from 'axios';
import { API_ROUTES } from '../../config/constants';
import { clearAuthSession } from '../../lib/auth';

let refreshPromise: Promise<void> | null = null;

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403) {
      clearAuthSession({ redirectToLogin: true });
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axiosClient
          .post(API_ROUTES.ACCOUNT_REFRESH)
          .then(() => {
            refreshPromise = null;
          })
          .catch((err) => {
            refreshPromise = null;
            clearAuthSession({ redirectToLogin: true });
            throw err;
          });
      }

      try {
        await refreshPromise;
        return axiosClient(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
