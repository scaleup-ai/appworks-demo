import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import {
  capturePostAuthRedirect,
  getIntegrationStatus,
  getXeroAuthUrl,
} from "../../apis/xero.api";

// Keep the public name the same so imports stay valid.
const AuthProtectedRouteLogic = ({ children }: { children: ReactElement }) => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [integrated, setIntegrated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    if (isAuthenticated) {
      setIntegrated(true);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const status = await getIntegrationStatus();
        if (!mounted) return;
        // New API returns an IntegrationStatus object. Consider the integration
        // present when `connected` is true.
        const ok = Boolean(status && status.connected);
        setIntegrated(ok);
      } catch (e) {
        if (!mounted) return;
        setIntegrated(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  if (loading) return <div />;
  if (integrated) return children;

  // If a redirect callback is being processed, don't start a new flow.
  try {
    const href = typeof window !== "undefined" ? window.location.href : "";
    const processing = !!(
      typeof window !== "undefined" &&
      sessionStorage.getItem("xero_processing") === "1"
    );
    // If we've recently completed an auth (RedirectHandler sets this), wait a bit
    // to let backend/integration status propagate before starting another flow.
    const recentAuthTs = (() => {
      try {
        const v = sessionStorage.getItem("xero_recent_auth");
        return v ? parseInt(v, 10) : null;
      } catch {
        return null;
      }
    })();
    const now = Date.now();
    const recentlyAuthed = recentAuthTs && now - recentAuthTs < 3000; // 3s grace

    if (processing || href.includes("/xero/oauth2/redirect") || recentlyAuthed)
      return <div />;
  } catch {}

  // Start full-page auth and capture the post-auth location.
  try {
    capturePostAuthRedirect();
  } catch {}
  try {
    window.location.href = getXeroAuthUrl();
  } catch {}

  return <div />;
};

export default AuthProtectedRouteLogic;
