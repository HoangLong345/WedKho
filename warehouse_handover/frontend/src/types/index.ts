export type PalletKind = "single" | "double" | "timber" | "oversize";

export interface ItemInput {
  item_code: string;
  item_name: string;
  item_type: string;
  unit_of_measure: string;
  quantity: number;
  length_m: number;
  width_m: number;
  height_m: number;
  gross_weight_kg: number;
  dimension_unit: "m" | "cm" | "mm";
}

export interface PalletPlan {
  item_code: string;
  pallet_code: string;
  cases: number;
  cases_per_layer: number;
  layers: number;
  kind: string;
  required_level: string;
  weight_kg: number;
  note?: string;
  case_length_m?: number;
  case_width_m?: number;
  case_height_m?: number;
  pallet_length_m?: number;
  pallet_width_m?: number;
  footprint_x_m?: number;
  footprint_y_m?: number;
  safety_review_required?: boolean;
}

export interface Suggestion {
  pallet_code: string;
  rack: number;
  bay: number;
  level: number;
  slots: string[];
  location_code?: string;
}

export interface PreviewResult {
  inbound_id: number;
  proposal_id: string;
  status: "PROPOSED" | "PARTIAL";
  suggestions: Suggestion[];
  unplaced_pallet_codes: string[];
}

export interface ConfirmResult {
  inbound_id: number;
  proposal_id: string;
  status: "CONFIRMED" | "PARTIAL";
  confirmed_pallet_codes: string[];
  unconfirmed_pallet_codes: string[];
}

export interface Tenant {
  code: string;
  name: string;
}

export type SlotStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "RESERVED"
  | "OCCUPIED"
  | "BLOCKED";

export interface WarehouseSlot {
  rack: number;
  bay: number;
  level: number;
  slot: "A" | "B" | "C";
  status: SlotStatus;
  tenant_id: string | null;
  pallet_code: string | null;
  sku: string | null;
  sku_name: string | null;
}

export interface AuditEvent {
  id?: number;
  tenant_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  occurred_at?: string;
}

export interface BayCoordinate {
  rack: number;
  bay: number;
}

export interface LeaseRecord {
  id?: number;
  tenant_code: string;
  tenant_name: string;
  area_m2: number;
  planned_bay_count: number;
  formatted_bays: string;
  bays: BayCoordinate[];
  status?: string;
  created_at?: string;
}

export interface OutboundInventoryItem {
  pallet_id: number;
  pallet_code: string;
  pallet_type: string;
  case_count: number;
  cargo_weight_kg: number;
  sku: string;
  sku_name: string;
  rack: number;
  bay: number;
  level: number;
  slots: string;
  location_code: string;
}

export interface OutboundInventoryResponse {
  tenant_code: string;
  items: OutboundInventoryItem[];
  count: number;
}

export interface OutboundProcessResponse {
  tenant_code: string;
  exported_count: number;
  pallet_codes: string[];
  message: string;
}

export interface TerminateLeaseResponse {
  tenant_code: string;
  released_bays: number;
  message: string;
}

export type TabType = "LEASING" | "INBOUND" | "MAP" | "AUDIT" | "OUTBOUND";

export interface HighlightTarget {
  rack: number;
  bay: number;
  level: number;
  slots: ("A" | "B" | "C")[];
  pallet_code: string;
}

export interface TenantPalette {
  primary: string;
  bg: string;
  border: string;
  text: string;
  glow: string;
  badge: string;
}
