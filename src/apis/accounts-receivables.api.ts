import axiosClient from './axios-client';
import { CollectionsReminderEvent, EmailDraftRequest as SharedDraftReq, EmailDraftResponse as SharedDraftRes } from '../types/api.types';

export enum AccountsReceivablesApiRoutes {
  BASE = '/api/v1/accounts-receivables',
  INVOICES = '/api/v1/accounts-receivables/invoices',
  COLLECTIONS_SCAN = '/api/v1/accounts-receivables/collections/scan',
  COLLECTIONS_SCHEDULED = '/api/v1/accounts-receivables/collections/scheduled',
  DRAFT_EMAIL = '/api/v1/accounts-receivables/draft-email',
}

export interface InvoiceSummaryDTO {
  invoiceId: string;
  number: string;
  amount: number;
  dueDate?: string | null;
  status?: string | null;
  tenantId?: string;
  clientId?: string;
}

export async function listInvoices(params?: { tenantId?: string; limit?: number; raw?: boolean }): Promise<InvoiceSummaryDTO[]> {
  const response = await axiosClient.get(AccountsReceivablesApiRoutes.INVOICES, {
    params: {
      tenantId: params?.tenantId,
      limit: params?.limit,
      raw: params?.raw === true ? 'true' : undefined,
    }
  });
  return response.data;
}

export async function triggerCollectionsScan(): Promise<{ status: string }> {
  const response = await axiosClient.post(AccountsReceivablesApiRoutes.COLLECTIONS_SCAN);
  return response.data;
}

export async function listScheduledCollections(): Promise<CollectionsReminderEvent[]> {
  const response = await axiosClient.get(AccountsReceivablesApiRoutes.COLLECTIONS_SCHEDULED);
  return response.data;
}

export type DraftEmailRequest = SharedDraftReq;
export type DraftEmailResponse = SharedDraftRes;

export async function draftEmail(request: DraftEmailRequest): Promise<DraftEmailResponse> {
  const response = await axiosClient.post(AccountsReceivablesApiRoutes.DRAFT_EMAIL, request);
  return response.data;
}

export default {
  listInvoices,
  triggerCollectionsScan,
  listScheduledCollections,
  draftEmail,
};
