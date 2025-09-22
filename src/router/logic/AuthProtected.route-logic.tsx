import React, { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAuthenticated } from "../../store/hooks";
import { useAuthStore } from "../../store/auth.store";

interface AuthProtectedRouteLogicProps {
  children: ReactElement;
}

const AuthProtectedRouteLogic: React.FC<AuthProtectedRouteLogicProps> = ({ children }) => {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  // Zustand hydration check
  const [hydrated, setHydrated] = useState(false);
  const store = useAuthStore();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Debug logging for hydration and auth state
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[AuthProtected Debug] hydrated:", hydrated, "isAuthenticated:", isAuthenticated, store);
  }, [hydrated, isAuthenticated, store]);

  // After hydration and authentication, check tenant selection
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    // Check tenant selection and redirect if needed
    const selectedTenantId = store.selectedTenantId;
    const tenants = store.tenants;
    if (!selectedTenantId || !tenants?.length) {
      // If no tenant selected, redirect to tenant selection or dashboard with prompt
      navigate("/dashboard", { state: { showTenantPrompt: true }, replace: true });
      return;
    }
  }, [hydrated, isAuthenticated, store, navigate]);

  if (!hydrated) {
    return null;
  }
  if (!isAuthenticated) {
    return null;
  }
  return children;
};

export default AuthProtectedRouteLogic;
