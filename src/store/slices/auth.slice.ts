import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  xeroConnected: boolean;
  loading: boolean;
  error: string | null;
  tenants: Array<{ openid_sub: string; tenantName?: string; tenantType?: string; clientId?: string; organisationNumber?: string; displayLabel?: string }>;
  // legacy name used across parts of the app
  selectedOpenIdSub?: string | null;
  // canonical name used in components: selectedTenantId
  selectedTenantId?: string | null;
}

const initialState: AuthState = {
  isAuthenticated: typeof window !== 'undefined' ? Boolean(localStorage.getItem('isAuthenticated')) : false,
  xeroConnected: false,
  loading: false,
  error: null,
  tenants: [],
  selectedOpenIdSub: typeof window !== 'undefined' ? (localStorage.getItem('selectedTenantId') || null) : null,
  selectedTenantId: typeof window !== 'undefined' ? (localStorage.getItem('selectedTenantId') || null) : null,
};

export const validateTokens = createAsyncThunk('auth/validateTokens', async () => {
  try {
    const v = localStorage.getItem('isAuthenticated');
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setXeroConnected: (state) => {
      state.isAuthenticated = true;
      state.xeroConnected = true;
      state.error = null;
      try {
        localStorage.setItem('isAuthenticated', '1');
      } catch {
        // ignore
      }
    },
    setTenants(state, action) {
      state.tenants = action.payload || [];
    },
    selectTenant(state, action) {
      state.selectedOpenIdSub = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.xeroConnected = false;
      state.error = null;
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('isAuthenticated');
      } catch {
        // ignore
      }
      state.tenants = [];
      state.selectedOpenIdSub = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateTokens.pending, (state) => {
        state.loading = true;
      })
      .addCase(validateTokens.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload) {
          state.isAuthenticated = false;
          state.xeroConnected = false;
        }
      })
      .addCase(validateTokens.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.xeroConnected = false;
      });
  },
});

export const { setXeroConnected, logout, setError, clearError, setLoading, setTenants, selectTenant } = authSlice.actions;
export default authSlice.reducer;

// Helper utilities for other parts of the app to read/write persisted auth values
export const AuthStorage = {
  getIsAuthenticated(): boolean {
    try {
      return Boolean(window && localStorage.getItem('isAuthenticated'));
    } catch {
      return false;
    }
  },
  setIsAuthenticated(v: boolean) {
    try {
      if (v) localStorage.setItem('isAuthenticated', '1');
      else localStorage.removeItem('isAuthenticated');
    } catch {
      // ignore
    }
  },
  getSelectedTenantId(): string | null {
    try {
      return localStorage.getItem('selectedTenantId') || null;
    } catch {
      return null;
    }
  },
  setSelectedTenantId(id: string | null) {
    try {
      if (id) localStorage.setItem('selectedTenantId', id);
      else localStorage.removeItem('selectedTenantId');
    } catch {
      // ignore
    }
  },
  // Access token helpers (kept for compatibility with axios client)
  getAccessToken(): string | null {
    try {
      return localStorage.getItem('access_token');
    } catch {
      return null;
    }
  },
  setAccessToken(token: string) {
    try {
      localStorage.setItem('access_token', token);
    } catch {
      // ignore
    }
  },
  clearAccessToken() {
    try {
      localStorage.removeItem('access_token');
    } catch {
      // ignore
    }
  },
};
