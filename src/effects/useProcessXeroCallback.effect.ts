import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { handleOAuthRedirect, startXeroAuth, getXeroToken } from "../apis/xero.api";
import { setXeroConnected, AuthStorage } from "../store/slices/auth.slice";
import showToast from "../utils/toast";
import axiosClient from "../apis/axios-client";

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
  return undefined;
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
  if (signal?.aborted) return { action: "error", message: "aborted" };

  try {
    const response = await handleOAuthRedirect({ code, state: state || "" });
    if (signal?.aborted) return { action: "error", message: "aborted" };

    // Handle non-200 early
    if (response.status === 409) return { action: "restart-auth" };
    if (response.status !== 200) return { action: "error", message: `status_${response.status}` };

    // At this point response.status === 200
    const payload = (response.data || null) as unknown;
    const payloadObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

    const extractTenantId = (single: Record<string, unknown> | null): string => {
      if (!single) return "";
      if (typeof single["tenantId"] === "string") return `${single["tenantId"]}`;
      if (typeof single["tenant_id"] === "string") return `${single["tenant_id"]}`;
      return "";
    };

    // NOTE: inlining the openid resolution and storage so errors surface to the outer catch.

    const tenants = payloadObj && Array.isArray(payloadObj.tenants) ? (payloadObj.tenants as Array<Record<string, unknown>>) : [];

    // handle tenants: multiple -> select-tenant, single -> try set and dashboard
    if (tenants.length > 1) return { action: "select-tenant", tenants };

    if (tenants.length === 1) {
      const single = tenants[0] || null;
      const tid = extractTenantId(single);

      // resolve openid: direct first, then try token metadata
      let maybeOpenId: string | null = getString(single ?? {}, "openid_sub", "openidSub") ?? null;
      if (!maybeOpenId) {
        const clientId = getString(single ?? {}, "clientId", "client_id", "id");
        if (clientId && tid) {
          const meta = (await getXeroToken(`${clientId}`, `${tid}`)) as unknown;
          if (meta && typeof meta === "object") {
            const metaOpenId = getString(meta as Record<string, unknown>, "openid_sub", "openidSub");
            if (metaOpenId) maybeOpenId = metaOpenId;
          }
        }
      }

      if (maybeOpenId) {
        AuthStorage.setSelectedOpenIdSub(maybeOpenId);
        if (axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
          axiosClient.defaults.headers.common["X-Openid-Sub"] = `${maybeOpenId}`;
        }
      }

      if (tid) {
        AuthStorage.setSelectedTenantId(tid);
        return { action: "dashboard" };
      }
    }

    // No tenants or single tenant without tid -> fallback to top-level openid
    const top = response.data as unknown;
    let topOpenId: string | undefined;
    if (top && typeof top === "object") {
      topOpenId = getString(top as Record<string, unknown>, "openid_sub", "openidSub");
    }
    if (topOpenId) {
      AuthStorage.setSelectedOpenIdSub(topOpenId);
      if (axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
        axiosClient.defaults.headers.common["X-Openid-Sub"] = `${topOpenId}`;
      }
    }

    return { action: "dashboard" };
  } catch (err) {
    const message = err instanceof Error ? err.message : `${err}`;
    return { action: "error", message };
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
