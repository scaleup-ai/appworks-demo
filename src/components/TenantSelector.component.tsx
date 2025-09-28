import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { selectTenant, AuthStorage } from "../store/slices/auth.slice";
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
                  onClick={() => {
                    AuthStorage.setSelectedTenantId(sub || null);
                    dispatch(selectTenant(sub || null));
                    navigate("/dashboard");
                  }}
                  className={`w-full px-4 py-2 text-left border rounded hover:bg-gray-100 ${isSelected ? "bg-blue-50 border-blue-300" : ""}`}
                >
                  <div className="font-medium">
                    {t.tenantName || t.displayLabel || t.clientId || (sub || '').slice(0, 8) || "Unknown"}
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