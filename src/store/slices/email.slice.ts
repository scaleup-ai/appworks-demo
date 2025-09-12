import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EmailDraftResponse, ApiError } from '../../types/api.types';

interface EmailState {
  isLoading: boolean;
  currentDraft: EmailDraftResponse | null;
  draftHistory: EmailDraftResponse[];
  error: ApiError | null;
}

const initialState: EmailState = {
  isLoading: false,
  currentDraft: null,
  draftHistory: [],
  error: null,
};

const emailSlice = createSlice({
  name: 'email',
  initialState,
  reducers: {
    // Generate draft actions
    generateDraftStart: (state, action: PayloadAction<any | undefined>) => {
      state.isLoading = true;
      state.error = null;
    },
    generateDraftSuccess: (state, action: PayloadAction<EmailDraftResponse>) => {
      state.isLoading = false;
      state.currentDraft = action.payload;
      state.draftHistory.unshift(action.payload);
      // Keep only last 10 drafts
      if (state.draftHistory.length > 10) {
        state.draftHistory = state.draftHistory.slice(0, 10);
      }
      state.error = null;
    },
    generateDraftFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Clear current draft
    clearCurrentDraft: (state) => {
      state.currentDraft = null;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  generateDraftStart,
  generateDraftSuccess,
  generateDraftFailure,
  clearCurrentDraft,
  clearError,
} = emailSlice.actions;

export default emailSlice.reducer;