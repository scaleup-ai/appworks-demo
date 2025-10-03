import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { capturePostAuthRedirect, getXeroAuthUrl, logoutXero, startXeroAuth } from "../apis/xero.api";
import { apiErrorToast } from "../handlers/shared.handler";
import { useTenants } from "../hooks/useTenants";
import { ROOT_PATH, appPath } from "../router/router";
import { AuthStorage, logout, selectTenant } from "../store/slices/auth.slice";
import { RootState } from "../store/store";
import showToast from "../utils/toast";

interface NavProps {
  className?: string;
  mobile?: boolean;
  onLinkClick?: () => void;
}

interface Tenant {
  tenantId?: string;
  tenant_id?: string;
  id?: string;
  openid_sub?: string;
  organisationNumber?: string;
  tenantName?: string;
  displayLabel?: string;
  clientId?: string;
}

const Nav: React.FC<NavProps> = ({ className = "", mobile = false, onLinkClick }) => {
  const linkClass = mobile ? "block text-sm py-2" : "text-sm px-3";
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLinkClick = () => {
    try {
      onLinkClick?.();
    } catch (err) {
      console.warn("Nav onLinkClick callback failed", err);
    }
  };

  const handleStartXeroAuth = async (options?: { persist?: boolean }) => {
    try {
      capturePostAuthRedirect();
      const resp = await startXeroAuth("json", { remember: options?.persist });
      const r = resp as { url?: string } | undefined;
      if (r && r.url) {
        window.location.href = r.url;
        return;
      }
      window.location.href = getXeroAuthUrl();
    } catch (err) {
      console.warn("startXeroAuth failed", err);
      apiErrorToast(showToast, "Failed to start Xero auth")(err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutXero();
    } catch (e) {
      console.warn("Xero logout failed", e);
    }
    dispatch(logout());
    AuthStorage.setSelectedTenantId(null);
    navigate(`${ROOT_PATH}`);
  };

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [persistSession, setPersistSession] = React.useState(false);

  const selectedTenantId = useSelector((s: RootState) => s.auth.selectedTenantId);
  const tenants: Tenant[] = useSelector((s: RootState) => s.auth.tenants || []);
  const xeroConnected = useSelector((s: RootState) => s.auth.xeroConnected);
  const currentOpenIdSub = useSelector((s: RootState) => s.xero.currentOpenIdSub);

  const { loadTenants } = useTenants();

  useEffect(() => {
    if (selectedTenantId && (!tenants || tenants.length === 0)) {
      loadTenants();
    }
  }, [selectedTenantId, tenants, loadTenants]);

  const handleSelectChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value || null;
    AuthStorage.setSelectedTenantId(val);
    dispatch(selectTenant(val));
  };

  // Derive a display label for a tenant object
  const deriveTenantLabel = (ta: Tenant) => {
    const tenantId =
      ta.tenantId || ta.tenant_id || (ta.id ? String(ta.id).split(":")[1] : undefined) || ta.openid_sub || "";
    const orgNo = ta.organisationNumber ? ` • Org#: ${ta.organisationNumber}` : "";
    const shortTid = tenantId ? String(tenantId).slice(0, 8) : "";
    const labelBase = ta.tenantName || ta.displayLabel || ta.clientId || (shortTid ? `...${shortTid}` : "Unknown");
    return `${labelBase}${orgNo}`;
  };

  const visibleTenants = tenants.filter(
    (t) => !currentOpenIdSub || String(t.openid_sub || "") === String(currentOpenIdSub)
  );

  return (
    <div className={className + " flex items-center gap-4 relative"}>
      {/* Tenant selector / display */}
      <div className={linkClass}>
        {visibleTenants.length > 1 ? (
          <select
            value={selectedTenantId || ""}
            onChange={handleSelectChange}
            className="px-2 py-1 text-sm bg-white border rounded"
            aria-label="Select organization"
          >
            {visibleTenants.length === 0 && <option value="">Select org</option>}
            {visibleTenants.map((ta) => {
              const tenantId =
                ta.tenantId || ta.tenant_id || (ta.id ? String(ta.id).split(":")[1] : undefined) || ta.openid_sub || "";
              return (
                <option key={tenantId} value={tenantId}>
                  {deriveTenantLabel(ta)}
                </option>
              );
            })}
          </select>
        ) : visibleTenants.length === 1 ? (
          <div className="px-2 py-1 text-sm text-gray-700 bg-white border rounded">
            {deriveTenantLabel(visibleTenants[0])}
          </div>
        ) : (
          <div className="px-2 py-1 text-sm text-gray-500 bg-white border rounded">No organisations</div>
        )}
      </div>
      <Link to={`${ROOT_PATH}`} onClick={handleLinkClick} className={linkClass}>
        Home
      </Link>
      <Link to={appPath("/dashboard")} onClick={handleLinkClick} className={linkClass}>
        Dashboard
      </Link>
      <Link to={appPath("/collections")} onClick={handleLinkClick} className={linkClass}>
        Collections
      </Link>
      <Link to={appPath("/payments")} onClick={handleLinkClick} className={linkClass}>
        Payments
      </Link>
      <Link to={appPath("/profitability")} onClick={handleLinkClick} className={linkClass}>
        Profitability
      </Link>
      <Link to={appPath("/cashflow")} onClick={handleLinkClick} className={linkClass}>
        Cash Flow
      </Link>

      {!xeroConnected ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleStartXeroAuth({ persist: persistSession })}
            className={mobile ? "text-sm font-medium text-blue-600 mt-2" : "text-sm font-medium text-blue-600"}
          >
            Sign in
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={persistSession} onChange={(e) => setPersistSession(e.target.checked)} />
            Keep me signed in
          </label>
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={mobile ? "text-sm font-medium text-blue-600 mt-2" : "text-sm font-medium text-blue-600"}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            Account ▾
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 w-40 mt-2 bg-white border rounded shadow-md">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(appPath("/settings"));
                  handleLinkClick();
                }}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  void handleSignOut();
                }}
                className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Nav;
