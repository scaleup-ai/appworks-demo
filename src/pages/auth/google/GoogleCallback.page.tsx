import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setXeroConnected } from "../../../store/authSlice";
import { handleGoogleOAuthRedirect } from "../../../apis/google.api";
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
        const response = await handleGoogleOAuthRedirect({ code, state: state || "" });
        if (response.status === 200) {
          showToast("Successfully connected to Google!", { type: "success" });
          try {
            // update redux auth state so the app has a single source of truth
            // (mirrors Xero callback behavior)
            dispatch(setXeroConnected() as any);
          } catch (e) {
            // ignore dispatch errors in rare cases
          }
          navigate("/dashboard");
          return;
        }
        if (response.status === 409) {
          showToast("Session already processed. Checking connection…", { type: "info" });
          // Fallback: go to dashboard and let status settle
          navigate("/dashboard");
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
                  const { startGoogleAuth } = await import("../../../apis/google.api");
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
              onClick={() => navigate("/", { replace: true })}
              className="px-4 py-3 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Return home
            </button>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
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
