import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CollectionsReminderEvent, ApiError } from '../../types/api.types';

interface CollectionsState {
  isLoading: boolean;
  isRunning: boolean;
  scheduledReminders: CollectionsReminderEvent[];
  error: ApiError | null;
}

const initialState: CollectionsState = {
  isLoading: false,
  isRunning: false,
  scheduledReminders: [],
  error: null,
};

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    // Start collections actions
    startCollectionsStart: (state, action: PayloadAction<any | undefined>) => {
      state.isLoading = true;
      state.error = null;
    },
    startCollectionsSuccess: (state) => {
      state.isLoading = false;
      state.isRunning = true;
      state.error = null;
    },
    startCollectionsFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Stop collections actions
    stopCollectionsStart: (state, action: PayloadAction<any | undefined>) => {
      state.isLoading = true;
      state.error = null;
    },
    stopCollectionsSuccess: (state) => {
      state.isLoading = false;
      state.isRunning = false;
      state.error = null;
    },
    stopCollectionsFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Trigger scan actions
    triggerScanStart: (state, action: PayloadAction<any | undefined>) => {
      state.isLoading = true;
      state.error = null;
    },
    triggerScanSuccess: (state) => {
      state.isLoading = false;
      state.error = null;
    },
    triggerScanFailure: (state, action: PayloadAction<ApiError>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Get scheduled actions
    getScheduledStart: (state, action: PayloadAction<any | undefined>) => {
      state.isLoading = true;
      state.error = null;
    },
    getScheduledSuccess: (state, action: PayloadAction<CollectionsReminderEvent[]>) => {
      state.isLoading = false;
      state.scheduledReminders = action.payload;
      state.error = null;
    },
    getScheduledFailure: (state, action: PayloadAction<ApiError>) => {
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
  startCollectionsStart,
  startCollectionsSuccess,
  startCollectionsFailure,
  stopCollectionsStart,
  stopCollectionsSuccess,
  stopCollectionsFailure,
  triggerScanStart,
  triggerScanSuccess,
  triggerScanFailure,
  getScheduledStart,
  getScheduledSuccess,
  getScheduledFailure,
  clearError,
} = collectionsSlice.actions;

export default collectionsSlice.reducer;