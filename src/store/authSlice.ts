import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  xeroConnected: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  xeroConnected: false,
  loading: false,
  error: null,
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
    logout: (state) => {
      state.isAuthenticated = false;
      state.xeroConnected = false;
      state.error = null;
      localStorage.removeItem('access_token');
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

export const { setXeroConnected, logout, setError, clearError, setLoading } = authSlice.actions;
export default authSlice.reducer;
