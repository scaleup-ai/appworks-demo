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
  // Support both shapes: server may return an array directly or a wrapper { ok, count, events }
  const data = response.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as AuditEventDTO[];
  if (data.events && Array.isArray(data.events)) return data.events as AuditEventDTO[];
  // Fallback: if server returned { ok: true, count: N } but no events, return empty
  return [];
}

export default {
  listRecentAuditEvents,
};
