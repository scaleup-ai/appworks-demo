import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  xeroConnected: boolean;
  googleConnected: boolean;
  loading: boolean;
  error: string | null;
  // Whether the backend server is reachable / healthy. False when we detect
  // persistent 5xx/503 responses so the app can display a single maintenance
  // page instead of letting users interact with broken APIs.
  serverAvailable: boolean;
  tenants: Array<{ openid_sub?: string; tenantName?: string; tenantType?: string; clientId?: string; organisationNumber?: string; displayLabel?: string }>;
  selectedOpenIdSub?: string | null;
  selectedTenantId?: string | null;
}

const initialState: AuthState = {
  isAuthenticated: typeof window !== 'undefined' ? Boolean(localStorage.getItem('isAuthenticated')) : false,
  xeroConnected: false,
  googleConnected: false,
  serverAvailable: true,
  loading: false,
  error: null,
  tenants: [],
  selectedOpenIdSub: typeof window !== 'undefined' ? (localStorage.getItem('selectedOpenIdSub') || null) : null,
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
    setGoogleConnected: (state) => {
      state.isAuthenticated = true;
      state.googleConnected = true;
      state.error = null;
      try {
        localStorage.setItem('isAuthenticated', '1');
      } catch {
        // ignore
      }
    },
    setTenants(state, action) {
      try {
        const raw = Array.isArray(action.payload) ? action.payload : [];
        const mapped = raw.map((t: unknown) => {
          const rec = t as Record<string, unknown> | undefined;
          const tenantId = (rec && (rec.tenantId as string | undefined)) || (rec && (rec.tenant_id as string | undefined)) || undefined;
          let derivedTenantId = tenantId;
          if (!derivedTenantId && rec && typeof rec.id === 'string') {
            const parts = String(rec.id).split(":");
            if (parts.length === 2) derivedTenantId = parts[1];
            else derivedTenantId = String(rec.id);
          }
          const rawOpenId = rec ? ((rec.openid_sub as string | undefined) || (rec.openidSub as string | undefined)) : undefined;
          const openid_sub = rawOpenId && rawOpenId.length > 0 ? rawOpenId : undefined;
          const clientId = rec && ((rec.clientId as string | undefined) || (rec.client_id as string | undefined) || (typeof rec.id === 'string' && String(rec.id).includes(":") ? String(rec.id).split(":")[0] : undefined));
          const displayLabel = rec && ((rec.displayLabel as string | undefined) || (rec.display_label as string | undefined) || (rec.display_name as string | undefined) || undefined);
          return {
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
      const v = action.payload;
      try {
        // Only set the selected tenant id here. Do NOT clobber the stored
        // selectedOpenIdSub (OpenID subject) with the tenant id. The OpenID
        // subject is a distinct identity value and must be set explicitly via
        // `setSelectedOpenIdSub` when available.
        if (v && typeof v === 'string') {
          state.selectedTenantId = v;
        } else {
          state.selectedTenantId = v ?? null;
        }
      } catch {
        state.selectedTenantId = v ?? null;
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.xeroConnected = false;
      state.googleConnected = false;
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
    setServerAvailable: (state, action) => {
      try {
        state.serverAvailable = Boolean(action.payload);
      } catch {
        state.serverAvailable = Boolean(action.payload);
      }
    },
    // Explicitly set the OpenID subject (user identifier) in both Redux state
    // and localStorage. This is distinct from the selected tenant id.
    setSelectedOpenIdSub(state, action) {
      const v = action.payload as string | null | undefined;
      try {
        state.selectedOpenIdSub = v ?? null;
        if (v) localStorage.setItem('selectedOpenIdSub', v);
        else localStorage.removeItem('selectedOpenIdSub');
      } catch {
        state.selectedOpenIdSub = v ?? null;
      }
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
          state.googleConnected = false;
        }
      })
      .addCase(validateTokens.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.xeroConnected = false;
        state.googleConnected = false;
      });
  },
});

export const { setXeroConnected, setGoogleConnected, logout, setError, clearError, setLoading, setTenants, selectTenant, setSelectedOpenIdSub, setServerAvailable } = authSlice.actions;
export default authSlice.reducer;

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
  getSelectedOpenIdSub(): string | null {
    try {
      return localStorage.getItem('selectedOpenIdSub') || null;
    } catch {
      return null;
    }
  },
  setSelectedOpenIdSub(id: string | null) {
    try {
      if (id) localStorage.setItem('selectedOpenIdSub', id);
      else localStorage.removeItem('selectedOpenIdSub');
    } catch {
      // ignore
    }
    // axios-client initializes its default header from AuthStorage on load;
    // no runtime mutation here to avoid circular import lint rules.
  },
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