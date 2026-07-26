import { create } from "zustand";

import { tokenManager } from "@/lib/token-manager";

import { authService } from "../services/auth.services";
import type {
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;

  loading: boolean;
  error: string | null;

  isAuthenticated: boolean;
  isInitializing: boolean;

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;

  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  loading: false,
  error: null,

  isAuthenticated: false,
  isInitializing: true,

  login: async (data) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const response = await authService.login(data);

      tokenManager.setToken(response.accessToken);

      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Login failed.",
      });

      throw error;
    }
  },

  register: async (data) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const response = await authService.register(data);

      tokenManager.setToken(response.accessToken);

      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Registration failed.",
      });

      throw error;
    }
  },

  logout: async () => {
    await authService.logout();

    tokenManager.clearToken();

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  initialize: async () => {
    try {
      const response = await authService.refresh();

      tokenManager.setToken(response.accessToken);

      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        isInitializing: false,
      });
    } catch {
      tokenManager.clearToken();

      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },

  clearError: () =>
    set({
      error: null,
    }),
}));