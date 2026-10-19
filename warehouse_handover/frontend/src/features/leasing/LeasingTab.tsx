import React, { FormEvent, RefObject } from "react";
import { LeaseRecord } from "../../types";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import {
  Building2,
  Calculator,
  CheckCircle2,
  AlertCircle,
  MapPin,
  PackagePlus,
  Layers,
  Inbox,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface LeasingTabProps {
  leaseTenantCode: string;
  setLeaseTenantCode: (val: string) => void;
  leaseTenantName: string;
  setLeaseTenantName: (val: string) => void;
  leaseAreaM2: number;
  setLeaseAreaM2: (val: number) => void;
  leaseBusy: boolean;
  leaseSuccess: string;
  leaseError: string;
  handleLeasePreview: (e: FormEvent) => Promise<void>;
  handleLeaseConfirm: () => Promise<void>;
  liveCalculatedBays: number;
  livePotentialSlots: number;
  leasePreviewResult?: LeaseRecord;
  leasePreviewRef: RefObject<HTMLDivElement | null>;
  leases: LeaseRecord[];
  displayedLeases: LeaseRecord[];
  activeLeases: LeaseRecord[];
  closedLeases: LeaseRecord[];
  leaseTabFilter: "ACTIVE" | "CLOSED" | "ALL";
  setLeaseTabFilter: (val: "ACTIVE" | "CLOSED" | "ALL") => void;
  leaseTablePan: {
    isPanning: boolean;
    panProps: Record<string, unknown>;
  };
  onStartInbound: (tenantCode: string) => void;
  onViewTenantOnMap: (tenantCode: string) => void;
}

const PRESET_AREAS = [50, 100, 200, 350, 500, 1000];

export const LeasingTab: React.FC<LeasingTabProps> = ({
  leaseTenantCode,
  setLeaseTenantCode,
  leaseTenantName,
  setLeaseTenantName,
  leaseAreaM2,
  setLeaseAreaM2,
  leaseBusy,
  leaseSuccess,
  leaseError,
  handleLeasePreview,
  handleLeaseConfirm,
  liveCalculatedBays,
  livePotentialSlots,
  leasePreviewResult,
  leasePreviewRef,
  leases,
  displayedLeases,
  activeLeases,
  closedLeases,
  leaseTabFilter,
  setLeaseTabFilter,
  leaseTablePan,
  onStartInbound,
  onViewTenantOnMap,
}) => {
  return (
    <div className="tab-container">
      {/* PAGE HEADER */}
      <PageHeader
        title="1. Đăng ký & Cho thuê kho"
        description="Tiếp nhận thông tin khách hàng, tính toán số lượng khoang kệ theo diện tích và cấp quyền thuê trên mặt bằng kho"
        badge="Quản lý Hợp đồng"
      />

      {/* TWO-COLUMN ENTERPRISE WORKSPACE */}
      <div className="workspace-grid workspace-leasing">
        {/* LEFT COLUMN: FORM ĐĂNG KÝ VÀ CẤP KHOANG (360px - 380px) */}
        <div className="workspace-sidebar">
          <form className="saas-card" onSubmit={handleLeasePreview}>
            <div className="saas-card-header">
              <div className="saas-card-title-box">
                <Building2 className="saas-card-icon" size={20} />
                <h3 className="saas-card-title">Cấp diện tích thuê</h3>
              </div>
              <span className="saas-card-subtitle">Nhập thông tin đối tác</span>
            </div>

            <div className="saas-form-group">
              <label className="saas-label" htmlFor="lease-tenant-code">
                Mã khách hàng <span className="saas-required">*</span>
              </label>
              <input
                id="lease-tenant-code"
                className="saas-input"
                required
                value={leaseTenantCode}
                onChange={(e) => setLeaseTenantCode(e.target.value)}
                placeholder="Ví dụ: KHACH-01"
              />
            </div>

            <div className="saas-form-group">
              <label className="saas-label" htmlFor="lease-tenant-name">
                Tên khách hàng / Doanh nghiệp <span className="saas-required">*</span>
              </label>
              <input
                id="lease-tenant-name"
                className="saas-input"
                required
                value={leaseTenantName}
                onChange={(e) => setLeaseTenantName(e.target.value)}
                placeholder="Công ty Tiếp vận Á Châu"
              />
            </div>

            <div className="saas-form-group">
              <div className="saas-label-row">
                <label className="saas-label" htmlFor="lease-area-input">
                  Diện tích đăng ký (m²) <span className="saas-required">*</span>
                </label>
                <span className="saas-input-hint">Chọn nhanh</span>
              </div>

              {/* SEGMENTED / PILL PRESET BUTTONS */}
              <div className="saas-segmented-chips" role="group" aria-label="Diện tích mẫu">
                {PRESET_AREAS.map((area) => (
                  <button
                    type="button"
                    key={area}
                    className={`saas-chip-pill ${leaseAreaM2 === area ? "active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setLeaseAreaM2(area);
                    }}
                  >
                    {area} m²
                  </button>
                ))}
              </div>

              <input
                id="lease-area-input"
                className="saas-input"
                required
                min="1"
                step="0.5"
                type="number"
                value={leaseAreaM2 || ""}
                onChange={(e) => setLeaseAreaM2(Number(e.target.value))}
                placeholder="Nhập số m² cần thuê..."
              />
            </div>

            {/* LIVE CALCULATION METRICS CARD */}
            <div className="saas-calc-card">
              <div className="saas-calc-item">
                <span className="saas-calc-label">Khoang đề xuất</span>
                <div className="saas-calc-value-row">
                  <span className="saas-calc-num">{liveCalculatedBays}</span>
                  <span className="saas-calc-unit">khoang</span>
                </div>
              </div>
              <div className="saas-calc-divider" />
              <div className="saas-calc-item">
                <span className="saas-calc-label">Sức chứa tối đa</span>
                <div className="saas-calc-value-row">
                  <span className="saas-calc-num">{livePotentialSlots}</span>
                  <span className="saas-calc-unit">slot pallet</span>
                </div>
              </div>
            </div>

            {/* PRIMARY BUTTON: TÍNH TOÁN & XEM ĐỀ XUẤT */}
            <button
              className="saas-btn saas-btn-primary saas-btn-block"
              disabled={leaseBusy}
              type="submit"
            >
              <Calculator size={18} strokeWidth={2} />
              <span>{leaseBusy ? "Đang quét ô trống..." : "Tính toán & Xem đề xuất vị trí"}</span>
            </button>

            {/* ERROR ALERT */}
            {leaseError && (
              <div className="saas-alert saas-alert-danger">
                <AlertCircle size={18} className="saas-alert-icon" />
                <div className="saas-alert-content">
                  <strong className="saas-alert-title">Không thể tạo đề xuất</strong>
                  <p className="saas-alert-desc">{leaseError}</p>
                </div>
              </div>
            )}

            {/* SUCCESS ALERT */}
            {leaseSuccess && (
              <div className="saas-alert saas-alert-success">
                <CheckCircle2 size={18} className="saas-alert-icon" />
                <div className="saas-alert-content">
                  <strong className="saas-alert-title">Thành công</strong>
                  <p className="saas-alert-desc">{leaseSuccess}</p>
                </div>
              </div>
            )}

            {/* ĐỀ XUẤT VÙNG KHOANG */}
            {leasePreviewResult && (
              <div className="saas-proposal-box" ref={leasePreviewRef}>
                <div className="saas-proposal-header">
                  <div className="saas-proposal-title-row">
                    <Badge variant="primary" size="sm">ĐỀ XUẤT</Badge>
                    <h4 className="saas-proposal-title">Vùng khoang dự kiến cấp</h4>
                  </div>
                  <Badge variant="info">
                    {leasePreviewResult.planned_bay_count} khoang
                  </Badge>
                </div>

                <div className="saas-proposal-body">
                  <div className="saas-bay-tag-box">
                    <span className="saas-bay-label">Khoang định vị:</span>
                    <span className="saas-tag-bay-span">
                      {leasePreviewResult.formatted_bays}
                    </span>
                  </div>
                  <p className="saas-proposal-note">
                    Hệ thống tự động nối tiếp các khoang trống liên tục từ phải sang trái
                    (Dãy 101 → 124), bảo đảm không cấp chồng lấn cho đối tác khác.
                  </p>
                </div>

                <button
                  className="saas-btn saas-btn-primary saas-btn-block"
                  disabled={leaseBusy}
                  onClick={handleLeaseConfirm}
                  type="button"
                >
                  <CheckCircle2 size={18} strokeWidth={2} />
                  <span>{leaseBusy ? "Đang lưu hợp đồng..." : "Xác nhận cấp quyền thuê"}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: DANH SÁCH ĐỐI TÁC KHÁCH HÀNG */}
        <div className="workspace-main">
          <div className="saas-card">
            <div className="saas-table-toolbar">
              <div className="saas-table-toolbar-left">
                <h3 className="saas-card-title">Danh sách đối tác khách hàng</h3>
                <span className="saas-card-subtitle">
                  Hiển thị <strong>{displayedLeases.length}</strong> / {leases.length} đối tác
                  ({activeLeases.length} hợp đồng đang hiệu lực)
                </span>
              </div>

              {/* FILTER SEGMENTS */}
              <div className="saas-segmented-filters" role="group" aria-label="Bộ lọc hợp đồng">
                <button
                  type="button"
                  className={`saas-filter-tab ${leaseTabFilter === "ACTIVE" ? "active" : ""}`}
                  onClick={() => setLeaseTabFilter("ACTIVE")}
                >
                  <span className="saas-tab-dot dot-active" />
                  <span>Đang thuê</span>
                  <span className="saas-tab-count">({activeLeases.length})</span>
                </button>
                <button
                  type="button"
                  className={`saas-filter-tab ${leaseTabFilter === "CLOSED" ? "active" : ""}`}
                  onClick={() => setLeaseTabFilter("CLOSED")}
                >
                  <span className="saas-tab-dot dot-closed" />
                  <span>Đã hủy / Thu hồi</span>
                  <span className="saas-tab-count">({closedLeases.length})</span>
                </button>
                <button
                  type="button"
                  className={`saas-filter-tab ${leaseTabFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setLeaseTabFilter("ALL")}
                >
                  <span>Tất cả</span>
                  <span className="saas-tab-count">({leases.length})</span>
                </button>
              </div>
            </div>

            {displayedLeases.length === 0 ? (
              <EmptyState
                icon={<Inbox size={40} strokeWidth={1.5} />}
                title={
                  leaseTabFilter === "ACTIVE"
                    ? "Không có đối tác nào đang thuê"
                    : leaseTabFilter === "CLOSED"
                    ? "Chưa có hợp đồng nào bị hủy hoặc thu hồi"
                    : "Chưa có hợp đồng thuê nào được lập"
                }
                description="Điền thông tin và đăng ký diện tích thuê ở cột bên trái để cấp mới hợp đồng khoang kệ cho đối tác."
              />
            ) : (
              <div
                className={`saas-table-responsive ${leaseTablePan.isPanning ? "is-panning" : ""}`}
                {...leaseTablePan.panProps}
              >
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th style={{ width: "28%" }}>Khách hàng</th>
                      <th style={{ width: "14%" }}>Diện tích</th>
                      <th style={{ width: "16%" }}>Số khoang</th>
                      <th style={{ width: "24%" }}>Vị trí khoang kệ</th>
                      <th style={{ width: "18%", textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLeases.map((l) => {
                      const isClosed = l.status === "CLOSED";
                      return (
                        <tr key={l.id ?? l.tenant_code} className={isClosed ? "tr-closed" : ""}>
                          <td>
                            <div className="saas-cell-tenant">
                              <div className="saas-tenant-name-row">
                                <span className="saas-tenant-name">{l.tenant_name}</span>
                                {isClosed ? (
                                  <Badge variant="neutral" size="sm">Đã hủy</Badge>
                                ) : (
                                  <Badge variant="success" size="sm">Đang thuê</Badge>
                                )}
                              </div>
                              <code className="saas-tenant-code">{l.tenant_code}</code>
                            </div>
                          </td>

                          <td>
                            <span className="saas-area-text">
                              <strong>{l.area_m2}</strong> m²
                            </span>
                          </td>

                          <td>
                            {isClosed ? (
                              <span className="saas-text-muted">
                                0 khoang <small>(Đã thu hồi)</small>
                              </span>
                            ) : (
                              <span className="saas-bay-count-badge">
                                <Layers size={14} />
                                <strong>{l.planned_bay_count}</strong> khoang
                              </span>
                            )}
                          </td>

                          <td>
                            {isClosed ? (
                              <span className="saas-tag-revoked">
                                Đã thu hồi toàn bộ khoang
                              </span>
                            ) : l.formatted_bays ? (
                              <span className="saas-tag-bay-span">
                                {l.formatted_bays}
                              </span>
                            ) : (
                              <span className="saas-text-muted">Chưa cấp khoang</span>
                            )}
                          </td>

                          <td style={{ textAlign: "right" }}>
                            {isClosed ? (
                              <span className="saas-badge-terminated" title="Hợp đồng đã kết thúc, khoang đã giải phóng về trạng thái trống">
                                Đã thanh lý
                              </span>
                            ) : (
                              <div className="saas-btn-group-end">
                                <button
                                  className="saas-btn saas-btn-primary saas-btn-sm"
                                  onClick={() => onStartInbound(l.tenant_code)}
                                  title="Tạo phiếu nhập kho cho khách hàng này"
                                  type="button"
                                >
                                  <PackagePlus size={14} strokeWidth={2} />
                                  <span>Nhập hàng</span>
                                </button>
                                <button
                                  className="saas-btn saas-btn-secondary saas-btn-sm"
                                  onClick={() => onViewTenantOnMap(l.tenant_code)}
                                  title="Xem vị trí ô khoang trên sơ đồ 2D"
                                  type="button"
                                >
                                  <MapPin size={14} strokeWidth={2} />
                                  <span>Bản đồ</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
