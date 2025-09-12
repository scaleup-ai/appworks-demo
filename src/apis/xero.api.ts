import axiosClient from './axios-client'
import { API_SERVICE_BASE_URL } from './axios-client'
import { XeroTokenRequest, XeroTokenSet } from '../types/api.types'

// Define routes enum locally per requirement
export enum XeroApiRoutesLocal {
  BASE = '/api/v1/xero',
  CREDS = '/api/v1/xero/creds',
  AUTH = '/api/v1/xero/auth',
  OAUTH2_REDIRECT = '/api/v1/xero/oauth2/redirect',
  INTEGRATION = '/api/v1/xero/integration',
  TOKEN = '/api/v1/xero/token',
  TOKEN_BY_IDS = '/api/v1/xero/token/{clientId}/{tenantId}',
}

// Minimal Xero API client based on provided OpenAPI subset.
// This file provides small, typed helpers for the endpoints used by the app.

export interface SetCredsResponse {
  success?: boolean
  error?: string
}

export async function setXeroCreds(params: {
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<SetCredsResponse> {
  const resp = await axiosClient.get<SetCredsResponse>(XeroApiRoutesLocal.CREDS, {
    params,
    headers: { 'Content-Type': 'application/json' },
  })
  return resp.data
}

export interface StartAuthResponse {
  // For the redirect case, the library will receive a 302 with Location header.
  // We return the raw response so callers can inspect headers if necessary.
}

export async function startXeroAuth(): Promise<import('axios').AxiosResponse> {
  // This endpoint issues a 302 redirect. We don't follow redirects here; the browser
  // will normally handle it when hitting the backend directly. For programmatic use,
  // return the full axios response so the caller can look at headers.location.
  return axiosClient.get(XeroApiRoutesLocal.AUTH, { validateStatus: () => true })
}

export function getXeroAuthUrl(): string {
  const base = (API_SERVICE_BASE_URL || '').replace(/\/$/, '')
  return `${base}${XeroApiRoutesLocal.AUTH}`
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
    sessionStorage.setItem('xero_post_auth_redirect', path);
  } catch (err) {
    // ignore storage errors
  }
}

export function readAndClearPostAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem('xero_post_auth_redirect');
    if (v) sessionStorage.removeItem('xero_post_auth_redirect');
    return v;
  } catch (err) {
    return null;
  }
}

export async function handleOAuthRedirect(query: { code?: string; state?: string }) {
  const resp = await axiosClient.get(XeroApiRoutesLocal.OAUTH2_REDIRECT, { params: query, validateStatus: () => true })
  return resp
}

export async function getIntegrationStatus() {
  const resp = await axiosClient.get(XeroApiRoutesLocal.INTEGRATION, { validateStatus: () => true })
  return resp
}

export async function saveXeroToken(request: XeroTokenRequest): Promise<void> {
  const response = await axiosClient.post(XeroApiRoutesLocal.TOKEN, request);
  return response.data;
}

export async function getXeroToken(clientId: string, tenantId: string): Promise<XeroTokenSet> {
  const path = XeroApiRoutesLocal.TOKEN_BY_IDS.replace('{clientId}', encodeURIComponent(clientId)).replace('{tenantId}', encodeURIComponent(tenantId));
  const response = await axiosClient.get<XeroTokenSet>(path);
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
}
