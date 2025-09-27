import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  xeroConnected: boolean;
  loading: boolean;
  error: string | null;
  tenants: Array<{ openid_sub?: string; tenantName?: string; tenantType?: string; clientId?: string; organisationNumber?: string; displayLabel?: string }>;
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
      // Normalize incoming tenants to a canonical shape that includes both
      // `openid_sub` (used by TenantSelector/Nav) and `tenantId` (used elsewhere).
      try {
        const raw = Array.isArray(action.payload) ? action.payload : [];
        const mapped = raw.map((t: unknown) => {
          const rec = t as Record<string, unknown> | undefined;
          const tenantId = (rec && (rec.tenantId as string | undefined)) || (rec && (rec.tenant_id as string | undefined)) || undefined;
          // If repo returns id in form clientId:tenantId, extract tenant id
          let derivedTenantId = tenantId;
          if (!derivedTenantId && rec && typeof rec.id === 'string') {
            const parts = String(rec.id).split(":");
            if (parts.length === 2) derivedTenantId = parts[1];
            else derivedTenantId = String(rec.id);
          }
          // Only use explicit openid_sub when provided by the backend. Do NOT
          // default it to the tenant id or record id; that causes incorrect
          // scoping where tenants appear to belong to the current user.
          const rawOpenId = rec ? ((rec.openid_sub as string | undefined) || (rec.openidSub as string | undefined)) : undefined;
          const openid_sub = rawOpenId && rawOpenId.length > 0 ? rawOpenId : undefined;
          const clientId = rec && ((rec.clientId as string | undefined) || (rec.client_id as string | undefined) || (typeof rec.id === 'string' && String(rec.id).includes(":") ? String(rec.id).split(":")[0] : undefined));
          const displayLabel = rec && ((rec.displayLabel as string | undefined) || (rec.display_label as string | undefined) || (rec.display_name as string | undefined) || undefined);
          return {
            // keep openid_sub undefined when backend didn't provide it
            openid_sub: openid_sub ? String(openid_sub) : undefined,
            tenantId: derivedTenantId ? String(derivedTenantId) : undefined,
            tenantName: (rec && ((rec.tenantName as string | undefined) || (rec.tenant_name as string | undefined) || (rec.name as string | undefined) || clientId)) || undefined,
            tenantType: (rec && ((rec.tenantType as string | undefined) || (rec.type as string | undefined))) || undefined,
            clientId: clientId || undefined,
            organisationNumber: rec && ((rec.organisationNumber as string | undefined) || (rec.organisation_number as string | undefined)) || undefined,
            displayLabel,
          };
        });
        state.tenants = mapped;
      } catch {
        state.tenants = action.payload || [];
      }
    },
    selectTenant(state, action) {
      // Allow selecting by either tenantId or openid_sub. Store both forms.
      const v = action.payload;
      try {
        if (v && typeof v === 'string') {
          state.selectedOpenIdSub = v;
          state.selectedTenantId = v;
        } else {
          state.selectedOpenIdSub = v ?? null;
          state.selectedTenantId = v ?? null;
        }
      } catch {
        state.selectedOpenIdSub = v ?? null;
        state.selectedTenantId = v ?? null;
      }
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
      state.selectedTenantId = null;
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
