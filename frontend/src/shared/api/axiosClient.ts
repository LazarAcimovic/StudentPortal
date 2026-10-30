import axios from "axios";
import { API_ROUTES } from "../../config/constants";
import { clearAuthSession } from "../../lib/auth";

let refreshPromise: Promise<void> | null = null;

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url ?? "";
    const authEndpoint =
      url.includes(API_ROUTES.ACCOUNT_LOGIN) ||
      url.includes(API_ROUTES.ACCOUNT_REFRESH);

      if(authEndpoint) {
        return Promise.reject(error);
      }

    // A 403 means the caller is authenticated but not authorized for THIS
    // resource (wrong role). It is NOT an authentication failure, so the
    // session must stay intact — surface the error to the caller (per D-029).
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
  },
);

export default axiosClient;
