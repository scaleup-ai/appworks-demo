import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import axiosClient from "../../apis/axios-client";
import { selectTenant, setTenants } from "../../store/authSlice";

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
          const mapped = orgData.map((t) => {
            let tenantIdRaw = (t.tenantId as string | undefined) || (t.tenant_id as string | undefined) || undefined;
            const idRaw = t.id as string | undefined;
            if (!tenantIdRaw && idRaw) {
              const parts = String(idRaw).split(":");
              if (parts.length === 2) tenantIdRaw = parts[1];
              else tenantIdRaw = String(idRaw);
            }
            const clientId = (t.clientId as string | undefined) || (idRaw ? String(idRaw).split(":")[0] : undefined);
            const name =
              (t.tenantName as string | undefined) || (t.tenant_name as string | undefined) || clientId || undefined;
            const shortTid = tenantIdRaw ? String(tenantIdRaw).slice(0, 8) : undefined;
            const organisationNumber =
              (t.organisationNumber as string | undefined) ||
              (t.organisation_number as string | undefined) ||
              undefined;
            const displayLabel = `${name || clientId || "Unknown"}${organisationNumber ? ` • Org#: ${organisationNumber}` : ""}${shortTid ? ` • ${shortTid}` : ""}`;
            return {
              tenantId: String(tenantIdRaw || ""),
              tenantName: name,
              clientId,
              organisationNumber,
              displayLabel,
            } as Org;
          });
          setOrgs(mapped);
          dispatch(
            setTenants(
              mapped.map((m) => ({
                tenantId: String(m.tenantId || ""),
                tenantName: m.tenantName,
                clientId: m.clientId,
                organisationNumber: m.organisationNumber,
                displayLabel: m.displayLabel,
              }))
            )
          );
        } else {
          // fallback to older organisations endpoint
          const orgResp = await axiosClient.get("/api/v1/xero/organisations");
          const orgData = orgResp.data || [];
          const mapped = (orgData as Array<Record<string, unknown>>).map((t) => {
            let tenantIdRaw = (t.tenantId as string | undefined) || (t.tenant_id as string | undefined) || undefined;
            const idRaw = t.id as string | undefined;
            if (!tenantIdRaw && idRaw) {
              const parts = String(idRaw).split(":");
              if (parts.length === 2) tenantIdRaw = parts[1];
              else tenantIdRaw = String(idRaw);
            }
            const clientId = (t.clientId as string | undefined) || (idRaw ? String(idRaw).split(":")[0] : undefined);
            const name =
              (t.tenantName as string | undefined) || (t.tenant_name as string | undefined) || clientId || undefined;
            const shortTid = tenantIdRaw ? String(tenantIdRaw).slice(0, 8) : undefined;
            const organisationNumber =
              (t.organisationNumber as string | undefined) ||
              (t.organisation_number as string | undefined) ||
              undefined;
            const displayLabel = `${name || clientId || "Unknown"}${organisationNumber ? ` • Org#: ${organisationNumber}` : ""}${shortTid ? ` • ${shortTid}` : ""}`;
            return {
              tenantId: String(tenantIdRaw || ""),
              tenantName: name,
              clientId,
              organisationNumber,
              displayLabel,
            } as Org;
          });
          setOrgs(mapped);
          dispatch(
            setTenants(
              mapped.map((m) => ({
                tenantId: String(m.tenantId || ""),
                tenantName: m.tenantName,
                clientId: m.clientId,
                organisationNumber: m.organisationNumber,
                displayLabel: m.displayLabel,
              }))
            )
          );
        }
      } catch (err) {
        console.warn("Failed to fetch organisations or status", err);
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [dispatch]);

  const handleChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value || null;
    try {
      if (val) {
        localStorage.setItem("selectedTenantId", val);
        dispatch(selectTenant(val));
      } else {
        localStorage.removeItem("selectedTenantId");
        dispatch(selectTenant(null));
      }
      setSelected(val);
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };

  return (
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
        <p className="mb-2 text-sm text-gray-600">Current integration status and limits returned by the backend.</p>
        <div className="max-w-2xl p-3 rounded bg-gray-50">
          {loading ? (
            <div>Loading status…</div>
          ) : (
            <pre className="overflow-auto text-xs">
              {JSON.stringify(status ?? { organisations: orgs.length }, null, 2)}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
