import { Dispatch } from "react";
import axiosClient from "../apis/axios-client";
import showToast from "../utils/toast";
import { logout as logoutAction, setTenants as setTenantsAction } from "../store/slices/auth.slice";
import { AnyAction } from "@reduxjs/toolkit";
import { parseAndDedupTenants, safeLocalStorageRemove, apiErrorToast } from "./shared.handler";

export function makeHandleStartXeroAuth() {
  return async function handleStartXeroAuth() {
    try {
      const xeroApi = await import("../apis/xero.api");
      const { capturePostAuthRedirect, startXeroAuth, getXeroAuthUrl } = xeroApi;
      try {
        capturePostAuthRedirect();
      } catch (err) {
        console.warn("capturePostAuthRedirect failed", err);
      }
      // If SPA JSON start is supported, prefer it so we can attach headers
      try {
        const remember = (() => {
          try { return localStorage.getItem('remember_me') === '1'; } catch { return false; }
        })();
        const resp = await startXeroAuth('json', { remember });
        const r = resp as { url?: string } | undefined;
        if (r && r.url) {
          // If server returned a consent URL, navigate there
          window.location.href = r.url;
          return;
        }
      } catch {
        // fallback to direct redirect URL
        try {
          window.location.href = getXeroAuthUrl();
          return;
        } catch {
          // fall through to generic error handling
        }
      }
    } catch (err) {
      console.warn("startXeroAuth failed", err);
      apiErrorToast(showToast, "Failed to start Xero auth")(err);
    }
  };
}

export function makeHandleSignOut(dispatch: Dispatch<AnyAction>, navigate: (path: string) => void) {
  return async function handleSignOut() {
    try {
      const xeroApi = await import("../apis/xero.api");
      try {
        await xeroApi.logoutXero();
      } catch (err) {
        console.warn("xeroApi.logoutXero failed", err);
      }
    } catch (e) {
      console.warn("Failed to import xero.api for logout", e);
    }

    try {
      // Dispatch the auth slice logout action
      dispatch(logoutAction() as unknown as AnyAction);
      safeLocalStorageRemove("selectedTenantId");
      navigate("/");
    } catch (err) {
      console.warn("Sign out failed", err);
      apiErrorToast(showToast, "Sign out failed")(err);
    }
  };
}

export function makeFetchAndSetTenants(dispatch: Dispatch<AnyAction>) {
  return async function fetchAndSetTenants() {
    try {
      const resp = await axiosClient.get("/api/v1/xero/organisations");
      const finalTenants = parseAndDedupTenants(resp.data || []);
      dispatch(setTenantsAction(finalTenants) as unknown as AnyAction);
    } catch (err) {
      // If unauthorized, clear tenants silently (backend may require explicit auth header)
      // Axios client will already clear access token on 401; handle gracefully here.
      // Parse axios error shape
      try {
        const maybe = err as unknown;
        if (typeof maybe === 'object' && maybe !== null && 'response' in (maybe as Record<string, unknown>)) {
          const resp = (maybe as Record<string, unknown>)['response'];
          if (resp && typeof resp === 'object' && (resp as Record<string, unknown>)['status'] === 401) {
            dispatch(setTenantsAction([]) as unknown as AnyAction);
            return;
          }
        }
      } catch {
        // ignore parsing errors
      }
      console.warn("Failed to fetch organisations for Nav", err);
    }
  };
}
