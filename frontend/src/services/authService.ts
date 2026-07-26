import api from './api';
import type { LoginRequest, LoginResponse, ApiResponse } from '@/types';

export const authService = {
  async login(data: LoginRequest): Promise<{ token: string; user: LoginResponse }> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    const authHeader = response.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || '';
    return { token, user: response.data.data };
  },

  async refreshToken(): Promise<string> {
    const response = await api.post<ApiResponse<{ token: string }>>('/auth/refresh');
    return response.data.data.token;
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
