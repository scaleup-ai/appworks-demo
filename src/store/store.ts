import { create } from 'zustand';

export type NavTenant = {
  tenantId: string;
  tenantName?: string;
  tenantType?: string;
  clientId?: string;
  organisationNumber?: string;
  createdAt?: string;
  displayLabel?: string;
};

export interface AuthState {
  isAuthenticated: boolean;
  xeroConnected: boolean;
  selectedTenantId: string | null;
  tenants: NavTenant[];
  setAuth: (auth: Partial<AuthState>) => void;
  setSelectedTenantId: (tenantId: string) => void;
  xeroLoading: boolean;
  collectionsLoading: boolean;
  emailLoading: boolean;
  paymentLoading: boolean;
}

export const useAuthStore = create<AuthState>((set: (fn: (state: AuthState) => AuthState) => void) => ({
  isAuthenticated: false,
  xeroConnected: false,
  selectedTenantId: null,
  tenants: [],
  setAuth: (auth: Partial<AuthState>) => set((state: AuthState) => ({ ...state, ...auth })),
  setSelectedTenantId: (tenantId: string) => set((state: AuthState) => ({ ...state, selectedTenantId: tenantId })),
  xeroLoading: false,
  collectionsLoading: false,
  emailLoading: false,
  paymentLoading: false,
}));