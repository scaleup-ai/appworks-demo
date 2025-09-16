import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setTenants, selectTenant } from "../store/authSlice";
import axiosClient from "../apis/axios-client";
import { RootState } from "../store/store";

interface NavProps {
  className?: string;
  mobile?: boolean;
  onLinkClick?: () => void;
}

const Nav: React.FC<NavProps> = ({ className = "", mobile = false, onLinkClick }) => {
  const linkClass = mobile ? "block text-sm py-2" : "text-sm px-3";

  const handleLinkClick = () => {
    // single, explicit place to invoke the optional callback
    try {
      onLinkClick?.();
    } catch (err) {
      // non-fatal callback error
      console.warn("Nav onLinkClick callback failed", err);
    }
  };

  const startXeroAuth = async () => {
    try {
      const { getXeroAuthUrl, capturePostAuthRedirect } = await import("../apis/xero.api");
      try {
        capturePostAuthRedirect();
      } catch (err) {
        // non-fatal; best-effort only
        console.warn("capturePostAuthRedirect failed", err);
      }
      window.location.href = getXeroAuthUrl();
    } catch (err) {
      console.warn("startXeroAuth failed", err);
    }
  };

  const dispatch = useDispatch();

  // tenant change is handled elsewhere (Nav only displays friendly name)

  // read tenant state at top-level so we can show friendly names and fetch missing metadata
  const selId = useSelector((s: RootState) => s.auth.selectedTenantId);
  const tenants = useSelector((s: RootState) => s.auth.tenants || []);

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

  useEffect(() => {
    // If a tenant is selected but the store has no tenant metadata yet, fetch organisations
    if (selId && (!tenants || tenants.length === 0)) {
      void (async () => {
        try {
          const resp = await axiosClient.get("/api/v1/xero/organisations");
          const data = resp.data || [];
          type NavTenant = {
            tenantId: string;
            tenantName?: string;
            tenantType?: string;
            clientId?: string;
            organisationNumber?: string;
            createdAt?: string;
            displayLabel?: string;
          };
          const tenantsArr = (data as OrgResponse[]).map((t) => {
            let tenantIdRaw = t.tenantId || t.tenant_id || undefined;
            let clientId = t.clientId || undefined;
            if (!tenantIdRaw && t.id) {
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
            } as NavTenant;
          });
          // dedupe by tenantId before dispatching
          const map = new Map<string, (typeof tenantsArr)[number]>();
          for (const m of tenantsArr) {
            if (!map.has(m.tenantId)) map.set(m.tenantId, m);
            else {
              const ex = map.get(m.tenantId)!;
              ex.tenantName = ex.tenantName || m.tenantName;
              ex.organisationNumber = ex.organisationNumber || m.organisationNumber;
              ex.clientId = ex.clientId || m.clientId;
            }
          }
          dispatch(
            setTenants(
              Array.from(map.values()).map((m) => ({
                tenantId: String(m.tenantId || ""),
                tenantName: m.tenantName,
                tenantType: m.tenantType,
                clientId: m.clientId,
                organisationNumber: m.organisationNumber,
                displayLabel: m.displayLabel,
              }))
            )
          );
        } catch (err) {
          console.warn("Failed to fetch organisations for Nav", err);
        }
      })();
    }
  }, [selId]);

  // UI rendering tenant shape is provided by auth store

  const handleSelectChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value || null;
    try {
      if (val) {
        localStorage.setItem("selectedTenantId", val);
        // dispatch selectTenant action
        // import kept minimal here to avoid circular deps
        dispatch(selectTenant(val));
      } else {
        localStorage.removeItem("selectedTenantId");
        dispatch(selectTenant(null));
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
          <option value="">Select org</option>
          {(tenants || [])
            .filter((t) => t && String(t.tenantId || "").length > 0)
            .map(
              (t: {
                tenantId: string;
                tenantName?: string;
                clientId?: string;
                organisationNumber?: string;
                displayLabel?: string;
              }) => {
                const tid = String(t.tenantId || "");
                const label =
                  t.displayLabel ||
                  (t.tenantName || t.clientId || tid) +
                    (t.organisationNumber ? ` • Org#: ${t.organisationNumber}` : "");
                return (
                  <option key={tid} value={tid}>
                    {label}
                  </option>
                );
              }
            )}
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
