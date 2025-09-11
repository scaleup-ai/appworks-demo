import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { getIntegrationStatus } from "../../apis/xero.api";
import { RootState } from "../../store/store";
import { ROOT_PATH } from "../router";

const AuthProtectedRouteLogic = ({ children }: { children: ReactElement }) => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [checking, setChecking] = useState(false);
  const [integrated, setIntegrated] = useState<boolean | null>(null);

  useEffect(() => {
    // If already authenticated, no need to call backend
    if (isAuthenticated) return;

    let mounted = true;
    setChecking(true);
    void (async () => {
      try {
        const resp = await getIntegrationStatus();
        if (!mounted) return;
        const ok =
          resp &&
          resp.status >= 200 &&
          resp.status < 300 &&
          resp.data?.integrationStatus?.success;
        setIntegrated(Boolean(ok));
      } catch (err) {
        if (!mounted) return;
        setIntegrated(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  if (isAuthenticated) return children;

  if (checking) return <div />;

  // If integration check passed, allow access. Otherwise redirect to login.
  if (integrated) return children;

  // Build a path relative to the app root (ROOT_PATH may be "/" or "/app/")
  const rootPrefix = (ROOT_PATH || "/").replace(/\/+$/g, "");
  const loginPath = rootPrefix + "/login";
  return <Navigate to={loginPath} replace />;
};

export default AuthProtectedRouteLogic;
