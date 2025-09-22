import { useAuthStore } from '../store/auth.store';

/**
 * Signs out the user by clearing all auth/tenant state from Zustand.
 * Optionally, you can also clear persisted Zustand storage and redirect to /auth.
 */
export function signOutUser() {
  // Clear Zustand state
  useAuthStore.getState().setAuth({
    isAuthenticated: false,
    xeroConnected: false,
    selectedTenantId: null,
    tenants: [],
  });
  // Optionally clear persisted storage
  try {
    window.localStorage.removeItem('auth-store');
  } catch (e) {
    console.error("Failed to clear localStorage:", e);
  }
  // Redirect to /auth
  window.location.replace('/auth');
}
