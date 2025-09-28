import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { store } from '../store/store';
import { validateTokens, AuthStorage } from '../store/slices/auth.slice';

// Modern, simplified axios client without complex refresh token logic
// since most demo endpoints don't require authentication

// Prefer Vite env; fall back to the local backend running on port 8098
export const API_SERVICE_BASE_URL = ((import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) || 'http://localhost:8098';

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_SERVICE_BASE_URL,
  timeout: 10000,
  // Ensure browser sends cookies (httpOnly cookies set by the API) with requests
  // so server-side plugins can validate remember tokens and set request headers.
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Also set default on the instance to be defensive for code that mutates config
axiosClient.defaults.withCredentials = true;

// If an OpenID subject was persisted earlier, set it as a default header so
// early requests (before interceptor runs) are scoped correctly.
try {
  const persisted = AuthStorage.getSelectedOpenIdSub ? AuthStorage.getSelectedOpenIdSub() : AuthStorage.getSelectedTenantId();
  if (persisted) {
    axiosClient.defaults.headers.common['X-Openid-Sub'] = String(persisted);
  }
} catch {
  // ignore
}

// Token management helper (delegates to AuthStorage)
export function getAccessToken(): string | null {
  return AuthStorage.getAccessToken();
}

export function setAccessToken(token: string): void {
  AuthStorage.setAccessToken(token);
  axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAccessToken(): void {
  AuthStorage.clearAccessToken();
  delete axiosClient.defaults.headers.common['Authorization'];
}

// Request interceptor - attach token if available
axiosClient.interceptors.request.use(
  (config: import('axios').InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Attach current selected tenant / OpenID subject so backend can scope requests
    try {
      // Prefer a persisted selection in localStorage (AuthStorage) first so
      // requests sent immediately after a page load have a scoped header.
      // Fall back to Redux (`xero.currentOpenIdSub`) if available.
      // Use a looser `any` here to avoid duplicate import lint rules for types in this utility file.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = store.getState() as any;
      const openidSub = AuthStorage.getSelectedTenantId() || (state && state.xero && state.xero.currentOpenIdSub);
      if (openidSub && config && config.headers) {
        config.headers['X-Openid-Sub'] = String(openidSub);
      }
    } catch {
      // ignore storage failures
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response interceptor - handle auth errors
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Clear invalid tokens
      clearAccessToken();

      // Validate tokens in the store
      store.dispatch(validateTokens());

      // Let the app-level auth logic handle navigation; do not force redirects here.
      // This keeps auth navigation consistent (Redux is the single source of truth).
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
