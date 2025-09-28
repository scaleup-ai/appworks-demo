import axiosClient from './axios-client';

export enum AuditApiRoutes {
  AUDIT = '/api/v1/audit',
}

export interface AuditEventDTO {
  id: string;
  session_id?: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at?: string;
}

export async function listRecentAuditEvents(params?: { limit?: number }): Promise<AuditEventDTO[]> {
  const response = await axiosClient.get(AuditApiRoutes.AUDIT, {
    params: { limit: params?.limit || 20 },
  });
  return response.data || [];
}

export default {
  listRecentAuditEvents,
};
