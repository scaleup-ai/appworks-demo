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
  const [checking, setChecking] = useState(false);

  // Initial check: see if integration exists or we are authenticated.
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
        const ok = Boolean(status && (status as any).connected);
        setIntegrated(ok);
      } catch {
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

  // Retry loop: when we know integration is false, poll a few times before starting full-page auth.
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
            const ok = Boolean(status && (status as any).connected);
            if (ok) {
              setIntegrated(true);
              return;
            }
          } catch {
            // ignore and retry
          }
          await new Promise((r) => setTimeout(r, 1000));
        }

        if (!mounted) return;

        // still not integrated -> start auth
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

  // sessionStorage-based runtime flags to avoid races with the redirect handler.
  let processing = false;
  let recentlyAuthed = false;
  try {
    const href = typeof window !== "undefined" ? window.location.href : "";
    processing =
      typeof window !== "undefined" &&
      sessionStorage.getItem("xero_processing") === "1";
    const recentAuthTs = (() => {
      try {
        const v = sessionStorage.getItem("xero_recent_auth");
        return v ? parseInt(v, 10) : null;
      } catch {
        return null;
      }
    })();
    const now = Date.now();
    recentlyAuthed = Boolean(recentAuthTs && now - recentAuthTs < 3000);
    if (href.includes("/xero/oauth2/redirect")) processing = true;
  } catch {}

  // Render decisions: show spinner during loading/checking/processing; render children only when integrated.
  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (integrated) return children;

  if (processing || recentlyAuthed || checking)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );

  // Fallback while the retry effect starts (should be transient).
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <LoadingSpinner size="lg" />
    </div>
  );
};

export default AuthProtectedRouteLogic;
