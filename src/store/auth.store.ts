import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  emailLoading: boolean;
  paymentLoading: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      xeroConnected: false,
      selectedTenantId: null,
      tenants: [],
      setAuth: (auth) => set((state) => ({ ...state, ...auth })),
      setSelectedTenantId: (tenantId) => set((state) => ({ ...state, selectedTenantId: tenantId })),
      xeroLoading: false,
      emailLoading: false,
      paymentLoading: false,
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        xeroConnected: state.xeroConnected,
        selectedTenantId: state.selectedTenantId,
        tenants: state.tenants,
      }),
    }
  )
);
