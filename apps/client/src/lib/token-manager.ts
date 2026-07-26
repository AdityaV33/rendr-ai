let accessToken: string | null = null;

export const tokenManager = {
  getToken: (): string | null => accessToken,

  setToken: (token: string | null): void => {
    accessToken = token;
  },

  clearToken: (): void => {
    accessToken = null;
  },
};