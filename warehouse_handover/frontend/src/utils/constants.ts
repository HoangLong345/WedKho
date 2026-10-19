import { ItemInput, SlotStatus, TenantPalette } from "../types";

export const initialItem: ItemInput = {
  item_code: "",
  item_name: "",
  item_type: "",
  unit_of_measure: "case",
  quantity: 1,
  length_m: 60,
  width_m: 40,
  height_m: 30,
  gross_weight_kg: 12,
  dimension_unit: "cm",
};

export const SLOT_STATUS_NAMES: Record<SlotStatus, string> = {
  AVAILABLE: "Trống (Khả dụng)",
  ASSIGNED: "Đã cấp thuê",
  RESERVED: "Đang giữ chỗ",
  OCCUPIED: "Đang chứa hàng",
  BLOCKED: "Khóa / Bảo trì",
};

export const PROPOSAL_STATUS_NAMES: Record<string, string> = {
  PROPOSED: "Đã đề xuất",
  PARTIAL: "Xếp một phần",
  CONFIRMED: "Đã xác nhận",
  DRAFT: "Bản nháp",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

export const BOX_PALETTES = [
  { main: 0xe5a953, tape: 0xd97706, name: "Carton Vàng Cam" },
  { main: 0x2dd4bf, tape: 0x0f766e, name: "Kiện Xanh Ngọc" },
  { main: 0x38bdf8, tape: 0x0284c7, name: "Kiện Xanh Dương" },
  { main: 0xa78bfa, tape: 0x7c3aed, name: "Kiện Tím Pastel" },
  { main: 0xf472b6, tape: 0xdb2777, name: "Kiện Hồng" },
];

export const TENANT_PALETTES: TenantPalette[] = [
  {
    primary: "#2563eb",
    bg: "#eff6ff",
    border: "#2563eb",
    text: "#1d4ed8",
    glow: "rgba(37, 99, 235, 0.45)",
    badge: "#1d4ed8",
  },
  {
    primary: "#059669",
    bg: "#ecfdf5",
    border: "#059669",
    text: "#047857",
    glow: "rgba(16, 185, 129, 0.45)",
    badge: "#047857",
  },
  {
    primary: "#7c3aed",
    bg: "#f5f3ff",
    border: "#7c3aed",
    text: "#6d28d9",
    glow: "rgba(124, 58, 237, 0.45)",
    badge: "#6d28d9",
  },
  {
    primary: "#ea580c",
    bg: "#fff7ed",
    border: "#ea580c",
    text: "#c2410c",
    glow: "rgba(234, 88, 12, 0.45)",
    badge: "#c2410c",
  },
  {
    primary: "#db2777",
    bg: "#fdf2f8",
    border: "#db2777",
    text: "#be185d",
    glow: "rgba(219, 39, 119, 0.45)",
    badge: "#be185d",
  },
  {
    primary: "#0891b2",
    bg: "#ecfeff",
    border: "#0891b2",
    text: "#0e7490",
    glow: "rgba(8, 145, 178, 0.45)",
    badge: "#0e7490",
  },
];
