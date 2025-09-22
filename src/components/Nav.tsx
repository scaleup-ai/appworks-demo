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
  // Dynamic sign-in state
  const isAuthenticated = Boolean(selId && tenants && tenants.length > 0);

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
    // Auto-select tenant if only one
    if (tenants && tenants.length === 1 && !selId) {
      setAuth({ selectedTenantId: tenants[0].tenantId });
    }
  }, [selId, tenants, setAuth]);

  const handleSelectChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value || null;
    try {
      setAuth({ selectedTenantId: val });
      if (val === null) {
        // Removed localStorage usage; rely on Zustand only
      }
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };

  return (
    <div className={className + " flex items-center gap-4"}>
      {/* Dynamic sign-in and tenant selector */}
      {!isAuthenticated ? (
        <button onClick={startXeroAuth} className="px-3 py-1 text-sm text-white bg-blue-600 rounded">
          Sign in with Xero
        </button>
      ) : (
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
                const labelBase =
                  t.tenantName || t.displayLabel || t.clientId || (shortId ? `...${shortId}` : "Unknown");
                const label = `${labelBase}${orgNo}`;
                return (
                  <option key={tid} value={tid}>
                    {label}
                  </option>
                );
              })}
          </select>
        </div>
      )}
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
