import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setGoogleConnected } from "../../../store/slices/auth.slice";
import { handleGoogleOAuthRedirect, startGoogleAuth } from "../../../apis/google.api";
import { ROOT_PATH, appPath } from "../../../router/router";
import showToast from "../../../utils/toast";
import LoadingSpinner from "../../../components/ui/LoadingSpinner.component";

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const params = useParams();
  const [processing, setProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const processCallback = async () => {
      const code = searchParams.get("code") || undefined;
      const ok = searchParams.get("ok") || undefined; // server-side callback may redirect with ok=1 or ok=0
      const stateFromQuery = searchParams.get("state") || undefined;
      const stateFromPath = params.state || undefined;
      const state = stateFromQuery || stateFromPath;
      const error = searchParams.get("error");

      if (error) {
        showToast(`Google OAuth error: ${error}`, { type: "error" });
        setErrorMessage(`Google OAuth error: ${error}`);
        setProcessing(false);
        return;
      }

      // Handle server-side callback redirect which doesn't include a code but instead sends ok=1/0
      if (!code && ok) {
        if (ok === "1") {
          showToast("Successfully connected to Google!", { type: "success" });
          try {
            dispatch(setGoogleConnected());
          } catch {}
          navigate(appPath("/dashboard"));
          return;
        }
        // ok === '0'
        const serverErr = error || "Google authentication failed on server";
        showToast(`Google OAuth error: ${serverErr}`, { type: "error" });
        setErrorMessage(`Google OAuth error: ${serverErr}`);
        setProcessing(false);
        return;
      }

      if (!code) {
        showToast("Missing authorization code. Please restart Google sign-in.", { type: "error" });
        setErrorMessage("Missing authorization code. Please restart Google sign-in.");
        setProcessing(false);
        return;
      }

      const guardKey = `google_oauth_callback_inflight:${code}`;
      try {
        const inflight = sessionStorage.getItem(guardKey);
        if (inflight === "1") {
          setProcessing(false);
          return;
        }
        sessionStorage.setItem(guardKey, "1");
      } catch {
        // ignore
      }

      try {
        // Include the actual redirectUri we used so backend can validate/exchange correctly
        const redirectUri = window.location.origin + window.location.pathname;
        const response = await handleGoogleOAuthRedirect({ code, state: state || "", redirectUri });
        if (response.status === 200) {
          showToast("Successfully connected to Google!", { type: "success" });
          try {
            dispatch(setGoogleConnected());
          } catch (e) {
            // ignore dispatch errors in rare cases
          }
          navigate(appPath("/dashboard"));
          return;
        }
        if (response.status === 409) {
          showToast("Session already processed. Checking connection…", { type: "info" });
          navigate(appPath("/dashboard"));
          return;
        }
        throw new Error(`OAuth callback failed with status ${response.status}`);
      } catch (err) {
        console.error("Google OAuth callback error:", err);
        showToast("Failed to complete Google authentication", { type: "error" });
        setErrorMessage("Failed to complete Google authentication");
        setProcessing(false);
      } finally {
        try {
          sessionStorage.removeItem(guardKey);
        } catch {
          // ignore
        }
      }
      if (mounted) setProcessing(false);
    };
    void processCallback();
    return () => {
      mounted = false;
    };
  }, [searchParams, navigate, dispatch, params.state]);

  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-lg font-medium text-gray-900">Processing Google Authentication...</h2>
          <p className="text-gray-500">Please wait while we complete your login.</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="max-w-lg text-center">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Authentication issue</h2>
          <p className="mb-6 text-sm text-gray-700">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={async () => {
                try {
                  const data = (await startGoogleAuth("json")) as any;
                  if (data && data.data && data.data.url) {
                    window.location.href = data.data.url;
                  } else if (data && data.url) {
                    window.location.href = data.url;
                  }
                } catch {
                  // noop
                }
              }}
              className="px-5 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Retry Connect
            </button>
            <button
              onClick={() => navigate(`${ROOT_PATH}`, { replace: true })}
              className="px-4 py-3 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Return home
            </button>
            <button
              onClick={() => navigate(appPath("/dashboard"), { replace: true })}
              className="px-4 py-3 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              Proceed to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GoogleCallback;
