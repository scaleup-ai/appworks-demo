import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
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

  // Track whether we are retrying integration status checks to avoid
  // immediately redirecting the user back to the provider.
  const [checking, setChecking] = useState(false);

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

  // If we reach here, integration is false. Don't immediately redirect.
  // Instead, perform a few short retries to allow backend state to stabilize.
  useEffect(() => {
    let mounted = true;
    if (checking || integrated !== false) return;

    (async () => {
      setChecking(true);
      try {
        const attempts = 3;
        for (let i = 0; i < attempts && mounted; i++) {
          try {
            const status = await getIntegrationStatus();
            if (!mounted) return;
            const ok = Boolean(status && status.connected);
            if (ok) {
              setIntegrated(true);
              return;
            }
          } catch {
            // swallow and retry
          }
          // wait before next attempt
          await new Promise((r) => setTimeout(r, 1000));
        }

        if (!mounted) return;

        // After retries, if still not integrated, proceed to start auth.
        try {
          capturePostAuthRedirect();
        } catch {}
        try {
          window.location.href = getXeroAuthUrl();
        } catch {}
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [checking, integrated]);

  // While retrying or before redirecting show a centered spinner so the user
  // isn't stuck on an empty page.
  if (checking)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );

  // Fallback UI while the retry effect starts.
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <LoadingSpinner size="lg" />
    </div>
  );
};

export default AuthProtectedRouteLogic;
