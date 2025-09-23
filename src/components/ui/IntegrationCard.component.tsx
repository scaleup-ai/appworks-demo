import React from "react";
import TenantsList from "../TenantsList.component";
import StatusBadge from "./StatusBadge.component";

export default function IntegrationCard({
  status,
  orgs,
  loading,
  showRaw,
  setShowRaw,
}: {
  status: any;
  orgs: any[];
  loading: boolean;
  showRaw: boolean;
  setShowRaw: (b: boolean) => void;
}) {
  return (
    <div className="max-w-2xl p-4 rounded bg-white border">
      {loading ? (
        <div className="text-sm text-gray-600">Loading status…</div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600">Integration</div>
              <div className="mt-1 text-lg font-semibold">
                {(status && (status.integrationStatus as any)?.success) === true ? (
                  <StatusBadge variant="green">Connected</StatusBadge>
                ) : (
                  <StatusBadge variant="red">Not connected</StatusBadge>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {(status && (status.integrationStatus as any)?.message) || "Status unknown"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Tenants</div>
              <div className="mt-1 text-sm font-semibold">
                {((status && (status.tenants as any[])?.length) || orgs.length) + " connected"}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="text-sm text-gray-600 mb-2">Connected organizations</div>
            <TenantsList tenants={(status && Array.isArray(status.tenants) ? (status.tenants as any[]) : orgs) || []} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              {showRaw ? "Hide raw JSON" : "Show raw JSON"}
            </button>
            <div className="text-xs text-gray-500">You can view the raw integration payload for debugging.</div>
          </div>

          {showRaw && (
            <div className="mt-3 p-2 bg-gray-50 border rounded text-xs">
              <pre className="overflow-auto">{JSON.stringify(status ?? { organisations: orgs.length }, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
