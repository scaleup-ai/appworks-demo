import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axiosClient from "../../apis/axios-client";
import { selectTenant, setTenants, AuthStorage } from "../../store/slices/auth.slice";
import { makeHandleChange } from "../../handlers/settings.handler";
import AppLayout from "../layouts/App.layout";
import TenantListItem from "../../components/ui/TenantListItem.component";
import StatusBadge from "../../components/ui/StatusBadge.component";
import GoogleIntegrationCard from "../../components/ui/settings/GoogleIntegrationCard.component";
import XeroIntegrationCard from "../../components/ui/settings/XeroIntegrationCard.component";

type Org = {
  id?: string;
  tenantId?: string;
  tenant_id?: string;
  tenantName?: string;
  tenant_name?: string;
  clientId?: string;
  organisationNumber?: string;
  displayLabel?: string;
};

const SettingsPage: React.FC = () => {
  // Get current openid_sub from xero slice
  const currentOpenIdSub = useSelector((s: RootState) => s.xero.currentOpenIdSub);
  const dispatch = useDispatch();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const reduxSelected = useSelector((s: RootState) => s.auth.selectedTenantId);
  const [selected, setSelected] = useState<string | null>(() => reduxSelected ?? AuthStorage.getSelectedTenantId());
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // Prefer enriched integration status endpoint which may include tenants + connectionCount
        const statusResp = await axiosClient.get("/api/v1/xero/integration/status");
        const statusData = (statusResp.data as Record<string, unknown>) || {};
        setStatus(statusData);

        // If the status endpoint returned a tenants array, use it; otherwise fall back to /organisations
        if (Array.isArray(statusData.tenants) && statusData.tenants.length > 0) {
          const orgData = statusData.tenants as Array<Record<string, unknown>>;
          const mapped: Org[] = orgData.map((t) => {
            const tenantIdRaw = (t.tenantId as string | undefined) || (t.tenant_id as string | undefined) || undefined;
            const idRaw = t.id as string | undefined;
            return {
              id: idRaw,
              tenantId: tenantIdRaw,
              tenant_id: tenantIdRaw,
              tenantName: (t.tenantName as string | undefined) || (t.tenant_name as string | undefined) || undefined,
              clientId: t.clientId as string | undefined,
              organisationNumber: t.organisationNumber as string | undefined,
              displayLabel:
                (t.displayLabel as string | undefined) || (t.display_name as string | undefined) || undefined,
            };
          });
          setOrgs(mapped);
        } else {
          try {
            const orgsResp = await axiosClient.get("/api/v1/xero/organisations");
            const orgsData = (orgsResp.data as Array<Record<string, unknown>> | null) || [];
            const mapped: Org[] = orgsData.map((t) => ({
              id: (t.id as string | undefined) || undefined,
              tenantId: (t.tenantId as string | undefined) || (t.tenant_id as string | undefined) || undefined,
              tenant_id: (t.tenant_id as string | undefined) || undefined,
              tenantName: (t.tenantName as string | undefined) || (t.tenant_name as string | undefined) || undefined,
              clientId: t.clientId as string | undefined,
              organisationNumber: t.organisationNumber as string | undefined,
              displayLabel:
                (t.displayLabel as string | undefined) || (t.display_name as string | undefined) || undefined,
            }));
            setOrgs(mapped);
          } catch (innerErr) {
            // If unauthorized, clear orgs and continue silently
            try {
              const maybe = innerErr as unknown;
              if (typeof maybe === "object" && maybe !== null && "response" in (maybe as Record<string, unknown>)) {
                const resp = (maybe as Record<string, unknown>)["response"];
                if (resp && typeof resp === "object" && (resp as Record<string, unknown>)["status"] === 401) {
                  setOrgs([]);
                  return;
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch organisations or status", err);
      } finally {
        // After initial status fetch, Google connection is handled by the dedicated component.
        setLoading(false);
      }
    };
    void fetch();
  }, [dispatch]);

  const handleChange = useMemo(() => {
    const base = makeHandleChange(dispatch, selectTenant);
    return (ev: React.ChangeEvent<HTMLSelectElement>) => {
      base(ev);
      const v = ev.target.value || null;
      setSelected(v);
      AuthStorage.setSelectedTenantId(v);
    };
  }, [dispatch]);

  return (
    <AppLayout>
      {/* Translucent OpenID info for Xero user scoping */}
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
            <select value={selected || ""} onChange={handleChange} className="w-full px-3 py-2 border rounded">
              <option value="">(none)</option>
              {orgs.map((o) => (
                <option key={o.tenantId} value={o.tenantId}>
                  {o.displayLabel || o.tenantName || o.clientId || o.tenantId}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-sm text-gray-600">Connected organizations: {orgs.length}</div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Xero Integration</h2>
          <p className="mb-2 text-sm text-gray-600">Current integration status and connected organizations.</p>

          <div className="max-w-2xl space-y-4">
            <XeroIntegrationCard
              status={status}
              orgs={orgs}
              loading={loading}
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
