import React from "react";
import { Link } from "react-router-dom";
import { useTenants, useSelectedTenantId, useSetAuth } from "../store/hooks";
import { useAuthStore } from "../store/auth.store";
import { signOutUser } from "../handlers/signout.handler";

// Tenant selector as its own component
const TenantSelector: React.FC<{
  selId: string;
  tenants: any[];
  onSelect: (id: string) => void;
  className?: string;
}> = ({ selId, tenants, onSelect, className }) => {
  return (
    <div className={className}>
      <select
        value={selId || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="px-2 py-1 text-sm bg-white border rounded"
        aria-label="Select organization"
      >
        {tenants.filter((t: any) => t && String(t.tenantId || "").length > 0).length === 0 && (
          <option value="">Select org</option>
        )}
        {tenants
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
  );
};

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleLinkClick = () => {
    try {
      onLinkClick?.();
    } catch (err) {
      console.error("Error occurred while handling link click:", err);
    }
  };

  const startXeroAuth = async () => {
    try {
      const { getXeroAuthUrl } = await import("../apis/xero.api");
      const url = await getXeroAuthUrl();
      window.location.href = url;
    } catch (err) {
      // Optionally show error toast
    }
  };

  return (
    <div className={className + " flex items-center gap-4"}>
      {!isAuthenticated ? (
        <button onClick={startXeroAuth} className="px-3 py-1 text-sm text-white bg-blue-600 rounded">
          Sign in with Xero
        </button>
      ) : (
        <>
          <TenantSelector
            selId={selId || ""}
            tenants={tenants || []}
            onSelect={(id) => setAuth({ selectedTenantId: id })}
            className={linkClass}
          />
          <button onClick={signOutUser} className="px-3 py-1 ml-2 text-sm text-gray-800 bg-gray-200 rounded">
            Sign out
          </button>
        </>
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
    </div>
  );
};

export default Nav;
