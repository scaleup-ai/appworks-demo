import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSetSelectedTenantId, useSetAuth, useSelectedTenantId } from "../store/hooks";
import axiosClient from "../apis/axios-client";

type Tenant = {
  tenantId?: string;
  tenant_id?: string;
  tenantName?: string;
  tenant_name?: string;
  tenantType?: string;
  type?: string;
  name?: string;
  organization?: string;
  clientId?: string;
  organisationNumber?: string;
  createdAt?: string;
  displayLabel?: string;
};

type OrgResponse = {
  id?: string;
  clientId?: string;
  tenantId?: string;
  tenant_id?: string;
  tenantName?: string;
  tenant_name?: string;
  tenantType?: string;
  type?: string;
  organisationNumber?: string;
  organisation_number?: string;
  createdAt?: string;
  created_at?: string;
};

const TenantSelector: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setSelectedTenantId = useSetSelectedTenantId();
  const setAuth = useSetAuth();
  const selectedTenantId = useSelectedTenantId();

  const [tenants, setLocalTenants] = useState<Tenant[]>(
    () => (location.state as { tenants?: Tenant[] })?.tenants || []
  );

  useEffect(() => {
    // If no tenants passed via route state, fetch available organisations from backend
    let mounted = true;
    const fetchTenants = async () => {
      if (tenants && tenants.length > 0) return;
      try {
        const resp = await axiosClient.get("/api/v1/xero/organisations");
        const data = resp.data || [];
        const mapped = (data as OrgResponse[]).map((t) => {
          // If backend returned id as `${clientId}:${tenantId}`, parse tenantId
          let tenantIdRaw = t.tenantId || t.tenant_id || undefined;
          if (!tenantIdRaw && t.id) {
            const parts = String(t.id).split(":");
            if (parts.length === 2) tenantIdRaw = parts[1];
            else tenantIdRaw = String(t.id);
          }
          const clientId = t.clientId || (t.id ? String((t.id as string).split(":")[0]) : undefined);
          const orgNo = t.organisationNumber || t.organisation_number || undefined;
          const name = t.tenantName || t.tenant_name || clientId || undefined;
          const shortTid = tenantIdRaw ? String(tenantIdRaw).slice(0, 8) : undefined;
          const displayLabel = `${name || clientId || "Unknown"}${orgNo ? ` • Org#: ${orgNo}` : ""}${shortTid ? ` • ${shortTid}` : ""}`;
          return {
            tenantId: String(tenantIdRaw || ""),
            tenantName: name,
            tenantType: t.tenantType || t.type || undefined,
            clientId,
            organisationNumber: orgNo,
            createdAt: t.createdAt || t.created_at || undefined,
            // helpful display label used in UI
            displayLabel,
          } as unknown as Tenant;
        });

        // dedupe by tenantId while preserving metadata
        const map = new Map<string, (typeof mapped)[number]>();
        for (const m of mapped) {
          const key = String(m.tenantId || "");
          if (!map.has(key)) map.set(key, { ...m, tenantId: key });
          else {
            const ex = map.get(key)!;
            ex.tenantName = ex.tenantName || m.tenantName;
            ex.organisationNumber = ex.organisationNumber || m.organisationNumber;
            ex.clientId = ex.clientId || m.clientId;
          }
        }
        // Also dedupe by displayLabel to avoid showing multiple identical-looking entries
        const byLabel = new Map<string, (typeof mapped)[number]>();
        for (const v of Array.from(map.values())) {
          const key = v.displayLabel || String(v.tenantId || "");
          if (!byLabel.has(key)) byLabel.set(key, v);
        }
        const tenantsArr = Array.from(byLabel.values());
        if (mounted) setLocalTenants(tenantsArr as unknown as Tenant[]);
        // Persist rich shape to Zustand store
        // Ensure all tenantId are strings (never undefined)
        const navTenants = tenantsArr.map((t) => ({
          ...t,
          tenantId: String(t.tenantId || ""),
        }));
        setAuth({ tenants: navTenants });
      } catch (err) {
        console.warn("Failed to fetch organisations", err);
      }
    };
    fetchTenants();
    return () => {
      mounted = false;
    };
  }, [tenants]);

  const handleSelect = (tenantId: string) => {
    try {
      if (tenantId) localStorage.setItem("selectedTenantId", tenantId);
      else localStorage.removeItem("selectedTenantId");
    } catch {
      // ignore storage errors
    }
    // dispatch null when no id
    if (tenantId && tenantId.length > 0) {
      setSelectedTenantId(tenantId);
    } else {
      setSelectedTenantId(""); // Clear selection with empty string
    }
    navigate("/dashboard");
  };

  // filter out any entries without a valid tenant id before rendering
  const visibleTenants = (tenants || []).filter((t) => {
    const tid = String(t?.tenantId || t?.tenant_id || "").trim();
    return tid.length > 0;
  });

  if (!visibleTenants || visibleTenants.length === 0) {
    // Nothing to select
    return (
      <div className="p-6">
        <h3 className="text-lg font-medium">No organizations found</h3>
        <p className="text-sm text-gray-600">No tenants were returned after authentication.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h2 className="mb-4 text-xl font-semibold">Select an Organization</h2>
        <p className="mb-4 text-sm text-gray-600">Choose which Xero organization you want to use for this session.</p>
        <ul>
          {visibleTenants.map((t: Tenant) => {
            const tid = (t.tenantId || t.tenant_id || "").toString();
            const isSelected = Boolean(selectedTenantId && selectedTenantId === tid);
            return (
              <li key={tid} className="mb-3">
                <button
                  onClick={() => handleSelect(tid)}
                  className={`w-full px-4 py-2 text-left border rounded hover:bg-gray-100 ${isSelected ? "bg-blue-50 border-blue-300" : ""}`}
                >
                  <div className="font-medium">
                    {t.tenantName || t.tenant_name || t.clientId || t.name || t.organization || "Unknown"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.organisationNumber ? `Org#: ${t.organisationNumber}` : t.tenantType || t.type || ""}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default TenantSelector;
