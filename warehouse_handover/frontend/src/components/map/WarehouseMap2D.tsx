import React, { useMemo, useRef, useEffect, useState } from "react";
import { WarehouseSlot, LeaseRecord, Tenant } from "../../types";
import { listLeases } from "../../services/api";

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
    badge: "#7c3aed",
  },
  {
    primary: "#ea580c",
    bg: "#fff7ed",
    border: "#ea580c",
    text: "#c2410c",
    glow: "rgba(234, 88, 12, 0.45)",
    badge: "#ea580c",
  },
  {
    primary: "#db2777",
    bg: "#fdf2f8",
    border: "#db2777",
    text: "#be185d",
    glow: "rgba(219, 39, 119, 0.45)",
    badge: "#db2777",
  },
  {
    primary: "#0891b2",
    bg: "#ecfeff",
    border: "#0891b2",
    text: "#0e7490",
    glow: "rgba(8, 145, 178, 0.45)",
    badge: "#0891b2",
  },
];

export function getBayDisplayCol(rack: number, bay: number): number {
  if (rack >= 110) {
    return bay;
  }
  if (rack >= 102 && rack <= 109) {
    if (bay >= 26) {
      return bay + 35; // 26 -> 61, 37 -> 72, 38 -> 73, 42 -> 77, 43 -> 78, 49 -> 84
    }
    return bay;
  }
  if (rack === 101) {
    if (bay >= 26) {
      return bay + 39; // 26 -> 65, 33 -> 72, 34 -> 73, 38 -> 77, 39 -> 78, 45 -> 84
    }
    return bay;
  }
  return bay;
}

export function getBayFromDisplayCol(
  rack: number,
  displayCol: number,
): {
  type: "BAY" | "VOID" | "CHARGING_STATION" | "SKIP";
  bay?: number;
} {
  if (rack >= 110) {
    return { type: "BAY", bay: displayCol };
  }
  if (rack >= 102 && rack <= 109) {
    if (displayCol >= 61) {
      const bay = displayCol - 35;
      if (bay >= 26 && bay <= 49) return { type: "BAY", bay };
    } else if (displayCol <= 25) {
      return { type: "BAY", bay: displayCol };
    }
    return { type: "VOID" };
  }
  if (rack === 101) {
    if (displayCol >= 65) {
      const bay = displayCol - 39;
      if (bay >= 26 && bay <= 45) return { type: "BAY", bay };
    } else if (displayCol === 64) {
      return { type: "CHARGING_STATION" };
    } else if (displayCol === 63) {
      return { type: "SKIP" };
    } else if (displayCol <= 25) {
      return { type: "BAY", bay: displayCol };
    }
    return { type: "VOID" };
  }
  return { type: "VOID" };
}

export function isForkliftPassageBay(rack: number, bay: number): boolean {
  if (rack >= 101 && rack <= 109) return bay === 12;
  if (rack >= 110 && rack <= 124) return [12, 26, 43, 60].includes(bay);
  return false;
}

interface WarehouseMap2DProps {
  highlightedLocation: HighlightTarget | null;
  onClearHighlight?: () => void;
  onBackToInbound?: () => void;
  warehouseSlots?: WarehouseSlot[];
  leases?: LeaseRecord[];
  tenants?: Tenant[];
  initialTenantFilter?: string;
  onTenantFilterChange?: (tenantCode: string) => void;
  selectedRack?: number;
  onSelectRack?: (rack: number) => void;
}

export const WarehouseMap2D: React.FC<WarehouseMap2DProps> = ({
  highlightedLocation,
  onClearHighlight,
  onBackToInbound,
  warehouseSlots = [],
  leases: propLeases,
  tenants: propTenants,
  initialTenantFilter = "",
  onTenantFilterChange,
  selectedRack,
  onSelectRack,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomInputText, setZoomInputText] = useState<string>("100");

  useEffect(() => {
    setZoomInputText(String(Math.round(zoomLevel * 100)));
  }, [zoomLevel]);

  const handleCommitZoom = () => {
    const parsed = Number(zoomInputText);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(250, Math.max(40, parsed));
      setZoomLevel(Number((clamped / 100).toFixed(2)));
      setZoomInputText(String(Math.round(clamped)));
    } else {
      setZoomInputText(String(Math.round(zoomLevel * 100)));
    }
  };

  const [activeViewMode, setActiveViewMode] = useState<"INTERACTIVE" | "BLUEPRINT">("INTERACTIVE");
  const [selectedCell, setSelectedCell] = useState<{ rack: number; bay: number } | null>(null);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>(initialTenantFilter);
  const [internalLeases, setInternalLeases] = useState<LeaseRecord[]>([]);

  // Tự động tải danh sách hợp đồng thuê nếu prop chưa có
  useEffect(() => {
    if (!propLeases || propLeases.length === 0) {
      listLeases().then(setInternalLeases).catch(() => {});
    }
  }, [propLeases]);

  useEffect(() => {
    if (initialTenantFilter !== undefined) {
      setSelectedTenantFilter(initialTenantFilter);
    }
  }, [initialTenantFilter]);

  const effectiveLeases = useMemo(
    () => {
      const list = propLeases && propLeases.length > 0 ? propLeases : internalLeases;
      return list.filter((l) => l.status !== "CLOSED");
    },
    [propLeases, internalLeases]
  );

  // Map tra cứu vị trí khoang của từng khách hàng: key = `${rack}-${bay}`
  const bayTenantMap = useMemo(() => {
    const map = new Map<
      string,
      {
        tenantCode: string;
        tenantName: string;
        palette: TenantPalette;
        lease: LeaseRecord;
      }
    >();

    effectiveLeases.forEach((lease, idx) => {
      const palette = TENANT_PALETTES[idx % TENANT_PALETTES.length];
      const tName = lease.tenant_name || lease.tenant_code;
      (lease.bays || []).forEach((b) => {
        map.set(`${b.rack}-${b.bay}`, {
          tenantCode: lease.tenant_code,
          tenantName: tName,
          palette,
          lease,
        });
      });
    });

    return map;
  }, [effectiveLeases]);

  const currentSelectedLease = useMemo(
    () => effectiveLeases.find((l) => l.tenant_code === selectedTenantFilter),
    [effectiveLeases, selectedTenantFilter]
  );

  const handleScrollToTenantFirstBay = (tenantCode?: string) => {
    const targetCode = tenantCode || selectedTenantFilter;
    const lease = effectiveLeases.find((l) => l.tenant_code === targetCode);
    if (!lease || !lease.bays || lease.bays.length === 0) return;
    const firstBay = lease.bays[0];
    setSelectedCell({ rack: firstBay.rack, bay: firstBay.bay });
    setTimeout(() => {
      const el = document.getElementById(`map-bay-${firstBay.rack}-${firstBay.bay}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 120);
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetBayCellRef = useRef<HTMLDivElement | null>(null);

  // Danh sách các dãy từ 124 xuống 101 (Đúng thứ tự nhìn từ trên xuống: 124 ở trên, 101 ở đáy)
  const racks = useMemo(
    () => Array.from({ length: 24 }, (_, i) => 124 - i),
    [],
  );

  // Danh sách 84 cột hiển thị (Duyệt từ Trái sang Phải: Cột 84 về Cột 01)
  const displayCols = useMemo(
    () => Array.from({ length: 84 }, (_, i) => 84 - i),
    [],
  );

  // Tự động cuộn tới ô đang làm sáng
  useEffect(() => {
    if (highlightedLocation && targetBayCellRef.current) {
      setSelectedCell({ rack: highlightedLocation.rack, bay: highlightedLocation.bay });
      setTimeout(() => {
        targetBayCellRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 150);
    }
  }, [highlightedLocation]);

  // Vị trí tỷ lệ phần trăm trên bản vẽ Blueprint ảnh gốc (1258 x 510)
  const blueprintCoords = useMemo(() => {
    if (!highlightedLocation) return null;
    const { rack, bay } = highlightedLocation;
    const displayCol = getBayDisplayCol(rack, bay);

    // Tính toán tọa độ X, Y trên ảnh gốc (1258 x 510 px)
    // Trục Y: Rack 124 ở trên cùng (~3.5%), Rack 101 ở dưới cùng (~93.5%)
    const yPercent = ((124 - rack) / 23) * 88 + 5.5;

    // Trục X: Cột 84 ở bên trái (~3%), Cột 01 ở bên phải (~97%)
    // Có 2 lối đi 4m ở giữa (78:77) và (73:72)
    let extraGap = 0;
    if (displayCol < 78) extraGap += 1.2;
    if (displayCol < 73) extraGap += 1.2;

    const xPercent = ((84 - displayCol) / 83) * 91 + 3.8 + extraGap;

    return {
      x: Math.min(Math.max(xPercent, 2), 98),
      y: Math.min(Math.max(yPercent, 3), 96),
    };
  }, [highlightedLocation]);

  const targetRack = highlightedLocation?.rack ?? selectedCell?.rack ?? selectedRack ?? 101;
  const targetBay = highlightedLocation?.bay ?? selectedCell?.bay ?? 16;
  const isTargetEven = targetRack % 2 === 0;
  const slotOrder: ("A" | "B" | "C")[] = isTargetEven ? ["C", "B", "A"] : ["A", "B", "C"];

  return (
    <div className="warehouse-2d-master-container">
      {/* HEADER ĐIỀU KHIỂN & CHỈ THỊ VỊ TRÍ */}
      <div className="map-master-header">
        <div className="map-title-group">
          <div className="blueprint-badge">📐 SƠ ĐỒ KHO THỰC TẾ</div>
          <h3>Mặt bằng tổng thể 24 dãy kệ (Dãy 101 → 124)</h3>
          <p className="map-subtitle">
            Bản đồ 2D toàn cảnh: 24 dãy ngang, 1.697 khoang, 2 lối đi bộ, vùng xe nâng trung tâm & trạm sạc.
          </p>
        </div>

        <div className="map-controls-group">
          {/* NÚT & BỘ CHỌN XEM KHOANG KHÁCH HÀNG THUÊ */}
          <div className="tenant-filter-control-box">
            <span className="tenant-filter-icon">🏢</span>
            <select
              id="tenant-map-select-filter"
              className="tenant-filter-select"
              value={selectedTenantFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTenantFilter(val);
                if (onTenantFilterChange) onTenantFilterChange(val);
                if (val && val !== "ALL_ACTIVE") {
                  handleScrollToTenantFirstBay(val);
                }
              }}
              title="Lựa chọn khách hàng để xem các ô khoang đã thuê"
            >
              <option value="">-- Tất cả khoang kệ --</option>
              {effectiveLeases.length > 0 && (
                <option value="ALL_ACTIVE">
                  Tất cả khách thuê
                </option>
              )}
              {effectiveLeases.map((l, idx) => (
                <option key={`${l.tenant_code}-${l.id || idx}`} value={l.tenant_code}>
                  🏢 {l.tenant_name || l.tenant_code} ({l.bays?.length || 0} khoang · {l.area_m2}m²)
                </option>
              ))}
            </select>
            {selectedTenantFilter && (
              <button
                type="button"
                className="btn-clear-tenant-filter"
                onClick={() => {
                  setSelectedTenantFilter("");
                  if (onTenantFilterChange) onTenantFilterChange("");
                }}
                title="Bỏ lọc khách hàng"
              >
                ✕
              </button>
            )}
          </div>

          <div className="view-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${activeViewMode === "INTERACTIVE" ? "active" : ""}`}
              onClick={() => setActiveViewMode("INTERACTIVE")}
            >
              🗺️ Bản đồ tương tác 2D
            </button>
            <button
              type="button"
              className={`mode-btn ${activeViewMode === "BLUEPRINT" ? "active" : ""}`}
              onClick={() => setActiveViewMode("BLUEPRINT")}
            >
              📷 Bản vẽ gốc
            </button>
          </div>

          <div className="zoom-controls">
            <button
              type="button"
              className="btn-zoom"
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              title="Thu nhỏ 10%"
            >
              ➖
            </button>
            <div className="zoom-input-box" title="Bấm vào để nhập số % phóng to thu nhỏ và nhấn Enter">
              <input
                type="number"
                min="40"
                max="250"
                step="5"
                className="zoom-number-input"
                value={zoomInputText}
                onChange={(e) => setZoomInputText(e.target.value)}
                onBlur={handleCommitZoom}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCommitZoom();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-label="Tỷ lệ phóng to thu nhỏ sơ đồ 2D (%)"
              />
              <span className="zoom-percent-sign">%</span>
            </div>
            <button
              type="button"
              className="btn-zoom"
              onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
              title="Phóng to 10%"
            >
              ➕
            </button>
            <button
              type="button"
              className="btn-zoom-reset"
              onClick={() => setZoomLevel(1)}
              title="Đặt lại 100%"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* BANNER HIỂN THỊ KHOANG THUÊ CỦA KHÁCH HÀNG */}
      {selectedTenantFilter && (
        <div className="map-tenant-active-banner">
          <div className="tenant-banner-left">
            <div
              className="tenant-banner-avatar"
              style={{
                backgroundColor:
                  selectedTenantFilter === "ALL_ACTIVE"
                    ? "#4f46e5"
                    : currentSelectedLease
                    ? TENANT_PALETTES[
                        effectiveLeases.indexOf(currentSelectedLease) %
                          TENANT_PALETTES.length
                      ].primary
                    : "#2563eb",
              }}
            >
              🏢
            </div>
            <div>
              <div className="tenant-banner-title">
                {selectedTenantFilter === "ALL_ACTIVE" ? (
                  <>
                    ĐANG HIỂN THỊ PHÂN VÙNG CỦA TẤT CẢ{" "}
                    <strong>{effectiveLeases.length} KHÁCH HÀNG THUÊ</strong>
                  </>
                ) : (
                  <>
                    CÁC Ô KHOANG THUÊ CỦA:{" "}
                    <strong>
                      {currentSelectedLease?.tenant_name ||
                        currentSelectedLease?.tenant_code}
                    </strong>{" "}
                    <code className="tenant-code-badge">
                      {currentSelectedLease?.tenant_code}
                    </code>
                  </>
                )}
              </div>
              <div className="tenant-banner-details">
                {selectedTenantFilter === "ALL_ACTIVE" ? (
                  <div className="tenant-legend-chips">
                    {effectiveLeases.map((l, idx) => {
                      const pal = TENANT_PALETTES[idx % TENANT_PALETTES.length];
                      return (
                        <button
                          key={l.tenant_code}
                          type="button"
                          className="tenant-legend-chip-btn"
                          style={{
                            background: pal.bg,
                            borderColor: pal.border,
                            color: pal.text,
                          }}
                          onClick={() => {
                            setSelectedTenantFilter(l.tenant_code);
                            handleScrollToTenantFirstBay(l.tenant_code);
                          }}
                          title={`Bấm để xem riêng khoang của ${l.tenant_name}`}
                        >
                          <span
                            className="chip-color-dot"
                            style={{ background: pal.primary }}
                          />
                          <strong>{l.tenant_name || l.tenant_code}</strong>:{" "}
                          {l.bays?.length || 0} khoang
                        </button>
                      );
                    })}
                  </div>
                ) : currentSelectedLease ? (
                  <div className="tenant-single-meta">
                    <span>
                      Đang thuê:{" "}
                      <strong className="stat-count">
                        {currentSelectedLease.bays?.length || 0} khoang
                      </strong>
                    </span>
                    <span>
                      Diện tích:{" "}
                      <strong>{currentSelectedLease.area_m2} m²</strong>
                    </span>
                    <span>
                      Vị trí khoang:{" "}
                      <strong>{currentSelectedLease.formatted_bays}</strong>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="tenant-banner-actions">
            {selectedTenantFilter !== "ALL_ACTIVE" &&
              currentSelectedLease &&
              (currentSelectedLease.bays?.length || 0) > 0 && (
                <button
                  type="button"
                  className="btn-scroll-tenant-bay"
                  onClick={() => handleScrollToTenantFirstBay()}
                >
                  🎯 Cuộn tới khoang của khách
                </button>
              )}
            <button
              type="button"
              className="btn-close-tenant-filter"
              onClick={() => {
                setSelectedTenantFilter("");
                if (onTenantFilterChange) onTenantFilterChange("");
              }}
            >
              ✕ Xem tất cả khoang
            </button>
          </div>
        </div>
      )}

      {/* BANNER THÔNG BÁO VỊ TRÍ PALLET ĐANG LÀM SÁNG */}
      {highlightedLocation && (
        <div className="map-target-pinpoint-card">
          <div className="pinpoint-info">
            <div className="pinpoint-radar-icon">
              <span className="radar-circle"></span>
              🎯
            </div>
            <div>
              <div className="pinpoint-title">
                VỊ TRÍ ĐÍCH ĐẾN CỦA PALLET: <strong>{highlightedLocation.pallet_code}</strong>
              </div>
              <div className="pinpoint-coords">
                📍 <strong>Dãy {highlightedLocation.rack}</strong> · Khoang <strong>#{String(highlightedLocation.bay).padStart(2, "0")}</strong> · Tầng <strong>{highlightedLocation.level}</strong> · Vị trí Slot <strong>{highlightedLocation.slots.join("")}</strong>
              </div>
            </div>
          </div>

          <div className="pinpoint-actions">
            <button
              type="button"
              className="btn-focus-target"
              onClick={() => {
                targetBayCellRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                  inline: "center",
                });
              }}
            >
              👁️ Cuộn tới ô đang sáng
            </button>
            {onClearHighlight && (
              <button
                type="button"
                className="btn-clear-target-pin"
                onClick={onClearHighlight}
              >
                ✕ Tắt sáng
              </button>
            )}
            {onBackToInbound && (
              <button
                type="button"
                className="btn-return-inbound"
                onClick={() => {
                  if (onClearHighlight) onClearHighlight();
                  onBackToInbound();
                }}
              >
                ← Quay lại Nhập hàng
              </button>
            )}
          </div>
        </div>
      )}

      {/* NỘI DUNG BẢN ĐỒ */}
      {activeViewMode === "BLUEPRINT" ? (
        /* CHẾ ĐỘ 1: BẢN VẼ GỐC TỪ SODOKHO.DOCX */
        <div className="blueprint-view-wrapper">
          <div className="blueprint-canvas" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}>
            <img
              src="/assets/warehouse_map_blueprint.png"
              alt="Sơ đồ kho gốc"
              className="blueprint-img"
            />
            {blueprintCoords && (
              <div
                className="blueprint-pinpoint-marker"
                style={{
                  left: `${blueprintCoords.x}%`,
                  top: `${blueprintCoords.y}%`,
                }}
                title={`Vị trí: Dãy ${highlightedLocation?.rack} · Khoang #${highlightedLocation?.bay} · Tầng ${highlightedLocation?.level}`}
              >
                <div className="marker-pulse-ring"></div>
                <div className="marker-dot"></div>
                <div className="marker-tooltip">
                  🎯 Pallet: {highlightedLocation?.pallet_code}
                  <br />
                  Dãy {highlightedLocation?.rack} - Ô #{highlightedLocation?.bay} (T{highlightedLocation?.level})
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ 2: BẢN ĐỒ TƯƠNG TÁC 2D TOÀN BỘ 24 DÃY */
        <div
          ref={containerRef}
          className="interactive-map-scroll-container"
        >
          <div
            className="warehouse-grid-canvas"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
            }}
          >
            {/* HÀNG HEADER HIỂN THỊ CỘT TRỤC X */}
            <div className="grid-header-row">
              <div className="rack-label-col header-corner">Dãy</div>
              {displayCols.map((col) => {
                const showWalkwayA = col === 78;
                const showWalkwayB = col === 73;
                return (
                  <React.Fragment key={col}>
                    <div className="col-header-cell">
                      {col % 5 === 0 || col === 1 || col === 84 || col === 12 || col === 26 || col === 43 || col === 60 ? `#${col}` : ""}
                    </div>
                    {showWalkwayA && (
                      <div className="walkway-header-cell" title="Lối đi ngang (Giữa ô 78 & 77)">
                        🚶
                      </div>
                    )}
                    {showWalkwayB && (
                      <div className="walkway-header-cell" title="Lối đi ngang (Giữa ô 73 & 72)">
                        🚶
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* CÁC HÀNG KỆ TỪ DÃY 124 XUỐNG DÃY 101 */}
            {racks.map((rack) => {
              const isTargetRack = highlightedLocation?.rack === rack;
              const isRackEven = rack % 2 === 0;
              const isBackToBackBelow = rack % 2 === 1 && rack > 101; // Dãy lẻ áp lưng vào dãy chẵn bên dưới

              return (
                <React.Fragment key={rack}>
                  <div className={`grid-rack-row ${isTargetRack ? "rack-has-target" : ""}`}>
                    {/* CỘT TÊN DÃY */}
                    <div
                      className={`rack-label-cell ${isRackEven ? "rack-even" : "rack-odd"} ${isTargetRack ? "rack-target-active" : ""}`}
                      title={`Dãy kệ ${rack} (${isRackEven ? "Dãy chẵn: C-B-A" : "Dãy lẻ: A-B-C"})`}
                    >
                      <span>{rack}</span>
                    </div>

                    {/* 84 CỘT HIỂN THỊ CỦA DÃY */}
                    {displayCols.map((col) => {
                      const showWalkwayA = col === 78;
                      const showWalkwayB = col === 73;
                      const cellInfo = getBayFromDisplayCol(rack, col);

                      if (cellInfo.type === "SKIP") {
                        return null;
                      }

                      if (cellInfo.type === "CHARGING_STATION") {
                        return (
                          <React.Fragment key={col}>
                            <div
                              className="bay-cell-station charging-station-box"
                              title="⚡ Trạm sạc xe nâng cạnh dãy 101"
                            >
                              ⚡ Sạc
                            </div>
                            {showWalkwayA && <div className="walkway-corridor-cell" />}
                            {showWalkwayB && <div className="walkway-corridor-cell" />}
                          </React.Fragment>
                        );
                      }

                      if (cellInfo.type === "VOID") {
                        // Khu vực trống nét đứt xe nâng
                        return (
                          <React.Fragment key={col}>
                            <div className="bay-cell-void" />
                            {showWalkwayA && <div className="walkway-corridor-cell" />}
                            {showWalkwayB && <div className="walkway-corridor-cell" />}
                          </React.Fragment>
                        );
                      }

                      const bay = cellInfo.bay!;
                      const isTargetBay = Boolean(
                        isTargetRack && highlightedLocation?.bay === bay,
                      );
                      const isForklift = isForkliftPassageBay(rack, bay);
                      const isSelected = selectedCell?.rack === rack && selectedCell?.bay === bay;

                      // Thông tin hợp đồng thuê kho của khoang này
                      const cellKey = `${rack}-${bay}`;
                      const bayTenantInfo = bayTenantMap.get(cellKey);
                      const isRentedBySelected = Boolean(
                        selectedTenantFilter &&
                        selectedTenantFilter !== "ALL_ACTIVE" &&
                        bayTenantInfo?.tenantCode === selectedTenantFilter
                      );
                      const isRentedInAllActive = Boolean(
                        selectedTenantFilter === "ALL_ACTIVE" &&
                        bayTenantInfo
                      );
                      const isDimmed = Boolean(
                        selectedTenantFilter &&
                        selectedTenantFilter !== "ALL_ACTIVE" &&
                        !isRentedBySelected
                      );

                      return (
                        <React.Fragment key={col}>
                          <div
                            ref={isTargetBay ? targetBayCellRef : null}
                            id={`map-bay-${rack}-${bay}`}
                            className={`grid-bay-cell ${isForklift ? "bay-forklift-pass" : ""} ${isTargetBay ? "bay-target-pulsing" : ""} ${isSelected ? "bay-selected" : ""} ${isRentedBySelected ? "bay-tenant-selected" : ""} ${isRentedInAllActive ? "bay-tenant-colored" : ""} ${isDimmed ? "bay-dimmed-by-filter" : ""}`}
                            style={
                              isRentedBySelected && bayTenantInfo
                                ? {
                                    backgroundColor: bayTenantInfo.palette.bg,
                                    borderColor: bayTenantInfo.palette.border,
                                    color: bayTenantInfo.palette.text,
                                    boxShadow: `0 0 7px ${bayTenantInfo.palette.glow}`,
                                    fontWeight: 800,
                                    zIndex: 8,
                                  }
                                : isRentedInAllActive && bayTenantInfo
                                ? {
                                    backgroundColor: bayTenantInfo.palette.bg,
                                    borderColor: bayTenantInfo.palette.border,
                                    color: bayTenantInfo.palette.text,
                                    fontWeight: 700,
                                  }
                                : undefined
                            }
                            onClick={() => {
                              setSelectedCell({ rack, bay });
                              onSelectRack?.(rack);
                            }}
                            title={
                              isTargetBay
                                ? `🎯 ĐÍCH ĐẾN: Dãy ${rack} · Khoang #${bay} (Cột #${col}) · Tầng ${highlightedLocation?.level} [Pallet: ${highlightedLocation?.pallet_code}]`
                                : bayTenantInfo
                                ? `Dãy ${rack} · Khoang #${bay}${isForklift ? " (Lối xe nâng T1-3)" : ""} · [ĐÃ THUÊ: ${bayTenantInfo.tenantName} (${bayTenantInfo.tenantCode})]`
                                : `Dãy ${rack} · Khoang #${bay}${isForklift ? " (Lối xe nâng T1-3)" : ""} · Vị trí Cột #${col} (Khoang trống)`
                            }
                          >
                            <span className="bay-num">{bay}</span>
                          </div>

                          {showWalkwayA && (
                            <div className="walkway-corridor-cell" title="Lối đi ngang" />
                          )}
                          {showWalkwayB && (
                            <div className="walkway-corridor-cell" title="Lối đi ngang" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* VẠCH ÁP LƯNG (BACK-TO-BACK) GIỮA DÃY LẺ VÀ DÃY CHẴN TIẾP THEO */}
                  {isBackToBackBelow && (
                    <div
                      className="back-to-back-spine"
                      title={`Lưng kệ đấu nhau (Back-to-back) giữa Dãy ${rack} và Dãy ${rack - 1}`}
                    />
                  )}

                  {/* KHOẢNG HỞ SÁT TƯỜNG ĐÁY Ở DƯỚI DÃY 101 */}
                  {rack === 101 && (
                    <div className="wall-clearance-bottom">
                      🧱 Khoảng hở cách tường đáy 0.5m
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* NHÃN KHU VỰC TRỐNG XE NÂNG (OVERLAY BẢNG ĐIỀU KHIỂN TRUNG TÂM) */}
            <div className="forklift-central-zone-overlay">
              <div className="zone-dashed-border">
                <span className="zone-title">🚜 KHU VỰC XE NÂNG & VẬN HÀNG (TRUNG TÂM)</span>
                <span className="zone-sub">Chừa trống theo thiết kế · Kết nối sạc xe nâng dãy 101</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHI TIẾT KHOANG KỆ ĐANG CHỌN / ĐANG LÀM SÁNG (MẶT CẮT 6 TẦNG & SLOT A, B, C) */}
      <div className="bay-detail-drawer">
        <div className="drawer-header">
          <div>
            <h4>
              Chi tiết Khoang #{String(targetBay).padStart(2, "0")} · Dãy {targetRack}
              {highlightedLocation && highlightedLocation.rack === targetRack && highlightedLocation.bay === targetBay && (
                <span className="drawer-target-tag">🎯 ĐANG LÀM SÁNG VỊ TRÍ HÀNG</span>
              )}
            </h4>
            <span className="drawer-subtitle">
              Hướng xếp slot từ trái qua phải: <strong>{slotOrder.join(" → ")}</strong> ({isTargetEven ? "Dãy chẵn C-B-A" : "Dãy lẻ A-B-C"})
            </span>
          </div>

          <div className="drawer-badges">
            {bayTenantMap.get(`${targetRack}-${targetBay}`) ? (
              <span
                className="badge-tenant-drawer-status"
                style={{
                  background: bayTenantMap.get(`${targetRack}-${targetBay}`)!.palette.bg,
                  borderColor: bayTenantMap.get(`${targetRack}-${targetBay}`)!.palette.border,
                  color: bayTenantMap.get(`${targetRack}-${targetBay}`)!.palette.text,
                }}
              >
                🏢 Thuê bởi: <strong>{bayTenantMap.get(`${targetRack}-${targetBay}`)!.tenantName} ({bayTenantMap.get(`${targetRack}-${targetBay}`)!.tenantCode})</strong> · HĐ: {bayTenantMap.get(`${targetRack}-${targetBay}`)!.lease.area_m2}m² (Tổng {bayTenantMap.get(`${targetRack}-${targetBay}`)!.lease.bays?.length || 0} khoang)
              </span>
            ) : (
              <span className="badge-available-drawer-status">
                ⚪ Khoang trống (Chưa cấp quyền thuê)
              </span>
            )}
            <span className="badge-rack-stat">
              Dãy {targetRack} ({racks.length} dãy) · Khoang #{targetBay}
            </span>
          </div>
        </div>

        <div className="bay-levels-diagram">
          {Array.from({ length: 6 }, (_, idx) => 6 - idx).map((level) => {
            const isTargetLevel = highlightedLocation?.rack === targetRack && highlightedLocation?.bay === targetBay && highlightedLocation?.level === level;
            const isForkliftLevel = isForkliftPassageBay(targetRack, targetBay) && level <= 3;

            return (
              <div
                key={level}
                className={`level-row ${isTargetLevel ? "level-target-active" : ""} ${isForkliftLevel ? "level-forklift-locked" : ""}`}
              >
                <div className="level-label">
                  <strong>Tầng {level}</strong>
                  {isForkliftLevel && <span className="tag-forklift-mini">Lối xe</span>}
                  {isTargetLevel && <span className="tag-target-mini">🎯 Đích</span>}
                </div>

                <div className="level-slots">
                  {slotOrder.map((slotCode) => {
                    const isTargetSlot = isTargetLevel && highlightedLocation?.slots.includes(slotCode);

                    return (
                      <div
                        key={slotCode}
                        className={`slot-box ${isTargetSlot ? "slot-target-pulsing" : ""} ${isForkliftLevel ? "slot-locked" : ""}`}
                        title={`Tầng ${level} · Slot ${slotCode}${isTargetSlot ? ` [ĐÍCH ĐẾN PALLET: ${highlightedLocation?.pallet_code}]` : ""}`}
                      >
                        <span className="slot-name">{slotCode}</span>
                        {isTargetSlot && (
                          <span className="slot-pallet-chip">
                            {highlightedLocation?.pallet_code}
                          </span>
                        )}
                        {isForkliftLevel && (
                          <span className="slot-lock-text">Khóa</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
