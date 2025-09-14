import React, { useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { handleOAuthRedirect } from "../apis/xero.api";
import { setXeroConnected } from "../store/authSlice";
import showToast from "../utils/toast";

const XeroCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const params = useParams();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code") || undefined;
      const stateFromQuery = searchParams.get("state") || undefined;
      const stateFromPath = params.state || undefined;
      const state = stateFromQuery || stateFromPath;
      const error = searchParams.get("error");

      if (error) {
        showToast(`Xero OAuth error: ${error}`, { type: "error" });
        navigate("/auth");
        return;
      }

      if (!code) {
        // Some providers might hit the route without query; show actionable help.
        showToast("Missing authorization code. Please restart Xero sign-in.", { type: "error" });
        navigate("/auth");
        return;
      }

      // One-shot guard keyed by the specific code to avoid duplicate backend calls
      try {
        const guardKey = `xero_oauth_callback_inflight:${code}`;
        const inflight = sessionStorage.getItem(guardKey);
        if (inflight === "1") {
          return; // already processing this code
        }
        sessionStorage.setItem(guardKey, "1");
      } catch {
        // ignore storage issues; continue
      }

      try {
        const response = await handleOAuthRedirect({ code, state: state || "" });

        if (response.status === 200) {
          dispatch(setXeroConnected());
          showToast("Successfully connected to Xero!", { type: "success" });
          navigate("/dashboard");
          return;
        }

        if (response.status === 409) {
          // Authorization code reused. If already connected, proceed; else restart auth.
          showToast("Session already processed. Checking connection…", { type: "info" });
          try {
            const statusResp = await (await import("../apis/xero.api")).getIntegrationStatus();
            const anyResp: any = statusResp as any;
            const isConnected =
              anyResp?.integrationStatus?.success === true ||
              statusResp.connected === true ||
              Boolean(statusResp.tenantId);
            if (isConnected) {
              dispatch(setXeroConnected());
              navigate("/dashboard");
              return;
            }
          } catch {
            // fall through to restart auth
          }
          showToast("Session expired. Restarting Xero sign-in…", { type: "warning" });
          try {
            const { startXeroAuth } = await import("../apis/xero.api");
            const data = (await startXeroAuth("json")) as import("../types/api.types").ConsentUrlResponse;
            if (data && data.url) {
              window.location.href = data.url;
              return;
            }
          } catch {
            // if restart fails, fall through to auth page
          }
          navigate("/auth");
          return;
        }

        throw new Error(`OAuth callback failed with status ${response.status}`);
      } catch (err) {
        console.error("OAuth callback error:", err);
        showToast("Failed to complete Xero authentication", { type: "error" });
        navigate("/auth");
      }
    };

    processCallback();
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
        <h2 className="text-lg font-medium text-gray-900">Processing Xero Authentication...</h2>
        <p className="text-gray-500">Please wait while we complete your login.</p>
      </div>
    </div>
  );
};

export default XeroCallback;
