import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { handleOAuthRedirect, getIntegrationStatus, startXeroAuth } from "../../../apis/xero.api";
import { setXeroConnected, selectTenant, AuthStorage } from "../../../store/slices/auth.slice";
import { setCurrentOpenIdSub } from "../../../store/slices/xero.slice";
import showToast from "../../../utils/toast";
import LoadingSpinner from "../../../components/ui/LoadingSpinner.component";

const XeroCallback: React.FC = () => {
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
        showToast(`Xero OAuth error: ${error}`, { type: "error" });
        setErrorMessage(`Xero OAuth error: ${error}`);
        setProcessing(false);
        return;
      }

      if (!code) {
        showToast("Missing authorization code. Please restart Xero sign-in.", { type: "error" });
        setErrorMessage("Missing authorization code. Please restart Xero sign-in.");
        setProcessing(false);
        return;
      }

      const guardKey = `xero_oauth_callback_inflight:${code}`;
      try {
        const inflight = sessionStorage.getItem(guardKey);
        if (inflight === "1") {
          setProcessing(false);
          return;
        }
        sessionStorage.setItem(guardKey, "1");
      } catch {
        // ignore storage issues; continue
      }

      try {
        const response = await handleOAuthRedirect({ code, state: state || "" });
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
            if (payload.tenants.length === 1) {
              const single = payload.tenants[0];
              const tid = single.tenantId || single.tenant_id || "";
              if (tid) {
                AuthStorage.setSelectedTenantId(tid);
                dispatch(selectTenant(tid));
              }
              dispatch(setXeroConnected());
              showToast("Successfully connected to Xero!", { type: "success" });
              navigate("/dashboard");
              return;
            }
            navigate("/select-tenant", { state: { tenants: payload.tenants } });
            return;
          }
          dispatch(setXeroConnected());
          dispatch(setCurrentOpenIdSub(null));
          showToast("Successfully connected to Xero!", { type: "success" });
          navigate("/dashboard");
          return;
        }
        if (response.status === 409) {
          showToast("Session already processed. Checking connection…", { type: "info" });
          try {
            type StatusResp = {
              integrationStatus?: { success?: boolean };
              connected?: boolean;
              tenantId?: string;
            } | null;
            const statusRespRaw = await getIntegrationStatus();
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
            const data = (await startXeroAuth("json")) as import("../../../types/api.types").ConsentUrlResponse;
            if (data && data.url) {
              window.location.href = data.url;
              return;
            }
          } catch {
            // if restart fails, fall through to auth page
          }
          setErrorMessage("Session expired. Please try again.");
          setProcessing(false);
          return;
        }
        throw new Error(`OAuth callback failed with status ${response.status}`);
      } catch (err) {
        console.error("OAuth callback error:", err);
        showToast("Failed to complete Xero authentication", { type: "error" });
        setErrorMessage("Failed to complete Xero authentication");
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
    processCallback();
    return () => {
      mounted = false;
    };
  }, [searchParams, navigate, dispatch, params.state]);

  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-lg font-medium text-gray-900">Processing Xero Authentication...</h2>
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
                  const data = (await startXeroAuth("json")) as import("../../../types/api.types").ConsentUrlResponse;
                  if (data && data.url) {
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

export default XeroCallback;