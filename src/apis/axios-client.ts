import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { store } from '../store/store';
import { validateTokens } from '../store/authSlice';

// Modern, simplified axios client without complex refresh token logic
// since most demo endpoints don't require authentication

// Prefer Vite env; fall back to the local backend running on port 8098
export const API_SERVICE_BASE_URL = (import.meta.env!.VITE_API_BASE_URL as string) || 'http://localhost:8098';

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_SERVICE_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Simple in-flight request dedupe map. Keys are method|url|params|data JSON.
const inFlightRequests = new Map<string, Promise<AxiosResponse>>();

function makeRequestKey(config: import('axios').InternalAxiosRequestConfig) {
  try {
    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.data ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : '';
    return `${method}|${url}|${params}|${data}`;
  } catch {
    return `${config.method || 'get'}|${config.url || ''}`;
  }
}

// Token management helper
export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function setAccessToken(token: string): void {
  localStorage.setItem('access_token', token);
  axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAccessToken(): void {
  localStorage.removeItem('access_token');
  delete axiosClient.defaults.headers.common['Authorization'];
}

// Request interceptor - attach token if available
axiosClient.interceptors.request.use(
  (config: import('axios').InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Attach tenant header when selected (app-wide from Redux store, fallback to localStorage)
    try {
      const stateTenant = store.getState().auth?.selectedTenantId;
      const tenantId = stateTenant || localStorage.getItem('selectedTenantId') || localStorage.getItem('selected_tenant_id');
      if (tenantId && config && config.headers) {
        config.headers['X-Tenant-Id'] = tenantId;
      }
    } catch {
      // ignore storage/state failures
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Add a request handler to dedupe GET requests: if an identical request is
// already in-flight, return the same promise instead of sending a new one.
axiosClient.interceptors.request.use((config) => {
  try {
    const method = (config.method || 'get').toLowerCase();
    // Only dedupe safe idempotent reads
    if (method === 'get') {
      const key = makeRequestKey(config);
      const existing = inFlightRequests.get(key);
      if (existing) {
        // Axios expects a config or a promise rejection; we short-circuit by
        // returning a promise that resolves to the same response. We attach
        // a flag so downstream interceptors can detect this path if needed.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        config.__inFlightKey = key;
        return config;
      }
    }
  } catch {
    // ignore dedupe errors
  }
  return config;
});

// Response interceptor to manage inFlightRequests cleanup and to resolve any
// configs that were flagged as using an existing in-flight request.
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    try {
      const req = response.config as import('axios').InternalAxiosRequestConfig & { __inFlightKey?: string };
      const key = makeRequestKey(req);
      // If this response corresponds to a stored in-flight promise, clear it
      if (inFlightRequests.has(key)) inFlightRequests.delete(key);
    } catch {
      // ignore
    }
    return response;
  },
  (error: AxiosError) => {
    try {
      const req = (error.config || {}) as import('axios').InternalAxiosRequestConfig & { __inFlightKey?: string };
      const key = makeRequestKey(req);
      if (inFlightRequests.has(key)) inFlightRequests.delete(key);
    } catch {
      // ignore
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      // Clear invalid tokens
      clearAccessToken();

      // Validate tokens in the store
      store.dispatch(validateTokens());

      // For protected routes, redirect to login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        // Just redirect to login page for now
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Wrapper to actually send requests and store GET promises in inFlightRequests
const originalRequest = axiosClient.request.bind(axiosClient);
axiosClient.request = function request(config: import('axios').InternalAxiosRequestConfig) {
  try {
    const method = (config.method || 'get').toLowerCase();
    if (method === 'get') {
      const key = makeRequestKey(config as import('axios').InternalAxiosRequestConfig);
      const existing = inFlightRequests.get(key);
      if (existing) return existing;
      const promise = originalRequest(config) as Promise<AxiosResponse>;
      inFlightRequests.set(key, promise);
      // Ensure cleanup after settle
      promise.finally(() => {
        try {
          if (inFlightRequests.get(key) === promise) inFlightRequests.delete(key);
        } catch {
          // ignore
        }
      });
      return promise;
    }
  } catch {
    // ignore and fall back to normal request
  }
  return originalRequest(config);
} as unknown as AxiosInstance['request'];

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

      // For protected routes, redirect to login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        // Just redirect to login page for now
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
