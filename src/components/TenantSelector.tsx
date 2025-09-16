import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { selectTenant } from "../store/authSlice";

const TenantSelector: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const tenants: Array<any> = (location.state as any)?.tenants || [];

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Select an Organization</h2>
        <p className="text-sm text-gray-600 mb-4">Choose which Xero organization you want to use for this session.</p>
        <ul>
          {tenants.map((t: any) => (
            <li key={t.tenantId || t.tenant_id} className="mb-3">
              <button
                onClick={() => handleSelect(t.tenantId || t.tenant_id)}
                className="w-full text-left px-4 py-2 border rounded hover:bg-gray-100"
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
