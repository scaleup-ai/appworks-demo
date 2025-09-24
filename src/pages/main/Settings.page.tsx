import React, { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import axiosClient from "../../apis/axios-client";
import { selectTenant, setTenants } from "../../store/authSlice";
import { makeHandleChange } from "../../handlers/settings.handler";
import AppLayout from "../layouts/App.layout";
import TenantListItem from "../../components/ui/TenantListItem.component";
import StatusBadge from "../../components/ui/StatusBadge.component";

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
  const dispatch = useDispatch();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      return localStorage.getItem("selectedTenantId") || null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

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
            const orgsResp = await axiosClient.get("/api/v1/organisations");
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
            // ignore organisations fallback failure
          }
        }
      } catch (err) {
        console.warn("Failed to fetch organisations or status", err);
      } finally {
        // After initial status fetch, probe Google connection state if not present in the status payload
        try {
          const g = (status && (status as any).google) as any | undefined;
          if (g && typeof g.connected === "boolean") {
            setGoogleConnected(Boolean(g.connected));
          } else {
            // fallback probe
            try {
              const resp = await axiosClient.get("/api/v1/google/status");
              setGoogleConnected(Boolean(resp.data && resp.data.connected));
            } catch (inner) {
              setGoogleConnected(false);
            }
          }
        } catch {
          /* ignore */
        }
        setLoading(false);
      }
    };
    void fetch();
  }, [dispatch]);

  const handleChange = useMemo(() => {
    const base = makeHandleChange(dispatch, selectTenant);
    return (ev: React.ChangeEvent<HTMLSelectElement>) => {
      base(ev);
      setSelected(ev.target.value || null);
    };
  }, [dispatch]);

  return (
    <AppLayout>
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

          <div className="max-w-2xl p-4 bg-white border rounded">
            {loading ? (
              <div className="text-sm text-gray-600">Loading status…</div>
            ) : (
              <div>
                {/* Integration summary */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-600">Integration</div>
                    <div className="mt-1 text-lg font-semibold">
                      {(status && (status.integrationStatus as any)?.success) === true ? (
                        <StatusBadge variant="green">Connected</StatusBadge>
                      ) : (
                        <StatusBadge variant="red">Not connected</StatusBadge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {(status && (status.integrationStatus as any)?.message) || "Status unknown"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-600">Tenants</div>
                    <div className="mt-1 text-sm font-semibold">
                      {((status && (status.tenants as any[])?.length) || orgs.length) + " connected"}
                    </div>
                  </div>
                </div>

                {/* Tenants list */}
                <div className="mb-3">
                  <div className="mb-2 text-sm text-gray-600">Connected organizations</div>
                  <ul className="space-y-2">
                    {(status && Array.isArray(status.tenants) ? (status.tenants as any[]) : orgs).map((t: any) => {
                      const key = String(t.tenantId || t.id || String(t.clientId || Math.random()));
                      const title = t.displayLabel || t.tenantName || t.clientId || t.tenantId;
                      const subtitle = `Tenant ID: ${String(t.tenantId || t.id || " ")}`;
                      const meta = t.organisationNumber ? `Org no: ${t.organisationNumber}` : undefined;
                      return <TenantListItem key={key} title={title} subtitle={subtitle} meta={meta} />;
                    })}
                    {status && (status.tenants as any[])?.length === 0 && orgs.length === 0 && (
                      <li className="text-sm text-gray-500">No connected organizations found.</li>
                    )}
                  </ul>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm text-gray-600">Google</div>
                      <div className="mt-1">
                        {googleConnected === null ? (
                          <span className="text-sm text-gray-500">Checking…</span>
                        ) : googleConnected === true ? (
                          <StatusBadge variant="green">Connected</StatusBadge>
                        ) : (
                          <StatusBadge variant="red">Not connected</StatusBadge>
                        )}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => window.open("/api/v1/google/connect", "_blank")}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Connect Google
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRaw((s) => !s)}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {showRaw ? "Hide raw JSON" : "Show raw JSON"}
                  </button>
                  <div className="text-xs text-gray-500">You can view the raw integration payload for debugging.</div>
                </div>

                {/* Show a lightweight toast/alert if Google not connected */}
                {googleConnected === false && (
                  <div className="p-3 mt-3 text-sm text-yellow-800 border-l-4 border-yellow-400 rounded bg-yellow-50">
                    Google is not connected. Click{" "}
                    <button onClick={() => window.open("/api/v1/google/connect", "_blank")} className="underline">
                      Connect Google
                    </button>{" "}
                    to enable features, or go to Settings &gt; Google.
                  </div>
                )}

                {showRaw && (
                  <div className="p-2 mt-3 text-xs border rounded bg-gray-50">
                    <pre className="overflow-auto">
                      {JSON.stringify(status ?? { organisations: orgs.length }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
