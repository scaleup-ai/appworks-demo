import { create } from 'zustand';
import { ApiError, CollectionsReminderEvent } from '../types/api.types';
import { startCollections, stopCollections, triggerScan, getScheduledReminders } from '../apis/collections.api';

export interface CollectionsState {
  collectionsLoading: boolean;
  startCollections: (onSuccess?: () => void, onError?: (err: ApiError) => void) => Promise<void>;
  stopCollections: (onSuccess?: () => void, onError?: (err: ApiError) => void) => Promise<void>;
  triggerScan: (onSuccess?: (res: { status: string }) => void, onError?: (err: ApiError) => void) => Promise<void>;
  getScheduledReminders: (onSuccess?: (res: CollectionsReminderEvent[]) => void, onError?: (err: ApiError) => void) => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set) => ({
  collectionsLoading: false,
  startCollections: async (onSuccess, onError) => {
    set((state) => ({ ...state, collectionsLoading: true }));
    try {
      await startCollections();
      set((state) => ({ ...state, collectionsLoading: false }));
      onSuccess?.();
    } catch (error) {
      set((state) => ({ ...state, collectionsLoading: false }));
      onError?.(error as ApiError);
    }
  },
  stopCollections: async (onSuccess, onError) => {
    set((state) => ({ ...state, collectionsLoading: true }));
    try {
      await stopCollections();
      set((state) => ({ ...state, collectionsLoading: false }));
      onSuccess?.();
    } catch (error) {
      set((state) => ({ ...state, collectionsLoading: false }));
      onError?.(error as ApiError);
    }
  },
  triggerScan: async (onSuccess, onError) => {
    set((state) => ({ ...state, collectionsLoading: true }));
    try {
      const res = await triggerScan();
      set((state) => ({ ...state, collectionsLoading: false }));
      onSuccess?.(res);
    } catch (error) {
      set((state) => ({ ...state, collectionsLoading: false }));
      onError?.(error as ApiError);
    }
  },
  getScheduledReminders: async (onSuccess, onError) => {
    set((state) => ({ ...state, collectionsLoading: true }));
    try {
      const res = await getScheduledReminders();
      set((state) => ({ ...state, collectionsLoading: false }));
      onSuccess?.(res);
    } catch (error) {
      set((state) => ({ ...state, collectionsLoading: false }));
      onError?.(error as ApiError);
    }
  },
}));
