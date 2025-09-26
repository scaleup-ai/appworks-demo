import React from "react";
import TenantsList from "../../TenantsList.component";
import StatusBadge from "../StatusBadge.component";

export default function XeroIntegrationCard({
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
    <div className="max-w-2xl p-4 bg-white border rounded">
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
              <div className="mt-1 text-sm text-gray-500">
                {(status && (status.integrationStatus as any)?.message) || "Status unknown"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Tenants</div>
              <div className="mt-1 text-sm font-semibold">
                {((orgs && orgs.length) || (status && (status.tenants as any[])?.length) || 0) + " connected"}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-2 text-sm text-gray-600">Connected organizations</div>
            {/* Prefer canonical `orgs` prop (from auth slice) so this card shows the same
                tenant list as the Nav and Settings selector. Only fall back to status.tenants
                when `orgs` is empty. */}
            <TenantsList
              tenants={
                Array.isArray(orgs) && orgs.length > 0
                  ? orgs
                  : Array.isArray((status && status.tenants) as any[])
                    ? (status!.tenants as any[])
                    : []
              }
            />
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
            <div className="p-2 mt-3 text-xs border rounded bg-gray-50">
              <pre className="overflow-auto">{JSON.stringify(status ?? { organisations: orgs.length }, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
