from dataclasses import dataclass
from math import ceil, floor

from app.prototype.allocator import Pallet


class ItemCalculationError(ValueError):
    pass


@dataclass(frozen=True)
class ItemInput:
    item_code: str
    item_name: str
    quantity: int
    length_m: float
    width_m: float
    height_m: float
    gross_weight_kg: float
    item_type: str = ""
    unit_of_measure: str = "case"
    dimension_unit: str = "m"


@dataclass(frozen=True)
class PalletPlan:
    pallet: Pallet
    item_code: str
    cases: int
    cases_per_layer: int
    layers: int
    required_level: str
    footprint_x_m: float
    footprint_y_m: float
    safety_review_required: bool = False
    note: str = ""
    case_length_m: float = 0.0
    case_width_m: float = 0.0
    case_height_m: float = 0.0
    pallet_length_m: float = 1.2
    pallet_width_m: float = 1.8


def _count_fit(total: float, item: float) -> int:
    return floor((total / item) + 1e-9)


def _orientations(length: float, width: float) -> tuple[tuple[float, float], ...]:
    if length == width:
        return ((length, width),)
    return ((length, width), (width, length))


def _fits_in(length: float, width: float, max_x: float, max_y: float) -> bool:
    return any(
        item_x <= max_x and item_y <= max_y
        for item_x, item_y in _orientations(length, width)
    )


def _layer_capacity(
    pallet_x: float,
    pallet_y: float,
    item_x: float,
    item_y: float,
) -> int:
    """Tính số kiện tối đa trên 1 lớp theo quy tắc đã chốt Mục 12:
    Mỗi lớp chỉ xếp đồng nhất theo 1 hướng (hoặc toàn bộ kiện 0 độ, hoặc toàn bộ kiện 90 độ),
    không trộn 2 hướng cùng một mặt phẳng lớp pallet.
    """
    fit_0 = _count_fit(pallet_x, item_x) * _count_fit(pallet_y, item_y)
    fit_90 = _count_fit(pallet_x, item_y) * _count_fit(pallet_y, item_x)
    return max(fit_0, fit_90)


def calculate_pallets(tenant_id: str, items: list[ItemInput]) -> list[PalletPlan]:
    if not items:
        raise ItemCalculationError("At least one item line is required")

    plans: list[PalletPlan] = []
    for item in items:
        unit_factor = {"m": 1.0, "cm": 0.01, "mm": 0.001}.get(
            item.dimension_unit.lower()
        )
        if unit_factor is None:
            raise ItemCalculationError(
                f"{item.item_code}: dimension unit must be m, cm or mm"
            )
        length_m = item.length_m * unit_factor
        width_m = item.width_m * unit_factor
        height_m = item.height_m * unit_factor
        if item.quantity <= 0 or any(
            value <= 0
            for value in (
                length_m,
                width_m,
                height_m,
                item.gross_weight_kg,
            )
        ):
            raise ItemCalculationError(
                f"{item.item_code}: quantity, dimensions and weight must be positive"
            )
        safety_review_required = False
        normalized_type = item.item_type.strip().lower()
        normalized_uom = item.unit_of_measure.strip().lower()
        normalized_name = item.item_name.strip().lower()

        # Không xem là gỗ thô nếu là thành phẩm đồ gỗ / nội thất đóng thùng
        is_furniture = any(
            kw in normalized_name or kw in normalized_type
            for kw in (
                "nội thất",
                "furniture",
                "bàn",
                "ghế",
                "tủ",
                "giường",
                "sofa",
                "kệ sách",
                "kệ tivi",
                "mặt bàn",
            )
        )

        # Nhận diện mặt hàng gỗ thô nguyên liệu:
        is_raw_timber = not is_furniture and (
            normalized_name.startswith("gỗ ")
            or normalized_name.startswith("go ")
            or normalized_type.startswith("gỗ ")
            or normalized_type.startswith("go ")
            or any(
                kw in normalized_type or kw in normalized_uom or kw in normalized_name
                for kw in (
                    "gỗ thô",
                    "go tho",
                    "gỗ súc",
                    "go suc",
                    "timber",
                    "raw wood",
                    "bó gỗ",
                    "bo go",
                    "lumber",
                    "log",
                    "logs",
                    "gỗ tấm",
                    "gỗ xẻ",
                    "gỗ tròn",
                    "gỗ óc chó",
                    "gỗ sồi",
                    "gỗ thông",
                    "gỗ tần bì",
                )
            )
        )

        footprint_x_m = 0.0
        footprint_y_m = 0.0
        pallet_x = 1.2
        pallet_y = 1.8
        mandatory_floor = False
        note = ""

        if is_raw_timber:
            # TRƯỜNG HỢP 1: GỖ THÔ -> KHÔNG DÙNG PALLET, ĐỂ THẲNG XUỐNG MẶT SÀN
            kind = "timber"
            mandatory_floor = True
            note = "Gỗ thô: Không dùng pallet, để thẳng xuống mặt sàn (Tầng 1)"
            footprint_x_m = max(length_m, width_m)
            footprint_y_m = min(length_m, width_m)
            pallet_x = footprint_x_m
            pallet_y = footprint_y_m
            if footprint_x_m > 4.0 or footprint_y_m > 2.0:
                raise ItemCalculationError(
                    f"{item.item_code}: Gỗ thô vượt quá giới hạn mặt sàn (tối đa 4.0m x 2.0m)"
                )
            if item.gross_weight_kg > 4500:
                raise ItemCalculationError(
                    f"{item.item_code}: Khối lượng kiện gỗ vượt quá tải trọng sàn (4500kg)"
                )
            max_cases_per_layer = 1
            max_h = 1.76  # Khống chế chiều cao chất hàng tối đa để tổng chiều cao gồm kê sàn (0.04m) không vượt quá 1.80m
            layers = max(1, floor(max_h / height_m))
            cases_per_pallet = max(1, min(max_cases_per_layer * layers, floor(4500 / item.gross_weight_kg)))
            tier = 1
        else:
            # TRƯỜNG HỢP 2: CÁC MẶT HÀNG CÒN LẠI
            # CỐ ĐỊNH CHIỀU CAO (KHÔNG LẬT THÙNG) - CHỈ XOAY 90 ĐỘ TRÊN MẶT PHẲNG ĐÁY (DÀI, RỘNG)
            # Theo quy định đóng gói: Kiện hàng giữ nguyên chiều cao thẳng đứng (This Way Up ↑↑)
            # Chỉ xoay 0° hoặc 90° giữa chiều dài (length_m) và chiều rộng (width_m)
            if _fits_in(length_m, width_m, 1.2, 1.8) and height_m <= 1.65:
                tier = 1
            elif _fits_in(length_m, width_m, 1.4, 1.8) and height_m <= 1.65:
                tier = 2
            elif _fits_in(length_m, width_m, 2.6, 2.05) and height_m <= 1.65:
                tier = 3
            elif _fits_in(length_m, width_m, 3.8, 1.8) and height_m <= 2.0 and item.gross_weight_kg <= 4500:
                tier = 4
            else:
                tier = 5

            if tier in (2, 4) or height_m > 1.65:
                safety_review_required = True

            if tier == 1:
                # Pallet đơn chuẩn: X' <= 1.2m và Y' <= 1.8m, gán 01 vị trí (slot)
                kind = "single"
                pallet_x, pallet_y = 1.2, 1.8
                max_cargo_x, max_cargo_y = 1.2, 1.8
            elif tier == 2:
                # Pallet đơn nhô ngang: 1.2 < X' <= 1.4m và Y' <= 1.8m, gán 01 slot (tối đa 01 pallet/tầng ô kệ)
                # Khung đế gỗ vẫn là Pallet đơn chuẩn (1.2m x 1.8m), hàng nhô ra ngoài mép
                kind = "single"
                pallet_x, pallet_y = 1.2, 1.8
                max_cargo_x, max_cargo_y = 1.4, 1.8
                safety_review_required = True
            elif tier == 3:
                # Pallet ghép đôi: X' > 1.4m hoặc Y' > 1.8m, chiếm 2 slot liền kề (AB hoặc BC)
                # Khung đế gỗ luôn là Pallet đôi chuẩn (2.4m x 1.8m = ghép 2 pallet đơn 1.2m)
                # Giới hạn hàng hóa: mặt tiền X <= 2.6m; chiều sâu Y cho phép nhô nhẹ tới 2.05m (mỗi đầu nhô <= 12.5cm)
                kind = "double"
                pallet_x, pallet_y = 2.4, 1.8
                max_cargo_x, max_cargo_y = 2.6, 2.05
                if max(length_m, width_m) > 2.4 or min(length_m, width_m) > 1.8:
                    safety_review_required = True
            elif tier == 4:
                # BỔ SUNG THEO QUY TẮC MỚI: Hàng có 2,6m < X' <= 3,8m (và Y' <= 1,8m, Za <= 2,0m, Mpal <= 4500kg)
                # Thực tế kho bãi không có pallet 3.8m, kiện hàng phải dùng Pallet đôi chuẩn (2.4m x 1.8m x 0.15m),
                # hàng nhô ra 2 đầu pallet, gán lên kệ Tầng 1 và khóa trọn khoang mã [Dãy]-[ô]-1-ABC.
                kind = "oversize"
                mandatory_floor = True
                safety_review_required = True
                note = "Pallet đôi - Hàng quá khổ (2,6m < X' ≤ 3,8m): Gán kệ Tầng 1, khóa trọn khoang mã [Dãy]-[ô]-1-ABC"
                pallet_x, pallet_y = 2.4, 1.8
                max_cargo_x, max_cargo_y = 3.8, 1.8
            else:
                if item.gross_weight_kg > 4500:
                    raise ItemCalculationError(
                        f"{item.item_code}: Khối lượng kiện hàng ({item.gross_weight_kg:.0f}kg) vượt quá tải trọng khoang kệ Tầng 1 (tối đa 4.500kg). Bắt buộc chuyển sang khu sàn ngoài (Khu vực OOG)."
                    )
                raise ItemCalculationError(
                    f"{item.item_code}: Hàng quá khổ (kích thước {length_m:.2f}m x {width_m:.2f}m x {height_m:.2f}m) vượt quá kích thước lọt lòng khoang kệ (tối đa 3.8m x 1.8m). Bắt buộc đẩy ra khu sàn ngoài (Khu vực OOG)."
                )

            if tier == 4:
                # Hàng quá khổ đặt trên Pallet đôi 2.4m x 1.8m:
                # Hướng kiện hàng sao cho chiều dài dọc theo mặt khoang kệ (X <= 3.8m)
                if length_m >= width_m:
                    footprint_x_m, footprint_y_m = length_m, width_m
                else:
                    footprint_x_m, footprint_y_m = width_m, length_m
                max_cases_per_layer = 1
                max_h = 1.95
                layers = max(1, floor(max_h / height_m))
                cases_per_pallet = max(1, min(layers, floor(4500 / item.gross_weight_kg)))
            else:
                # Chọn chiều xoay mặt đáy (0 độ hay 90 độ) sao cho số kiện trên 1 lớp là nhiều nhất
                nx_0 = _count_fit(max_cargo_x, length_m)
                ny_0 = _count_fit(max_cargo_y, width_m)
                fit_0 = nx_0 * ny_0

                nx_90 = _count_fit(max_cargo_x, width_m)
                ny_90 = _count_fit(max_cargo_y, length_m)
                fit_90 = nx_90 * ny_90

                if fit_90 > fit_0:
                    footprint_x_m = round(max(1, nx_90) * width_m, 3)
                    footprint_y_m = round(max(1, ny_90) * length_m, 3)
                    max_cases_per_layer = max(1, fit_90)
                else:
                    footprint_x_m = round(max(1, nx_0) * length_m, 3)
                    footprint_y_m = round(max(1, ny_0) * width_m, 3)
                    max_cases_per_layer = max(1, fit_0)

                max_h = 1.95 if mandatory_floor else 1.65
                layers = max(1, floor(max_h / height_m))
                load_limit = 4500 if mandatory_floor else (1500 if kind == "single" else 3000)
                cases_per_pallet = max(
                    1,
                    min(
                        max_cases_per_layer * layers,
                        floor(load_limit / item.gross_weight_kg),
                    ),
                )

        if cases_per_pallet <= 0:
            raise ItemCalculationError(
                f"{item.item_code}: one case exceeds the pallet load limit"
            )

        remaining = item.quantity
        sequence = 1
        while remaining:
            cases = min(remaining, cases_per_pallet)
            weight = cases * item.gross_weight_kg
            required_level = (
                "floor"
                if kind in ("timber", "oversize")
                or mandatory_floor
                or weight > (700 if kind == "single" else 1400)
                else "upper_or_floor"
            )

            # Nguyên tắc xếp pallet an toàn kho bãi (Full Base Layer Foundation):
            # Các tầng bên dưới (đặc biệt là tầng đáy) luôn phải xếp ĐẦY ĐỦ 100% (max_cases_per_layer)
            # để tạo bệ đỡ phẳng, vuông vức, vững chãi, chống nghiêng ngả và sập lún.
            # Tầng trên cùng sẽ chứa số kiện còn lại của pallet.
            actual_layers = max(1, ceil(cases / max_cases_per_layer))
            pallet_cases_per_layer = max_cases_per_layer

            cargo_height_m = round(actual_layers * height_m, 3)
            pallet_code = f"{item.item_code}-P{sequence:02d}"
            plans.append(
                PalletPlan(
                    pallet=Pallet(
                        pallet_code=pallet_code,
                        tenant_id=tenant_id,
                        sku=item.item_code,
                        kind=kind,
                        weight_kg=weight,
                        cargo_height_m=cargo_height_m,
                        overhang=safety_review_required,
                        required_level=required_level,
                    ),
                    item_code=item.item_code,
                    cases=cases,
                    cases_per_layer=pallet_cases_per_layer,
                    layers=actual_layers,
                    required_level=required_level,
                    footprint_x_m=footprint_x_m,
                    footprint_y_m=footprint_y_m,
                    safety_review_required=safety_review_required,
                    note=note,
                    case_length_m=length_m,
                    case_width_m=width_m,
                    case_height_m=height_m,
                    pallet_length_m=pallet_x,
                    pallet_width_m=pallet_y,
                )
            )
            remaining -= cases
            sequence += 1
    return plans
