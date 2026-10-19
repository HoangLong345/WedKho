import React, { ChangeEvent, FormEvent, RefObject } from "react";
import {
  ConfirmResult,
  ItemInput,
  LeaseRecord,
  PalletPlan,
  PreviewResult,
  Suggestion,
} from "../../types";
import { formatLocationCode } from "../../utils/warehouse";
import { PROPOSAL_STATUS_NAMES } from "../../utils/constants";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { StatCard } from "../../components/common/StatCard";
import {
  Boxes,
  FileSpreadsheet,
  UploadCloud,
  Plus,
  Trash2,
  Box,
  MapPin,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scale,
  Maximize2,
  Check,
  FileText,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface InboundTabProps {
  tenantId: string;
  setTenantId: (val: string) => void;
  tenants: { code: string; name: string }[];
  leases?: LeaseRecord[];
  items: ItemInput[];
  setItems: React.Dispatch<React.SetStateAction<ItemInput[]>>;
  updateItem: <K extends keyof ItemInput>(
    index: number,
    field: K,
    value: ItemInput[K],
  ) => void;
  updateItemUnit: (index: number, newUnit: ItemInput["dimension_unit"]) => void;
  addPallet: () => void;
  removePallet: (index: number) => void;
  allowPartial: boolean;
  setAllowPartial: (val: boolean) => void;
  busy: boolean;
  locationBusy: boolean;
  error: string;
  setError: (val: string) => void;
  importSummary: string;
  importError: string;
  uploadedFileName: string;
  uploadedFileSize: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  inboundFormRef: RefObject<HTMLFormElement | null>;
  palletPlanSectionRef: RefObject<HTMLDivElement | null>;
  locationProposalSectionRef: RefObject<HTMLDivElement | null>;
  confirmationSectionRef: RefObject<HTMLDivElement | null>;
  palletPlans: PalletPlan[];
  preview?: PreviewResult;
  confirmation?: ConfirmResult;
  handleExcelImport: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleClearUploadedFile: () => void;
  handleCalculatePallets: (e: FormEvent) => Promise<void>;
  handleRequestLocationPreview: () => Promise<void>;
  handleConfirm: () => Promise<void>;
  handleViewLocationOnMap: (item: {
    rack: number;
    bay: number;
    level: number;
    slots: string[];
    pallet_code: string;
  }) => void;
  handleExcludeOversizedAndCalculate?: () => Promise<void>;
  planTablePan: {
    isPanning: boolean;
    panProps: Record<string, unknown>;
  };
  onOpen3D: (plan: PalletPlan) => void;
}

export const InboundTab: React.FC<InboundTabProps> = ({
  tenantId,
  setTenantId,
  tenants,
  leases = [],
  items,
  setItems,
  updateItem,
  updateItemUnit,
  addPallet,
  removePallet,
  allowPartial,
  setAllowPartial,
  busy,
  locationBusy,
  error,
  setError,
  importSummary,
  importError,
  uploadedFileName,
  uploadedFileSize,
  fileInputRef,
  inboundFormRef,
  palletPlanSectionRef,
  locationProposalSectionRef,
  confirmationSectionRef,
  palletPlans,
  preview,
  confirmation,
  handleExcelImport,
  handleClearUploadedFile,
  handleCalculatePallets,
  handleRequestLocationPreview,
  handleConfirm,
  handleViewLocationOnMap,
  handleExcludeOversizedAndCalculate,
  planTablePan,
  onOpen3D,
}) => {
  const hasPlanResult =
    palletPlans.length > 0 ||
    preview !== undefined ||
    confirmation !== undefined;

  // Bản đồ tổng hợp diện tích và số hợp đồng theo mã đối tác
  const tenantLeaseSummary = React.useMemo(() => {
    const summary: Record<string, { totalArea: number; leaseCount: number; baysCount: number }> = {};
    if (!leases) return summary;
    leases.forEach((l) => {
      const status = l.status || "ACTIVE";
      if (status === "ACTIVE") {
        if (!summary[l.tenant_code]) {
          summary[l.tenant_code] = { totalArea: 0, leaseCount: 0, baysCount: 0 };
        }
        summary[l.tenant_code].totalArea += l.area_m2 || 0;
        summary[l.tenant_code].leaseCount += 1;
        summary[l.tenant_code].baysCount += l.bays?.length || 0;
      }
    });
    return summary;
  }, [leases]);

  const activeLeasesCount = React.useMemo(() => {
    return leases?.filter((l) => (l.status || "ACTIVE") === "ACTIVE").length || 0;
  }, [leases]);

  const oversizedItemsList = React.useMemo(() => {
    const factorMap: Record<string, number> = { m: 1, cm: 0.01, mm: 0.001 };
    return items
      .map((item, index) => {
        const factor = factorMap[item.dimension_unit?.toLowerCase()] || 1;
        const lenM = (Number(item.length_m) || 0) * factor;
        const widM = (Number(item.width_m) || 0) * factor;
        const maxD = Math.max(lenM, widM);
        const minD = Math.min(lenM, widM);
        const weight = Number(item.gross_weight_kg) || 0;
        const isOog = maxD > 3.8 || minD > 1.8 || weight > 4500;
        let reason = "";
        if (maxD > 3.8) {
          reason = `Dài ${maxD.toFixed(2)}m vượt chiều dài lọt lòng khoang kệ 3.8m`;
        } else if (minD > 1.8) {
          reason = `Rộng ${minD.toFixed(2)}m vượt chiều sâu khoang kệ 1.8m`;
        } else if (weight > 4500) {
          reason = `Nặng ${weight}kg vượt tải trọng tối đa Tầng 1 (4.500kg)`;
        }
        return { item, index, isOog, maxD, reason };
      })
      .filter((o) => o.isOog);
  }, [items]);

  return (
    <div className="tab-container">
      {/* PAGE HEADER */}
      <PageHeader
        title="2. Nhập hàng & Xếp Pallet 3D"
        description="Lập phiếu nhập kho, nạp file Excel sản phẩm, tính toán lớp xếp pallet 3D và tự động đề xuất vị trí lưu trữ an toàn trên kệ"
        badge="Điều phối Inbound"
      />

      {/* TWO-COLUMN ENTERPRISE WORKSPACE */}
      <div className="workspace-grid workspace-inbound">
        {/* LEFT COLUMN: FORM TẠO PHIẾU NHẬP (380px) */}
        <div className="workspace-sidebar">
          <form
            className="saas-card"
            ref={inboundFormRef}
            onSubmit={handleCalculatePallets}
          >
            <div className="saas-card-header">
              <div className="saas-card-title-box">
                <Boxes className="saas-card-icon" size={20} />
                <h3 className="saas-card-title">Mặt hàng nhập kho</h3>
              </div>
              <span className="saas-card-subtitle">Tạo phiếu & Xếp pallet</span>
            </div>

            {/* CHỌN KHÁCH HÀNG */}
            <div className="saas-form-group">
              <label className="saas-label" htmlFor="inbound-tenant-select">
                Khách hàng lưu kho <span className="saas-required">*</span>
              </label>
              <select
                id="inbound-tenant-select"
                className="saas-select"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">
                  -- Chọn khách hàng đã thuê kho ({tenants.length} đối tác · {activeLeasesCount} hợp đồng) --
                </option>
                {tenants.map((t, idx) => {
                  const info = tenantLeaseSummary[t.code];
                  const areaText = info?.totalArea ? ` · ${info.totalArea.toLocaleString("vi-VN")} m²` : "";
                  const countText = info?.leaseCount && info.leaseCount > 1 ? ` (${info.leaseCount} đợt thuê)` : "";
                  return (
                    <option key={`${t.code}-${idx}`} value={t.code}>
                      {t.name} ({t.code}){areaText}{countText}
                    </option>
                  );
                })}
              </select>
              {tenantId && tenantLeaseSummary[tenantId] && (
                <span className="saas-input-hint" style={{ color: "var(--primary)", fontWeight: 500, marginTop: "5px", display: "inline-block", fontSize: "12.5px" }}>
                  📐 Tổng diện tích thuê: <strong>{tenantLeaseSummary[tenantId].totalArea.toLocaleString("vi-VN")} m²</strong>
                  {tenantLeaseSummary[tenantId].leaseCount > 1 ? (
                    <span> (gồm <strong>{tenantLeaseSummary[tenantId].leaseCount} hợp đồng đang hiệu lực</strong> · {tenantLeaseSummary[tenantId].baysCount} khoang kệ)</span>
                  ) : (
                    <span> ({tenantLeaseSummary[tenantId].baysCount} khoang kệ)</span>
                  )}
                </span>
              )}
              {tenants.length === 0 && (
                <span className="saas-input-hint text-warning">
                  ⚠️ Chưa có khách thuê. Vui lòng cấp khoang tại tab "Đăng ký & Cho thuê kho".
                </span>
              )}
            </div>

            {/* EXCEL IMPORT BOX */}
            <div className="saas-excel-box">
              <input
                ref={fileInputRef}
                accept=".xlsx"
                disabled={busy}
                onChange={handleExcelImport}
                type="file"
                style={{ display: "none" }}
              />

              {!uploadedFileName ? (
                <div
                  className="saas-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="saas-upload-icon-box">
                    <FileSpreadsheet size={22} className="text-primary" />
                  </div>
                  <div className="saas-upload-text">
                    <strong>Nạp danh sách từ file Excel (.xlsx)</strong>
                    <span>Kéo thả file hoặc bấm vào đây để tải lên</span>
                  </div>
                </div>
              ) : (
                <div className="saas-uploaded-file-row">
                  <div className="saas-file-info">
                    <FileText size={18} className="text-primary" />
                    <div>
                      <span className="saas-file-name">{uploadedFileName}</span>
                      {uploadedFileSize && (
                        <span className="saas-file-size">({uploadedFileSize})</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="saas-btn-icon-danger"
                    onClick={handleClearUploadedFile}
                    title="Xóa file đã chọn"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {importSummary && (
                <div className="saas-alert saas-alert-success mt-2">
                  <CheckCircle2 size={16} />
                  <span>{importSummary}</span>
                </div>
              )}
              {importError && (
                <div className="saas-alert saas-alert-danger mt-2">
                  <AlertTriangle size={16} />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            {/* DANH SÁCH MÃ HÀNG (SKU INPUTS) */}
            <div className="saas-sku-list-section">
              <div className="saas-sku-list-header">
                <span className="saas-sku-count-label">Danh sách mặt hàng ({items.length})</span>
                <span className="saas-sku-hint">Quy cách kiện</span>
              </div>

              {/* CẢNH BÁO HÀNG QUÁ KHỔ OOG */}
              {oversizedItemsList.length > 0 && (
                <div
                  className="saas-alert saas-alert-warning mt-2 mb-3"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ fontSize: "12.5px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                      <strong>Cảnh báo Hàng quá khổ OOG:</strong> Phát hiện{" "}
                      <span style={{ color: "#b45309", fontWeight: 700 }}>
                        {oversizedItemsList.length} kiện hàng
                      </span>{" "}
                      ({oversizedItemsList.map((o) => `${o.item.item_code} - ${o.maxD.toFixed(2)}m`).join(", ")}) vượt quá kích thước khoang kệ 3.8m. Theo quy chuẩn an toàn, kiện này không thể đưa lên kệ tiêu chuẩn mà cần chuyển sang khu sàn bãi ngoài OOG.
                    </div>
                  </div>
                  {handleExcludeOversizedAndCalculate && (
                    <button
                      type="button"
                      className="saas-btn saas-btn-sm"
                      style={{
                        alignSelf: "flex-start",
                        fontSize: "12px",
                        padding: "6px 14px",
                        background: "#d97706",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      onClick={handleExcludeOversizedAndCalculate}
                      disabled={busy}
                    >
                      🛡️ Tách {oversizedItemsList.length} kiện OOG & Tính pallet {items.length - oversizedItemsList.length} kiện còn lại
                    </button>
                  )}
                </div>
              )}

              {items.map((item, index) => {
                const isOog = oversizedItemsList.some((o) => o.index === index);
                return (
                  <div
                    className="saas-sku-card"
                    key={index}
                    style={isOog ? { borderColor: "rgba(239, 68, 68, 0.4)", background: "rgba(254, 242, 242, 0.3)" } : undefined}
                  >
                    <div className="saas-sku-card-top">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="saas-sku-badge">Mặt hàng #{index + 1}</span>
                        {isOog && (
                          <span
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              marginLeft: "8px",
                            }}
                          >
                            ⚠️ Quá khổ OOG (&gt; 3.8m)
                          </span>
                        )}
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="saas-btn-text-danger"
                          onClick={() => removePallet(index)}
                          title="Xóa mã hàng này"
                        >
                          <Trash2 size={14} />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>

                  <div className="saas-grid-2">
                    <div className="saas-form-group">
                      <label className="saas-label">Mã SKU *</label>
                      <input
                        className="saas-input saas-input-sm"
                        required
                        value={item.item_code}
                        onChange={(e) => updateItem(index, "item_code", e.target.value)}
                        placeholder="SKU-01"
                      />
                    </div>
                    <div className="saas-form-group">
                      <label className="saas-label">Tên hàng hóa *</label>
                      <input
                        className="saas-input saas-input-sm"
                        required
                        value={item.item_name}
                        onChange={(e) => updateItem(index, "item_name", e.target.value)}
                        placeholder="Tivi Sony 43 inch"
                      />
                    </div>
                  </div>

                  <div className="saas-grid-2">
                    <div className="saas-form-group">
                      <label className="saas-label">Số kiện *</label>
                      <input
                        className="saas-input saas-input-sm"
                        required
                        min="1"
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        placeholder="100"
                      />
                    </div>
                    <div className="saas-form-group">
                      <label className="saas-label">Đơn vị đo</label>
                      <select
                        className="saas-select saas-select-sm"
                        value={item.dimension_unit}
                        onChange={(e) =>
                          updateItemUnit(
                            index,
                            e.target.value as ItemInput["dimension_unit"],
                          )
                        }
                      >
                        <option value="m">Mét (m)</option>
                        <option value="cm">Centimét (cm)</option>
                        <option value="mm">Milimét (mm)</option>
                      </select>
                    </div>
                  </div>

                  <div className="saas-grid-3">
                    <div className="saas-form-group">
                      <label className="saas-label">Dài ({item.dimension_unit})</label>
                      <input
                        className="saas-input saas-input-sm"
                        required
                        min="0.001"
                        step="any"
                        type="number"
                        value={item.length_m || ""}
                        onChange={(e) => updateItem(index, "length_m", Number(e.target.value))}
                        placeholder="0.4"
                      />
                    </div>
                    <div className="saas-form-group">
                      <label className="saas-label">Rộng ({item.dimension_unit})</label>
                      <input
                        className="saas-input saas-input-sm"
                        required
                        min="0.001"
                        step="any"
                        type="number"
                        value={item.width_m || ""}
                        onChange={(e) => updateItem(index, "width_m", Number(e.target.value))}
                        placeholder="0.3"
                      />
                    </div>
                    <div className="saas-form-group">
                      <label className="saas-label">Cao ({item.dimension_unit})</label>
                      <input
                        className="saas-input saas-input-sm"
                        required
                        min="0.001"
                        step="any"
                        type="number"
                        value={item.height_m || ""}
                        onChange={(e) => updateItem(index, "height_m", Number(e.target.value))}
                        placeholder="0.25"
                      />
                    </div>
                  </div>

                  <div className="saas-form-group">
                    <label className="saas-label">Khối lượng mỗi kiện (kg) *</label>
                    <input
                      className="saas-input saas-input-sm"
                      required
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={item.gross_weight_kg || ""}
                      onChange={(e) => updateItem(index, "gross_weight_kg", Number(e.target.value))}
                      placeholder="12.5"
                    />
                  </div>
                </div>
              );
            })}

              <button
                type="button"
                className="saas-btn saas-btn-secondary saas-btn-sm saas-btn-block"
                onClick={addPallet}
              >
                <Plus size={16} />
                <span>Thêm mặt hàng khác</span>
              </button>
            </div>

            {/* CHECKBOX CHO PHÉP XẾP MỘT PHẦN */}
            <div className="saas-checkbox-group">
              <label className="saas-checkbox-label">
                <input
                  type="checkbox"
                  className="saas-checkbox"
                  checked={allowPartial}
                  onChange={(e) => setAllowPartial(e.target.checked)}
                />
                <span>Cho phép xếp một phần nếu khoang thuê của khách không đủ chỗ</span>
              </label>
            </div>

            {/* BUTTON TÍNH TOÁN PALLET */}
            <button
              className="saas-btn saas-btn-primary saas-btn-block"
              disabled={busy}
              type="submit"
            >
              <Sparkles size={18} strokeWidth={2} />
              <span>{busy ? "Đang tính toán phân lớp..." : "Tính toán Pallet & Phân lớp 3D"}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: KẾT QUẢ PHÂN BỔ PALLET HOẶC HƯỚNG DẪN QUY TRÌNH GỌN */}
        <div className="workspace-main">
          {hasPlanResult ? (
            <div className="saas-card" ref={palletPlanSectionRef}>
              <div className="saas-table-toolbar">
                <div className="saas-table-toolbar-left">
                  <div className="saas-title-with-badge">
                    <Badge variant="primary" size="sm">KẾ HOẠCH</Badge>
                    <h3 className="saas-card-title">Kết quả phân bổ Pallet</h3>
                  </div>
                  {palletPlans.length > 0 && (
                    <span className="saas-card-subtitle">
                      Tổng số: <strong>{palletPlans.length}</strong> pallet cần xếp vào khoang kệ
                    </span>
                  )}
                </div>

                {palletPlans.length > 0 && (
                  <button
                    type="button"
                    className="saas-btn saas-btn-primary"
                    disabled={locationBusy}
                    onClick={handleRequestLocationPreview}
                  >
                    <MapPin size={16} strokeWidth={2} />
                    <span>{locationBusy ? "Đang định vị khoang kệ..." : "Đề xuất vị trí lên kệ"}</span>
                  </button>
                )}
              </div>

              {palletPlans.length === 0 ? (
                <div className="saas-empty-box">Chưa có kết quả tính pallet.</div>
              ) : (
                <div
                  className={`saas-table-responsive ${planTablePan.isPanning ? "is-panning" : ""}`}
                  {...planTablePan.panProps}
                >
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Mã SKU</th>
                        <th>Mã Pallet</th>
                        <th>Số kiện</th>
                        <th>Kiện / Lớp</th>
                        <th>Số lớp</th>
                        <th>Loại Pallet & Quy cách</th>
                        <th>Tầng ưu tiên</th>
                        <th style={{ textAlign: "right" }}>Mô phỏng 3D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {palletPlans.map((plan) => (
                        <tr key={plan.pallet_code}>
                          <td>
                            <strong>{plan.item_code}</strong>
                          </td>
                          <td>
                            <code className="saas-code-badge">{plan.pallet_code}</code>
                          </td>
                          <td>
                            <strong>{plan.cases}</strong> kiện
                          </td>
                          <td>{plan.cases_per_layer}</td>
                          <td>{plan.layers} lớp</td>
                          <td>
                            {plan.kind === "timber" ? (
                              <Badge variant="warning">Gỗ thô (đặt sàn T1)</Badge>
                            ) : plan.kind === "oversize" ? (
                              <Badge variant="danger">Quá khổ (khóa 1-ABC)</Badge>
                            ) : plan.kind === "double" && plan.required_level === "floor" ? (
                              <Badge variant="info">Pallet đôi (kê sàn T1)</Badge>
                            ) : plan.kind === "double" ? (
                              <Badge variant="primary">Pallet đôi</Badge>
                            ) : (
                              <Badge variant="neutral">Pallet đơn</Badge>
                            )}
                          </td>
                          <td>
                            <Badge
                              variant={plan.required_level === "floor" ? "warning" : "info"}
                              size="sm"
                            >
                              {plan.required_level === "floor" ? "Tầng 1 (Sàn)" : "Tầng trên / Sàn"}
                            </Badge>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="saas-btn saas-btn-secondary saas-btn-sm"
                              onClick={() => onOpen3D(plan)}
                              title={`Xem mô phỏng 3D xếp kiện ${plan.pallet_code}`}
                            >
                              <Eye size={14} />
                              <span>Xem 3D</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VỊ TRÍ ĐẶT TRÊN KỆ ĐỀ XUẤT */}
              {preview && (
                <div
                  className="saas-location-proposal-card"
                  ref={locationProposalSectionRef}
                >
                  <div className="saas-proposal-top">
                    <div>
                      <div className="saas-title-with-badge">
                        <Badge variant="success" size="sm">GỢI Ý VỊ TRÍ</Badge>
                        <h4 className="saas-proposal-h4">Vị trí lưu kho đề xuất</h4>
                      </div>
                      <span className="saas-proposal-meta">
                        Phiếu nhập #{preview.inbound_id} · Mã đề xuất: <code>{preview.proposal_id}</code>
                      </span>
                    </div>

                    <Badge
                      variant={
                        preview.status === "PARTIAL"
                          ? "warning"
                          : "primary"
                      }
                    >
                      {PROPOSAL_STATUS_NAMES[preview.status] || preview.status}
                    </Badge>
                  </div>

                  <div className="saas-suggestion-grid">
                    {preview.suggestions.map((item: Suggestion) => {
                      const locCode =
                        item.location_code ||
                        formatLocationCode(
                          item.rack,
                          item.bay,
                          item.level,
                          item.slots,
                        );
                      return (
                        <div className="saas-suggestion-card" key={item.pallet_code}>
                          <div className="saas-suggestion-head">
                            <span className="saas-suggestion-pallet">
                              <Box size={16} />
                              <strong>{item.pallet_code}</strong>
                            </span>
                            <span className="saas-loc-badge">{locCode}</span>
                          </div>

                          <div className="saas-suggestion-desc">
                            Dãy {item.rack} · Khoang {String(item.bay).padStart(2, "0")} · Tầng {item.level} · Slot {item.slots.join("")}
                          </div>

                          <button
                            type="button"
                            className="saas-btn saas-btn-secondary saas-btn-sm saas-btn-block"
                            onClick={() => handleViewLocationOnMap(item)}
                            title="Mở sơ đồ 2D và xem vị trí ô lưu trữ"
                          >
                            <MapPin size={14} />
                            <span>Xem vị trí trên bản đồ</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {preview.unplaced_pallet_codes.length > 0 && (
                    <div className="saas-alert saas-alert-warning mt-3">
                      <AlertTriangle size={18} />
                      <div className="saas-alert-content">
                        <strong>Chưa thể xếp các pallet sau do vượt sức chứa khoang khách:</strong>
                        <p>{preview.unplaced_pallet_codes.join(", ")}</p>
                      </div>
                    </div>
                  )}

                  <div className="saas-proposal-action-bar">
                    {confirmation ? (
                      <div className="saas-confirmed-box" ref={confirmationSectionRef}>
                        <CheckCircle2 size={24} className="text-success" />
                        <div>
                          <strong>Đã xác nhận và lưu kho thành công!</strong>
                          <p>
                            Pallet: {confirmation.confirmed_pallet_codes.join(", ")}. Bấm "Xem vị trí trên bản đồ" ở từng ô để kiểm tra trực quan.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="saas-btn saas-btn-primary saas-btn-lg"
                        disabled={busy}
                        onClick={handleConfirm}
                        type="button"
                      >
                        <Check size={18} strokeWidth={2.2} />
                        <span>Xác nhận lưu kho (Confirm Placement)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* THÔNG BÁO LỖI (NẾU CÓ) */}
              {error && (
                <div className="saas-alert saas-alert-danger mt-3">
                  <ShieldAlert size={20} className="saas-alert-icon" />
                  <div className="saas-alert-content">
                    <strong className="saas-alert-title">Lỗi quy cách hàng hóa</strong>
                    <p className="saas-alert-desc">{error}</p>
                    {palletPlans.length > 0 &&
                      items.length >
                        new Set(palletPlans.map((p) => p.item_code)).size && (
                        <button
                          type="button"
                          className="saas-btn saas-btn-danger saas-btn-sm mt-2"
                          onClick={() => {
                            const validCodes = new Set(
                              palletPlans.map((p) => p.item_code),
                            );
                            setItems((cur) =>
                              cur.filter((it) => validCodes.has(it.item_code)),
                            );
                            setError("");
                          }}
                        >
                          <Trash2 size={14} />
                          <span>
                            Bỏ các mặt hàng ngoại cỡ ({items.length - new Set(palletPlans.map((p) => p.item_code)).size} mã) để tiếp tục lưu kho
                          </span>
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* KHU VỰC HƯỚNG DẪN QUY TRÌNH GỌN & THÔNG SỐ STAT CARDS */
            <div className="saas-card saas-inbound-guide-card">
              <div className="saas-card-header">
                <div className="saas-card-title-box">
                  <Sparkles className="saas-card-icon" size={20} />
                  <h3 className="saas-card-title">Quy trình Nhập kho & Xếp Pallet tự động</h3>
                </div>
              </div>

              {/* HORIZONTAL STEPPER COMPACT */}
              <div className="saas-stepper-horizontal">
                <div className="saas-stepper-item active">
                  <div className="saas-stepper-circle">1</div>
                  <div className="saas-stepper-content">
                    <span className="saas-stepper-title">Chọn khách hàng</span>
                    <span className="saas-stepper-desc">Liên kết khoang thuê</span>
                  </div>
                </div>
                <div className="saas-stepper-arrow"><ArrowRight size={16} /></div>
                <div className="saas-stepper-item">
                  <div className="saas-stepper-circle">2</div>
                  <div className="saas-stepper-content">
                    <span className="saas-stepper-title">Nạp dữ liệu SKU</span>
                    <span className="saas-stepper-desc">Nhập tay hoặc Excel</span>
                  </div>
                </div>
                <div className="saas-stepper-arrow"><ArrowRight size={16} /></div>
                <div className="saas-stepper-item">
                  <div className="saas-stepper-circle">3</div>
                  <div className="saas-stepper-content">
                    <span className="saas-stepper-title">Mô phỏng 3D</span>
                    <span className="saas-stepper-desc">Tối ưu lớp xếp pallet</span>
                  </div>
                </div>
                <div className="saas-stepper-arrow"><ArrowRight size={16} /></div>
                <div className="saas-stepper-item">
                  <div className="saas-stepper-circle">4</div>
                  <div className="saas-stepper-content">
                    <span className="saas-stepper-title">Gán kệ & Lưu kho</span>
                    <span className="saas-stepper-desc">Định vị Slot tự động</span>
                  </div>
                </div>
              </div>

              {/* STAT CARDS: THÔNG SỐ KỸ THUẬT KHO BÃI */}
              <div className="saas-specs-title-row">
                <h4 className="saas-specs-title">Tiêu chuẩn Kỹ thuật Khoang kệ & Tải trọng</h4>
                <span className="saas-specs-subtitle">Theo Master Document v2.0</span>
              </div>

              <div className="saas-specs-grid">
                <StatCard
                  title="Mặt pallet tiêu chuẩn"
                  value="1.2 × 1.8 m"
                  subtitle="Đế pallet cao 0.15 m"
                  icon={<Maximize2 size={20} className="text-primary" />}
                />
                <StatCard
                  title="Chiều cao kiện tối đa"
                  value="Hàng ≤ 1.65 m"
                  subtitle="Tổng pallet ≤ 1.80 m"
                  icon={<Layers size={20} className="text-primary" />}
                />
                <StatCard
                  title="Tải trọng Tầng 1 (Sàn)"
                  value="Tối đa 4.500 kg"
                  subtitle="Đơn ≤ 1.500kg · Đôi ≤ 3.000kg"
                  icon={<Scale size={20} className="text-warning" />}
                />
                <StatCard
                  title="Tải trọng Tầng 2–6 (Beam)"
                  value="Tối đa 2.100 kg"
                  subtitle="Đơn ≤ 700kg · Đôi ≤ 1.400kg"
                  icon={<Layers size={20} className="text-primary" />}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
