import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

// Modern, simplified axios client without complex refresh token logic
// since most demo endpoints don't require authentication

// Prefer Vite env; fall back to the local backend running on port 8098
export const API_SERVICE_BASE_URL = ((import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) || 'http://localhost:8098';

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_SERVICE_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
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

      // TODO: If you want to trigger a Zustand state update on 401, add logic here using your Zustand store hooks.

      // For protected routes, redirect to login
      const currentPath = window.location.pathname;
      window.location.href = '/login';
      if (currentPath !== '/login' && currentPath !== '/') {
        // Use SPA navigation for internal login route
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
