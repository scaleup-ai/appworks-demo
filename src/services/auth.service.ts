import axiosClient from '../apis/axios-client';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface XeroOAuthState {
  state: string;
  codeVerifier?: string;
  redirectUrl: string;
}

export enum AuthRoutes {
  // Standard auth routes (for future implementation)
  LOGIN = '/api/v1/auth/login',
  LOGOUT = '/api/v1/auth/logout',
  REFRESH = '/api/v1/auth/refresh',
  ME = '/api/v1/auth/me',

  // Xero OAuth routes
  XERO_AUTH_URL = '/api/v1/xero/auth',
  XERO_CALLBACK = '/api/v1/xero/oauth2/redirect',
  XERO_STATUS = '/api/v1/xero/integration/status',
}

// Token management
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(tokens: AuthTokens): void {
    if (tokens.accessToken) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);

      if (tokens.expiresIn) {
        const expiryTime = Date.now() + (tokens.expiresIn * 1000);
        localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
    }

    if (tokens.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  static isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return false;

    return Date.now() > parseInt(expiryTime);
  }

  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isTokenExpired();
  }
}

// Xero OAuth Helper
export class XeroOAuthManager {
  private static readonly STATE_KEY = 'xero_oauth_state';
  private static readonly CODE_VERIFIER_KEY = 'xero_code_verifier';

  static saveOAuthState(state: XeroOAuthState): void {
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  static getOAuthState(): XeroOAuthState | null {
    const stored = sessionStorage.getItem(this.STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  static clearOAuthState(): void {
    sessionStorage.removeItem(this.STATE_KEY);
    sessionStorage.removeItem(this.CODE_VERIFIER_KEY);
  }
}

// Auth API Functions
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await axiosClient.post<AuthResponse>(AuthRoutes.LOGIN, credentials);

  if (response.data.tokens) {
    TokenManager.setTokens(response.data.tokens);
  }

  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await axiosClient.post(AuthRoutes.LOGOUT);
  } catch (error) {
    // Continue with local logout even if server request fails
    console.warn('Server logout failed:', error);
  } finally {
    TokenManager.clearTokens();
    XeroOAuthManager.clearOAuthState();
  }
}

export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = TokenManager.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axiosClient.post<{ tokens: AuthTokens }>(AuthRoutes.REFRESH, {
    refreshToken,
  });

  if (response.data.tokens) {
    TokenManager.setTokens(response.data.tokens);
  }

  return response.data.tokens;
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  const response = await axiosClient.get<{ user: AuthResponse['user'] }>(AuthRoutes.ME);
  return response.data.user;
}

// Xero OAuth Functions
export async function getXeroAuthUrl(): Promise<{ url: string; state: string }> {
  const response = await axiosClient.get<{ url: string; state: string }>(
    AuthRoutes.XERO_AUTH_URL,
    { params: { mode: 'json' } }
  );

  // Save state for verification
  XeroOAuthManager.saveOAuthState({
    state: response.data.state,
    redirectUrl: window.location.href,
  });

  return response.data;
}

export async function handleXeroCallback(code: string, state: string): Promise<void> {
  const savedState = XeroOAuthManager.getOAuthState();

  if (!savedState || savedState.state !== state) {
    throw new Error('Invalid OAuth state');
  }

  // Use GET request since backend expects GET
  const response = await axiosClient.get(AuthRoutes.XERO_CALLBACK, {
    params: { code, state },
  });

  XeroOAuthManager.clearOAuthState();
  return response.data;
}

export async function getXeroIntegrationStatus(): Promise<{
  connected: boolean;
  tenantId?: string;
  expiresAt?: string;
}> {
  const response = await axiosClient.get(AuthRoutes.XERO_STATUS);
  return response.data;
}

export default {
  TokenManager,
  XeroOAuthManager,
  login,
  logout,
  refreshTokens,
  getCurrentUser,
  getXeroAuthUrl,
  handleXeroCallback,
  getXeroIntegrationStatus,
};
