import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PaymentReconciliationResponse, ApiError } from '../../types/api.types';

interface PaymentState {
  isLoading: boolean;
  reconciliationResults: PaymentReconciliationResponse[];
  error: ApiError | null;
}

const initialState: PaymentState = {
  isLoading: false,
  reconciliationResults: [],
  error: null,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    // Reconcile payment actions
    reconcilePaymentStart: (state, action: PayloadAction<any | undefined>) => {
      state.isLoading = true;
      state.error = null;
    },
    reconcilePaymentSuccess: (state, action: PayloadAction<PaymentReconciliationResponse>) => {
      state.isLoading = false;
      state.reconciliationResults.unshift(action.payload);
      // Keep only last 50 results
      if (state.reconciliationResults.length > 50) {
        state.reconciliationResults = state.reconciliationResults.slice(0, 50);
      }
      state.error = null;
    },
    reconcilePaymentFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Clear results
    clearReconciliationResults: (state) => {
      state.reconciliationResults = [];
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  reconcilePaymentStart,
  reconcilePaymentSuccess,
  reconcilePaymentFailure,
  clearReconciliationResults,
  clearError,
} = paymentSlice.actions;

export default paymentSlice.reducer;