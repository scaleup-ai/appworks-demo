import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { handleOAuthRedirect, startXeroAuth, getXeroToken } from "../../apis/xero.api";
import { setXeroConnected, AuthStorage } from "../../store/slices/auth.slice";
import showToast from "../../utils/toast";
import axiosClient from "../../apis/axios-client";

export type ProcessCallbackResult =
  | { action: "dashboard" }
  | { action: "select-tenant"; tenants: Array<Record<string, unknown>> }
  | { action: "restart-auth" }
  | { action: "error"; message?: string };

type ProcessArgs = {
  code?: string | null;
  state?: string | null;
  signal?: AbortSignal;
};

const getString = (obj: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return undefined as string | undefined;
};

/**
 * Pure-ish handler that encapsulates the Xero OAuth callback flow.
 * - Persists OpenID subject when present
 * - Selects tenant when present
 * - Seeds axios header to avoid first-request races
 * - Polls the server for integration recognition when appropriate
 *
 * Returns a simple action object describing next-step for the caller.
 */
export async function processXeroCallback({ code, state, signal }: ProcessArgs): Promise<ProcessCallbackResult> {
  if (!code) return { action: "error", message: "missing_code" };
  // guard if cancelled
  if (signal?.aborted) return { action: "error", message: "aborted" };

  try {
    const response = await handleOAuthRedirect({ code, state: state || "" });
    // Instrumentation: log the backend response status and keys for debugging
    try {
      console.log('processXeroCallback: backend response', { status: response.status, dataKeys: response && response.data && typeof response.data === 'object' ? Object.keys(response.data) : undefined });
    } catch { /* ignore console failures */ }

    if (signal?.aborted) return { action: "error", message: "aborted" };

    if (response.status === 200) {
      const payload = (response.data || null) as unknown;
      // safe-guard: check for tenants array
      const maybeTenants =
        payload && typeof payload === "object" && (payload as Record<string, unknown>)["tenants"]
          ? (payload as Record<string, unknown>)["tenants"]
          : undefined;
      if (Array.isArray(maybeTenants) && maybeTenants.length > 0) {
        if (maybeTenants.length === 1) {
          const single = maybeTenants[0] as Record<string, unknown>;
          const tid =
            (typeof single["tenantId"] === "string" && (single["tenantId"] as string)) ||
            (typeof single["tenant_id"] === "string" && (single["tenant_id"] as string)) ||
            "";

          let maybeOpenId = getString(single, "openid_sub", "openidSub") || null;
          if (!maybeOpenId) {
            const clientId = getString(single, "clientId", "client_id", "id");
            if (clientId && tid) {
              try {
                const meta = (await getXeroToken(String(clientId), String(tid))) as unknown;
                if (meta && typeof meta === "object") {
                  maybeOpenId =
                    (getString(meta as Record<string, unknown>, "openid_sub", "openidSub") as string) || maybeOpenId;
                }
              } catch {
                // ignore token metadata failures
              }
            }
          }

          if (maybeOpenId) {
            try {
              AuthStorage.setSelectedOpenIdSub(String(maybeOpenId));
            } catch {
              // ignore storage issues
            }
            try {
              if (axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
                axiosClient.defaults.headers.common["X-Openid-Sub"] = String(maybeOpenId);
              }
            } catch {
              // ignore
            }
          }

          if (tid) {
            try {
              AuthStorage.setSelectedTenantId(tid);
            } catch {
              // noop
            }
            return { action: "dashboard" };
          }
        }
        return { action: "select-tenant", tenants: maybeTenants as Array<Record<string, unknown>> };
      }

      // fallback: maybe top-level openid_sub
      const top = response.data as unknown;
      const topOpenId =
        top && typeof top === "object"
          ? (getString(top as Record<string, unknown>, "openid_sub", "openidSub") as string | undefined)
          : undefined;
      if (topOpenId) {
        try {
          AuthStorage.setSelectedOpenIdSub(String(topOpenId));
        } catch {
          // ignore
        }
        try {
          if (axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
            axiosClient.defaults.headers.common["X-Openid-Sub"] = String(topOpenId);
          }
        } catch {
          // ignore
        }
      }

      // success and no tenant selection required
      return { action: "dashboard" };
    }

    if (response.status === 409) {
      // session already processed - ask caller to check server status
      return { action: "restart-auth" };
    }

    return { action: "error", message: `status_${response.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { action: "error", message: message };
  }
}

/**
 * React hook that runs the Xero callback flow on mount and exposes lifecycle-safe callbacks.
 *
 * Usage:
 *  useProcessXeroCallback({ onDashboard: () => ..., onSelectTenant: (tenants) => ..., onError: (msg) => ... })
 */
export function useProcessXeroCallback(options?: {
  onDashboard?: () => void;
  onSelectTenant?: (tenants: Array<Record<string, unknown>>) => void;
  onRestartAuth?: () => void;
  onError?: (message?: string) => void;
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams<Record<string, string | undefined>>();
  const dispatch = useDispatch();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const controller = new AbortController();
    const run = async () => {
      const code = searchParams.get("code") || undefined;
      const stateFromQuery = searchParams.get("state") || undefined;
      const stateFromPath = params.state || undefined;
      const state = stateFromQuery || stateFromPath;

      // call core handler
      const result = await processXeroCallback({ code, state, signal: controller.signal });

      if (controller.signal.aborted) return;

      switch (result.action) {
        case "dashboard":
          try {
            // update redux state and navigate
            dispatch(setXeroConnected());
            navigate("/dashboard");
            options?.onDashboard?.();
          } catch {
            // ignore navigation issues
            options?.onDashboard?.();
          }
          break;
        case "select-tenant":
          try {
            options?.onSelectTenant?.(result.tenants);
            navigate("/select-tenant", { state: { tenants: result.tenants } });
          } catch {
            options?.onSelectTenant?.(result.tenants);
          }
          break;
        case "restart-auth":
          try {
            options?.onRestartAuth?.();
            const data = (await startXeroAuth("json")) as { url?: string } | null;
            if (data && data.url) window.location.href = data.url;
          } catch {
            options?.onError?.("restart_failed");
          }
          break;
        case "error":
        default:
          options?.onError?.(result.message);
          showToast("Failed to complete Xero authentication", { type: "error" });
          break;
      }
    };
    // fire and forget; callers receive callbacks
    run();
    return () => {
      controller.abort();
    };
    // intentionally run once on mount
  }, []);
}

export default useProcessXeroCallback;
