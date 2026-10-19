import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { X } from "lucide-react";
import { PalletPlan, ItemInput } from "../../types";

interface Pallet3DViewerProps {
  plan: PalletPlan;
  item?: ItemInput;
  allPlans: PalletPlan[];
  onSelectPlan: (plan: PalletPlan) => void;
  onClose: () => void;
}

// Bảng màu sinh động của các thùng hàng giống Hình 2
const BOX_PALETTES = [
  { main: 0xe5a953, tape: 0xd97706, name: "Carton Vàng Cam" }, // Vàng cam carton (giống hình 2)
  { main: 0x2dd4bf, tape: 0x0f766e, name: "Kiện Xanh Ngọc" },  // Xanh ngọc mint (giống hình 2)
  { main: 0x38bdf8, tape: 0x0284c7, name: "Kiện Xanh Dương" }, // Xanh dương (giống hình 2)
  { main: 0xa78bfa, tape: 0x7c3aed, name: "Kiện Tím Pastel" },
  { main: 0xf472b6, tape: 0xdb2777, name: "Kiện Hồng" },
];

export const Pallet3DViewer: React.FC<Pallet3DViewerProps> = ({
  plan,
  item,
  allPlans,
  onSelectPlan,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<number | "ALL">("ALL");
  const [cameraView, setCameraView] = useState<"ISO" | "TOP" | "FRONT" | "SIDE">("ISO");

  // Tìm index pallet hiện tại để hỗ trợ Previous / Next
  const currentIndex = allPlans.findIndex((p) => p.pallet_code === plan.pallet_code);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPlans.length - 1 && currentIndex !== -1;

  // Lấy kích thước kiện hàng từ plan hoặc item gốc
  let boxL = 0.6;
  let boxW = 0.4;
  let boxH = 0.3;

  if (plan.case_length_m && plan.case_length_m > 0) {
    boxL = plan.case_length_m;
    boxW = plan.case_width_m || 0.4;
    boxH = plan.case_height_m || 0.3;
  } else if (item) {
    const factor = { m: 1, cm: 0.01, mm: 0.001 }[item.dimension_unit] || 1;
    boxL = Math.max(0.1, item.length_m * factor);
    boxW = Math.max(0.1, item.width_m * factor);
    boxH = Math.max(0.1, item.height_m * factor);
  } else if (plan.footprint_x_m && plan.footprint_y_m) {
    boxL = plan.footprint_x_m;
    boxW = plan.footprint_y_m;
  }

  // Kích thước pallet chuẩn thực tế kho bãi
  // Pallet đơn: 1.2m x 1.8m | Pallet đôi (kể cả hàng quá khổ): 2.4m x 1.8m | Gỗ thô: kê đệm sàn
  const isTimber = plan.kind === "timber";
  const isOversize = plan.kind === "oversize";
  const isDouble = plan.kind === "double";
  const palletLength = isTimber
    ? Math.max(1.4, boxL)
    : isDouble || isOversize
    ? 2.4
    : 1.2;
  const palletWidth = isTimber
    ? Math.max(1.8, boxW)
    : 1.8;
  const palletHeight = isTimber ? 0.04 : 0.15; // Pallet tiêu chuẩn cao 0.15m

  // Tính số lượng thùng & lớp thực tế xếp trên pallet
  const totalCases = plan.cases || 1;
  const casesPerLayer = Math.max(1, plan.cases_per_layer || 1);
  // Số lớp thực tế xếp: chỉ bằng số lớp thực sự cần cho số kiện hiện có
  const totalLayers = Math.max(
    1,
    Math.min(plan.layers || 999, Math.ceil(totalCases / casesPerLayer))
  );

  // Refs để lưu điều khiển camera
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Tạo Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d); // Nền tối CAD cao cấp như Hình 2

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(42, width / Math.max(height, 1), 0.1, 100);
    cameraRef.current = camera;

    // Vị trí camera góc nhìn isometric chuẩn
    camera.position.set(2.8, 2.5, 3.2);

    // 2. Tạo WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Tự động điều chỉnh kích thước ngay khi container sẵn sàng
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // 3. OrbitControls tương tác xoay 360 độ
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Không xoay xuống dưới sàn
    controls.minDistance = 1.2;
    controls.maxDistance = 8.5;
    controls.target.set(0, (totalLayers * boxH + palletHeight) * 0.45, 0);
    controlsRef.current = controls;

    // 4. Ánh sáng (Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 8, 4);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    dirLight1.shadow.bias = -0.001;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.5); // Ánh sáng phụ phản xạ xanh nhẹ
    dirLight2.position.set(-4, 3, -3);
    scene.add(dirLight2);

    // 5. Lưới mặt sàn 3D Grid (giống Hình 2)
    const grid = new THREE.GridHelper(6, 24, 0x3b82f6, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // 6. DỰNG ĐẾ PALLET GỖ (Wooden Pallet)
    if (!isTimber) {
      const palletGroup = new THREE.Group();

      const woodMaterial = new THREE.MeshStandardMaterial({
        color: 0xb5824c, // Màu gỗ pallet tự nhiên
        roughness: 0.82,
        metalness: 0.05,
      });

      const woodEdgeMaterial = new THREE.LineBasicMaterial({
        color: 0x6e4722,
        linewidth: 1,
      });

      // A. Các thanh nan mặt trên (Top Deck Slats)
      const slatCount = 7;
      const slatWidth = (palletLength * 0.88) / slatCount;
      const slatThickness = 0.022;
      const slatGap = (palletLength - slatCount * slatWidth) / (slatCount - 1);

      for (let i = 0; i < slatCount; i++) {
        const slatGeo = new THREE.BoxGeometry(slatWidth, slatThickness, palletWidth);
        const slatMesh = new THREE.Mesh(slatGeo, woodMaterial);
        slatMesh.castShadow = true;
        slatMesh.receiveShadow = true;

        const posX = -palletLength / 2 + slatWidth / 2 + i * (slatWidth + slatGap);
        slatMesh.position.set(posX, palletHeight - slatThickness / 2, 0);
        palletGroup.add(slatMesh);

        const edgeGeo = new THREE.EdgesGeometry(slatGeo);
        const edgeLine = new THREE.LineSegments(edgeGeo, woodEdgeMaterial);
        slatMesh.add(edgeLine);
      }

      // B. Ba thanh dầm dọc (3 Stringers / Dầm chịu lực)
      const stringerThickness = 0.045;
      const stringerHeight = palletHeight - slatThickness * 2;
      const stringerGeo = new THREE.BoxGeometry(palletLength, stringerHeight, stringerThickness);

      const stringerZOffsets = [-palletWidth / 2 + stringerThickness / 2, 0, palletWidth / 2 - stringerThickness / 2];
      stringerZOffsets.forEach((posZ) => {
        const stringerMesh = new THREE.Mesh(stringerGeo, woodMaterial);
        stringerMesh.castShadow = true;
        stringerMesh.receiveShadow = true;
        stringerMesh.position.set(0, slatThickness + stringerHeight / 2, posZ);
        palletGroup.add(stringerMesh);

        const edgeGeo = new THREE.EdgesGeometry(stringerGeo);
        const edgeLine = new THREE.LineSegments(edgeGeo, woodEdgeMaterial);
        stringerMesh.add(edgeLine);
      });

      // C. Ba thanh ván đáy (Bottom Deck Slats)
      const bottomSlatCount = 3;
      const bottomSlatWidth = palletLength * 0.16;
      for (let i = 0; i < bottomSlatCount; i++) {
        const bSlatGeo = new THREE.BoxGeometry(bottomSlatWidth, slatThickness, palletWidth);
        const bSlatMesh = new THREE.Mesh(bSlatGeo, woodMaterial);
        bSlatMesh.castShadow = true;
        bSlatMesh.receiveShadow = true;

        const posX = -palletLength / 2 + bottomSlatWidth / 2 + i * ((palletLength - bottomSlatWidth) / (bottomSlatCount - 1));
        bSlatMesh.position.set(posX, slatThickness / 2, 0);
        palletGroup.add(bSlatMesh);
      }

      scene.add(palletGroup);
    } else {
      // Gỗ thô: Đệm sàn khoang kệ
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      const floorPad = new THREE.Mesh(new THREE.BoxGeometry(palletLength + 0.1, 0.02, palletWidth + 0.1), floorMat);
      floorPad.position.set(0, 0.01, 0);
      scene.add(floorPad);
    }

    // 7. XẾP CÁC THÙNG HÀNG (BOXES / CARGO) LÊN PALLET
    const cargoGroup = new THREE.Group();

    // Tính bố trí trên một lớp (grid arrangement)
    // Hướng 1: orientL = boxL (trục X - mặt tiền), orientW = boxW (trục Z - chiều sâu)
    // Hướng 2: orientL = boxW (trục X - mặt tiền), orientW = boxL (trục Z - chiều sâu)
    const rawFit1X = Math.floor(palletLength / boxL);
    const rawFit1Z = Math.floor(palletWidth / boxW);
    const fits1 = rawFit1X >= 1 && rawFit1Z >= 1;
    const cap1 = Math.max(1, rawFit1X) * Math.max(1, rawFit1Z);

    const rawFit2X = Math.floor(palletLength / boxW);
    const rawFit2Z = Math.floor(palletWidth / boxL);
    const fits2 = rawFit2X >= 1 && rawFit2Z >= 1;
    const cap2 = Math.max(1, rawFit2X) * Math.max(1, rawFit2Z);

    let orientL = boxL;
    let orientW = boxW;
    let fitX = Math.max(1, rawFit1X);
    let fitZ = Math.max(1, rawFit1Z);

    if (isOversize) {
      // Hàng quá khổ đặt trên Pallet đôi: Luôn định hướng chiều dài dọc theo mặt trước khoang kệ (trục X)
      orientL = Math.max(boxL, boxW);
      orientW = Math.min(boxL, boxW);
      fitX = 1;
      fitZ = 1;
    } else {
      // Ưu tiên:
      // 1. Hướng nằm lọt lòng trong pallet (không bị nhô ra ngoài viền pallet)
      // 2. Khớp với footprint_x_m và footprint_y_m do backend tính toán
      // 3. Nếu cả 2 đều vừa, chọn hướng có sức chứa khớp casesPerLayer hơn
      let chooseAlt = false;
      if (fits2 && !fits1) {
        // Hướng 2 lọt lòng pallet, hướng 1 bị tràn ra ngoài -> Chọn hướng 2
        chooseAlt = true;
      } else if (!fits2 && fits1) {
        // Hướng 1 lọt lòng pallet, hướng 2 bị tràn ra ngoài -> Giữ hướng 1
        chooseAlt = false;
      } else if (plan.footprint_x_m && plan.footprint_y_m) {
        // Cả 2 đều vừa (hoặc cả 2 đều tràn nhẹ): Khớp hướng theo footprint backend đã định vị
        const isMultiple = (val: number, base: number) => {
          if (!base || base <= 0) return false;
          const ratio = val / base;
          return Math.abs(ratio - Math.round(ratio)) < 0.05;
        };
        const matchDefault = isMultiple(plan.footprint_x_m, boxL) && isMultiple(plan.footprint_y_m, boxW);
        const matchAlt = isMultiple(plan.footprint_x_m, boxW) && isMultiple(plan.footprint_y_m, boxL);
        if (matchAlt && !matchDefault) {
          chooseAlt = true;
        } else if (matchDefault) {
          chooseAlt = false;
        } else {
          chooseAlt = Math.abs(cap2 - casesPerLayer) < Math.abs(cap1 - casesPerLayer);
        }
      } else {
        chooseAlt = Math.abs(cap2 - casesPerLayer) < Math.abs(cap1 - casesPerLayer);
      }

      if (chooseAlt) {
        orientL = boxW;
        orientW = boxL;
        fitX = Math.max(1, rawFit2X);
        fitZ = Math.max(1, rawFit2Z);
      }
    }

    // Điều chỉnh số cột / hàng nếu casesPerLayer cố định
    if (fitX * fitZ < casesPerLayer) {
      if (palletLength / orientL >= palletWidth / orientW) {
        fitX = Math.ceil(casesPerLayer / fitZ);
      } else {
        fitZ = Math.ceil(casesPerLayer / fitX);
      }
    }

    // Khoảng hở nhỏ giữa các thùng (0.006m = 6mm) để nhìn rõ từng kiện riêng biệt
    const gap = 0.006;
    let placedCases = 0;

    for (let layerIdx = 0; layerIdx < totalLayers; layerIdx++) {
      if (placedCases >= totalCases) break;

      const casesRemaining = totalCases - placedCases;
      const casesInThisLayer = Math.min(casesPerLayer, casesRemaining);

      // Lọc lớp theo lựa chọn của người dùng
      if (selectedLayer !== "ALL" && selectedLayer !== layerIdx) {
        placedCases += casesInThisLayer;
        continue;
      }

      const layerY = palletHeight + layerIdx * boxH + boxH / 2;

      // Tính cấu hình hàng và cột thực tế để căn giữa khối hàng vào tâm pallet
      let layerCols = fitX;
      let layerRows = fitZ;

      if (casesInThisLayer < fitX * fitZ) {
        if (casesInThisLayer === 3 && fitX >= 2 && fitZ >= 2) {
          // Xếp hình tam giác kiềng 3 chân (2 thùng hàng trước, 1 thùng hàng sau ở giữa)
          // giúp cụm hàng vuông vắn cân bằng trọng tâm, chống nghiêng ngả thay vì 1 hàng thẳng mỏng dính
          layerCols = 2;
          layerRows = 2;
        } else {
          // Với các lớp không đầy hoặc pallet lẻ (ví dụ chỉ có 1 hoặc 2 kiện)
          // Tìm cặp (cols, rows) nhỏ gọn nhất bao trọn casesInThisLayer kiện
          let minWasted = 999;
          let bestCols = Math.min(fitX, casesInThisLayer);
          let bestRows = Math.ceil(casesInThisLayer / bestCols);

          for (let r = 1; r <= fitZ; r++) {
            for (let c = 1; c <= fitX; c++) {
              if (c * r >= casesInThisLayer) {
                const wasted = c * r - casesInThisLayer;
                if (wasted < minWasted) {
                  minWasted = wasted;
                  bestCols = c;
                  bestRows = r;
                }
              }
            }
          }
          layerCols = bestCols;
          layerRows = bestRows;
        }
      }

      const layerSpanZ = layerRows * (orientW + gap) - gap;
      const startZ = -layerSpanZ / 2 + orientW / 2;

      // Bảng màu theo từng tầng để tạo visual sinh động
      const palette = BOX_PALETTES[layerIdx % BOX_PALETTES.length];

      const boxGeo = new THREE.BoxGeometry(orientL, boxH, orientW);
      const boxMaterial = new THREE.MeshStandardMaterial({
        color: palette.main,
        roughness: 0.65,
        metalness: 0.05,
      });

      const boxEdgeMaterial = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        linewidth: 1.5,
      });

      // Băng dính niêm phong carton (Seal Tape) ở mặt trên thùng
      const tapeGeo = new THREE.BoxGeometry(orientL * 0.98, 0.002, orientW * 0.18);
      const tapeMaterial = new THREE.MeshStandardMaterial({
        color: palette.tape,
        roughness: 0.4,
      });

      let placedInLayer = 0;
      for (let r = 0; r < layerRows; r++) {
        if (placedInLayer >= casesInThisLayer) break;

        // Căn giữa riêng từng hàng nếu hàng cuối cùng có ít kiện hơn layerCols
        const remainingInLayer = casesInThisLayer - placedInLayer;
        const itemsInThisRow = Math.min(layerCols, remainingInLayer);
        const rowSpanX = itemsInThisRow * (orientL + gap) - gap;
        const rowStartX = -rowSpanX / 2 + orientL / 2;
        const posZ = startZ + r * (orientW + gap);

        for (let c = 0; c < itemsInThisRow; c++) {
          const posX = rowStartX + c * (orientL + gap);

          const boxMesh = new THREE.Mesh(boxGeo, boxMaterial);
          boxMesh.castShadow = true;
          boxMesh.receiveShadow = true;
          boxMesh.position.set(posX, layerY, posZ);

          // Thêm viền đen sắc nét quanh thùng
          const edgeGeo = new THREE.EdgesGeometry(boxGeo);
          const edgeLine = new THREE.LineSegments(edgeGeo, boxEdgeMaterial);
          boxMesh.add(edgeLine);

          // Thêm dải băng keo carton ở nắp trên
          const tapeMesh = new THREE.Mesh(tapeGeo, tapeMaterial);
          tapeMesh.position.set(0, boxH / 2 + 0.001, 0);
          boxMesh.add(tapeMesh);

          cargoGroup.add(boxMesh);
          placedInLayer++;
          placedCases++;
        }
      }
    }

    scene.add(cargoGroup);

    // 8. Vòng lặp Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (autoRotate && controlsRef.current) {
        scene.rotation.y += 0.006;
      } else {
        scene.rotation.y = 0;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Xử lý Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup khi component unmount
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [plan, item, boxL, boxW, boxH, palletLength, palletWidth, palletHeight, totalCases, casesPerLayer, totalLayers, selectedLayer, autoRotate, isTimber, isOversize]);

  // Điều khiển góc nhìn Camera
  function switchCameraView(view: "ISO" | "TOP" | "FRONT" | "SIDE") {
    setCameraView(view);
    setAutoRotate(false);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const centerY = (totalLayers * boxH + palletHeight) * 0.5;
    controls.target.set(0, centerY, 0);

    if (view === "ISO") {
      camera.position.set(2.8, 2.5, 3.2);
    } else if (view === "TOP") {
      camera.position.set(0, 4.5, 0.01);
    } else if (view === "FRONT") {
      camera.position.set(0, centerY, 3.8);
    } else if (view === "SIDE") {
      camera.position.set(3.8, centerY, 0);
    }
    controls.update();
  }

  // Phím tắt bàn phím
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onSelectPlan(allPlans[currentIndex - 1]);
      } else if (e.key === "ArrowRight" && hasNext) {
        onSelectPlan(allPlans[currentIndex + 1]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasPrev, hasNext, allPlans, onSelectPlan, onClose]);

  const totalHeightM = (totalLayers * boxH + palletHeight).toFixed(2);
  const isSafeHeight = Number(totalHeightM) <= 1.8;

  const modalNode = (
    <div className="pallet-3d-modal-overlay" onClick={onClose}>
      <div
        className="pallet-3d-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút X nổi cố định ở góc trên bên phải container */}
        <button
          type="button"
          className="pallet-3d-floating-close-btn"
          onClick={onClose}
          title="Đóng mô phỏng 3D (Phím ESC)"
          aria-label="Đóng mô phỏng 3D"
        >
          <X size={18} strokeWidth={2.5} />
          <span>Đóng</span>
        </button>

        {/* Modal Header */}
        <div className="pallet-3d-header">
          <div className="pallet-3d-title-group">
            <span className="pallet-3d-tag">MÔ PHỎNG 3D</span>
            <h3 className="pallet-3d-title">
              Pallet: <code>{plan.pallet_code}</code>
            </h3>
            <span className="pallet-3d-sku">Mã hàng: <strong>{plan.item_code}</strong></span>
          </div>

          <div className="pallet-3d-header-actions">
            {/* Nút chuyển đổi Pallet Trước / Sau */}
            <div className="pallet-nav-group">
              <button
                type="button"
                className="pallet-nav-btn"
                disabled={!hasPrev}
                onClick={() => onSelectPlan(allPlans[currentIndex - 1])}
                title="Xem pallet trước (Phím mũi tên Trái)"
              >
                ◀ Trước
              </button>
              <span className="pallet-nav-indicator">
                {currentIndex + 1} / {allPlans.length}
              </span>
              <button
                type="button"
                className="pallet-nav-btn"
                disabled={!hasNext}
                onClick={() => onSelectPlan(allPlans[currentIndex + 1])}
                title="Xem pallet kế tiếp (Phím mũi tên Phải)"
              >
                Kế tiếp ▶
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: 3D Canvas + Technical HUD Sidepanel */}
        <div className="pallet-3d-body">
          {/* Vùng Canvas Three.js */}
          <div className="pallet-3d-viewport-wrap">
            <div className="pallet-3d-canvas-container" ref={mountRef} />

            {/* Floating Camera & Control Toolbar */}
            <div className="pallet-3d-floating-toolbar">
              <button
                type="button"
                className={`view-tool-btn ${autoRotate ? "active" : ""}`}
                onClick={() => setAutoRotate(!autoRotate)}
                title="Bật/Tắt tự động xoay 360 độ"
              >
                🔄 {autoRotate ? "Dừng xoay" : "Tự xoay"}
              </button>
              <div className="view-preset-group">
                <button
                  type="button"
                  className={`view-preset-btn ${cameraView === "ISO" ? "active" : ""}`}
                  onClick={() => switchCameraView("ISO")}
                >
                  3D Xéo
                </button>
                <button
                  type="button"
                  className={`view-preset-btn ${cameraView === "TOP" ? "active" : ""}`}
                  onClick={() => switchCameraView("TOP")}
                >
                  Đỉnh (Top)
                </button>
                <button
                  type="button"
                  className={`view-preset-btn ${cameraView === "FRONT" ? "active" : ""}`}
                  onClick={() => switchCameraView("FRONT")}
                >
                  Mặt trước
                </button>
                <button
                  type="button"
                  className={`view-preset-btn ${cameraView === "SIDE" ? "active" : ""}`}
                  onClick={() => switchCameraView("SIDE")}
                >
                  Bên hông
                </button>
              </div>
            </div>

            {/* Hướng dẫn thao tác chuột */}
            <div className="pallet-3d-mouse-hint">
              <span>🖱️ Chuột trái: Xoay 360° | Cuộn chuột: Phóng to/Thu nhỏ | Chuột phải: Dời góc nhìn</span>
            </div>
          </div>

          {/* Bảng thông số kỹ thuật bên phải (HUD Specs Panel) */}
          <div className="pallet-3d-hud-panel">
            <h4 className="hud-panel-title">📊 Thông Số Xếp Hàng Chi Tiết</h4>

            {/* Chỉ số chính */}
            <div className="hud-metric-card primary">
              <div className="hud-metric-row">
                <span className="hud-metric-label">Tổng kiện trên pallet:</span>
                <span className="hud-metric-val highlight">{totalCases} <small>kiện</small></span>
              </div>
              <div className="hud-metric-row">
                <span className="hud-metric-label">Bố trí xếp:</span>
                <span className="hud-metric-val">
                  {totalLayers === 1
                    ? `${totalCases} kiện / 1 lớp`
                    : totalCases % casesPerLayer === 0
                    ? `${casesPerLayer} kiện/lớp × ${totalLayers} lớp`
                    : `Lớp 1: ${casesPerLayer} kiện | Lớp ${totalLayers}: ${totalCases - (totalLayers - 1) * casesPerLayer} kiện`}
                </span>
              </div>
              <div className="hud-metric-row">
                <span className="hud-metric-label">Tổng tải trọng pallet:</span>
                <span className="hud-metric-val highlight">{plan.weight_kg.toFixed(1)} <small>kg</small></span>
              </div>
            </div>

            {/* Chi tiết hình học & kích thước */}
            <div className="hud-section">
              <h5 className="hud-section-header">📐 Kích Thước Hình Học</h5>
              <div className="hud-spec-grid">
                <div className="hud-spec-item">
                  <span>Quy cách 1 kiện (D×R×C):</span>
                  <strong>
                    {(boxL * 100).toFixed(0)} × {(boxW * 100).toFixed(0)} × {(boxH * 100).toFixed(0)} cm
                  </strong>
                </div>
                <div className="hud-spec-item">
                  <span>Khung đế pallet:</span>
                  <strong>
                    {palletLength.toFixed(1)}m × {palletWidth.toFixed(1)}m × {palletHeight.toFixed(2)}m{" "}
                    {isDouble || isOversize ? "(Pallet đôi)" : isTimber ? "(Kê đệm sàn)" : "(Pallet đơn)"}
                  </strong>
                </div>
                <div className="hud-spec-item">
                  <span>Chiều cao chất hàng:</span>
                  <strong>{(totalLayers * boxH).toFixed(2)} m</strong>
                </div>
                <div className="hud-spec-item">
                  <span>Tổng chiều cao (gồm pallet):</span>
                  <strong style={{ color: isSafeHeight ? "#059669" : "#dc2626" }}>
                    {totalHeightM} m {isSafeHeight ? "✅ (≤ 1.80m)" : "⚠️ (> 1.80m)"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bộ lọc bóc tách lớp (Layer Isolation Slider) */}
            <div className="hud-section">
              <h5 className="hud-section-header">🔍 Bóc Tách Từng Tầng Hàng</h5>
              <div className="hud-layer-selector">
                <button
                  type="button"
                  className={`layer-chip ${selectedLayer === "ALL" ? "active" : ""}`}
                  onClick={() => setSelectedLayer("ALL")}
                >
                  Tất cả ({totalLayers} lớp)
                </button>
                {Array.from({ length: totalLayers }, (_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`layer-chip ${selectedLayer === idx ? "active" : ""}`}
                    onClick={() => setSelectedLayer(idx)}
                  >
                    Lớp {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Cảnh báo an toàn kho bãi */}
            <div className="hud-section">
              <h5 className="hud-section-header">🛡️ Tiêu Chuẩn An Toàn & Đề Xuất</h5>
              <div className="hud-status-badge-list">
                <div className="hud-status-row">
                  <span>Vị trí tầng lưu kho:</span>
                  <span className="badge-level">
                    {plan.required_level === "floor" ? "Tầng 1 (Mặt Sàn)" : "Tầng trên / Sàn"}
                  </span>
                </div>
                <div className="hud-status-row">
                  <span>Loại Pallet:</span>
                  <span className="badge-type">
                    {isTimber
                      ? "Gỗ thô mặt sàn (Khóa 1-ABC)"
                      : isOversize
                      ? "Pallet đôi quá khổ (Khóa trọn khoang 1-ABC)"
                      : isDouble
                      ? "Pallet đôi (2.4m)"
                      : "Pallet đơn chuẩn (1.2m)"}
                  </span>
                </div>
                {plan.note && (
                  <div className="hud-note-box">
                    💡 <strong>Ghi chú:</strong> {plan.note}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
};
