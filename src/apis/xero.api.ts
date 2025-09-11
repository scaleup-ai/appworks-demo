import axiosClient from './axios-client'
import { API_BASE_URL } from './axios-client'
import { XeroTokenRequest, XeroTokenSet } from '../types/api.types'

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
  const resp = await axiosClient.get<SetCredsResponse>('/api/v1/xero/creds', {
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
  return axiosClient.get('/api/v1/xero/auth', { validateStatus: () => true })
}

export function getXeroAuthUrl(): string {
  const base = (API_BASE_URL || '').replace(/\/$/, '')
  return `${base}/api/v1/xero/auth`
}

export async function handleOAuthRedirect(query: { code?: string; state?: string }) {
  const resp = await axiosClient.get('/api/v1/xero/oauth2/redirect', { params: query, validateStatus: () => true })
  return resp
}

export async function getIntegrationStatus() {
  const resp = await axiosClient.get('/api/v1/xero/integration', { validateStatus: () => true })
  return resp
}

export async function saveXeroToken(request: XeroTokenRequest): Promise<void> {
  const response = await axiosClient.post('/api/v1/xero/token', request);
  return response.data;
}

export async function getXeroToken(clientId: string, tenantId: string): Promise<XeroTokenSet> {
  const response = await axiosClient.get<XeroTokenSet>(`/api/v1/xero/token/${clientId}/${tenantId}`);
  return response.data;
}

export default {
  setXeroCreds,
  startXeroAuth,
  handleOAuthRedirect,
  getIntegrationStatus,
  getXeroAuthUrl,
  saveXeroToken,
  getXeroToken,
}
