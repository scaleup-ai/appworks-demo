import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  handleOAuthRedirect,
  readAndClearPostAuthRedirect,
  getXeroAuthUrl,
} from "../../apis/xero.api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const RedirectHandler = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const href = typeof window !== "undefined" ? window.location.href : "";
    if (!href.includes("/xero/oauth2/redirect")) return;

    let mounted = true;
    (async () => {
      try {
        try {
          sessionStorage.setItem("xero_processing", "1");
        } catch {}
        setProcessing(true);

        const url = new URL(href);
        const code = url.searchParams.get("code") ?? undefined;
        const state = url.searchParams.get("state") ?? undefined;

        const resp = await handleOAuthRedirect({ code, state });
        if (!mounted) return;
        const ok = resp && resp.status >= 200 && resp.status < 300;
        const stored = readAndClearPostAuthRedirect();
        if (ok) navigate(stored || state || "/", { replace: true });
        else setError("Xero authentication failed. Retry to continue.");
      } catch (e) {
        if (!mounted) return;
        setError("Error processing Xero callback. Retry to continue.");
      } finally {
        try {
          sessionStorage.removeItem("xero_processing");
        } catch {}
        if (mounted) setProcessing(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // only re-run when the URL parts change
  }, [location.pathname, location.search, location.hash, navigate]);

  if (processing)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white" role="status" aria-live="polite">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (error)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-white">
        <div className="max-w-lg text-center">
          <h2 className="mb-4 text-xl font-semibold">Authentication issue</h2>
          <p className="mb-6 text-sm text-gray-700">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                try {
                  window.location.href = getXeroAuthUrl();
                } catch {}
              }}
              className="px-5 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Retry Connect
            </button>
            <button
              onClick={() => {
                setError(null);
                navigate("/", { replace: true });
              }}
              className="px-4 py-3 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Return home
            </button>
          </div>
        </div>
      </div>
    );

  return children;
};

export default RedirectHandler;
