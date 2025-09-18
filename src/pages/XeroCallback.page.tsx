import React, { useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { handleOAuthRedirect } from "../apis/xero.api";
import { setXeroConnected, selectTenant } from "../store/authSlice";
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
        // If another handler (RedirectHandler) is actively processing the
        // callback, avoid showing an error toast. Instead try to detect if
        // the app is already connected (race where backend processed code).
        try {
          const processing = sessionStorage.getItem("xero_processing");
          if (processing === "1") {
            try {
              // If backend already processed the callback, query integration
              // status and proceed to dashboard silently if connected.
              const statusRespRaw = await (await import("../apis/xero.api")).getIntegrationStatus();
              const statusResp = statusRespRaw as unknown as {
                integrationStatus?: { success?: boolean };
                connected?: boolean;
                tenantId?: string;
              } | null;
              const integrationStatus = statusResp?.integrationStatus || null;
              const isConnected =
                (integrationStatus && integrationStatus.success === true) ||
                statusResp?.connected === true ||
                Boolean(statusResp?.tenantId);
              if (isConnected) {
                dispatch(setXeroConnected());
                navigate("/dashboard");
                return;
              }
            } catch {
              // ignore status check failures — fall through to silent return
            }

            // If not connected, silently exit and let the other handler finish.
            return;
          }
        } catch {
          // ignore storage issues (private mode)
        }

        // Some providers might hit the route without query; show actionable help.
        showToast("Missing authorization code. Please restart Xero sign-in.", { type: "error" });
        navigate("/auth");
        return;
      }

      // One-shot guard keyed by the specific code to avoid duplicate backend calls
      const guardKey = `xero_oauth_callback_inflight:${code}`;
      try {
        const inflight = sessionStorage.getItem(guardKey);
        if (inflight === "1") {
          return; // already processing this code
        }
        sessionStorage.setItem(guardKey, "1");
      } catch {
        // ignore storage issues; continue
      }

      // continue: process callback normally

      try {
        const response = await handleOAuthRedirect({ code, state: state || "" });

        // backend may return tenant list when OAuth completes for SPA flows
        if (response.status === 200) {
          type ResponsePayload = {
            tenants?: Array<{
              tenantId?: string;
              tenant_id?: string;
              tenantName?: string;
              tenant_name?: string;
              tenantType?: string;
              type?: string;
              name?: string;
              organization?: string;
            }>;
          };
          const payload = (response.data || {}) as ResponsePayload;
          if (payload.tenants && Array.isArray(payload.tenants) && payload.tenants.length > 0) {
            // If single tenant, auto-select and continue
            if (payload.tenants.length === 1) {
              const single = payload.tenants[0];
              // persist selection for axios and future requests
              const tid = single.tenantId || single.tenant_id || "";
              if (tid) {
                localStorage.setItem("selectedTenantId", tid);
                dispatch(selectTenant(tid));
              }
              dispatch(setXeroConnected());
              showToast("Successfully connected to Xero!", { type: "success" });
              navigate("/dashboard");
              return;
            }

            // multiple tenants -> navigate to selector and pass tenants via state
            navigate("/select-tenant", { state: { tenants: payload.tenants } });
            return;
          }

          // default: mark connected and go to dashboard
          dispatch(setXeroConnected());
          showToast("Successfully connected to Xero!", { type: "success" });
          navigate("/dashboard");
          return;
        }

        if (response.status === 409) {
          // Authorization code reused. If already connected, proceed; else restart auth.
          showToast("Session already processed. Checking connection…", { type: "info" });
          try {
            type StatusResp = {
              integrationStatus?: { success?: boolean };
              connected?: boolean;
              tenantId?: string;
            } | null;
            const statusRespRaw = await (await import("../apis/xero.api")).getIntegrationStatus();
            const statusResp = statusRespRaw as unknown as StatusResp;
            const integrationStatus = statusResp?.integrationStatus || null;
            const isConnected =
              (integrationStatus && integrationStatus.success === true) ||
              statusResp?.connected === true ||
              Boolean(statusResp?.tenantId);
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
      } finally {
        try {
          sessionStorage.removeItem(guardKey);
        } catch {
          // ignore
        }
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
