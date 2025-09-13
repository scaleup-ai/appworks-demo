import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as authService from '../services/auth.service';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

export interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;

  // Xero integration state
  xeroConnected: boolean;
  xeroTenantId?: string;
  xeroExpiresAt?: string;

  // OAuth flow state
  isOAuthInProgress: boolean;
}

const initialState: AuthState = {
  isAuthenticated: authService.TokenManager.isAuthenticated(),
  isLoading: false,
  user: null,
  error: null,
  xeroConnected: false,
  isOAuthInProgress: false,
};

// Async thunks for auth operations
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await authService.login(credentials);
    return response;
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const refreshTokens = createAsyncThunk('auth/refresh', async () => {
  const tokens = await authService.refreshTokens();
  return tokens;
});

export const getCurrentUser = createAsyncThunk('auth/getCurrentUser', async () => {
  const user = await authService.getCurrentUser();
  return user;
});

export const initializeXeroOAuth = createAsyncThunk('auth/initializeXeroOAuth', async () => {
  const authData = await authService.getXeroAuthUrl();
  return authData;
});

export const completeXeroOAuth = createAsyncThunk(
  'auth/completeXeroOAuth',
  async ({ code, state }: { code: string; state: string }) => {
    await authService.handleXeroCallback(code, state);
    const status = await authService.getXeroIntegrationStatus();
    return status;
  }
);

export const checkXeroStatus = createAsyncThunk('auth/checkXeroStatus', async () => {
  const status = await authService.getXeroIntegrationStatus();
  return status;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setOAuthInProgress: (state, action: PayloadAction<boolean>) => {
      state.isOAuthInProgress = action.payload;
    },
    // For manual token validation/refresh
    validateTokens: (state) => {
      state.isAuthenticated = authService.TokenManager.isAuthenticated();
      if (!state.isAuthenticated) {
        state.user = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user || null;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.error.message || 'Login failed';
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.xeroConnected = false;
        state.xeroTenantId = undefined;
        state.xeroExpiresAt = undefined;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Force logout even if server request failed
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.xeroConnected = false;
        state.xeroTenantId = undefined;
        state.xeroExpiresAt = undefined;
      });

    // Get current user
    builder
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload || null;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        // If getting user fails, might need to re-authenticate
        state.isAuthenticated = false;
        state.user = null;
      });

    // Xero OAuth initialization
    builder
      .addCase(initializeXeroOAuth.pending, (state) => {
        state.isLoading = true;
        state.isOAuthInProgress = true;
        state.error = null;
      })
      .addCase(initializeXeroOAuth.fulfilled, (state) => {
        state.isLoading = false;
        // OAuth will continue in browser redirect
      })
      .addCase(initializeXeroOAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isOAuthInProgress = false;
        state.error = action.error.message || 'Failed to initialize Xero OAuth';
      });

    // Xero OAuth completion
    builder
      .addCase(completeXeroOAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(completeXeroOAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isOAuthInProgress = false;
        state.xeroConnected = action.payload.connected;
        state.xeroTenantId = action.payload.tenantId;
        state.xeroExpiresAt = action.payload.expiresAt;
        state.error = null;
      })
      .addCase(completeXeroOAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isOAuthInProgress = false;
        state.error = action.error.message || 'Xero OAuth failed';
      });

    // Xero status check
    builder
      .addCase(checkXeroStatus.fulfilled, (state, action) => {
        state.xeroConnected = action.payload.connected;
        state.xeroTenantId = action.payload.tenantId;
        state.xeroExpiresAt = action.payload.expiresAt;
      });
  },
});

// Export actions
export const { clearError, setOAuthInProgress, validateTokens } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectXeroStatus = (state: { auth: AuthState }) => ({
  connected: state.auth.xeroConnected,
  tenantId: state.auth.xeroTenantId,
  expiresAt: state.auth.xeroExpiresAt,
});

export default authSlice.reducer;