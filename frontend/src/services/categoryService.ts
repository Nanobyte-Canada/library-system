import api from './api';
import type { Category, CategoryCreateRequest, ApiResponse } from '../types';

export const categoryService = {
  async createCategory(data: CategoryCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/categories', data);
    return response.data;
  },

  async listCategories(): Promise<ApiResponse<Category[]>> {
    const response = await api.get<ApiResponse<Category[]>>('/categories');
    return response.data;
  },

  async getCategory(id: string): Promise<ApiResponse<Category>> {
    const response = await api.get<ApiResponse<Category>>(`/categories/${id}`);
    return response.data;
  },
};
