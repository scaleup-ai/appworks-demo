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
          const tenantsArr = (data as OrgResponse[]).map((t) => ({
            tenantId: String(t.tenantId || t.tenant_id || t.id || ""),
            tenantName: t.tenantName || t.tenant_name || t.clientId || t.id || undefined,
            tenantType: t.tenantType || t.type || undefined,
            clientId: t.clientId || (t.id ? String((t.id as string).split(":")[0]) : undefined),
            organisationNumber: t.organisationNumber || t.organisation_number || undefined,
            createdAt: t.createdAt || t.created_at || undefined,
          }));
          dispatch(setTenants(tenantsArr));
        } catch (err) {
          console.warn("Failed to fetch organisations for Nav", err);
        }
      })();
    }
  }, [selId]);

  // tenant option shape used for rendering
  type TenantOption = {
    tenantId?: string;
    tenant_id?: string;
    id?: string;
    tenantName?: string;
    tenant_name?: string;
    clientId?: string;
    organisationNumber?: string;
    organisation_number?: string;
    name?: string;
  };

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
          {(tenants || []).map((t: TenantOption) => {
            const tid = String(t.tenantId || t.tenant_id || t.id || "");
            const name = t.tenantName || t.tenant_name || t.clientId || t.name || tid;
            const orgNo = t.organisationNumber || t.organisation_number || undefined;
            return <option key={tid} value={tid}>{`${name}${orgNo ? ` • Org#: ${orgNo}` : ""}`}</option>;
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
