import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { store } from '../store/store';
import { validateTokens, AuthStorage, logout, setServerAvailable } from '../store/slices/auth.slice';

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
// early requests (before interceptor runs) are scoped correctly. Do NOT
// fall back to the tenant id here — tenant ids are not the same as an
// OpenID subject and can cause incorrect scoping/401s.
try {
  const persistedOpenId = (typeof AuthStorage.getSelectedOpenIdSub === 'function' ? AuthStorage.getSelectedOpenIdSub() : null);
  if (persistedOpenId) {
    axiosClient.defaults.headers.common['X-Openid-Sub'] = String(persistedOpenId);
  }
} catch {
  // ignore storage failures
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
      // Prefer a persisted OpenID subject in localStorage (AuthStorage) first
      // so requests sent immediately after a page load have a scoped header.
      // Fall back to Redux (`xero.currentOpenIdSub`) only. Do NOT fall back to
      // the tenant id here — that's a different concept and was causing
      // incorrect header values to be sent.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = store.getState() as any;
      const persisted = (typeof AuthStorage.getSelectedOpenIdSub === 'function' ? AuthStorage.getSelectedOpenIdSub() : null) || null;
      const openidSub = persisted || (state && state.xero && state.xero.currentOpenIdSub) || null;
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
  (response: AxiosResponse) => {
    // Mark server available on successful responses
    try { store.dispatch(setServerAvailable(true)); } catch { /* ignore */ }
    return response;
  },
  (error: AxiosError) => {
    // Network or server errors (5xx) should mark server as unavailable and
    // clear local auth so the frontend doesn't continue showing dashboard UI
    // when the backend is unreachable after a restart.
    const status = error.response?.status;
    const isServerError = !status || (status >= 500 && status < 600);

    if (isServerError) {
      try {
        store.dispatch(setServerAvailable(false));
        // Force a logout so UI won't assume authenticated session while
        // backend is down. This is safer than keeping stale UI that will
        // surface many failing API calls.
        store.dispatch(logout());
      } catch {
        // ignore dispatch errors
      }
    }

    // Handle authentication errors (401) separately
    if (status === 401) {
      // Clear invalid tokens
      clearAccessToken();

      // Validate tokens in the store (causes loading=false and unauth state)
      store.dispatch(validateTokens());
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
