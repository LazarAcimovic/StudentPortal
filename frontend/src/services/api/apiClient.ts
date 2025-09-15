import axios from "axios";
import { useAuthStore } from "../../store/authStore";

const apiClient = axios.create({
  baseURL: "https://localhost:7253/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor za dodavanje tokena u svaki zahtev
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
