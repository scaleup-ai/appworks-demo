import axiosClient from './axios-client';
import BACKEND_ROUTES from '../router/backend.routes';

export async function handleGoogleOAuthRedirect(payload: { code: string; state?: string; redirectUri?: string }) {
  // POST to the canonical backend route for completing Google OAuth
  const url = (BACKEND_ROUTES && BACKEND_ROUTES.google && BACKEND_ROUTES.google.authComplete) || '/api/v1/google/auth/complete';
  return axiosClient.post(url, payload);
}

export async function startGoogleAuth(format: 'json' | 'redirect' = 'json', redirectUri?: string) {
  // POST to the canonical backend route for starting Google OAuth
  const url = (BACKEND_ROUTES && BACKEND_ROUTES.google && BACKEND_ROUTES.google.authStart) || '/api/v1/google/auth/start';
  return axiosClient.post(url, { format, redirectUri });
}

export default { handleGoogleOAuthRedirect, startGoogleAuth };
