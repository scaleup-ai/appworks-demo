import axiosClient from './axios-client';

export async function handleGoogleOAuthRedirect(payload: { code: string; state?: string }) {
  // POST to backend complete endpoint which will exchange code and persist tokens
  return axiosClient.post('/api/v1/google/auth/complete', payload);
}

export async function startGoogleAuth(format: 'json' | 'redirect' = 'json') {
  return axiosClient.post('/api/v1/google/auth/start', { format });
}

export default { handleGoogleOAuthRedirect, startGoogleAuth };
