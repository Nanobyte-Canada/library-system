import api from './api';
import type { Branch, ApiResponse } from '../types';

export const branchService = {
  async listBranches(): Promise<ApiResponse<Branch[]>> {
    const response = await api.get<ApiResponse<Branch[]>>('/branches');
    return response.data;
  },
};
