import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axiosClient from "../../apis/axios-client";
import BACKEND_ROUTES from "../../router/backend.routes";
import { selectTenant, AuthStorage } from "../../store/slices/auth.slice";
import AppLayout from "../layouts/App.layout";
import GoogleIntegrationCard from "../../components/ui/settings/GoogleIntegrationCard.component";
import XeroIntegrationCard from "../../components/ui/settings/XeroIntegrationCard.component";
import { useTenants } from "../../hooks/useTenants";
import { useApi } from "../../hooks/useApi";

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch();
  const {
    tenants: tenantsFromStore,
    selectedTenantId,
    currentOpenIdSub,
  } = useSelector((state: RootState) => ({
    tenants: state.auth.tenants || [],
    selectedTenantId: state.auth.selectedTenantId,
    currentOpenIdSub: state.xero.currentOpenIdSub,
  }));

  const [showRaw, setShowRaw] = useState(false);

  const { loadTenants, isLoading: tenantsLoading } = useTenants();
  // Defensive: include X-Openid-Sub header from AuthStorage in case the
  // axios interceptor ran before Redux/localStorage hydration. Memoize the
  // API function so `useApi` returns a stable `execute` and the effect
  // below doesn't re-run on every render (which caused repeated requests
  // and spammy toasts when the request timed out).
  const selectedOpenLocal = (() => {
    try {
      return AuthStorage.getSelectedOpenIdSub();
    } catch {
      return null;
    }
  })();

  const statusApiFunc = React.useCallback(() => {
    const headers: Record<string, string> = {};
    if (selectedOpenLocal) headers["X-Openid-Sub"] = String(selectedOpenLocal);
    const url = BACKEND_ROUTES?.xero?.integrationStatus || "/api/v1/xero/integration/status";
    return axiosClient.get(url, { headers });
  }, [selectedOpenLocal]);

  const { execute: fetchStatus, isLoading: statusLoading } = useApi(statusApiFunc);

  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    loadTenants();
    fetchStatus().then((status: { data: any } | undefined) => setStatus(status?.data));
  }, [loadTenants, fetchStatus]);

  const handleChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value || null;
    AuthStorage.setSelectedTenantId(val);
    dispatch(selectTenant(val));
  };

  const displayedOrgs = currentOpenIdSub
    ? tenantsFromStore.filter((t: any) => String(t.openid_sub || "") === String(currentOpenIdSub))
    : tenantsFromStore;

  const isLoading = tenantsLoading || statusLoading;

  return (
    <AppLayout>
      {currentOpenIdSub && (
        <div style={{ position: "absolute", top: 16, right: 16, opacity: 0.5, pointerEvents: "none", zIndex: 10 }}>
          <div className="px-3 py-2 text-xs text-blue-900 border border-blue-200 rounded shadow bg-blue-50">
            <span>Xero OpenID (sub):</span>
            <span className="ml-2 font-mono">{currentOpenIdSub}</span>
          </div>
        </div>
      )}
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
        <section className="mb-6">
          <h2 className="text-lg font-medium">Organization</h2>
          <p className="mb-2 text-sm text-gray-600">Select which connected Xero organization to use for the app.</p>
          <div className="max-w-md">
            <select value={selectedTenantId || ""} onChange={handleChange} className="w-full px-3 py-2 border rounded">
              <option value="">(none)</option>
              {displayedOrgs.map((o: any) => (
                <option key={o.tenantId} value={o.tenantId}>
                  {o.displayLabel || o.tenantName || o.clientId || o.tenantId}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-sm text-gray-600">Connected organizations: {displayedOrgs.length}</div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Xero Integration</h2>
          <p className="mb-2 text-sm text-gray-600">Current integration status and connected organizations.</p>
          <div className="max-w-2xl space-y-4">
            <XeroIntegrationCard
              status={status}
              orgs={displayedOrgs}
              loading={isLoading}
              showRaw={showRaw}
              setShowRaw={setShowRaw}
            />
            <GoogleIntegrationCard />
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
