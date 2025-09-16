import React from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectTenant } from "../store/authSlice";
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

  const handleTenantChange = (v: string | null) => {
    try {
      if (v) localStorage.setItem("selectedTenantId", v);
      else localStorage.removeItem("selectedTenantId");
    } catch (e) {
      console.warn("localStorage write failed", e);
    }
    try {
      dispatch(selectTenant(v));
    } catch (err) {
      console.warn("dispatch(selectTenant) failed", err);
    }
  };

  return (
    <div className={className + " flex items-center gap-4"}>
      {/* show currently selected tenant and link to change */}
      {(() => {
        // show tenant selector when we have tenants
        const selId = useSelector((s: RootState) => s.auth.selectedTenantId);
        const tenants = useSelector((s: RootState) => s.auth.tenants || []);

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => handleTenantChange(e.target.value || null);

        if (tenants && tenants.length > 0) {
          return (
            <div className={linkClass}>
              <label htmlFor="tenant-select" className="sr-only">
                Select organisation
              </label>
              <select id="tenant-select" value={selId || ""} onChange={handleChange} className="text-sm">
                <option value="">(choose org)</option>
                {tenants.map((t) => (
                  <option key={t.tenantId} value={t.tenantId}>
                    {t.tenantName || t.tenantId}
                  </option>
                ))}
              </select>
              <Link to="/select-tenant" className={"ml-2 " + linkClass} onClick={handleLinkClick}>
                Change
              </Link>
            </div>
          );
        }
        // no tenants: keep the existing link to selection page
        return (
          <Link to="/select-tenant" className={linkClass} onClick={handleLinkClick}>
            Select org
          </Link>
        );
      })()}
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
