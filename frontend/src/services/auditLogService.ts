import api from './api';
import type { ApiResponse } from '../types';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
}

export const auditLogService = {
  async getAuditLogs(entityType?: string, limit: number = 100): Promise<ApiResponse<AuditLog[]>> {
    const response = await api.get<ApiResponse<AuditLog[]>>('/audit-logs', {
      params: { entityType, limit },
    });
    return response.data;
  },
};
