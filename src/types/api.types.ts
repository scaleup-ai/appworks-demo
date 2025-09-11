// Generated types based on OpenAPI spec
export interface XeroCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface XeroTokenSet {
  refresh_token: string;
  access_token?: string;
  expires_at?: string;
  scope?: string | string[];
}

export interface XeroTokenRequest {
  clientId: string;
  tenantId: string;
  tokenSet: XeroTokenSet;
}

export interface XeroTokenResponse {
  success?: boolean;
  error?: string;
}

export interface EmailDraftRequest {
  invoiceId: string;
  amount?: number;
  dueDate?: string;
  stage?: string;
  customerName?: string;
}

export interface EmailDraftResponse {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  mergeFields?: Record<string, string>;
}

export interface PaymentReconciliationRequest {
  paymentId: string;
  amount: number;
  reference?: string;
}

export interface PaymentReconciliationResponse {
  matched: boolean;
  invoiceId?: string;
}

export interface CollectionsReminderEvent {
  id: string;
  invoiceId: string;
  stage: string;
  scheduledAt: string;
  status: 'scheduled' | 'sent' | 'failed';
}

// API Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

// Error types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Saga action types
export interface SagaAction<T = any> {
  type: string;
  payload?: T;
}

export interface SagaActionWithCallback<T = any> extends SagaAction<T> {
  onSuccess?: (result: any) => void;
  onError?: (error: ApiError) => void;
}