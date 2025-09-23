import React from "react";
import TenantListItem from "./ui/TenantListItem.component";

type TenantLike = {
  tenantId?: string;
  id?: string;
  clientId?: string;
  tenantName?: string;
  displayLabel?: string;
  organisationNumber?: string;
};

export default function TenantsList({ tenants }: { tenants: TenantLike[] }) {
  return (
    <ul className="space-y-2">
      {tenants.map((t) => {
        const key = String(t.tenantId || t.id || t.clientId || Math.random());
        const title = t.displayLabel || t.tenantName || t.clientId || t.tenantId;
        const subtitle = `Tenant ID: ${String(t.tenantId || t.id || "—")}`;
        const meta = t.organisationNumber ? `Org no: ${t.organisationNumber}` : undefined;
        return <TenantListItem key={key} title={title} subtitle={subtitle} meta={meta} />;
      })}
    </ul>
  );
}
