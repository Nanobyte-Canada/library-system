import api from './api';
import type { ApiResponse } from '../types';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface BranchCreateRequest {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export const branchService = {
  async getAllBranches(): Promise<ApiResponse<Branch[]>> {
    const response = await api.get<ApiResponse<Branch[]>>('/branches');
    return response.data;
  },
  async getBranch(id: string): Promise<ApiResponse<Branch>> {
    const response = await api.get<ApiResponse<Branch>>(`/branches/${id}`);
    return response.data;
  },
  async createBranch(data: BranchCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/branches', data);
    return response.data;
  },
  async updateBranch(id: string, data: BranchCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>(`/branches/${id}`, data);
    return response.data;
  },
  async deleteBranch(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/branches/${id}`);
    return response.data;
  },
};
