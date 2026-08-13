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
let isRedirectingToLogin = false;

const triggerAuthRedirect = (error: unknown) => {
  tokenManager.clearToken();

  if (
    !window.location.pathname.includes("/login") &&
    !window.location.pathname.includes("/register")
  ) {
    if (!isRedirectingToLogin) {
      isRedirectingToLogin = true;
      import("@/lib/toast").then(({ toast }) => {
        toast.error("Session expired.");
      });

      window.location.replace("/login");
    }

    // We reject the promise properly here so that the original caller
    // receives the 401 error. 
    // All stores have been updated to throw on 401 rather than setting global
    // error state, preventing the UI from showing raw errors.
    // Throwing the error also allows polling loops (like in BuilderPage) to catch it
    // and correctly call clearInterval().
    return Promise.reject(error);
  }

  return Promise.reject(error);
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Handle 401s
    if (error.response?.status === 401) {
      // If we already retried and it still failed, redirect to login
      if (originalRequest._retry) {
        return triggerAuthRedirect(error);
      }
    } else {
      // Not a 401, reject normally
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
      return triggerAuthRedirect(refreshError);
    }
  },
);

export default api;