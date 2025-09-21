import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleOAuthRedirect } from "../../../apis/xero.api";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { useSetAuth } from "../../../store/hooks";
import showToast from "../../../utils/toast";

const XeroCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useSetAuth();
  const [processing, setProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const code = searchParams.get("code") || undefined;
    const state = searchParams.get("state") || undefined;
    const error = searchParams.get("error");
    const guardKey = code ? `xero_oauth_callback_inflight:${code}` : undefined;

    const finish = (msg?: string) => {
      if (msg) setErrorMessage(msg);
      setProcessing(false);
    };

    const process = async () => {
      if (error) {
        showToast(`Xero OAuth error: ${error}`, { type: "error" });
        finish(`Xero OAuth error: ${error}`);
        return;
      }
      if (!code) {
        showToast("Missing authorization code. Please restart Xero sign-in.", { type: "error" });
        finish("Missing authorization code. Please restart Xero sign-in.");
        return;
      }
      if (guardKey) {
        try {
          if (sessionStorage.getItem(guardKey) === "1") {
            finish();
            return;
          }
          sessionStorage.setItem(guardKey, "1");
        } catch {}
      }
      try {
        const response = await handleOAuthRedirect({ code, state: state || "" });
        if (response.status === 200) {
          const payload = response.data || {};
          const tenants = Array.isArray(payload.tenants) ? payload.tenants : [];
          if (tenants.length === 1) {
            const t = tenants[0];
            const tid = t.tenantId || t.tenant_id || "";
            if (tid) {
              localStorage.setItem("selectedTenantId", tid);
              localStorage.setItem("xeroConnected", "true");
              setAuth({ selectedTenantId: tid, xeroConnected: true });
              showToast("Successfully connected to Xero!", { type: "success" });
              setTimeout(() => {
                navigate("/dashboard", { replace: true });
              }, 200);
              return;
            }
          }
          if (tenants.length > 1) {
            navigate("/select-tenant", { state: { tenants } });
            return;
          }
          localStorage.setItem("xeroConnected", "true");
          setAuth({ xeroConnected: true });
          showToast("Successfully connected to Xero!", { type: "success" });
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 200);
          return;
        }
        if (response.status === 409) {
          showToast("Session already processed. Checking connection…", { type: "info" });
          try {
            const statusRespRaw = await (await import("../../../apis/xero.api")).getIntegrationStatus();
            const statusResp = statusRespRaw || {};
            // Check connection status using statusResp directly
            const isConnected = statusResp.connected === true || Boolean(statusResp.tenantId);
            if (isConnected) {
              localStorage.setItem("xeroConnected", "true");
              setAuth({ xeroConnected: true });
              setTimeout(() => {
                navigate("/dashboard", { replace: true });
              }, 200);
              return;
            }
          } catch {}
          showToast("Session expired. Restarting Xero sign-in…", { type: "warning" });
          try {
            const { startXeroAuth } = await import("../../../apis/xero.api");
            const data = await startXeroAuth("json");
            // Only redirect if data is ConsentUrlResponse and has .url
            if (data && typeof data === "object" && "url" in data) {
              window.location.href = (data as { url: string }).url;
              return;
            }
          } catch {}
          finish("Session expired. Please try again.");
          return;
        }
        throw new Error(`OAuth callback failed with status ${response.status}`);
      } catch (err) {
        console.error("OAuth callback error:", err);
        showToast("Failed to complete Xero authentication", { type: "error" });
        finish("Failed to complete Xero authentication");
      } finally {
        if (guardKey) {
          try {
            sessionStorage.removeItem(guardKey);
          } catch {}
        }
      }
      if (mounted) setProcessing(false);
    };
    process();
    return () => {
      mounted = false;
    };
  }, [searchParams, navigate]);

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
                  const { startXeroAuth } = await import("../../../apis/xero.api");
                  const data = await startXeroAuth("json");
                  if (data && typeof data === "object" && "url" in data) {
                    window.location.href = (data as { url: string }).url;
                  }
                } catch {}
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
