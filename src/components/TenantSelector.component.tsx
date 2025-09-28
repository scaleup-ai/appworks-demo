import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROOT_PATH } from "../router/router";
import { selectTenant, AuthStorage, setSelectedOpenIdSub } from "../store/slices/auth.slice";
import axiosClient from "../apis/axios-client";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useTenants } from "../hooks/useTenants";
import LoadingSpinner from "../components/ui/LoadingSpinner.component";

type Tenant = {
  openid_sub?: string;
  tenantName?: string;
  tenantType?: string;
  clientId?: string;
  organisationNumber?: string;
  createdAt?: string;
  displayLabel?: string;
};

const TenantSelector: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const selectedOpenIdSub = useAppSelector((s) => s.xero.currentOpenIdSub);
  const storeTenants = useAppSelector((s) => s.auth.tenants);

  const [tenants, setLocalTenants] = useState<Tenant[]>(
    () => (location.state as { tenants?: Tenant[] })?.tenants || storeTenants || []
  );

  const { loadTenants, isLoading } = useTenants();

  useEffect(() => {
    if (!tenants || tenants.length === 0) {
      loadTenants();
    }
  }, [tenants, loadTenants]);

  useEffect(() => {
    setLocalTenants(storeTenants as Tenant[]);
  }, [storeTenants]);

  const visibleTenants = (tenants || []).filter((t) => t.openid_sub && t.openid_sub.length > 0);

  // Handler extracted from inline JSX to keep JSX clean and enable easier
  // reasoning about the flow (derive tenant id, persist, dispatch, navigate).
  function handleTenantClick(t: Tenant) {
    // Derive tenant id from available fields. The tenant object may encode
    // client:tenant as `id` elsewhere; fall back to openid_sub when necessary.
    const tenantIdCandidate = (t as any).tenantId || (t as any).tenant_id || undefined;
    const idFromIdField = (t as any).id
      ? String((t as any).id).includes(":")
        ? String((t as any).id).split(":")[1]
        : String((t as any).id)
      : undefined;
    const tenantId = tenantIdCandidate || idFromIdField || t.clientId || t.openid_sub || null;
    const openid = t.openid_sub || null;
    // Persist tenant id and openid subject separately
    AuthStorage.setSelectedTenantId(tenantId);
    AuthStorage.setSelectedOpenIdSub(openid);
    try {
      // Defensive: also set axios default header so the shared client sends
      // the OpenID subject on any immediate requests (prevents first-request race).
      if (openid && axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
        axiosClient.defaults.headers.common["X-Openid-Sub"] = String(openid);
      }
    } catch {
      // ignore
    }
    try {
      dispatch(selectTenant(tenantId));
    } catch {}
    try {
      dispatch(setSelectedOpenIdSub(openid));
    } catch {}
    navigate(`${ROOT_PATH}app/dashboard`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!visibleTenants || visibleTenants.length === 0) {
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
                  onClick={() => handleTenantClick(t)}
                  className={`w-full px-4 py-2 text-left border rounded hover:bg-gray-100 ${isSelected ? "bg-blue-50 border-blue-300" : ""}`}
                >
                  <div className="font-medium">
                    {t.tenantName || t.displayLabel || t.clientId || (sub || "").slice(0, 8) || "Unknown"}
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
