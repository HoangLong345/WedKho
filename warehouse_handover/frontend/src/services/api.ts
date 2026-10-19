import {
  AuditEvent,
  BayCoordinate,
  ConfirmResult,
  ItemInput,
  LeaseRecord,
  OutboundInventoryResponse,
  OutboundProcessResponse,
  PalletPlan,
  PreviewResult,
  Tenant,
  TerminateLeaseResponse,
  WarehouseSlot,
} from "../types";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    let msg = `API request failed (${response.status})`;
    if (typeof body.detail === "string") {
      msg = body.detail;
    } else if (Array.isArray(body.detail)) {
      msg = body.detail
        .map((err: any) => {
          const loc = Array.isArray(err.loc)
            ? err.loc
                .filter((p: any) => p !== "body" && p !== "items")
                .join(".")
            : "";
          const prefix = loc ? `Mục [${loc}]: ` : "";
          const cleanMsg = (err.msg || JSON.stringify(err)).replace(
            /^Value error,?\s*/i,
            "",
          );
          return `${prefix}${cleanMsg}`;
        })
        .join("; ");
    } else if (body.detail && typeof body.detail === "object") {
      msg = JSON.stringify(body.detail);
    }
    throw new Error(msg);
  }
  return response.json() as Promise<T>;
}

export function createInbound(
  tenantId: string,
  items: ItemInput[],
  excludeOversized: boolean = false,
) {
  return request<{
    inbound_id: number;
    status: string;
    pallet_count: number;
    pallet_plans: PalletPlan[];
  }>("/api/v1/inbounds/manual", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenantId,
      items,
      exclude_oversized: excludeOversized,
    }),
  });
}

export function listTenants() {
  return request<Tenant[]>("/api/v1/tenants", { method: "GET" });
}

export function listWarehouseSlots(
  rack: number,
  level?: number,
  tenant?: string,
) {
  const params = new URLSearchParams({ rack_code: String(rack) });
  if (level) params.set("level_no", String(level));
  if (tenant) params.set("tenant_id", tenant);
  return request<{
    rack: number;
    level: number | null;
    slots: WarehouseSlot[];
  }>(`/api/v1/warehouse/slots?${params.toString()}`, { method: "GET" });
}

export function importItems(file: File) {
  const body = new FormData();
  body.append("file", file);
  return request<{
    filename: string;
    item_count: number;
    pallet_count: number;
    items: ItemInput[];
    pallet_plans: PalletPlan[];
    errors?: string[];
    detected_tenant_code?: string;
    detected_tenant_name?: string;
    oversized_items?: Array<{
      item_code: string;
      item_name: string;
      length_m: number;
      width_m: number;
      height_m: number;
      gross_weight_kg: number;
      reason: string;
    }>;
  }>("/api/v1/inbounds/import", {
    method: "POST",
    body,
    headers: {},
  });
}

export function previewLocations(inboundId: number, allowPartial: boolean) {
  return request<PreviewResult>(
    `/api/v1/inbounds/${inboundId}/location-preview`,
    {
      method: "POST",
      body: JSON.stringify({ allow_partial: allowPartial }),
    },
  );
}

export function confirmLocations(inboundId: number, proposalId: string) {
  return request<ConfirmResult>(`/api/v1/inbounds/${inboundId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ proposal_id: proposalId }),
  });
}

export function listAuditEvents(
  tenant?: string,
  action?: string,
  limit = 100,
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (tenant) params.set("tenant_id", tenant);
  if (action) params.set("action", action);
  return request<{ events: AuditEvent[]; count: number }>(
    `/api/v1/audit-events?${params.toString()}`,
    { method: "GET" },
  );
}

export function previewLease(
  tenantCode: string,
  tenantName: string,
  areaM2: number,
) {
  return request<LeaseRecord>("/api/v1/leases/preview", {
    method: "POST",
    body: JSON.stringify({
      tenant_code: tenantCode,
      tenant_name: tenantName,
      area_m2: areaM2,
    }),
  });
}

export function confirmLease(
  tenantCode: string,
  tenantName: string,
  areaM2: number,
  bays?: BayCoordinate[],
) {
  return request<LeaseRecord>("/api/v1/leases/confirm", {
    method: "POST",
    body: JSON.stringify({
      tenant_code: tenantCode,
      tenant_name: tenantName,
      area_m2: areaM2,
      bays,
    }),
  });
}

export function listLeases() {
  return request<LeaseRecord[]>("/api/v1/leases", { method: "GET" });
}

export function getTenantInventory(tenantCode: string) {
  return request<OutboundInventoryResponse>(
    `/api/v1/outbounds/inventory?tenant_code=${encodeURIComponent(tenantCode)}`,
    { method: "GET" },
  );
}

export function processOutbound(tenantCode: string) {
  return request<OutboundProcessResponse>("/api/v1/outbounds/process", {
    method: "POST",
    body: JSON.stringify({ tenant_code: tenantCode }),
  });
}

export function terminateLease(tenantCode: string) {
  return request<TerminateLeaseResponse>("/api/v1/leases/terminate", {
    method: "POST",
    body: JSON.stringify({ tenant_code: tenantCode }),
  });
}
