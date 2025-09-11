import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import {
  getIntegrationStatus,
  getXeroAuthUrl,
  capturePostAuthRedirect,
} from "../../apis/xero.api";
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

  // If integration check passed, allow access. Otherwise start Xero auth.
  if (integrated) return children;

  // If a redirect callback is currently being processed, don't start a new
  // auth flow (avoids an immediate loop where redirect handler and this
  // guard race to start Xero). We detect this via a short-lived session flag
  // or by checking the current URL for the callback path.
  try {
    const processing =
      (typeof window !== "undefined" &&
        (sessionStorage.getItem("xero_processing") === "1" ||
          window.location.href.includes("/xero/oauth2/redirect"))) ||
      false;

    if (processing) {
      // let the redirect handler finish; render a minimal placeholder
      return <div />;
    }
  } catch {}

  try {
    capturePostAuthRedirect();
  } catch {}
  window.location.href = getXeroAuthUrl();
  return <div />;
};

export default AuthProtectedRouteLogic;
