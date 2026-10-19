import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AuditEvent,
  ConfirmResult,
  HighlightTarget,
  ItemInput,
  LeaseRecord,
  OutboundInventoryItem,
  PalletPlan,
  PreviewResult,
  SlotStatus,
  TabType,
  Tenant,
  WarehouseSlot,
} from "./types";
import {
  confirmLocations,
  confirmLease,
  createInbound,
  getTenantInventory,
  importItems,
  listAuditEvents,
  listLeases,
  listTenants,
  listWarehouseSlots,
  previewLease,
  previewLocations,
  processOutbound,
  terminateLease,
} from "./services/api";
import { initialItem } from "./utils/constants";
import { useLeftClickHorizontalPan } from "./hooks/useHorizontalPan";
import { Header } from "./components/layout/Header";
import { LeasingTab } from "./features/leasing/LeasingTab";
import { InboundTab } from "./features/inbound/InboundTab";
import { WarehouseMapTab } from "./features/map/WarehouseMapTab";
import { AuditTab } from "./features/audit/AuditTab";
import { OutboundTab } from "./features/outbound/OutboundTab";
import { Pallet3DViewer } from "./components/viewer3d/Pallet3DViewer";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("LEASING");

  // Hook kéo chuột trái cuộn ngang cho các bảng dữ liệu
  const planTablePan = useLeftClickHorizontalPan();
  const leaseTablePan = useLeftClickHorizontalPan();
  const mapGridPan = useLeftClickHorizontalPan();

  // Khách hàng & Thuê kho State
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [leaseTenantCode, setLeaseTenantCode] = useState("");
  const [leaseTenantName, setLeaseTenantName] = useState("");
  const [leaseAreaM2, setLeaseAreaM2] = useState<number>(100);
  const [leasePreviewResult, setLeasePreviewResult] = useState<LeaseRecord>();
  const [leaseBusy, setLeaseBusy] = useState(false);
  const [leaseSuccess, setLeaseSuccess] = useState("");
  const [leaseError, setLeaseError] = useState("");

  // Inbound & Nhập kho State
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [items, setItems] = useState<ItemInput[]>([{ ...initialItem }]);
  const [allowPartial, setAllowPartial] = useState(false);
  const [inboundId, setInboundId] = useState<number>();
  const [preview, setPreview] = useState<PreviewResult>();
  const [palletPlans, setPalletPlans] = useState<PalletPlan[]>([]);
  const [selected3DPlan, setSelected3DPlan] = useState<PalletPlan | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmResult>();
  const [busy, setBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [error, setError] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importError, setImportError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const palletPlanSectionRef = useRef<HTMLDivElement>(null);
  const locationProposalSectionRef = useRef<HTMLDivElement>(null);
  const confirmationSectionRef = useRef<HTMLDivElement>(null);
  const leasePreviewRef = useRef<HTMLDivElement>(null);
  const inboundFormRef = useRef<HTMLFormElement>(null);

  // Sơ đồ kho 2D State
  const [selectedRack, setSelectedRack] = useState(110);
  const [selectedLevel, setSelectedLevel] = useState(0); // 0 = Tất cả các tầng (T1-T6)
  const [gridWrapMode, setGridWrapMode] = useState<"WRAP" | "SCROLL">("WRAP");
  const [warehouseSlots, setWarehouseSlots] = useState<WarehouseSlot[]>([]);
  const [warehouseBusy, setWarehouseBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<WarehouseSlot>();
  const [slotStatusFilter, setSlotStatusFilter] = useState<"ALL" | SlotStatus>(
    "ALL",
  );
  const [slotSkuFilter, setSlotSkuFilter] = useState("");
  const [highlightedLocation, setHighlightedLocation] =
    useState<HighlightTarget | null>(null);
  const [selectedTenantMapFilter, setSelectedTenantMapFilter] =
    useState<string>("");
  const [isMatrixExpanded, setIsMatrixExpanded] = useState<boolean>(true);

  // Audit State
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditBusy, setAuditBusy] = useState(false);

  // Outbound State
  const [selectedOutboundTenant, setSelectedOutboundTenant] =
    useState<string>("");
  const [outboundInventory, setOutboundInventory] = useState<
    OutboundInventoryItem[]
  >([]);
  const [isOutboundLoading, setIsOutboundLoading] = useState(false);
  const [outboundMessage, setOutboundMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isOutboundProcessing, setIsOutboundProcessing] = useState(false);
  const [isTerminatingLease, setIsTerminatingLease] = useState(false);
  const [leaseTabFilter, setLeaseTabFilter] = useState<
    "ACTIVE" | "CLOSED" | "ALL"
  >("ACTIVE");

  function refreshTenantsAndLeases() {
    listTenants()
      .then(setTenants)
      .catch(() => {});
    listLeases()
      .then(setLeases)
      .catch(() => {});
  }

  function refreshWarehouseSlots() {
    setWarehouseBusy(true);
    listWarehouseSlots(
      selectedRack,
      selectedLevel === 0 ? undefined : selectedLevel,
      tenantId || undefined,
    )
      .then((result) => setWarehouseSlots(result.slots))
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không tải được sơ đồ kho",
        ),
      )
      .finally(() => setWarehouseBusy(false));
  }

  function refreshAudit() {
    setAuditBusy(true);
    return listAuditEvents(
      tenantId || undefined,
      auditActionFilter === "ALL" ? undefined : auditActionFilter,
    )
      .then((result) => setAuditEvents(result.events))
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không tải được nhật ký kho",
        ),
      )
      .finally(() => setAuditBusy(false));
  }

  useEffect(() => {
    refreshTenantsAndLeases();
  }, []);

  useEffect(() => {
    refreshWarehouseSlots();
  }, [selectedRack, selectedLevel, tenantId]);

  useEffect(() => {
    void refreshAudit();
  }, [tenantId, auditActionFilter]);

  const activeLeases = leases.filter(
    (l) => l.status === "ACTIVE" || !l.status,
  );
  const closedLeases = leases.filter((l) => l.status === "CLOSED");
  const effectiveLeases = activeLeases;

  const displayedLeases = leases.filter((l) => {
    const status = l.status || "ACTIVE";
    if (leaseTabFilter === "ACTIVE") return status === "ACTIVE";
    if (leaseTabFilter === "CLOSED") return status === "CLOSED";
    return true;
  });

  const currentOutboundLease = effectiveLeases.find(
    (l) => l.tenant_code === selectedOutboundTenant,
  );

  // Tự động chọn khách hàng đầu tiên khi mở Tab Xuất kho
  useEffect(() => {
    if (
      activeTab === "OUTBOUND" &&
      !selectedOutboundTenant &&
      effectiveLeases.length > 0
    ) {
      setSelectedOutboundTenant(effectiveLeases[0].tenant_code);
    }
  }, [activeTab, effectiveLeases, selectedOutboundTenant]);

  // Tải dữ liệu tồn kho khách hàng
  useEffect(() => {
    if (!selectedOutboundTenant) {
      setOutboundInventory([]);
      return;
    }
    setIsOutboundLoading(true);
    getTenantInventory(selectedOutboundTenant)
      .then((res) => {
        setOutboundInventory(res.items || []);
      })
      .catch((err) => {
        console.error("Lỗi tải tồn kho khách hàng:", err);
        setOutboundInventory([]);
      })
      .finally(() => setIsOutboundLoading(false));
  }, [selectedOutboundTenant]);

  useEffect(() => {
    setSelectedSlot(undefined);
  }, [selectedRack, selectedLevel, tenantId, slotStatusFilter, slotSkuFilter]);

  const filteredWarehouseSlots = warehouseSlots.filter((slot) => {
    const matchesStatus =
      slotStatusFilter === "ALL" || slot.status === slotStatusFilter;
    const skuQuery = slotSkuFilter.trim().toLowerCase();
    const matchesSku =
      !skuQuery ||
      slot.sku?.toLowerCase().includes(skuQuery) ||
      slot.sku_name?.toLowerCase().includes(skuQuery) ||
      slot.pallet_code?.toLowerCase().includes(skuQuery);
    return matchesStatus && matchesSku;
  });

  // Xử lý Thuê kho
  const liveCalculatedBays = Math.ceil((Math.max(0, leaseAreaM2) * 0.7) / 5.6);
  const livePotentialSlots = liveCalculatedBays * 18;

  async function handleLeasePreview(event: FormEvent) {
    event.preventDefault();
    setLeaseError("");
    setLeaseSuccess("");
    setLeaseBusy(true);
    try {
      const result = await previewLease(
        leaseTenantCode.trim(),
        leaseTenantName.trim(),
        leaseAreaM2,
      );
      setLeasePreviewResult(result);
      setTimeout(() => {
        leasePreviewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    } catch (cause) {
      let msg =
        cause instanceof Error
          ? cause.message
          : "Không thể tính toán phân bổ ô";
      const bayMatch = msg.match(
        /Không đủ ô(?:\s+còn trống)?:\s*cần\s*(\d+),\s*chỉ còn\s*(\d+)/i,
      );
      if (bayMatch) {
        const neededBays = parseInt(bayMatch[1], 10);
        const availBays = parseInt(bayMatch[2], 10);
        const neededM2 = leaseAreaM2;
        const availM2 = availBays * 8;
        msg = `Không đủ diện tích: Cần ${neededM2.toLocaleString("vi-VN")} m² (${neededBays.toLocaleString("vi-VN")} khoang), kho chỉ còn ${availM2.toLocaleString("vi-VN")} m² (${availBays.toLocaleString("vi-VN")} khoang)`;
      }
      setLeaseError(msg);
    } finally {
      setLeaseBusy(false);
    }
  }

  async function handleLeaseConfirm() {
    if (!leasePreviewResult) return;
    setLeaseError("");
    setLeaseSuccess("");
    setLeaseBusy(true);
    try {
      const confirmed = await confirmLease(
        leasePreviewResult.tenant_code,
        leasePreviewResult.tenant_name,
        leasePreviewResult.area_m2,
        leasePreviewResult.bays,
      );
      setLeaseSuccess(
        `Đã cấp thành công ${confirmed.planned_bay_count} khoang (${confirmed.formatted_bays}) cho khách hàng ${confirmed.tenant_name}!`,
      );
      setLeasePreviewResult(undefined);
      setLeaseTenantCode("");
      setLeaseTenantName("");
      refreshTenantsAndLeases();
      void refreshAudit();
    } catch (cause) {
      let msg =
        cause instanceof Error
          ? cause.message
          : "Không thể xác nhận hợp đồng thuê";
      const bayMatch = msg.match(
        /Không đủ ô(?:\s+còn trống)?:\s*cần\s*(\d+),\s*chỉ còn\s*(\d+)/i,
      );
      if (bayMatch) {
        const neededBays = parseInt(bayMatch[1], 10);
        const availBays = parseInt(bayMatch[2], 10);
        const neededM2 = leasePreviewResult.area_m2;
        const availM2 = availBays * 8;
        msg = `Không đủ diện tích còn trống: Cần ${neededM2.toLocaleString("vi-VN")} m² (${neededBays.toLocaleString("vi-VN")} khoang), kho chỉ còn ${availM2.toLocaleString("vi-VN")} m² (${availBays.toLocaleString("vi-VN")} khoang)`;
      }
      setLeaseError(msg);
    } finally {
      setLeaseBusy(false);
    }
  }

  function startInboundForTenant(code: string) {
    setTenantId(code);
    setActiveTab("INBOUND");
    setTimeout(() => {
      inboundFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }

  // Xử lý Inbound
  function updateItem<K extends keyof ItemInput>(
    index: number,
    field: K,
    value: ItemInput[K],
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function updateItemUnit(index: number, newUnit: ItemInput["dimension_unit"]) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const oldUnit = item.dimension_unit;
        if (oldUnit === newUnit) return item;
        const toMeters = { m: 1, cm: 0.01, mm: 0.001 };
        const fromMeters = { m: 1, cm: 100, mm: 1000 };
        const convert = (val: number) => {
          if (!val || val <= 0) return val;
          const inM = val * toMeters[oldUnit];
          const converted = inM * fromMeters[newUnit];
          return Number(converted.toFixed(4));
        };
        return {
          ...item,
          dimension_unit: newUnit,
          length_m: convert(item.length_m),
          width_m: convert(item.width_m),
          height_m: convert(item.height_m),
        };
      }),
    );
  }

  function addPallet() {
    setItems((current) => [...current, { ...initialItem }]);
  }

  function removePallet(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function handleExcelImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setImportSummary("");
    setImportError("");

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setImportError(
        "Tệp không đúng định dạng! Hệ thống chỉ hỗ trợ tệp bảng tính Excel (.xlsx).",
      );
      setUploadedFileName("");
      setUploadedFileSize("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setBusy(true);
    try {
      const result = await importItems(file);
      setItems(result.items);
      setPalletPlans([]);
      setPreview(undefined);
      setConfirmation(undefined);

      setUploadedFileName(file.name);
      const sizeKb = (file.size / 1024).toFixed(1);
      setUploadedFileSize(`${sizeKb} KB`);

      const totalCases = result.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      );

      if (result.detected_tenant_code) {
        const directMatch = tenants.find(
          (t) => t.code.toUpperCase() === result.detected_tenant_code!.toUpperCase(),
        );
        if (directMatch) {
          setTenantId(directMatch.code);
        } else if (result.detected_tenant_name) {
          const nameMatch = tenants.find(
            (t) =>
              t.name.toLowerCase().includes(result.detected_tenant_name!.toLowerCase()) ||
              result.detected_tenant_name!.toLowerCase().includes(t.name.toLowerCase()),
          );
          if (nameMatch) {
            setTenantId(nameMatch.code);
          }
        }
      }

      if (result.oversized_items && result.oversized_items.length > 0) {
        const oogCodes = result.oversized_items.map((o) => o.item_code).join(", ");
        setError(
          `⚠️ Phát hiện ${result.oversized_items.length} kiện hàng quá khổ OOG (${oogCodes}): Vượt quá kích thước lọt lòng khoang kệ 3.8m. Theo quy chuẩn an toàn, các kiện này cần chuyển sang khu sàn bãi ngoài OOG. Bạn có thể bấm nút "Tách kiện OOG" bên dưới để tính toán 15 kiện còn lại.`,
        );
      } else if (result.errors && result.errors.length > 0) {
        setError(
          `Lưu ý một số mã hàng: ${result.errors.join("; ")}. Dữ liệu đã được nạp lên form bên dưới, bạn có thể chỉnh lại đơn vị đo (mm/cm) hoặc kích thước nếu cần.`,
        );
      }

      const summaryPrefix = result.detected_tenant_code
        ? `[Khách hàng: ${result.detected_tenant_code}] `
        : "";
      setImportSummary(
        `${summaryPrefix}Đã nạp ${result.item_count} mã hàng (tổng số ${totalCases.toLocaleString("vi-VN")} kiện hàng) từ tệp Excel vào form bên dưới.`,
      );
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : "Không đọc được file Excel";
      setImportError(msg);
      setImportSummary("");
      setUploadedFileName("");
      setUploadedFileSize("");
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleClearUploadedFile() {
    setUploadedFileName("");
    setUploadedFileSize("");
    setImportSummary("");
    setImportError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleCalculatePallets(event: FormEvent) {
    event.preventDefault();
    setError("");
    setConfirmation(undefined);
    setPreview(undefined);
    setBusy(true);
    try {
      const inbound = await createInbound(tenantId.trim(), items);
      setInboundId(inbound.inbound_id);
      setPalletPlans(inbound.pallet_plans);
      await refreshAudit();
      setTimeout(() => {
        palletPlanSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tính kế hoạch pallet",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleExcludeOversizedAndCalculate() {
    if (!tenantId) {
      setError("Vui lòng chọn khách hàng lưu kho trước khi tính toán pallet.");
      return;
    }
    setError("");
    setConfirmation(undefined);
    setPreview(undefined);
    setBusy(true);
    try {
      const factorMap: Record<string, number> = { m: 1, cm: 0.01, mm: 0.001 };
      const validItems = items.filter((item) => {
        const factor = factorMap[item.dimension_unit?.toLowerCase()] || 1;
        const maxDim = Math.max(item.length_m, item.width_m) * factor;
        return maxDim <= 3.8 && item.gross_weight_kg <= 4500;
      });
      const excludedCount = items.length - validItems.length;
      if (validItems.length === 0) {
        setError("Tất cả các kiện hàng đều vượt quá kích thước khoang kệ 3.8m!");
        return;
      }
      setItems(validItems);
      const inbound = await createInbound(tenantId.trim(), validItems, true);
      setInboundId(inbound.inbound_id);
      setPalletPlans(inbound.pallet_plans);
      await refreshAudit();
      setImportSummary(
        `Đã tính toán thành công ${inbound.pallet_plans.length} pallet cho ${validItems.length} kiện hàng. Tách ${excludedCount} kiện quá khổ (> 3.8m) chuyển lưu trữ sàn bãi ngoài OOG.`,
      );
      setTimeout(() => {
        palletPlanSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tính kế hoạch pallet",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestLocationPreview() {
    if (!inboundId) {
      setError("Vui lòng bấm 'Tính Pallet' trước khi đề xuất vị trí lên kệ.");
      return;
    }
    setError("");
    setConfirmation(undefined);
    setLocationBusy(true);
    try {
      const result = await previewLocations(inboundId, allowPartial);
      setPreview(result);
      await refreshAudit();
      setTimeout(() => {
        locationProposalSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tạo đề xuất vị trí kệ",
      );
    } finally {
      setLocationBusy(false);
    }
  }

  async function handleConfirm() {
    if (!inboundId || !preview) return;
    setError("");
    setBusy(true);
    try {
      const result = await confirmLocations(inboundId, preview.proposal_id);
      setConfirmation(result);
      await refreshAudit();
      refreshWarehouseSlots();
      setTimeout(() => {
        confirmationSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xác nhận vị trí",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleViewLocationOnMap(item: {
    rack: number;
    bay: number;
    level: number;
    slots: string[];
    pallet_code: string;
  }) {
    setSelectedRack(item.rack);
    setSelectedLevel(item.level);
    setHighlightedLocation({
      rack: item.rack,
      bay: item.bay,
      level: item.level,
      slots: item.slots as ("A" | "B" | "C")[],
      pallet_code: item.pallet_code,
    });
    setIsMatrixExpanded(true);
    setActiveTab("MAP");
  }

  // Xử lý Outbound
  async function handleProcessOutbound() {
    if (!selectedOutboundTenant) return;
    setIsOutboundProcessing(true);
    setOutboundMessage(null);
    try {
      const res = await processOutbound(selectedOutboundTenant);
      setOutboundMessage({
        type: "success",
        text: `✅ ${res.message || `Đã xuất kho thành công ${res.exported_count} pallet!`}`,
      });
      const invRes = await getTenantInventory(selectedOutboundTenant);
      setOutboundInventory(invRes.items || []);
      refreshWarehouseSlots();
      void refreshAudit();
    } catch (err) {
      setOutboundMessage({
        type: "error",
        text: `❌ Lỗi xuất kho: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsOutboundProcessing(false);
    }
  }

  async function handleTerminateLease() {
    if (!selectedOutboundTenant) return;
    const tenantName =
      currentOutboundLease?.tenant_name || selectedOutboundTenant;
    const bayCount = currentOutboundLease?.bays?.length || 0;
    const confirmMsg = `Xác nhận hủy quyền thuê kho của đối tác "${tenantName}" (${selectedOutboundTenant})?\n\nToàn bộ ${bayCount} khoang kệ sẽ được thu hồi và trở về trạng thái TRỐNG KHẢ DỤNG trên sơ đồ mặt bằng 2D.`;
    if (!window.confirm(confirmMsg)) return;

    setIsTerminatingLease(true);
    setOutboundMessage(null);
    try {
      const res = await terminateLease(selectedOutboundTenant);
      setOutboundMessage({
        type: "success",
        text: `✅ ${res.message || `Đã hủy hợp đồng thuê đối tác ${tenantName} thành công!`}`,
      });
      setOutboundInventory([]);
      setSelectedOutboundTenant("");
      refreshTenantsAndLeases();
      refreshWarehouseSlots();
      void refreshAudit();
    } catch (err) {
      setOutboundMessage({
        type: "error",
        text: `❌ Lỗi hủy hợp đồng thuê: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsTerminatingLease(false);
    }
  }

  return (
    <div className="app-layout">
      {/* Full-width Enterprise SaaS Header */}
      <Header
        activeLeasesCount={activeLeases.length}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <main className="shell">

      {/* TAB 1: KHÁCH HÀNG & THUÊ KHO */}
      {activeTab === "LEASING" && (
        <LeasingTab
          leaseTenantCode={leaseTenantCode}
          setLeaseTenantCode={setLeaseTenantCode}
          leaseTenantName={leaseTenantName}
          setLeaseTenantName={setLeaseTenantName}
          leaseAreaM2={leaseAreaM2}
          setLeaseAreaM2={setLeaseAreaM2}
          leaseBusy={leaseBusy}
          leaseSuccess={leaseSuccess}
          leaseError={leaseError}
          handleLeasePreview={handleLeasePreview}
          handleLeaseConfirm={handleLeaseConfirm}
          liveCalculatedBays={liveCalculatedBays}
          livePotentialSlots={livePotentialSlots}
          leasePreviewResult={leasePreviewResult}
          leasePreviewRef={leasePreviewRef}
          leases={leases}
          displayedLeases={displayedLeases}
          activeLeases={activeLeases}
          closedLeases={closedLeases}
          leaseTabFilter={leaseTabFilter}
          setLeaseTabFilter={setLeaseTabFilter}
          leaseTablePan={leaseTablePan}
          onStartInbound={startInboundForTenant}
          onViewTenantOnMap={(tenantCode) => {
            setSelectedTenantMapFilter(tenantCode);
            setActiveTab("MAP");
          }}
        />
      )}

      {/* TAB 2: NHẬP KHO & XẾP PALLET */}
      {activeTab === "INBOUND" && (
        <InboundTab
          tenantId={tenantId}
          setTenantId={setTenantId}
          tenants={tenants}
          leases={leases}
          items={items}
          setItems={setItems}
          updateItem={updateItem}
          updateItemUnit={updateItemUnit}
          addPallet={addPallet}
          removePallet={removePallet}
          allowPartial={allowPartial}
          setAllowPartial={setAllowPartial}
          busy={busy}
          locationBusy={locationBusy}
          error={error}
          setError={setError}
          importSummary={importSummary}
          importError={importError}
          uploadedFileName={uploadedFileName}
          uploadedFileSize={uploadedFileSize}
          fileInputRef={fileInputRef}
          inboundFormRef={inboundFormRef}
          palletPlanSectionRef={palletPlanSectionRef}
          locationProposalSectionRef={locationProposalSectionRef}
          confirmationSectionRef={confirmationSectionRef}
          palletPlans={palletPlans}
          preview={preview}
          confirmation={confirmation}
          handleExcelImport={handleExcelImport}
          handleClearUploadedFile={handleClearUploadedFile}
          handleCalculatePallets={handleCalculatePallets}
          handleExcludeOversizedAndCalculate={handleExcludeOversizedAndCalculate}
          handleRequestLocationPreview={handleRequestLocationPreview}
          handleConfirm={handleConfirm}
          handleViewLocationOnMap={handleViewLocationOnMap}
          planTablePan={planTablePan}
          onOpen3D={(plan) => setSelected3DPlan(plan)}
        />
      )}

      {/* TAB 3: SƠ ĐỒ KHO 2D */}
      {activeTab === "MAP" && (
        <WarehouseMapTab
          selectedRack={selectedRack}
          setSelectedRack={setSelectedRack}
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          gridWrapMode={gridWrapMode}
          setGridWrapMode={setGridWrapMode}
          warehouseSlots={warehouseSlots}
          warehouseBusy={warehouseBusy}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
          slotStatusFilter={slotStatusFilter}
          setSlotStatusFilter={setSlotStatusFilter}
          slotSkuFilter={slotSkuFilter}
          setSlotSkuFilter={setSlotSkuFilter}
          highlightedLocation={highlightedLocation}
          setHighlightedLocation={setHighlightedLocation}
          selectedTenantMapFilter={selectedTenantMapFilter}
          setSelectedTenantMapFilter={setSelectedTenantMapFilter}
          isMatrixExpanded={isMatrixExpanded}
          setIsMatrixExpanded={setIsMatrixExpanded}
          activeLeases={activeLeases}
          tenants={tenants}
          filteredWarehouseSlots={filteredWarehouseSlots}
          mapGridPan={mapGridPan}
          onBackToInbound={() => {
            setHighlightedLocation(null);
            setActiveTab("INBOUND");
          }}
        />
      )}

      {/* TAB 4: NHẬT KÝ THAO TÁC */}
      {activeTab === "AUDIT" && (
        <AuditTab
          auditBusy={auditBusy}
          refreshAudit={refreshAudit}
          auditActionFilter={auditActionFilter}
          setAuditActionFilter={setAuditActionFilter}
          auditEvents={auditEvents}
        />
      )}

      {/* TAB 5: QUẢN LÝ XUẤT KHO & HỦY THUÊ */}
      {activeTab === "OUTBOUND" && (
        <OutboundTab
          outboundMessage={outboundMessage}
          setOutboundMessage={setOutboundMessage}
          selectedOutboundTenant={selectedOutboundTenant}
          setSelectedOutboundTenant={setSelectedOutboundTenant}
          effectiveLeases={effectiveLeases}
          currentOutboundLease={currentOutboundLease}
          outboundInventory={outboundInventory}
          isOutboundLoading={isOutboundLoading}
          isOutboundProcessing={isOutboundProcessing}
          isTerminatingLease={isTerminatingLease}
          handleProcessOutbound={handleProcessOutbound}
          handleTerminateLease={handleTerminateLease}
        />
      )}

      {/* MODAL MÔ PHỎNG 3D XẾP PALLET */}
      {selected3DPlan && (
        <Pallet3DViewer
          plan={selected3DPlan}
          item={items.find((it) => it.item_code === selected3DPlan.item_code)}
          allPlans={palletPlans}
          onSelectPlan={(newPlan) => setSelected3DPlan(newPlan)}
          onClose={() => setSelected3DPlan(null)}
        />
      )}
      </main>
    </div>
  );
}

export default App;
