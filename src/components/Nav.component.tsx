import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setTenants, selectTenant, AuthStorage } from "../store/slices/auth.slice";
import axiosClient from "../apis/axios-client";
import { RootState } from "../store/store";
import { makeHandleStartXeroAuth, makeHandleSignOut } from "../handlers/auth.handler";
import { useNavigate } from "react-router-dom";

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

  // auth handlers (moved to handlers for reuse)

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleStartXeroAuth = makeHandleStartXeroAuth();
  const handleSignOut = makeHandleSignOut(dispatch, navigate);

  const [menuOpen, setMenuOpen] = React.useState(false);

  // tenant change is handled elsewhere (Nav only displays friendly name)

  // read tenant state at top-level so we can show friendly names and fetch missing metadata
  const selectedTenantId = useSelector((s: RootState) => s.auth.selectedTenantId);
  const tenants = useSelector((s: RootState) => s.auth.tenants || []);
  const xeroConnected = useSelector((s: RootState) => s.auth.xeroConnected);
  const currentOpenIdSub = useSelector((s: RootState) => s.xero.currentOpenIdSub);

  type OrganizationDetails = {
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
    if (selectedTenantId && (!tenants || tenants.length === 0)) {
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
          const tenantsArr = (data as OrganizationDetails[]).map((t) => {
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
  }, [selectedTenantId]);

  // UI rendering tenant shape is provided by auth store

  const handleSelectChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value || null;
    try {
      if (val) {
        AuthStorage.setSelectedTenantId(val);
        // dispatch selectTenant action
        // import kept minimal here to avoid circular deps
        dispatch(selectTenant(val));
      } else {
        AuthStorage.setSelectedTenantId(null);
        dispatch(selectTenant(null));
      }
    } catch (e) {
      console.warn("Failed to persist tenant selection", e);
    }
  };

  // sign-out handled by makeHandleSignOut (wired below)

  return (
    <div className={className + " flex items-center gap-4 relative"}>
      {/* Tenant selector / display */}
      <div className={linkClass}>
        <select
          value={selectedTenantId || ""}
          onChange={handleSelectChange}
          className="px-2 py-1 text-sm bg-white border rounded"
          aria-label="Select organization"
        >
          {/* Only show a blank placeholder when we have no tenants loaded */}
          {(tenants || []).length === 0 && <option value="">Select org</option>}
          {((tenants || []) as any[])
            .filter((t) => !currentOpenIdSub || String(t.openid_sub || "") === String(currentOpenIdSub))
            .map((t) => {
              const ta: any = t;
              const tenantId =
                ta.tenantId || ta.tenant_id || (ta.id ? String(ta.id).split(":")[1] : undefined) || ta.openid_sub || "";
              const orgNo = ta.organisationNumber ? ` • Org#: ${ta.organisationNumber}` : "";
              const shortTid = tenantId ? String(tenantId).slice(0, 8) : "";
              const labelBase =
                ta.tenantName || ta.displayLabel || ta.clientId || (shortTid ? `...${shortTid}` : "Unknown");
              const label = `${labelBase}${orgNo}`;
              return (
                <option key={tenantId} value={tenantId}>
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

      {!xeroConnected ? (
        <button
          onClick={handleStartXeroAuth}
          className={mobile ? "text-sm font-medium text-blue-600 mt-2" : "text-sm font-medium text-blue-600"}
        >
          Sign in
        </button>
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
                  navigate("/settings");
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
