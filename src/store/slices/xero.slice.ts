import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { XeroTokenSet, ApiError } from '../../types/api.types';

interface XeroState {
  isLoading: boolean;
  isAuthenticated: boolean;
  credentials: {
    clientId?: string;
    redirectUri?: string;
  };
  tokens: Record<string, XeroTokenSet>; // keyed by clientId-tenantId
  error: ApiError | null;
}

const initialState: XeroState = {
  isLoading: false,
  isAuthenticated: false,
  credentials: {},
  tokens: {},
  error: null,
};

const xeroSlice = createSlice({
  name: 'xero',
  initialState,
  reducers: {
    // Set credentials actions
    setXeroCredsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    setXeroCredsSuccess: (state, action: PayloadAction<any>) => {
      state.isLoading = false;
      state.error = null;
    },
    setXeroCredsFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Save token actions
    saveTokenStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    saveTokenSuccess: (state, action: PayloadAction<any>) => {
      state.isLoading = false;
      state.error = null;
    },
    saveTokenFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Get token actions
    getTokenStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getTokenSuccess: (state, action: PayloadAction<XeroTokenSet>) => {
      state.isLoading = false;
      state.error = null;
      // Store token in state if needed
    },
    getTokenFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Start auth actions
    startAuthStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    startAuthSuccess: (state, action: PayloadAction<any>) => {
      state.isLoading = false;
      state.error = null;
    },
    startAuthFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setXeroCredsStart,
  setXeroCredsSuccess,
  setXeroCredsFailure,
  saveTokenStart,
  saveTokenSuccess,
  saveTokenFailure,
  getTokenStart,
  getTokenSuccess,
  getTokenFailure,
  startAuthStart,
  startAuthSuccess,
  startAuthFailure,
  clearError,
} = xeroSlice.actions;

export default xeroSlice.reducer;