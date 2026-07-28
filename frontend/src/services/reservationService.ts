import api from './api';
import type { ApiResponse } from '../types';

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookName: string;
  branchId: string;
  branchName: string;
  status: 'PENDING' | 'READY' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED';
  queuePosition: number;
  reservedAt: string;
  notifiedAt: string | null;
  expiresAt: string | null;
}

export const reservationService = {
  async reserveBook(bookId: string, branchId: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/reservations', { bookId, branchId });
    return response.data;
  },
  async cancelReservation(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/reservations/${id}/cancel`);
    return response.data;
  },
  async getMyReservations(): Promise<ApiResponse<Reservation[]>> {
    const response = await api.get<ApiResponse<Reservation[]>>('/reservations/my');
    return response.data;
  },
  async getAllReservations(): Promise<ApiResponse<Reservation[]>> {
    const response = await api.get<ApiResponse<Reservation[]>>('/reservations');
    return response.data;
  },
  async markReady(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/reservations/${id}/ready`);
    return response.data;
  },
  async fulfillReservation(id: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/reservations/${id}/fulfill`);
    return response.data;
  },
};
