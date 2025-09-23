import React from "react";

type TenantLike = {
  tenantId?: string;
  id?: string;
  clientId?: string;
  tenantName?: string;
  displayLabel?: string;
};

export default function TenantsList({ tenants }: { tenants: TenantLike[] }) {
  return (
    <ul className="space-y-2">
      {tenants.map((t) => (
        <li key={String(t.tenantId || t.id || t.clientId || Math.random())} className="p-2 border rounded bg-gray-50">
          <div className="text-sm font-medium">{t.displayLabel || t.tenantName || t.clientId || t.tenantId}</div>
          <div className="text-xs text-gray-500 mt-1">Tenant ID: {String(t.tenantId || t.id || "—")}</div>
        </li>
      ))}
    </ul>
  );
}
