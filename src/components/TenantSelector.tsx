import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { selectTenant, setTenants } from "../store/authSlice";
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
  const dispatch = useDispatch();

  const [tenants, setLocalTenants] = useState<Tenant[]>(
    () => (location.state as { tenants?: Tenant[] })?.tenants || []
  );

  useEffect(() => {
    // If no tenants passed via route state, fetch available organisations from backend
    const fetchTenants = async () => {
      if (tenants && tenants.length > 0) return;
      try {
        const resp = await axiosClient.get("/api/v1/xero/organisations");
        const data = resp.data || [];
        const mapped = (data as OrgResponse[]).map((t) => ({
          tenantId: String(t.tenantId || t.tenant_id || t.tenantId || t.tenant_id || t.id || ""),
          tenantName: t.tenantName || t.tenant_name || t.clientId || t.id || undefined,
          tenantType: t.tenantType || t.type || undefined,
          clientId: t.clientId || (t.id ? String((t.id as string).split(":")[0]) : undefined),
          organisationNumber: t.organisationNumber || t.organisation_number || undefined,
          createdAt: t.createdAt || t.created_at || undefined,
        }));

        // dedupe by tenantId while preserving metadata
        const map = new Map<string, (typeof mapped)[number]>();
        for (const m of mapped) {
          if (!map.has(m.tenantId)) map.set(m.tenantId, m);
          else {
            const ex = map.get(m.tenantId)!;
            ex.tenantName = ex.tenantName || m.tenantName;
            ex.organisationNumber = ex.organisationNumber || m.organisationNumber;
            ex.clientId = ex.clientId || m.clientId;
          }
        }
        const tenantsArr = Array.from(map.values());
        // persist normalized tenants to local state and redux store
        setLocalTenants(tenantsArr as unknown as Tenant[]);
        dispatch(setTenants(tenantsArr));
      } catch (err) {
        console.warn("Failed to fetch organisations", err);
      }
    };
    fetchTenants();
  }, []);

  const handleSelect = (tenantId: string) => {
    localStorage.setItem("selectedTenantId", tenantId);
    dispatch(selectTenant(tenantId));
    navigate("/dashboard");
  };

  if (!tenants || tenants.length === 0) {
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
          {tenants.map((t: Tenant) => (
            <li key={t.tenantId || t.tenant_id} className="mb-3">
              <button
                onClick={() => handleSelect(t.tenantId || t.tenant_id || "")}
                className="w-full px-4 py-2 text-left border rounded hover:bg-gray-100"
              >
                <div className="font-medium">
                  {t.tenantName || t.tenant_name || t.clientId || t.name || t.organization || "Unknown"}
                </div>
                <div className="text-xs text-gray-500">
                  {t.organisationNumber ? `Org#: ${t.organisationNumber}` : t.tenantType || t.type || ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TenantSelector;
