import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { selectTenant } from "../store/authSlice";

type Tenant = {
  tenantId?: string;
  tenant_id?: string;
  tenantName?: string;
  tenant_name?: string;
  tenantType?: string;
  type?: string;
  name?: string;
  organization?: string;
};

const TenantSelector: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const tenants: Tenant[] = (location.state as { tenants?: Tenant[] })?.tenants || [];

  const handleSelect = (tenantId: string) => {
    localStorage.setItem("selectedTenantId", tenantId);
    dispatch(selectTenant(tenantId));
    navigate("/dashboard");
  };

  if (!tenants || tenants.length === 0) {
    // Nothing to select
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
          {tenants.map((t: Tenant) => (
            <li key={t.tenantId || t.tenant_id} className="mb-3">
              <button
                onClick={() => handleSelect(t.tenantId || t.tenant_id || "")}
                className="w-full px-4 py-2 text-left border rounded hover:bg-gray-100"
              >
                <div className="font-medium">
                  {t.tenantName || t.tenant_name || t.name || t.organization || "Unknown"}
                </div>
                <div className="text-xs text-gray-500">{t.tenantType || t.type || ""}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TenantSelector;
