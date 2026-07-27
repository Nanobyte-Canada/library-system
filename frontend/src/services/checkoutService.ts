import api from './api';
import type {
  BookIssue,
  ApiResponse,
} from '../types';

export interface CheckoutRequest {
  userId: string;
  copyId: string;
}

export interface ReturnRequest {
  copyId: string;
}

export interface ScanCheckoutRequest {
  barcode: string;
}

export interface ScanReturnRequest {
  barcode: string;
}

export const checkoutService = {
  async checkout(data: CheckoutRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/checkout', data);
    return response.data;
  },

  async returnBook(data: ReturnRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/return', data);
    return response.data;
  },

  async scanCheckout(data: ScanCheckoutRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/checkout/scan', data);
    return response.data;
  },

  async scanReturn(data: ScanReturnRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/return/scan', data);
    return response.data;
  },

  async renewIssue(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/checkout/${id}/renew`);
    return response.data;
  },

  async getMyCheckouts(): Promise<ApiResponse<BookIssue[]>> {
    const response = await api.get<ApiResponse<BookIssue[]>>('/checkout/my');
    return response.data;
  },

  async getCheckoutHistory(): Promise<ApiResponse<BookIssue[]>> {
    const response = await api.get<ApiResponse<BookIssue[]>>('/checkout/history');
    return response.data;
  },
};
