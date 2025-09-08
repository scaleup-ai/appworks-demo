import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { store } from '../store/store'
import { logout } from '../store/authSlice'

// Assumptions:
// - API base URL is provided via Vite env: import.meta.env.VITE_API_BASE_URL
// - Access token and refresh token are stored in localStorage under keys
//   'access_token' and 'refresh_token'. Adjust if your app stores tokens elsewhere.
// - Refresh endpoint is POST `${baseURL}/auth/refresh` and accepts { refreshToken }
//   returning { accessToken, refreshToken? }. Update endpoint if your backend differs.

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || ''

const axiosClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Helpers to get/set/clear tokens. Centralize in one place to change storage later.
export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function setTokens({ accessToken, refreshToken }: { accessToken: string; refreshToken?: string }) {
  if (accessToken) {
    localStorage.setItem('access_token', accessToken)
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  }
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken)
  }
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  delete axiosClient.defaults.headers.common['Authorization']
}

// Attach access token to outgoing requests when available
axiosClient.interceptors.request.use(
  (config: import('axios').InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config && config.headers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (config.headers as any)['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error: any) => Promise.reject(error)
)

// Refresh token handling
let isRefreshing = false
let refreshSubscribers: Array<(token: string | null) => void> = []

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  // Use plain axios (not axiosClient) to avoid interceptors and baseURL recursion
  const resp = await axios.post(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  )

  // Expecting { accessToken, refreshToken? }
  const { accessToken, refreshToken: newRefresh } = resp.data || {}
  if (!accessToken) throw new Error('Refresh failed: no access token returned')

  setTokens({ accessToken, refreshToken: newRefresh })
  return accessToken
}

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError & { config?: AxiosRequestConfig & { _retry?: boolean } }) => {
    const originalRequest = error.config

    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      // Mark request to prevent infinite loop
      originalRequest._retry = true

      if (isRefreshing) {
        // Queue the request until token refresh finishes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token) {
              if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${token}`
              resolve(axiosClient(originalRequest))
            } else {
              reject(error)
            }
          })
        })
      }

      isRefreshing = true

      return new Promise(async (resolve, reject) => {
        try {
          const newToken = await refreshAccessToken()
          onRefreshed(newToken)
          isRefreshing = false
          if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          resolve(axiosClient(originalRequest))
        } catch (refreshError) {
          isRefreshing = false
          onRefreshed(null)
          // If refresh fails, clear tokens and force logout via store
          clearTokens()
          try {
            store.dispatch(logout())
          } catch (e) {
            // ignore if dispatching fails in non-redux contexts
          }
          reject(refreshError)
        }
      })
    }

    return Promise.reject(error)
  }
)

export default axiosClient
