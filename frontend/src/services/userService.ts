import api from './api';
import type {
  UserResponse,
  UserCreateRequest,
  UserUpdateRequest,
  PasswordChangeRequest,
  UserSearchParams,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const userService = {
  async createUser(data: UserCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: UserUpdateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>(`/users/${id}`, data);
    return response.data;
  },

  async getUser(id: string): Promise<ApiResponse<UserResponse>> {
    const response = await api.get<ApiResponse<UserResponse>>(`/users/${id}`);
    return response.data;
  },

  async listUsers(page = 1, size = 20): Promise<PaginatedResponse<UserResponse>> {
    const response = await api.get<PaginatedResponse<UserResponse>>('/users', {
      params: { page, size },
    });
    return response.data;
  },

  async searchUsers(params: UserSearchParams): Promise<PaginatedResponse<UserResponse>> {
    const response = await api.get<PaginatedResponse<UserResponse>>('/users/search', {
      params,
    });
    return response.data;
  },

  async getProfile(): Promise<ApiResponse<UserResponse>> {
    const response = await api.get<ApiResponse<UserResponse>>('/users/me');
    return response.data;
  },

  async updateProfile(data: UserUpdateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>('/users/me', data);
    return response.data;
  },

  async changePassword(data: PasswordChangeRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>('/users/me/password', data);
    return response.data;
  },
};
