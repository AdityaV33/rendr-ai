import { create } from "zustand";
import axios from "axios";

import { tokenManager } from "@/lib/token-manager";
import { toast } from "@/lib/toast";

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

      toast.success("Welcome back.");
    } catch (error) {
      const msg = axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : "Something went wrong. Please try again.";
      
      set({
        loading: false,
        error: msg,
      });

      toast.error(
        !axios.isAxiosError(error) 
          ? "Unable to reach server. Please try again." 
          : msg
      );

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

      toast.success("Account created successfully.");
    } catch (error) {
      const msg = axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : "Something went wrong. Please try again.";

      set({
        loading: false,
        error: msg,
      });

      toast.error(
        !axios.isAxiosError(error) 
          ? "Unable to reach server. Please try again." 
          : msg
      );

      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (e) {
      // ignore
    }

    tokenManager.clearToken();

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
    });

    toast.success("Signed out successfully.");
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