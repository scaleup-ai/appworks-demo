import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../store/store';
import { logout } from '../store/authSlice';

// Assumptions:
// - API base URL is provided via Vite env: import.meta.env.VITE_API_BASE_URL
// - Access token and refresh token are stored in localStorage under keys
//   'access_token' and 'refresh_token'. Adjust if your app stores tokens elsewhere.
// - Refresh endpoint is POST `${baseURL}/auth/refresh` and accepts { refreshToken }
//   returning { accessToken, refreshToken? }. Update endpoint if your backend differs.

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

// Helpers to get/set/clear tokens. Centralize in one place to change storage later.
export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function setTokens({ accessToken, refreshToken }: { accessToken: string; refreshToken?: string }) {
  if (accessToken) {
    localStorage.setItem('access_token', accessToken);
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  delete axiosClient.defaults.headers.common['Authorization'];
}

// Attach access token to outgoing requests when available
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

// Refresh token handling
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  // Note: The backend doesn't currently have an /auth/refresh endpoint
  // This is a placeholder implementation - update when auth is added
  try {
    // Use plain axios (not axiosClient) to avoid interceptors and baseURL recursion
    const resp = await axios.post(
      `${API_SERVICE_BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Expecting { accessToken, refreshToken? }
    const { accessToken, refreshToken: newRefresh } = resp.data || {};
    if (!accessToken) throw new Error('Refresh failed: no access token returned');

    setTokens({ accessToken, refreshToken: newRefresh });
    return accessToken;
  } catch (error) {
    // If refresh endpoint doesn't exist, just clear tokens
    console.warn('Token refresh failed - this is expected if auth is not implemented yet:', error);
    throw new Error('Token refresh not available');
  }
}

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError & { config?: AxiosRequestConfig & { _retry?: boolean } }) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      // Mark request to prevent infinite loop
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue the request until token refresh finishes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token) {
              if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(axiosClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;

      return new Promise((resolve, reject) => {
        refreshAccessToken()
          .then((newToken) => {
            onRefreshed(newToken);
            isRefreshing = false;
            if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(axiosClient(originalRequest));
          })
          .catch((refreshError) => {
            isRefreshing = false;
            onRefreshed(null);
            // If refresh fails, clear tokens and force logout via store
            clearTokens();
            try {
              store.dispatch(logout());
            } catch {
              // ignore if dispatching fails in non-redux contexts
            }
            reject(refreshError);
          });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
