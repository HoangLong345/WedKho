import React, { Fragment, useState, useEffect } from "react";
import {
  HighlightTarget,
  LeaseRecord,
  SlotStatus,
  Tenant,
  WarehouseSlot,
} from "../../types";
import { WarehouseMap2D } from "../../components/map/WarehouseMap2D";
import {
  formatLocationCode,
  getBayCountForRack,
  isForkliftPassage,
} from "../../utils/warehouse";
import { SLOT_STATUS_NAMES } from "../../utils/constants";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import {
  LayoutGrid,
  Filter,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  MapPin,
  X,
  ArrowLeft,
  Layers,
  Box,
} from "lucide-react";

interface WarehouseMapTabProps {
  selectedRack: number;
  setSelectedRack: (rack: number) => void;
  selectedLevel: number;
  setSelectedLevel: (level: number) => void;
  gridWrapMode: "WRAP" | "SCROLL";
  setGridWrapMode: (mode: "WRAP" | "SCROLL") => void;
  warehouseSlots: WarehouseSlot[];
  warehouseBusy: boolean;
  selectedSlot?: WarehouseSlot;
  setSelectedSlot: (slot?: WarehouseSlot) => void;
  slotStatusFilter: "ALL" | SlotStatus;
  setSlotStatusFilter: (status: "ALL" | SlotStatus) => void;
  slotSkuFilter: string;
  setSlotSkuFilter: (sku: string) => void;
  highlightedLocation: HighlightTarget | null;
  setHighlightedLocation: (loc: HighlightTarget | null) => void;
  selectedTenantMapFilter: string;
  setSelectedTenantMapFilter: (tenant: string) => void;
  isMatrixExpanded: boolean;
  setIsMatrixExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  activeLeases: LeaseRecord[];
  tenants: Tenant[];
  filteredWarehouseSlots: WarehouseSlot[];
  mapGridPan: {
    isPanning: boolean;
    panProps: Record<string, unknown>;
  };
  onBackToInbound: () => void;
}

export const WarehouseMapTab: React.FC<WarehouseMapTabProps> = ({
  selectedRack,
  setSelectedRack,
  selectedLevel,
  setSelectedLevel,
  gridWrapMode,
  setGridWrapMode,
  warehouseSlots,
  warehouseBusy,
  selectedSlot,
  setSelectedSlot,
  slotStatusFilter,
  setSlotStatusFilter,
  slotSkuFilter,
  setSlotSkuFilter,
  highlightedLocation,
  setHighlightedLocation,
  selectedTenantMapFilter,
  setSelectedTenantMapFilter,
  isMatrixExpanded,
  setIsMatrixExpanded,
  activeLeases,
  tenants,
  filteredWarehouseSlots,
  mapGridPan,
  onBackToInbound,
}) => {
  const bayCount = getBayCountForRack(selectedRack);
  const isRackEven = selectedRack % 2 === 0;
  const slotOrder: ("A" | "B" | "C")[] = isRackEven
    ? ["C", "B", "A"]
    : ["A", "B", "C"];
  const [matrixZoomPercent, setMatrixZoomPercent] = useState<number>(85);
  const [matrixZoomInputText, setMatrixZoomInputText] = useState<string>("85");

  useEffect(() => {
    setMatrixZoomInputText(String(matrixZoomPercent));
  }, [matrixZoomPercent]);

  const handleCommitMatrixZoom = () => {
    const val = Number(matrixZoomInputText);
    if (!isNaN(val) && val > 0) {
      const clamped = Math.min(180, Math.max(40, val));
      setMatrixZoomPercent(clamped);
      setMatrixZoomInputText(String(clamped));
    } else {
      setMatrixZoomInputText(String(matrixZoomPercent));
    }
  };

  const bayNumbers = Array.from(
    { length: bayCount },
    (_, index) => bayCount - index,
  );

  return (
    <div className="tab-container">
      {/* PAGE HEADER */}
      <PageHeader
        title="3. Sơ đồ Mặt bằng Kệ 2D"
        description="Bản đồ tương tác toàn kho 24 dãy kệ (101–124) và chi tiết 1.697 khoang theo sơ đồ thực tế Master Document v2.0"
        badge="Sơ đồ Mặt bằng"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* 1. SƠ ĐỒ TOÀN CẢNH KHO 2D (24 DÃY 101-124) */}
        <WarehouseMap2D
          highlightedLocation={highlightedLocation}
          onClearHighlight={() => setHighlightedLocation(null)}
          onBackToInbound={onBackToInbound}
          warehouseSlots={warehouseSlots}
          leases={activeLeases}
          tenants={tenants}
          initialTenantFilter={selectedTenantMapFilter}
          onTenantFilterChange={setSelectedTenantMapFilter}
          selectedRack={selectedRack}
          onSelectRack={setSelectedRack}
        />

        {/* 2. MA TRẬN CHI TIẾT TOÀN BỘ KHOANG & SLOT */}
        <div className="saas-card warehouse-map">
          {/* MATRIX CARD HEADER / ACCORDION */}
          <div
            className="saas-matrix-header"
            onClick={() => setIsMatrixExpanded((prev) => !prev)}
            role="button"
            tabIndex={0}
          >
            <div className="saas-matrix-title-row">
              <button
                type="button"
                className="saas-btn-icon-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMatrixExpanded((prev) => !prev);
                }}
                aria-label="Thu phóng ma trận ô kệ"
              >
                {isMatrixExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <div>
                <h3 className="saas-card-title">
                  Ma trận chi tiết Dãy {selectedRack} · Tầng{" "}
                  {selectedLevel === 0 ? "Tất cả các tầng (T1 → T6)" : `Tầng ${selectedLevel}`}
                </h3>
                <span className="saas-card-subtitle">
                  {warehouseBusy
                    ? "Đang nạp trạng thái ô..."
                    : isRackEven
                    ? "Dãy chẵn: C · B · A (Nhìn mặt tiền từ Trái sang Phải)"
                    : "Dãy lẻ: A · B · C (Nhìn mặt tiền từ Trái sang Phải)"}
                </span>
              </div>
            </div>

            <div className="saas-matrix-quick-actions">
              {!isMatrixExpanded ? (
                <Badge variant="primary" size="sm">Bấm để mở rộng ma trận</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Thu gọn bảng</Badge>
              )}
            </div>
          </div>

          {isMatrixExpanded && (
            <div className="saas-matrix-body">
              {/* TARGET HIGHLIGHT ALERT BANNER */}
              {highlightedLocation && (
                <div className="saas-highlight-banner">
                  <div className="saas-highlight-info">
                    <span className="saas-pulse-dot" />
                    <div>
                      <strong>
                        Đang định vị Pallet: <code>{highlightedLocation.pallet_code}</code>
                      </strong>
                      <p>
                        Dãy {highlightedLocation.rack} · Khoang #{String(highlightedLocation.bay).padStart(2, "0")} · Tầng {highlightedLocation.level} · Vị trí Slot {highlightedLocation.slots.join("")}
                      </p>
                    </div>
                  </div>
                  <div className="saas-highlight-actions">
                    <button
                      type="button"
                      className="saas-btn saas-btn-secondary saas-btn-sm"
                      onClick={() => setHighlightedLocation(null)}
                    >
                      <X size={14} />
                      <span>Tắt làm sáng</span>
                    </button>
                    <button
                      type="button"
                      className="saas-btn saas-btn-primary saas-btn-sm"
                      onClick={() => {
                        setHighlightedLocation(null);
                        onBackToInbound();
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Quay lại Nhập hàng</span>
                    </button>
                  </div>
                </div>
              )}

              {/* UNIFIED TOOLBAR: BỘ LỌC + TÌM KIẾM + ZOOM + VIEW MODE */}
              <div className="saas-unified-toolbar">
                <div className="saas-toolbar-row">
                  <div className="saas-toolbar-field">
                    <label className="saas-field-label">Dãy kệ (Rack)</label>
                    <select
                      className="saas-select saas-select-sm"
                      value={selectedRack}
                      onChange={(e) => setSelectedRack(Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, index) => 101 + index).map((rack) => (
                        <option key={rack} value={rack}>
                          Dãy {rack} ({getBayCountForRack(rack)} khoang)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="saas-toolbar-field">
                    <label className="saas-field-label">Tầng kệ (Level)</label>
                    <select
                      className="saas-select saas-select-sm"
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(Number(e.target.value))}
                    >
                      <option value={0}>Tất cả các tầng (T1 → T6)</option>
                      {Array.from({ length: 6 }, (_, index) => index + 1).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          Tầng {lvl} {lvl <= 3 ? "(Có lối xe nâng)" : "(Kệ beam tiêu chuẩn)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="saas-toolbar-field">
                    <label className="saas-field-label">Trạng thái ô</label>
                    <select
                      className="saas-select saas-select-sm"
                      value={slotStatusFilter}
                      onChange={(e) => setSlotStatusFilter(e.target.value as "ALL" | SlotStatus)}
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      {(["AVAILABLE", "ASSIGNED", "RESERVED", "OCCUPIED", "BLOCKED"] as SlotStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {SLOT_STATUS_NAMES[st]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="saas-toolbar-field saas-field-search">
                    <label className="saas-field-label">Tìm SKU / Pallet</label>
                    <div className="saas-input-with-icon">
                      <Search size={14} className="saas-input-icon text-muted" />
                      <input
                        className="saas-input saas-input-sm"
                        value={slotSkuFilter}
                        onChange={(e) => setSlotSkuFilter(e.target.value)}
                        placeholder="Nhập mã SKU hoặc Pallet..."
                      />
                    </div>
                  </div>
                </div>

                {/* DÒNG ĐIỀU KHIỂN VIEW & ZOOM */}
                <div className="saas-toolbar-subrow">
                  <div className="saas-view-mode-toggle">
                    <button
                      type="button"
                      className={`saas-mode-btn ${gridWrapMode === "WRAP" ? "active" : ""}`}
                      onClick={() => setGridWrapMode("WRAP")}
                      title="Dàn đều các ô khoang trên màn hình"
                    >
                      <LayoutGrid size={14} />
                      <span>Dàn đều</span>
                    </button>
                    <button
                      type="button"
                      className={`saas-mode-btn ${gridWrapMode === "SCROLL" ? "active" : ""}`}
                      onClick={() => setGridWrapMode("SCROLL")}
                      title="Cuộn ngang 1 hàng"
                    >
                      <Maximize2 size={14} />
                      <span>Cuộn ngang</span>
                    </button>
                  </div>

                  {/* ZOOM CONTROLS */}
                  <div className="saas-zoom-control">
                    <button
                      type="button"
                      className="saas-zoom-btn"
                      onClick={() => setMatrixZoomPercent((z) => Math.max(40, z - 10))}
                      title="Thu nhỏ 10%"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <div className="saas-zoom-input-box">
                      <input
                        type="number"
                        min="40"
                        max="180"
                        step="5"
                        className="saas-zoom-input"
                        value={matrixZoomInputText}
                        onChange={(e) => setMatrixZoomInputText(e.target.value)}
                        onBlur={handleCommitMatrixZoom}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCommitMatrixZoom();
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                      />
                      <span className="saas-zoom-pct">%</span>
                    </div>
                    <button
                      type="button"
                      className="saas-zoom-btn"
                      onClick={() => setMatrixZoomPercent((z) => Math.min(180, z + 10))}
                      title="Phóng to 10%"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>

                  <div className="saas-toolbar-info-tags">
                    <span className="saas-tag-direction">
                      Mặt tiền: <strong>{slotOrder.join(" → ")}</strong>
                    </span>
                    <span className="saas-tag-rack-info">
                      Dãy {selectedRack} ({bayCount} khoang)
                    </span>
                  </div>
                </div>
              </div>

              {/* COLOR LEGEND */}
              <div className="saas-map-legend">
                {(["AVAILABLE", "ASSIGNED", "RESERVED", "OCCUPIED", "BLOCKED"] as SlotStatus[]).map((st) => (
                  <div className="saas-legend-item" key={st}>
                    <span className={`saas-legend-dot dot-${st.toLowerCase()}`} />
                    <span>{SLOT_STATUS_NAMES[st]}</span>
                  </div>
                ))}
                <div className="saas-legend-item">
                  <span className="saas-legend-tag passage">Lối xe nâng</span>
                  <span>Tầng 1–3</span>
                </div>
                {selectedRack >= 110 && (
                  <div className="saas-legend-item">
                    <span className="saas-legend-tag walkway">Lối đi ngang 4m</span>
                    <span>Ô 78:77 & 73:72</span>
                  </div>
                )}
              </div>

              {/* MA TRẬN SLOT GRID CONTAINER */}
              <div
                className={`slot-grid-container ${gridWrapMode === "WRAP" ? "wrap-all-container" : ""} ${
                  gridWrapMode === "SCROLL" && mapGridPan.isPanning ? "is-panning" : ""
                }`}
                {...(gridWrapMode === "SCROLL" ? mapGridPan.panProps : {})}
              >
                <div
                  className={`slot-grid ${gridWrapMode === "WRAP" ? "wrap-all" : ""} ${
                    matrixZoomPercent <= 85 ? "matrix-compact" : "matrix-normal"
                  }`}
                  style={{ zoom: matrixZoomPercent / 100 }}
                  aria-label={`Sơ đồ dãy ${selectedRack}`}
                >
                  {bayNumbers.map((bay) => {
                    const baySlots = filteredWarehouseSlots.filter((slot) => slot.bay === bay);
                    const isPassageBay = isForkliftPassage(selectedRack, bay, 1);
                    const isHighlightedBay = Boolean(
                      highlightedLocation &&
                        highlightedLocation.rack === selectedRack &&
                        (selectedLevel === 0 || highlightedLocation.level === selectedLevel) &&
                        highlightedLocation.bay === bay,
                    );
                    const showWalkwayA = selectedRack >= 110 && bay === 78;
                    const showWalkwayB = selectedRack >= 110 && bay === 73;
                    const showCharging = selectedRack <= 109 && bay === 26;

                    // TRƯỜNG HỢP 1: TẤT CẢ CÁC TẦNG (T6 -> T1)
                    if (selectedLevel === 0) {
                      return (
                        <Fragment key={bay}>
                          <div
                            id={`bay-cell-${bay}`}
                            className={`bay-cell bay-multi-level ${isPassageBay ? "bay-forklift-passage" : ""} ${
                              isHighlightedBay ? "bay-highlighted-target" : ""
                            }`}
                            title={`Khoang #${String(bay).padStart(2, "0")}`}
                          >
                            <div className="bay-cell-header">
                              <strong>#{String(bay).padStart(2, "0")}</strong>
                              {isHighlightedBay && (
                                <span className="bay-target-badge">🎯 VỊ TRÍ HÀNG</span>
                              )}
                              {isPassageBay && (
                                <span className="bay-passage-badge">Lối xe</span>
                              )}
                            </div>
                            <div className="bay-level-stack">
                              {[6, 5, 4, 3, 2, 1].map((lvl) => {
                                const levelSlots = baySlots.filter((s) => s.level === lvl);
                                const isPassageLvl = isForkliftPassage(selectedRack, bay, lvl);
                                const isHighlightedLvl = Boolean(
                                  isHighlightedBay && highlightedLocation?.level === lvl,
                                );
                                return (
                                  <div
                                    key={lvl}
                                    className={`bay-level-mini-row ${isPassageLvl ? "level-is-passage" : ""} ${
                                      isHighlightedLvl ? "level-has-target" : ""
                                    }`}
                                  >
                                    <span className="bay-level-tag">T{lvl}</span>
                                    <div className="slot-row">
                                      {slotOrder.map((slotCode) => {
                                        const slot = levelSlots.find((item) => item.slot === slotCode);
                                        const isHighlightedSlot = Boolean(
                                          isHighlightedLvl && highlightedLocation?.slots.includes(slotCode),
                                        );

                                        return slot ? (
                                          <button
                                            className={`slot-cell ${slot.status.toLowerCase()} ${
                                              isPassageLvl ? "slot-passage" : ""
                                            } ${isHighlightedSlot ? "slot-highlighted-pulse" : ""}`}
                                            key={slotCode}
                                            onClick={() => setSelectedSlot(slot)}
                                            type="button"
                                          >
                                            {slotCode}
                                          </button>
                                        ) : (
                                          <button
                                            className={`slot-cell available ${isPassageLvl ? "slot-passage" : ""}`}
                                            key={slotCode}
                                            type="button"
                                            disabled
                                          >
                                            {slotCode}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {showWalkwayA && (
                            <div className="grid-separator walkway-separator" title="Lối đi ngang giữa khoang 78 và 77">
                              <span className="sep-label">LỐI ĐI 4M</span>
                            </div>
                          )}
                          {showWalkwayB && (
                            <div className="grid-separator walkway-separator" title="Lối đi ngang giữa khoang 73 và 72">
                              <span className="sep-label">LỐI ĐI 4M</span>
                            </div>
                          )}
                          {showCharging && (
                            <div className="grid-separator charging-separator" title="Trạm sạc xe nâng giữa khoang 26 và 25">
                              <span className="sep-label">SẠC XE NÂNG</span>
                            </div>
                          )}
                        </Fragment>
                      );
                    }

                    // TRƯỜNG HỢP 2: HIỂN THỊ 1 TẦNG CỤ THỂ
                    const isPassageLvl = isForkliftPassage(selectedRack, bay, selectedLevel);
                    const isHighlightedLvl = Boolean(
                      isHighlightedBay && highlightedLocation?.level === selectedLevel,
                    );
                    return (
                      <Fragment key={bay}>
                        <div
                          id={`bay-cell-${bay}`}
                          className={`bay-cell ${isPassageLvl ? "bay-forklift-passage" : ""} ${
                            isHighlightedLvl ? "bay-highlighted-target" : ""
                          }`}
                        >
                          <div className="bay-cell-header">
                            <strong>#{String(bay).padStart(2, "0")}</strong>
                            {isHighlightedLvl && (
                              <span className="bay-target-badge">🎯 VỊ TRÍ HÀNG</span>
                            )}
                            {isPassageLvl && (
                              <span className="bay-passage-badge">Lối xe</span>
                            )}
                          </div>
                          <div className="slot-row">
                            {slotOrder.map((slotCode) => {
                              const slot = baySlots.find((item) => item.slot === slotCode);
                              const isHighlightedSlot = Boolean(
                                isHighlightedLvl && highlightedLocation?.slots.includes(slotCode),
                              );

                              return slot ? (
                                <button
                                  className={`slot-cell ${slot.status.toLowerCase()} ${
                                    isPassageLvl ? "slot-passage" : ""
                                  } ${isHighlightedSlot ? "slot-highlighted-pulse" : ""}`}
                                  key={slotCode}
                                  onClick={() => setSelectedSlot(slot)}
                                  type="button"
                                >
                                  {slotCode}
                                </button>
                              ) : (
                                <button
                                  className={`slot-cell available ${isPassageLvl ? "slot-passage" : ""}`}
                                  key={slotCode}
                                  type="button"
                                  disabled
                                >
                                  {slotCode}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {showWalkwayA && (
                          <div className="grid-separator walkway-separator" title="Lối đi ngang giữa khoang 78 và 77">
                            <span className="sep-label">LỐI ĐI 4M</span>
                          </div>
                        )}
                        {showWalkwayB && (
                          <div className="grid-separator walkway-separator" title="Lối đi ngang giữa khoang 73 và 72">
                            <span className="sep-label">LỐI ĐI 4M</span>
                          </div>
                        )}
                        {showCharging && (
                          <div className="grid-separator charging-separator" title="Trạm sạc xe nâng giữa khoang 26 và 25">
                            <span className="sep-label">SẠC XE NÂNG</span>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {/* CARD CHI TIẾT Ô KHI ĐƯỢC CLICK CHỌN */}
              {selectedSlot && (
                <div className="saas-slot-detail-modal">
                  <div className="saas-slot-detail-card">
                    <div className="saas-slot-detail-header">
                      <div>
                        <div className="saas-title-with-badge">
                          <MapPin size={18} className="text-primary" />
                          <h4 className="saas-card-title">
                            {formatLocationCode(
                              selectedSlot.rack,
                              selectedSlot.bay,
                              selectedSlot.level,
                              [selectedSlot.slot],
                            )}
                          </h4>
                        </div>
                        <span className="saas-card-subtitle">
                          Dãy {selectedSlot.rack} · Khoang #{String(selectedSlot.bay).padStart(2, "0")} · Tầng {selectedSlot.level} · Slot {selectedSlot.slot}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="saas-btn-icon-close"
                        onClick={() => setSelectedSlot(undefined)}
                        title="Đóng chi tiết"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="saas-slot-detail-grid">
                      <div className="saas-slot-info-item">
                        <span className="saas-slot-info-label">Trạng thái ô</span>
                        <Badge
                          variant={
                            selectedSlot.status === "OCCUPIED"
                              ? "success"
                              : selectedSlot.status === "ASSIGNED"
                              ? "info"
                              : selectedSlot.status === "RESERVED"
                              ? "warning"
                              : selectedSlot.status === "BLOCKED"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {SLOT_STATUS_NAMES[selectedSlot.status]}
                        </Badge>
                      </div>

                      <div className="saas-slot-info-item">
                        <span className="saas-slot-info-label">Khách thuê khoang</span>
                        <strong>{selectedSlot.tenant_id || "Chưa cấp quyền thuê"}</strong>
                      </div>

                      <div className="saas-slot-info-item">
                        <span className="saas-slot-info-label">Mã Pallet lưu trữ</span>
                        <code>{selectedSlot.pallet_code || "—"}</code>
                      </div>

                      <div className="saas-slot-info-item">
                        <span className="saas-slot-info-label">Mặt hàng / SKU</span>
                        <span>
                          {selectedSlot.sku ? `${selectedSlot.sku} (${selectedSlot.sku_name || ""})` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
