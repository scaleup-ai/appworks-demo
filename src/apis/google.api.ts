import axiosClient from './axios-client';
import BACKEND_ROUTES from '../router/backend.routes';

export async function handleGoogleOAuthRedirect(payload: { code: string; state?: string; redirectUri?: string }) {
  // POST to backend complete endpoint which will exchange code and persist tokens
  const url = BACKEND_ROUTES?.google?.authComplete || '/api/v1/google/auth/complete';
  return axiosClient.post(url, payload);
}

export async function startGoogleAuth(format: 'json' | 'redirect' = 'json', redirectUri?: string) {
  const url = BACKEND_ROUTES?.google?.authStart || '/api/v1/google/auth/start';
  return axiosClient.post(url, { format, redirectUri });
}

export default { handleGoogleOAuthRedirect, startGoogleAuth };
