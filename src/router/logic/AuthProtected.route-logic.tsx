import React, { ReactElement, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ROOT_PATH } from "../../router/router";
import { RootState } from "../../store/store";
import { logout as logoutAction, AuthStorage } from "../../store/slices/auth.slice";

interface AuthProtectedRouteLogicProps {
  children: ReactElement;
}

const LoadingFallback: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
    <div>
      <div style={{ fontSize: 18, marginBottom: 8 }}>Validating session…</div>
      <div role="status" aria-live="polite">
        Please wait
      </div>
    </div>
  </div>
);

/**
 * Auth guard for routes that require a validated authenticated session.
 *
 * Contract:
 * - Input: children element to render when the user is allowed.
 * - Output: Renders a small loading UI while auth state is being established.
 * - If server is unavailable, navigates to /maintenance.
 * - If unauthenticated, navigates to /auth.
 */
const AuthProtectedRouteLogic: React.FC<AuthProtectedRouteLogicProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, xeroConnected, tenants, loading, serverAvailable } = useSelector((state: RootState) => ({
    isAuthenticated: state.auth.isAuthenticated,
    xeroConnected: state.auth.xeroConnected,
    tenants: state.auth.tenants || [],
    loading: state.auth.loading,
    serverAvailable: typeof state.auth.serverAvailable !== "undefined" ? state.auth.serverAvailable : true,
  }));

  // Memoize a small diagnostic snapshot for dev-only logging
  const diag = useMemo(
    () => ({
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
    }),
    [isAuthenticated, xeroConnected, tenants]
  );

  useEffect(() => {
    if (import.meta.env && (import.meta.env.DEV as boolean)) {
      // eslint-disable-next-line no-console
      console.debug("AuthGuard:", diag);
    }

    // While auth validation is in progress, render the loading UI and do not
    // attempt navigation. This avoids redirect races during app startup.
    if (loading) return;

    // If the API/server is reporting as unavailable, send the user to a
    // single maintenance page so they don't interact with broken APIs.
    if (serverAvailable === false) {
      navigate(`${ROOT_PATH}maintenance`, { replace: true });
      return;
    }

    // Not authenticated -> send to auth entrypoint.
    if (!isAuthenticated) {
      // Best-effort: clear any stale client-side auth tokens.
      try {
        AuthStorage.clearAccessToken();
      } catch {}
      navigate(`${ROOT_PATH}auth`, { replace: true });
      return;
    }

    // If authenticated but Xero shows connected and we have no tenants, we
    // allow the route to render. Downstream pages should show tenant-empty
    // states or prompt the user to connect/refresh tenants.
  }, [loading, serverAvailable, isAuthenticated, xeroConnected, tenants, navigate, diag, dispatch]);

  // Render a small, accessible loading UI while validation is in-flight.
  if (loading) return <LoadingFallback />;

  // After validation completes, only render children when authenticated.
  if (!isAuthenticated) return null;

  return children;
};

export default AuthProtectedRouteLogic;
