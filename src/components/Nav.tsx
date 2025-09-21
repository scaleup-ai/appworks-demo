import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../apis/axios-client";
import { useTenants, useSelectedTenantId, useSetAuth } from "../store/hooks";

interface NavProps {
  className?: string;
  mobile?: boolean;
  onLinkClick?: () => void;
}

const Nav: React.FC<NavProps> = ({ className = "", mobile = false, onLinkClick }) => {
  const linkClass = mobile ? "block text-sm py-2" : "text-sm px-3";
  const selId = useSelectedTenantId();
  const tenants = useTenants();
  const setAuth = useSetAuth();

  const handleLinkClick = () => {
    try {
      onLinkClick?.();
    } catch (err) {
      console.warn("Nav onLinkClick callback failed", err);
    }
  };

  const startXeroAuth = async () => {
    try {
      const { getXeroAuthUrl, capturePostAuthRedirect } = await import("../apis/xero.api");
      try {
        capturePostAuthRedirect();
      } catch (err) {
        console.warn("capturePostAuthRedirect failed", err);
      }
      // External OAuth redirect, keep window.location.href
      window.location.href = getXeroAuthUrl();
    } catch (err) {
      console.warn("startXeroAuth failed", err);
    }
  };

  type OrgResponse = {
    id?: string;
    clientId?: string;
    tenantId?: string;
    tenant_id?: string;
    tenantName?: string;
    tenant_name?: string;
    organisationNumber?: string;
    organisation_number?: string;
    createdAt?: string;
    created_at?: string;
    tenantType?: string;
    type?: string;
  };

  type NavTenant = {
    tenantId: string;
    tenantName?: string;
    tenantType?: string;
    clientId?: string;
    organisationNumber?: string;
    createdAt?: string;
    displayLabel?: string;
  };

  useEffect(() => {
    if (selId && (!tenants || tenants.length === 0)) {
      (async () => {
        try {
          const resp = await axiosClient.get("/api/v1/xero/organisations");
          const data: OrgResponse[] = resp.data || [];
          const tenantsArr: NavTenant[] = data.map((t: OrgResponse) => {
            let clientId = t.clientId || undefined;
            let tenantIdRaw = t.tenantId || t.tenant_id || undefined;
            if (t.id) {
              const parts = String(t.id).split(":");
              if (parts.length === 2) {
                clientId = clientId || parts[0];
                tenantIdRaw = parts[1];
              } else {
                tenantIdRaw = String(t.id);
              }
            }
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
              displayLabel,
            };
          });
          // dedupe by tenantId before dispatching
          const map = new Map<string, NavTenant>();
          for (const m of tenantsArr) {
            if (!map.has(m.tenantId)) map.set(m.tenantId, m);
            else {
              const ex = map.get(m.tenantId)!;
              ex.tenantName = ex.tenantName || m.tenantName;
              ex.organisationNumber = ex.organisationNumber || m.organisationNumber;
              ex.clientId = ex.clientId || m.clientId;
            }
          }
          setAuth({ tenants: Array.from(map.values()) });
        } catch (err) {
          console.warn("Failed to fetch organisations for Nav", err);
        }
      })();
    }
  }, [selId, tenants, setAuth]);

  const handleSelectChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value || null;
    try {
      setAuth({ selectedTenantId: val });
      if (val === null) {
        localStorage.removeItem("selectedTenantId");
      }
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };

  return (
    <div className={className + " flex items-center gap-4"}>
      {/* Tenant selector / display */}
      <div className={linkClass}>
        <select
          value={selId || ""}
          onChange={handleSelectChange}
          className="px-2 py-1 text-sm bg-white border rounded"
          aria-label="Select organization"
        >
          {(tenants || []).filter((t: any) => t && String(t.tenantId || "").length > 0).length === 0 && (
            <option value="">Select org</option>
          )}
          {(tenants || [])
            .filter((t: any) => t && String(t.tenantId || "").length > 0)
            .map((t: any) => {
              const tid = String(t.tenantId || "");
              const orgNo = t.organisationNumber ? ` • Org#: ${t.organisationNumber}` : "";
              const shortId = tid ? String(tid).slice(0, 8) : "";
              const labelBase = t.tenantName || t.displayLabel || t.clientId || (shortId ? `...${shortId}` : "Unknown");
              const label = `${labelBase}${orgNo}`;
              return (
                <option key={tid} value={tid}>
                  {label}
                </option>
              );
            })}
        </select>
      </div>
      <Link to="/" onClick={handleLinkClick} className={linkClass}>
        Home
      </Link>
      <Link to="/dashboard" onClick={handleLinkClick} className={linkClass}>
        Dashboard
      </Link>
      <Link to="/collections" onClick={handleLinkClick} className={linkClass}>
        Collections
      </Link>
      <Link to="/payments" onClick={handleLinkClick} className={linkClass}>
        Payments
      </Link>
      <Link to="/profitability" onClick={handleLinkClick} className={linkClass}>
        Profitability
      </Link>
      <Link to="/cashflow" onClick={handleLinkClick} className={linkClass}>
        Cash Flow
      </Link>
      <Link to="/settings" onClick={handleLinkClick} className={linkClass}>
        Settings
      </Link>

      <button
        onClick={startXeroAuth}
        className={mobile ? "text-sm font-medium text-blue-600 mt-2" : "text-sm font-medium text-blue-600"}
      >
        Sign in
      </button>
    </div>
  );
};

export default Nav;
