import { AuthState, useAuthStore } from './store';

export const useIsAuthenticated = () => useAuthStore((state: AuthState) => state.isAuthenticated);
export const useXeroConnected = () => useAuthStore((state: AuthState) => state.xeroConnected);
export const useSelectedTenantId = () => useAuthStore((state: AuthState) => state.selectedTenantId);
export const useTenants = () => useAuthStore((state: AuthState) => state.tenants);
export const useSetAuth = () => useAuthStore((state: AuthState) => state.setAuth);
export const useSetSelectedTenantId = () => useAuthStore((state: AuthState) => state.setSelectedTenantId);

// Loading state hooks for DashboardLayout
export const useXeroLoading = () => useAuthStore((state: AuthState) => state.xeroLoading);
export const useCollectionsLoading = () => useAuthStore((state: AuthState) => state.collectionsLoading);
export const useEmailLoading = () => useAuthStore((state: AuthState) => state.emailLoading);
export const usePaymentLoading = () => useAuthStore((state: AuthState) => state.paymentLoading);
