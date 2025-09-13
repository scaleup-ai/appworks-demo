import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  handleOAuthRedirect,
  readAndClearPostAuthRedirect,
} from "../../apis/xero.api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

// A small route-level redirect handler. It receives the route element as
// children and can perform client-side checks (query params, hashes, etc.)
// to redirect before the main route logic runs. Keep it minimal and
// synchronous-friendly so it doesn't block rendering.
const RedirectHandler = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const callbackPath = "/xero/oauth2/redirect";
  // If the current URL looks like the callback, mark processing synchronously
  // so other route logic can observe it on first render and avoid restarting auth.
  let initialProcessing = false;
  try {
    const href =
      typeof window !== "undefined" ? window.location.href || "" : "";
    if (href.includes(callbackPath)) {
      try {
        sessionStorage.setItem("xero_processing", "1");
      } catch {}
      initialProcessing = true;
    }
  } catch {}
  const [processing, setProcessing] = useState(initialProcessing);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Detect the Xero OAuth backend redirect path in the full URL.
    // Example: https://scaleupai.tech/api/v1/xero/oauth2/redirect?code=...&state=...
    try {
      const href = window.location.href || "";
      if (!href.includes(callbackPath)) return;

      const url = new URL(href);
      const code = url.searchParams.get("code") ?? undefined;
      const state = url.searchParams.get("state") ?? undefined;

      // Avoid double-processing
      if (!mounted) return;

      console.log("RedirectHandler: Processing OAuth callback");
      // mark that we're processing a callback so other route guards don't
      // immediately redirect back to Xero and cause a loop.
      try {
        sessionStorage.setItem("xero_processing", "1");
      } catch {}
      setProcessing(true);
      (async () => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000)
          );
          const respPromise = handleOAuthRedirect({ code, state });
          const resp = await Promise.race([respPromise, timeoutPromise]);

          console.log("RedirectHandler: Response status", (resp as any).status);
          console.log("RedirectHandler: Response data", (resp as any).data);

          const ok =
            resp && (resp as any).status >= 200 && (resp as any).status < 300;
          if (ok) {
            console.log("RedirectHandler: Callback successful, navigating");
            // Mark a short-lived 'recent auth' timestamp so route guards can
            // avoid immediately restarting auth while backend state propagates.
            try {
              sessionStorage.setItem("xero_recent_auth", String(Date.now()));
            } catch {}
            const stored = readAndClearPostAuthRedirect();
            const target = stored || state || "/dashboard";
            navigate(target, { replace: true });
          } else {
            console.log("RedirectHandler: Callback failed");
            const errorDetails = (resp as any).data
              ? JSON.stringify((resp as any).data)
              : "Unknown error";
            if (mounted)
              setErrorMessage(
                `Xero authentication failed: ${errorDetails}. You can retry below.`
              );
          }
        } catch (err) {
          console.error("RedirectHandler: Error processing callback", err);
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
      console.error("RedirectHandler: Error in useEffect", err);
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
                  window.location.href = "/api/v1/xero/auth";
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
            <button
              onClick={() => {
                setErrorMessage(null);
                navigate("/dashboard", { replace: true });
              }}
              className="px-4 py-3 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              Proceed to Dashboard
            </button>
          </div>
        </div>
      </div>
    );

  return children;
};

export default RedirectHandler;
