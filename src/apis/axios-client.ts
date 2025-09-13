import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { store } from '../store/store';
import { validateTokens } from '../store/authSlice';

// Modern, simplified axios client without complex refresh token logic
// since most demo endpoints don't require authentication

// Prefer Vite env; fall back to the local backend running on port 8098
export const API_SERVICE_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:8098';

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_SERVICE_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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
