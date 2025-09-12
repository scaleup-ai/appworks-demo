import axiosClient from './axios-client';
import { EmailDraftRequest, EmailDraftResponse } from '../types/api.types';

// API route enums (defined in-file per repo convention)
export enum EmailApiRoutes {
  // NOTE: these endpoints were removed/renamed in the updated OpenAPI. Keep the
  // constants for historical reasons but surface an explicit error if called so
  // callers update to the Xero-backed flows.
  BASE = '/api/v1/email-copywriter',
  DRAFT = '/api/v1/email-copywriter/draft',
}

export async function generateEmailDraft(_: EmailDraftRequest): Promise<EmailDraftResponse> {
  throw new Error('generateEmailDraft: endpoint removed in OpenAPI update; use the Xero invoice/email flows instead')
}

export default {
  generateEmailDraft,
}