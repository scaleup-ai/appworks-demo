import axiosClient from './axios-client';
import { EmailDraftRequest, EmailDraftResponse } from '../types/api.types';

// API route enums (defined in-file per repo convention)
export enum EmailApiRoutes {
  BASE = '/api/v1/email-copywriter',
  DRAFT = '/api/v1/email-copywriter/draft',
}

export async function generateEmailDraft(request: EmailDraftRequest): Promise<EmailDraftResponse> {
  const response = await axiosClient.post<EmailDraftResponse>(EmailApiRoutes.DRAFT, request);
  return response.data;
}

export default {
  generateEmailDraft,
};