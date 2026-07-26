import axios from "axios";

import { tokenManager } from "@/lib/token-manager";

const api = axios.create({
  baseURL: "http://localhost:3000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = tokenManager.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!isRefreshing) {
        isRefreshing = true;

        refreshPromise = axios
          .post(
            "http://localhost:3000/api/v1/auth/refresh",
            {},
            {
              withCredentials: true,
            },
          )
          .then((response) => {
            tokenManager.setToken(response.data.accessToken);
          })
          .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
      }

      await refreshPromise;

      const token = tokenManager.getToken();

      if (token) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      tokenManager.clearToken();

      return Promise.reject(refreshError);
    }
  },
);

export default api;