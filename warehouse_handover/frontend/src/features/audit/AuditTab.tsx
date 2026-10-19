import React from "react";
import { AuditEvent } from "../../types";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge, BadgeVariant } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import {
  RotateCcw,
  ClipboardList,
  Calendar,
  Building2,
  FileCheck,
  Package,
  MapPin,
  Truck,
  ShieldAlert,
  Inbox,
  Filter,
} from "lucide-react";

interface AuditTabProps {
  auditBusy: boolean;
  refreshAudit: () => Promise<void>;
  auditActionFilter: string;
  setAuditActionFilter: (val: string) => void;
  auditEvents: AuditEvent[];
}

function getActionBadgeConfig(action: string): {
  label: string;
  variant: BadgeVariant;
  icon: React.ReactNode;
} {
  switch (action) {
    case "CONFIRM_LEASE":
      return {
        label: "Cấp hợp đồng thuê",
        variant: "success",
        icon: <Building2 size={13} />,
      };
    case "CREATE_INBOUND":
      return {
        label: "Tạo phiếu nhập kho",
        variant: "primary",
        icon: <FileCheck size={13} />,
      };
    case "PREVIEW_PLACEMENT":
      return {
        label: "Đề xuất vị trí kệ",
        variant: "info",
        icon: <MapPin size={13} />,
      };
    case "CONFIRM_PLACEMENT":
      return {
        label: "Xác nhận lưu kho",
        variant: "success",
        icon: <Package size={13} />,
      };
    case "OUTBOUND_SHIPMENT":
      return {
        label: "Xuất kho giải phóng hàng",
        variant: "warning",
        icon: <Truck size={13} />,
      };
    case "TERMINATE_LEASE":
      return {
        label: "Hủy hợp đồng & Thu hồi khoang",
        variant: "danger",
        icon: <ShieldAlert size={13} />,
      };
    default:
      return {
        label: action,
        variant: "neutral",
        icon: <ClipboardList size={13} />,
      };
  }
}

function formatEventDetails(event: AuditEvent): string {
  if (!event.details) return "—";
  if (typeof event.details === "string") return event.details;
  const d = event.details as Record<string, unknown>;
  const parts: string[] = [];
  if (d.message) return String(d.message);
  if (d.area_m2) parts.push(`Diện tích: ${d.area_m2} m²`);
  if (d.bay_count) parts.push(`Số khoang: ${d.bay_count}`);
  if (d.formatted_bays) parts.push(`Vị trí: ${d.formatted_bays}`);
  if (d.pallet_count) parts.push(`Số pallet: ${d.pallet_count}`);
  if (d.proposal_id) parts.push(`Mã đề xuất: ${d.proposal_id}`);
  if (d.exported_count !== undefined) parts.push(`Đã xuất: ${d.exported_count} pallet`);
  if (d.released_bay_count !== undefined) parts.push(`Đã thu hồi: ${d.released_bay_count} khoang`);
  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(d);
}

export const AuditTab: React.FC<AuditTabProps> = ({
  auditBusy,
  refreshAudit,
  auditActionFilter,
  setAuditActionFilter,
  auditEvents,
}) => {
  return (
    <div className="tab-container">
      {/* PAGE HEADER CÓ NÚT LÀM MỚI Ở GÓC PHẢI */}
      <PageHeader
        title="4. Nhật ký Vận hành Kho"
        description="Theo dõi toàn bộ lịch sử giao dịch: cấp thuê kho, tạo phiếu nhập, đề xuất vị trí, xác nhận lưu kho và xuất kho"
        badge="Audit Trail"
        action={
          <button
            className="saas-btn saas-btn-secondary"
            disabled={auditBusy}
            onClick={() => void refreshAudit()}
            type="button"
          >
            <RotateCcw size={16} className={auditBusy ? "saas-spin" : ""} />
            <span>{auditBusy ? "Đang tải dữ liệu..." : "Làm mới dữ liệu"}</span>
          </button>
        }
      />

      <div className="saas-card">
        {/* TOOLBAR BỘ LỌC HÀNH ĐỘNG */}
        <div className="saas-table-toolbar">
          <div className="saas-table-toolbar-left">
            <h3 className="saas-card-title">Lịch sử sự kiện</h3>
            <span className="saas-card-subtitle">
              Tổng số <strong>{auditEvents.length}</strong> sự kiện được ghi nhận trong cơ sở dữ liệu
            </span>
          </div>

          <div className="saas-toolbar-right">
            <div className="saas-filter-group">
              <label className="saas-label-inline" htmlFor="audit-filter-select">
                <Filter size={15} className="text-muted" />
                <span>Loại hành động:</span>
              </label>
              <select
                id="audit-filter-select"
                className="saas-select saas-select-sm"
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
              >
                <option value="ALL">Tất cả hành động</option>
                <option value="CONFIRM_LEASE">Cấp khoang thuê (Lease)</option>
                <option value="CREATE_INBOUND">Tạo phiếu nhập</option>
                <option value="PREVIEW_PLACEMENT">Gợi ý vị trí đặt kệ</option>
                <option value="CONFIRM_PLACEMENT">Xác nhận lưu kho</option>
                <option value="OUTBOUND_SHIPMENT">Xuất kho giải phóng hàng</option>
                <option value="TERMINATE_LEASE">Hủy hợp đồng thuê kho</option>
              </select>
            </div>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU NHẬT KÝ ENTERPRISE */}
        {auditEvents.length === 0 ? (
          <EmptyState
            icon={<Inbox size={40} strokeWidth={1.5} />}
            title="Chưa có bản ghi nhật ký phù hợp"
            description="Các thao tác thuê kho, nhập hàng và xuất kho sẽ tự động tạo bản ghi lịch sử truy vết bảo mật tại đây."
          />
        ) : (
          <div className="saas-table-responsive">
            <table className="saas-table">
              <thead>
                <tr>
                  <th style={{ width: "18%" }}>Thời gian</th>
                  <th style={{ width: "24%" }}>Loại hành động</th>
                  <th style={{ width: "16%" }}>Đối tượng & ID</th>
                  <th style={{ width: "16%" }}>Khách hàng</th>
                  <th style={{ width: "26%" }}>Nội dung chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((event, index) => {
                  const cfg = getActionBadgeConfig(event.action);
                  return (
                    <tr key={event.id ?? `${event.entity_id}-${event.action}-${index}`}>
                      <td>
                        <div className="saas-time-cell">
                          <Calendar size={13} className="text-muted" />
                          <span>
                            {event.occurred_at
                              ? new Date(event.occurred_at).toLocaleString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <Badge variant={cfg.variant} icon={cfg.icon}>
                          {cfg.label}
                        </Badge>
                      </td>

                      <td>
                        <div className="saas-entity-cell">
                          <span className="saas-entity-type">{event.entity_type}</span>
                          <code className="saas-entity-id">#{event.entity_id}</code>
                        </div>
                      </td>

                      <td>
                        {event.tenant_id ? (
                          <div className="saas-tenant-pill-badge">
                            <Building2 size={13} />
                            <strong>{event.tenant_id}</strong>
                          </div>
                        ) : (
                          <span className="saas-text-muted">Hệ thống</span>
                        )}
                      </td>

                      <td>
                        <span className="saas-audit-details">
                          {formatEventDetails(event)}
                        </span>
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
  );
};
