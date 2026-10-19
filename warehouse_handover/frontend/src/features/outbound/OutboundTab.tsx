import React from "react";
import { LeaseRecord, OutboundInventoryItem } from "../../types";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { StatCard } from "../../components/common/StatCard";
import { EmptyState } from "../../components/common/EmptyState";
import {
  Truck,
  Building2,
  Layers,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  ShieldAlert,
  Boxes,
  Inbox,
  Scale,
} from "lucide-react";

interface OutboundTabProps {
  outboundMessage: {
    type: "success" | "error";
    text: string;
  } | null;
  setOutboundMessage: (
    msg: { type: "success" | "error"; text: string } | null,
  ) => void;
  selectedOutboundTenant: string;
  setSelectedOutboundTenant: (tenant: string) => void;
  effectiveLeases: LeaseRecord[];
  currentOutboundLease?: LeaseRecord;
  outboundInventory: OutboundInventoryItem[];
  isOutboundLoading: boolean;
  isOutboundProcessing: boolean;
  isTerminatingLease: boolean;
  handleProcessOutbound: () => Promise<void>;
  handleTerminateLease: () => Promise<void>;
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  outboundMessage,
  setOutboundMessage,
  selectedOutboundTenant,
  setSelectedOutboundTenant,
  effectiveLeases,
  currentOutboundLease,
  outboundInventory,
  isOutboundLoading,
  isOutboundProcessing,
  isTerminatingLease,
  handleProcessOutbound,
  handleTerminateLease,
}) => {
  const totalPallets = outboundInventory.length;
  const totalCases = outboundInventory.reduce((s, i) => s + i.case_count, 0);
  const totalWeight = outboundInventory.reduce((s, i) => s + i.cargo_weight_kg, 0);

  return (
    <div className="tab-container">
      {/* PAGE HEADER */}
      <PageHeader
        title="5. Quản lý Xuất kho & Thu hồi khoang"
        description="Kiểm tra hàng tồn trên kệ của từng đối tác, thực hiện xuất kho giải phóng hàng và thu hồi khoang kệ về trạng thái trống"
        badge="Điều phối Outbound"
      />

      {/* THÔNG BÁO KẾT QUẢ THAO TÁC */}
      {outboundMessage && (
        <div
          className={`saas-alert ${
            outboundMessage.type === "success" ? "saas-alert-success" : "saas-alert-danger"
          } mb-4`}
        >
          {outboundMessage.type === "success" ? (
            <CheckCircle2 size={18} className="saas-alert-icon" />
          ) : (
            <AlertTriangle size={18} className="saas-alert-icon" />
          )}
          <div className="saas-alert-content" style={{ flex: 1 }}>
            <span>{outboundMessage.text}</span>
          </div>
          <button
            type="button"
            className="saas-alert-close"
            onClick={() => setOutboundMessage(null)}
            title="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CARD 1: CHỌN ĐỐI TÁC KHÁCH HÀNG & THỐNG KÊ NHANH */}
      <div className="saas-card mb-4">
        <div className="saas-card-header">
          <div className="saas-card-title-box">
            <Building2 className="saas-card-icon" size={20} />
            <h3 className="saas-card-title">Chọn đối tác cần xuất kho</h3>
          </div>
          <span className="saas-card-subtitle">
            Hợp đồng đang có hiệu lực ({effectiveLeases.length})
          </span>
        </div>

        <div className="saas-form-group" style={{ maxWidth: 480 }}>
          <label className="saas-label" htmlFor="outbound-tenant-select">
            Đối tác khách hàng <span className="saas-required">*</span>
          </label>
          <select
            id="outbound-tenant-select"
            className="saas-select"
            value={selectedOutboundTenant}
            onChange={(e) => {
              setSelectedOutboundTenant(e.target.value);
              setOutboundMessage(null);
            }}
          >
            <option value="">-- Vui lòng chọn khách hàng cần xuất kho --</option>
            {effectiveLeases.map((l) => (
              <option key={l.tenant_code} value={l.tenant_code}>
                {l.tenant_name || l.tenant_code} ({l.bays?.length || 0} khoang · {l.area_m2} m²)
              </option>
            ))}
          </select>
        </div>

        {/* 4 STAT CARDS ĐỒNG ĐỀU KHI ĐÃ CHỌN KHÁCH HÀNG */}
        {currentOutboundLease && (
          <div className="saas-stat-grid-4 mt-4">
            <StatCard
              title="Khách hàng thuê"
              value={currentOutboundLease.tenant_name || currentOutboundLease.tenant_code}
              subtitle={<code>{currentOutboundLease.tenant_code}</code>}
              icon={<Building2 size={20} className="text-primary" />}
            />
            <StatCard
              title="Diện tích thuê"
              value={`${currentOutboundLease.area_m2} m²`}
              subtitle={`${currentOutboundLease.bays?.length || 0} khoang kệ`}
              icon={<Layers size={20} className="text-primary" />}
            />
            <StatCard
              title="Vị trí khoang thuê"
              value={
                <span className="saas-stat-bay-text">
                  {currentOutboundLease.formatted_bays || "Chưa có khoang"}
                </span>
              }
              subtitle="Khoanh vùng vật lý"
              icon={<MapPin size={20} className="text-primary" />}
            />
            <StatCard
              title="Tồn kho thực tế trên kệ"
              value={`${totalPallets} Pallet`}
              subtitle={`${totalCases} kiện · ${totalWeight.toLocaleString("vi-VN")} kg`}
              icon={<Boxes size={20} className="text-primary" />}
              highlight={totalPallets > 0}
            />
          </div>
        )}
      </div>

      {/* CARD 2: DANH SÁCH PALLET VÀ NÚT XUẤT KHO */}
      {selectedOutboundTenant && (
        <div className="saas-card mb-4">
          <div className="saas-table-toolbar">
            <div className="saas-table-toolbar-left">
              <div className="saas-title-with-badge">
                <Package className="saas-card-icon" size={20} />
                <h3 className="saas-card-title">Danh sách hàng hóa trên kệ</h3>
              </div>
              <span className="saas-card-subtitle">
                {totalPallets > 0
                  ? `Có ${totalPallets} pallet đang lưu trữ trên khoang kệ của đối tác`
                  : "Khoang kệ hiện không có pallet nào lưu giữ"}
              </span>
            </div>

            <button
              type="button"
              className="saas-btn saas-btn-primary"
              disabled={isOutboundProcessing || totalPallets === 0}
              onClick={handleProcessOutbound}
            >
              <Truck size={18} strokeWidth={2} />
              <span>
                {isOutboundProcessing
                  ? "Đang xuất kho..."
                  : `Xác nhận Xuất kho (${totalPallets} Pallet)`}
              </span>
            </button>
          </div>

          {isOutboundLoading ? (
            <div className="saas-loading-box">
              <span className="saas-spin-icon">⏳</span>
              <span>Đang tải danh sách tồn kho trên kệ...</span>
            </div>
          ) : totalPallets === 0 ? (
            <EmptyState
              icon={<Inbox size={42} strokeWidth={1.5} />}
              title="Khoang kệ hiện đang trống"
              description="Khách hàng này hiện chưa nhập hàng hoặc toàn bộ hàng hóa đã được xuất kho thành công khỏi hệ thống."
            />
          ) : (
            <div className="saas-table-responsive" style={{ maxHeight: 420 }}>
              <table className="saas-table">
                <thead>
                  <tr>
                    <th style={{ width: "6%" }}>STT</th>
                    <th style={{ width: "16%" }}>Mã Pallet</th>
                    <th style={{ width: "22%" }}>Mã SKU / Tên hàng</th>
                    <th style={{ width: "14%" }}>Loại Pallet</th>
                    <th style={{ width: "20%" }}>Vị trí lưu kho</th>
                    <th style={{ width: "10%" }}>Số kiện</th>
                    <th style={{ width: "12%" }}>Trọng lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {outboundInventory.map((item, idx) => (
                    <tr key={item.pallet_code || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <code className="saas-code-badge">{item.pallet_code}</code>
                      </td>
                      <td>
                        <div className="saas-sku-cell">
                          <strong>{item.sku}</strong>
                          <span className="saas-sku-name-sub">{item.sku_name}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant="neutral">{item.pallet_type}</Badge>
                      </td>
                      <td>
                        <div className="saas-loc-cell">
                          <MapPin size={13} className="text-primary" />
                          <span>
                            Dãy {item.rack} · Ô {String(item.bay).padStart(2, "0")} · T{item.level} · {item.slots}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{item.case_count}</strong>
                      </td>
                      <td>
                        <strong>{item.cargo_weight_kg.toLocaleString("vi-VN")}</strong> kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CARD 3: THỦ TỤC THANH LÝ HỢP ĐỒNG & THU HỒI KHOANG KỆ */}
      {selectedOutboundTenant && (
        <div className="saas-card saas-terminate-card">
          <div className="saas-terminate-grid">
            <div className="saas-terminate-info">
              <div className="saas-terminate-badge-row">
                <Badge variant="danger" size="sm">
                  THỦ TỤC THANH LÝ & THU HỒI KHOANG KỆ
                </Badge>
              </div>
              <h4 className="saas-terminate-title">
                Chấm dứt quyền thuê của đối tác{" "}
                {currentOutboundLease?.tenant_name || selectedOutboundTenant}
              </h4>
              <p className="saas-terminate-desc">
                Sau khi xuất hàng hoàn tất (hoặc đối tác thanh lý hợp đồng), bấm nút bên cạnh để
                hủy quyền thuê đối tác và giải phóng toàn bộ{" "}
                <strong>{currentOutboundLease?.bays?.length || 0} khoang kệ</strong>{" "}
                ({currentOutboundLease?.area_m2} m²) về trạng thái{" "}
                <strong className="text-success">Trống khả dụng (AVAILABLE)</strong> trên sơ đồ kho 2D.
              </p>

              {totalPallets > 0 && (
                <div className="saas-alert saas-alert-warning mt-2">
                  <AlertTriangle size={16} />
                  <span>
                    Đối tác hiện vẫn còn {totalPallets} pallet trên kệ. Hệ thống sẽ tự động giải phóng toàn bộ số pallet này trước khi thu hồi khoang.
                  </span>
                </div>
              )}
            </div>

            <div className="saas-terminate-action">
              <button
                type="button"
                className="saas-btn saas-btn-danger"
                disabled={isTerminatingLease}
                onClick={handleTerminateLease}
              >
                <Trash2 size={16} strokeWidth={2} />
                <span>
                  {isTerminatingLease ? "Đang xử lý..." : "Hủy hợp đồng & Thu hồi khoang"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
