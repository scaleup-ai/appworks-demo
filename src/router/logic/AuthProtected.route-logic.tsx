import React, { ReactElement, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ROOT_PATH } from "../../router/router";
import { RootState } from "../../store/store";
import { logout as logoutAction, AuthStorage } from "../../store/slices/auth.slice";

interface AuthProtectedRouteLogicProps {
  children: ReactElement;
}

const AuthProtectedRouteLogic: React.FC<AuthProtectedRouteLogicProps> = ({ children }) => {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const xeroConnected = useSelector((state: RootState) => state.auth.xeroConnected);
  const tenants = useSelector((state: RootState) => state.auth.tenants || []);
  const loading = useSelector((state: RootState) => state.auth.loading);

  useEffect(() => {
    // Debug: print auth guard state so we can trace why routes mount/redirect
    // at runtime. Keep this quiet in production by gating on DEV flag if needed.
    try {
      // eslint-disable-next-line no-console
      console.log("AuthGuard:", {
        isAuthenticated,
        xeroConnected,
        tenantsCount: Array.isArray(tenants) ? tenants.length : 0,
        persistedOpenId: (() => {
          try {
            return AuthStorage.getSelectedOpenIdSub();
          } catch {
            return null;
          }
        })(),
      });
    } catch {}
    // If auth state is still being validated, don't redirect yet. This avoids
    // racing with async validation on app boot (validateTokens thunk etc.).
    if (loading) return;

    // If the user is not authenticated, go to auth flow.
    if (!isAuthenticated) {
      navigate(`${ROOT_PATH}auth`);
      return;
    }

    // If the user is authenticated and Xero integration is marked connected
    // but we have zero known tenants, do NOT force a logout. Instead, send
    // the user to tenant selection so they can re-select or recover their
    // organisation. Forcing logout here caused races during OAuth callbacks.
    if (isAuthenticated && xeroConnected && Array.isArray(tenants) && tenants.length === 0) {
      try {
        // Prefer navigating to tenant selection rather than clearing auth.
        navigate(`${ROOT_PATH}select-tenant`);
      } catch (e) {
        // If navigation fails for any reason, fall back to auth page.
        try {
          navigate(`${ROOT_PATH}auth`);
        } catch {}
      }
      return;
    }
  }, [isAuthenticated, xeroConnected, tenants, loading, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return children;
};

export default AuthProtectedRouteLogic;
