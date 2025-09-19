import React from "react";
import { useSetAuth } from "../../../store/hooks";

const XeroSuccessPage: React.FC = () => {
  const setAuth = useSetAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Connected to Xero</h1>
        <p className="mt-2 text-sm text-gray-600">You are authenticated with Xero</p>
        <button
          className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium text-white bg-red-500 border border-transparent rounded-md hover:bg-red-600"
          onClick={() => setAuth({ isAuthenticated: false, xeroConnected: false, selectedTenantId: null, tenants: [] })}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default XeroSuccessPage;
