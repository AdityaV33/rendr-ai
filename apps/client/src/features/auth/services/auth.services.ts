import api from "@/lib/axios";

import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/auth";

const login = async (
  data: LoginRequest,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>(
    "/auth/login",
    data,
  );

  return response.data;
};

const register = async (
  data: RegisterRequest,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>(
    "/auth/register",
    data,
  );

  return response.data;
};

const logout = async (): Promise<void> => {
  await api.post("/auth/logout");
};

const me = async (): Promise<User> => {
  const response = await api.get<User>("/auth/me");

  return response.data;
};

const refresh = async (): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>(
    "/auth/refresh",
  );

  return response.data;
};

export const authService = {
  login,
  register,
  logout,
  me,
  refresh,
};