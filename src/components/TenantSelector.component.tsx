import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { selectTenant, setTenants, AuthStorage } from "../store/slices/auth.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import axiosClient from "../apis/axios-client";

type Tenant = {
  openid_sub: string;
  tenantName?: string;
  tenantType?: string;
  clientId?: string;
  organisationNumber?: string;
  createdAt?: string;
  displayLabel?: string;
};

type OrgResponse = {
  id?: string;
  clientId?: string;
  openid_sub?: string;
  tenantId?: string;
  tenant_id?: string;
  tenantName?: string;
  tenantType?: string;
  organisationNumber?: string;
  createdAt?: string;
};

const TenantSelector: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const selectedOpenIdSub = useAppSelector((s) => s.xero.currentOpenIdSub);

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
          // prefer explicit tenant_id/tenantId, fall back to openid_sub or id
          const openid_sub =
            (t.openid_sub as string | undefined) ||
            (t.tenantId as string | undefined) ||
            (t.tenant_id as string | undefined) ||
            (t.id as string | undefined) ||
            "";
          const clientId = t.clientId || "";
          const orgNo = t.organisationNumber || "";
          const name = t.tenantName || clientId || "";
          const shortSub = openid_sub ? String(openid_sub).slice(0, 8) : "";
          const displayLabel = `${name}${orgNo ? ` • Org#: ${orgNo}` : ""}${shortSub ? ` • ${shortSub}` : ""}`;
          return {
            openid_sub,
            tenantName: name,
            tenantType: t.tenantType || "",
            clientId,
            organisationNumber: orgNo,
            createdAt: t.createdAt || "",
            displayLabel,
          };
        });

        // dedupe by openid_sub while preserving metadata
        const map = new Map<string, (typeof mapped)[number]>();
        for (const m of mapped) {
          const key = String(m.openid_sub || "");
          if (!map.has(key)) map.set(key, { ...m, openid_sub: key });
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
          const key = v.displayLabel || String(v.openid_sub || "");
          if (!byLabel.has(key)) byLabel.set(key, v);
        }
        const tenantsArr = Array.from(byLabel.values());
        // persist normalized tenants to local state and redux store (rich shape)
        const tenantsArrTyped = tenantsArr.map((t) => ({
          openid_sub: String(t.openid_sub || ""),
          tenantName: t.tenantName,
          tenantType: t.tenantType,
          clientId: t.clientId,
          organisationNumber: t.organisationNumber,
          displayLabel: t.displayLabel,
        }));
        if (mounted) setLocalTenants(tenantsArr as Tenant[]);
        // Persist rich shape to redux regardless of component mount state (safe)
        dispatch(setTenants(tenantsArrTyped));
      } catch (err) {
        console.warn("Failed to fetch organisations", err);
      }
    };
    fetchTenants();
    return () => {
      mounted = false;
    };
  }, [dispatch, tenants]);

  // filter out any entries without a valid tenant id before rendering
  const visibleTenants = (tenants || []).filter((t) => t.openid_sub && t.openid_sub.length > 0);

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
            const sub = t.openid_sub;
            const isSelected = Boolean(selectedOpenIdSub && selectedOpenIdSub === sub);
            return (
              <li key={sub} className="mb-3">
                <button
                  onClick={() => {
                    AuthStorage.setSelectedTenantId(sub);
                    dispatch(selectTenant(sub));
                    navigate("/dashboard");
                  }}
                  className={`w-full px-4 py-2 text-left border rounded hover:bg-gray-100 ${isSelected ? "bg-blue-50 border-blue-300" : ""}`}
                >
                  <div className="font-medium">
                    {t.tenantName || t.displayLabel || t.clientId || sub.slice(0, 8) || "Unknown"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.organisationNumber ? `Org#: ${t.organisationNumber}` : t.tenantType || ""}
                  </div>
                  <div className="text-xs text-gray-400">OpenID: {sub}</div>
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
