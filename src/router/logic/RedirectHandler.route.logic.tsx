import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  handleOAuthRedirect,
  readAndClearPostAuthRedirect,
} from "../../apis/xero.api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { ROOT_PATH } from "../router";

// A small route-level redirect handler. It receives the route element as
// children and can perform client-side checks (query params, hashes, etc.)
// to redirect before the main route logic runs. Keep it minimal and
// synchronous-friendly so it doesn't block rendering.
const RedirectHandler = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

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

      setProcessing(true);
      (async () => {
        try {
          const resp = await handleOAuthRedirect({ code, state });
          if (!mounted) return;

          const ok = resp && resp.status >= 200 && resp.status < 300;

          // If backend handled the callback OK, navigate to the stored post-auth
          // redirect (if any), else fall back to state param or /success.
          const rootPrefix = (ROOT_PATH || "/").replace(/\/+$/g, "");
          const loginPath = `${rootPrefix}/login`;

          const stored = readAndClearPostAuthRedirect();
          if (ok) {
            const target = stored || state || `${rootPrefix}/success`;
            navigate(target, { replace: true });
          } else {
            navigate(loginPath, { replace: true });
          }
        } catch (err) {
          if (!mounted) return;
          const rootPrefix = (ROOT_PATH || "/").replace(/\/+$/g, "");
          navigate(`${rootPrefix}/login`, { replace: true });
        } finally {
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

  return children;
};

export default RedirectHandler;
