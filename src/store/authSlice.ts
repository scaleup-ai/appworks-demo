import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  xeroConnected: boolean;
  loading: boolean;
  error: string | null;
  tenants: Array<{ tenantId: string; tenantName?: string; tenantType?: string }>;
  selectedTenantId?: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  xeroConnected: false,
  loading: false,
  error: null,
  tenants: [],
  // initialize selected tenant from localStorage if present so app picks up previous selection
  selectedTenantId: typeof window !== 'undefined' ? (localStorage.getItem('selectedTenantId') || null) : null,
};

export const validateTokens = createAsyncThunk('auth/validateTokens', async () => {
  const token = localStorage.getItem('access_token');
  return !!token;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setXeroConnected: (state) => {
      state.isAuthenticated = true;
      state.xeroConnected = true;
      state.error = null;
    },
    setTenants(state, action: { payload: Array<{ tenantId: string; tenantName?: string; tenantType?: string }> }) {
      state.tenants = action.payload || [];
    },
    selectTenant(state, action: { payload: string | null }) {
      state.selectedTenantId = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.xeroConnected = false;
      state.error = null;
      localStorage.removeItem('access_token');
      state.tenants = [];
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
