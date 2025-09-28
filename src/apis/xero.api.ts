import axiosClient, { API_SERVICE_BASE_URL } from './axios-client';
import { AuthStorage } from '../store/slices/auth.slice';
import {
  XeroTokenRequest,
  ConsentUrlResponse,
  TokenMetadataResponse,
  IntegrationStatus,
} from '../types/api.types';

// Define routes enum locally per requirement
export enum XeroApiRoutesLocal {
  BASE = '/api/v1/xero',
  CREDS = '/api/v1/xero/creds',
  AUTH = '/api/v1/xero/auth',
  OAUTH2_REDIRECT = '/api/v1/xero/oauth2/redirect',
  INTEGRATION = '/api/v1/xero/integration',
  INTEGRATION_STATUS = '/api/v1/xero/integration/status',
  TOKEN = '/api/v1/xero/token',
  TOKEN_BY_IDS = '/api/v1/xero/token/{clientId}/{tenantId}',
  LOGOUT = '/api/v1/xero/logout',
}

// Minimal Xero API client based on provided OpenAPI subset.
// This file provides small, typed helpers for the endpoints used by the app.

// Response for auth redirect - currently not used but kept for API compatibility  
export interface StartAuthResponse {
  url?: string;
}

export async function startXeroAuth(mode: 'redirect' | 'json' = 'redirect', opts?: { remember?: boolean }) {
  // If caller wants the JSON variant (SPA-managed flow), request mode=json and
  // return the typed ConsentUrlResponse. Otherwise return the raw axios response
  // so callers can inspect the Location header for a server-side redirect.
  if (mode === 'json') {
    // Use fetch with credentials included so server-set cookies (remember_token)
    // are accepted by the browser without changing axios global settings.
    const base = (API_SERVICE_BASE_URL || '').replace(/\/$/, '');
    const url = `${base}${XeroApiRoutesLocal.AUTH}?mode=json`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    try {
      if (opts && opts.remember) headers['X-Remember-Me'] = '1';
    } catch {
      // ignore
    }
    try {
      const selected = AuthStorage && typeof AuthStorage.getSelectedTenantId === 'function' ? AuthStorage.getSelectedTenantId() : null;
      if (selected) headers['X-Openid-Sub'] = String(selected);
    } catch {
      // ignore
    }
    const resp = await fetch(url, { method: 'GET', credentials: 'include', headers });
    if (!resp.ok) throw new Error(`startXeroAuth json failed: ${resp.status}`);
    const data = (await resp.json()) as ConsentUrlResponse;
    return data;
  }

  return axiosClient.get(XeroApiRoutesLocal.AUTH, { validateStatus: () => true });
}

export function getXeroAuthUrl(): string {
  const base = (API_SERVICE_BASE_URL || '').replace(/\/$/, '');
  return `${base}${XeroApiRoutesLocal.AUTH}`;
}

export async function setXeroCreds(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ success?: boolean; error?: string } | undefined> {
  // Expose the admin/ops endpoint for setting creds when needed (kept minimal).
  try {
    const resp = await axiosClient.get<{ success?: boolean; error?: string }>(XeroApiRoutesLocal.CREDS, {
      params,
      headers: { 'Content-Type': 'application/json' },
    });
    return resp.data;
  } catch {
    // bubble up minimal information; callers can catch if needed
    return undefined;
  }
}

// Store the intended post-auth redirect path in sessionStorage so the app
// can return the user to the page they were trying to access.
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
  // Fixed: Backend expects GET request with query parameters, not POST
  const resp = await axiosClient.get(XeroApiRoutesLocal.OAUTH2_REDIRECT, {
    params: query,
    validateStatus: () => true
  });
  return resp;
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const resp = await axiosClient.get<IntegrationStatus>(XeroApiRoutesLocal.INTEGRATION_STATUS, { validateStatus: () => true });
  return resp.data;
}

export async function saveXeroToken(request: XeroTokenRequest): Promise<void> {
  // OpenAPI specifies 204 on success. Return void and let callers catch errors.
  await axiosClient.post(XeroApiRoutesLocal.TOKEN, request);
}

export async function getXeroToken(clientId: string, tenantId: string): Promise<TokenMetadataResponse> {
  const path = XeroApiRoutesLocal.TOKEN_BY_IDS.replace('{clientId}', encodeURIComponent(clientId)).replace('{tenantId}', encodeURIComponent(tenantId));
  const response = await axiosClient.get<TokenMetadataResponse>(path);
  return response.data;
}

export async function logoutXero(): Promise<boolean> {
  const resp = await axiosClient.post(XeroApiRoutesLocal.LOGOUT, undefined, { validateStatus: () => true });
  return resp.status === 204;
}

export default {
  // setXeroCreds, // DEPRECATED: insecure
  startXeroAuth,
  handleOAuthRedirect,
  getIntegrationStatus,
  getXeroAuthUrl,
  capturePostAuthRedirect,
  readAndClearPostAuthRedirect,
  saveXeroToken,
  getXeroToken,
  logoutXero,
};
