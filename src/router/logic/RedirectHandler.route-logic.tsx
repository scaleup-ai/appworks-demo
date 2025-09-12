import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  handleOAuthRedirect,
  readAndClearPostAuthRedirect,
  getXeroAuthUrl,
} from "../../apis/xero.api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

// A small route-level redirect handler. It receives the route element as
// children and can perform client-side checks (query params, hashes, etc.)
// to redirect before the main route logic runs. Keep it minimal and
// synchronous-friendly so it doesn't block rendering.
const RedirectHandler = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Detect the Xero OAuth backend redirect path in the full URL.
    // Example: https://scaleupai.tech/api/v1/xero/oauth2/redirect?code=...&state=...
    try {
      const href = window.location.href || "";
      const callbackPath = "/xero/oauth2/redirect";
      if (!href.includes(callbackPath)) return;

      const url = new URL(href);
      const code = url.searchParams.get("code") ?? undefined;
      const state = url.searchParams.get("state") ?? undefined;

      // Avoid double-processing
      if (!mounted) return;

      // mark that we're processing a callback so other route guards don't
      // immediately redirect back to Xero and cause a loop.
      try {
        sessionStorage.setItem("xero_processing", "1");
      } catch {}
      setProcessing(true);
      (async () => {
        try {
          const resp = await handleOAuthRedirect({ code, state });
          if (!mounted) return;

          const ok = resp && resp.status >= 200 && resp.status < 300;

          // If backend handled the callback OK, navigate to the stored post-auth
          // redirect (if any), else fall back to the state param. On failure,
          // surface an error and let the user choose to retry so we don't
          // automatically send them back into the OAuth loop.
          const stored = readAndClearPostAuthRedirect();
          if (ok) {
            const target = stored || state || "/";
            navigate(target, { replace: true });
          } else {
            if (mounted)
              setErrorMessage(
                "Xero authentication failed. You can retry below."
              );
          }
        } catch (err) {
          if (!mounted) return;
          // Don't auto-redirect to Xero on error — show a retry UI instead.
          if (mounted)
            setErrorMessage(
              "An error occurred while processing the Xero callback. Retry to continue."
            );
        } finally {
          try {
            sessionStorage.removeItem("xero_processing");
          } catch {}
          if (mounted) setProcessing(false);
        }
      })();
    } catch (err) {
      // noop
    }

    return () => {
      mounted = false;
    };
  }, [location.pathname, location.search, location.hash, navigate]);

  // While processing the OAuth callback, render a full-viewport centered spinner.
  if (processing)
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 flex items-center justify-center bg-white"
      >
        <LoadingSpinner size="lg" />
      </div>
    );

  if (errorMessage)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-white">
        <div className="max-w-lg text-center">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Authentication issue
          </h2>
          <p className="mb-6 text-sm text-gray-700">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                try {
                  // start Xero auth explicitly on user action
                  window.location.href = getXeroAuthUrl();
                } catch {
                  // noop
                }
              }}
              className="px-5 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Retry Connect
            </button>
            <button
              onClick={() => {
                setErrorMessage(null);
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
