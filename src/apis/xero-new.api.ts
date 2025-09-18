import axiosClient, { API_SERVICE_BASE_URL } from './axios-client';
import {
  XeroTokenRequest,
  ConsentUrlResponse,
  TokenMetadataResponse,
  IntegrationStatus,
} from '../types/api.types';

// Define routes enum locally
export enum XeroApiRoutes {
  BASE = '/api/v1/xero',
  CREDS = '/api/v1/xero/creds',
  AUTH = '/api/v1/xero/auth',
  OAUTH2_REDIRECT = '/api/v1/xero/oauth2/redirect',
  INTEGRATION = '/api/v1/xero/integration',
  INTEGRATION_STATUS = '/api/v1/xero/integration/status',
  TOKEN = '/api/v1/xero/token',
  TOKEN_BY_IDS = '/api/v1/xero/token/{clientId}/{tenantId}',
}

export interface SetCredsResponse {
  success?: boolean;
  error?: string;
}

export async function setXeroCreds(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<SetCredsResponse> {
  const resp = await axiosClient.get<SetCredsResponse>(XeroApiRoutes.CREDS, {
    params,
    headers: { 'Content-Type': 'application/json' },
  });
  return resp.data;
}

export async function startXeroAuth(mode: 'redirect' | 'json' = 'redirect') {
  if (mode === 'json') {
    const resp = await axiosClient.get<ConsentUrlResponse>(XeroApiRoutes.AUTH, {
      params: { mode: 'json' },
    });
    return resp.data;
  }

  return axiosClient.get(XeroApiRoutes.AUTH, { validateStatus: () => true });
}

export function getXeroAuthUrl(): string {
  const base = (API_SERVICE_BASE_URL || '').replace(/\/$/, '');
  return `${base}${XeroApiRoutes.AUTH}`;
}

export function capturePostAuthRedirect(redirectPath?: string) {
  try {
    const path =
      redirectPath ??
      (typeof window !== 'undefined'
        ? window.location.pathname + window.location.search + window.location.hash
        : '/');
  // Do not store the OAuth callback itself or any URL containing an auth code
  const callbackIndicator = '/oauth2/redirect';
  if (String(path).includes(callbackIndicator) || String(path).includes('?code=')) return;
  sessionStorage.setItem('xero_post_auth_redirect', path);
  } catch {
    // ignore storage errors
  }
}

export function readAndClearPostAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem('xero_post_auth_redirect');
    if (v) sessionStorage.removeItem('xero_post_auth_redirect');
    return v;
  } catch {
    return null;
  }
}

export async function handleOAuthRedirect(query: { code?: string; state?: string }) {
  // Backend expects GET request with query parameters, not POST
  const resp = await axiosClient.get(XeroApiRoutes.OAUTH2_REDIRECT, {
    params: query,
    validateStatus: () => true
  });
  return resp;
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const resp = await axiosClient.get<IntegrationStatus>(XeroApiRoutes.INTEGRATION_STATUS, {
    validateStatus: () => true
  });
  return resp.data;
}

export async function saveXeroToken(request: XeroTokenRequest): Promise<void> {
  await axiosClient.post(XeroApiRoutes.TOKEN, request);
}

export async function getXeroToken(clientId: string, tenantId: string): Promise<TokenMetadataResponse> {
  const path = XeroApiRoutes.TOKEN_BY_IDS
    .replace('{clientId}', encodeURIComponent(clientId))
    .replace('{tenantId}', encodeURIComponent(tenantId));
  const response = await axiosClient.get<TokenMetadataResponse>(path);
  return response.data;
}

export default {
  setXeroCreds,
  startXeroAuth,
  handleOAuthRedirect,
  getIntegrationStatus,
  getXeroAuthUrl,
  capturePostAuthRedirect,
  readAndClearPostAuthRedirect,
  saveXeroToken,
  getXeroToken,
};
