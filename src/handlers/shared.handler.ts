export type Tenant = {
  tenantId: string;
  tenantName?: string;
  tenantType?: string;
  clientId?: string;
  organisationNumber?: string;
  createdAt?: string;
  displayLabel?: string;
};

type OrgResponse = {
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

export function parseAndDedupTenants(data: unknown): Tenant[] {
  const arr = (Array.isArray(data) ? data : []) as OrgResponse[];

  const tenantsArr = arr.map((t) => {
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
    } as Tenant;
  });

  const map = new Map<string, Tenant>();
  for (const m of tenantsArr) {
    if (!map.has(m.tenantId)) map.set(m.tenantId, m);
    else {
      const ex = map.get(m.tenantId)!;
      ex.tenantName = ex.tenantName || m.tenantName;
      ex.organisationNumber = ex.organisationNumber || m.organisationNumber;
      ex.clientId = ex.clientId || m.clientId;
    }
  }

  return Array.from(map.values()).map((m) => ({
    tenantId: String(m.tenantId || ""),
    tenantName: m.tenantName,
    tenantType: m.tenantType,
    clientId: m.clientId,
    organisationNumber: m.organisationNumber,
    createdAt: m.createdAt,
    displayLabel: m.displayLabel,
  }));
}

// Small cross-handler helpers
export function safeLocalStorageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // best-effort only — log when something goes wrong
    try {
      console.warn(`safeLocalStorageRemove failed for ${key}`, e);
    } catch {
      // ignore
    }
  }
}

import type { ToastOptions } from "react-toastify";

export function apiErrorToast(showToast: (msg: string, opts?: ToastOptions) => void, defaultMsg = "Request failed") {
  return (err: unknown) => {
    // Try to surface a useful message when available
    let msg = defaultMsg;
    try {
      if (err && typeof err === "object") {
        const anyErr = err as Record<string, unknown>;
        if (typeof anyErr.message === "string") msg = anyErr.message as string;
        else if (typeof anyErr.error === "string") msg = anyErr.error as string;
      }
    } catch (err) {
      console.warn("apiErrorToast failed to format error", err);
    }
    showToast(msg, { type: "error" });
  };
}
