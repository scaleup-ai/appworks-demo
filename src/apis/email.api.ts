import axiosClient from './axios-client';
import { EmailDraftRequest, EmailDraftResponse } from '../types/api.types';

export async function generateEmailDraft(request: EmailDraftRequest): Promise<EmailDraftResponse> {
  const response = await axiosClient.post<EmailDraftResponse>('/api/v1/email/draft', request);
  return response.data;
}

export default {
  generateEmailDraft,
};