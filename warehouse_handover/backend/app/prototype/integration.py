"""Demo integration: tenant bay allocation -> safe pallet recommendations.
No persistent database writes. Both confirmations are explicit operations in-memory.
"""
from dataclasses import dataclass, field
from math import ceil
from .allocator import BayLevel, Pallet, assign, NoSafeSlot

RACKS = range(101, 125)
LEVELS = range(1, 7)
SLOTS = ('A','B','C')
AREA_RATIO = .70
AREA_PER_BAY = 5.6

def get_bay_count_for_rack(rack: int) -> int:
    """Số ô theo 3 nhóm mặt bằng v2.0."""
    if rack == 101:
        return 45
    elif 102 <= rack <= 109:
        return 49
    elif 110 <= rack <= 124:
        return 84
    return 84

def get_bays_for_rack(rack: int) -> list[int]:
    """Thứ tự ô vật lý từ TRÁI sang PHẢI.
    Do toàn bộ kho đánh số từ PHẢI sang TRÁI (01 ở mép phải),
    duyệt từ TRÁI sang PHẢI vật lý tương ứng mã ô GIẢM DẦN.
    """
    count = get_bay_count_for_rack(rack)
    return list(range(count, 0, -1))

def is_forklift_passage(rack: int, bay: int, level: int) -> bool:
    """Kiểm tra 69 ô đặc biệt có tầng 1-3 làm lối xe nâng (không lưu pallet)."""
    if level not in (1, 2, 3):
        return False
    if rack == 101 and bay == 12:
        return True
    if 102 <= rack <= 109 and bay == 12:
        return True
    if 110 <= rack <= 124 and bay in (12, 26, 43, 60):
        return True
    return False

@dataclass(frozen=True)
class ConfirmationResult:
    status: str
    confirmed_pallet_codes: tuple[str, ...]
    unconfirmed_pallet_codes: tuple[str, ...]

def _format_vn_num(val: float | int) -> str:
    if float(val).is_integer():
        return f"{int(val):,}".replace(",", ".")
    parts = f"{round(float(val), 2):,.2f}".rstrip("0").rstrip(".").split(".")
    integer_part = parts[0].replace(",", ".")
    return f"{integer_part},{parts[1]}" if len(parts) > 1 else integer_part

@dataclass
class Warehouse:
    # (rack,bay) -> tenant ID; allocation always reserves all six levels
    leases: dict[tuple[int,int],str] = field(default_factory=dict)
    # (rack,bay,level,slot) -> pallet ID
    placements: dict[tuple[int,int,int,str],str] = field(default_factory=dict)
    # mapped pallets -> weight, immutable after confirmation in this prototype
    pallets: dict[str,Pallet] = field(default_factory=dict)
    disabled_bays: set[tuple[int,int]] = field(default_factory=set)
    reservations: dict[tuple[int,int,int,str],str] = field(default_factory=dict)

    def required_bays(self, square_metres: float) -> int:
        if square_metres <= 0:
            raise ValueError('Diện tích thuê phải lớn hơn 0')
        return ceil(round(square_metres * AREA_RATIO / AREA_PER_BAY, 10))

    def propose_lease(self, tenant: str, square_metres: float, preferred_rack: int | None = None) -> list[tuple[int,int]]:
        """Physical left-right ordering: racks 101->124; bays from left to right (decreasing bay number).
        Prefer one continuous span, otherwise lexicographic free spans.
        """
        if not tenant:
            raise ValueError('Thiếu mã khách thuê')
        count = self.required_bays(square_metres)
        
        # Cho phép ưu tiên bắt đầu từ một dãy nhất định (ví dụ dãy 110) nếu được chỉ định
        rack_order = list(RACKS)
        if preferred_rack is not None and preferred_rack in RACKS:
            idx = rack_order.index(preferred_rack)
            rack_order = rack_order[idx:] + rack_order[:idx]

        free = [
            (r, b)
            for r in rack_order
            for b in get_bays_for_rack(r)
            if (r, b) not in self.leases and (r, b) not in self.disabled_bays
        ]
        if len(free) < count:
            free_count = len(free)
            avail_m2 = int(free_count * 8)
            req_m2_str = _format_vn_num(square_metres)
            avail_m2_str = _format_vn_num(avail_m2)
            bay_count_str = _format_vn_num(count)
            free_count_str = _format_vn_num(free_count)
            raise ValueError(
                f"Không đủ diện tích: Cần {req_m2_str} m² ({bay_count_str} khoang), kho chỉ còn {avail_m2_str} m² ({free_count_str} khoang)"
            )
        return free[:count]

    def confirm_lease(self, tenant: str, suggestion: list[tuple[int,int]]):
        if not suggestion or len(suggestion)!=len(set(suggestion)):
            raise ValueError('Danh sách ô không hợp lệ')
        # Atomic within demo single process; production must use DB transaction locks.
        if any(
            k in self.leases
            or k in self.disabled_bays
            or k[0] not in RACKS
            or not (1 <= k[1] <= get_bay_count_for_rack(k[0]))
            for k in suggestion
        ):
            raise ValueError('Có ô đã được cấp, bị khóa hoặc nằm ngoài kho')
        for key in suggestion: self.leases[key]=tenant

    def propose_pallets(
        self,
        tenant: str,
        pallets: list[Pallet],
        proposal_id: str | None = None,
        allow_partial: bool = False,
    ):
        if any(str(p.tenant_id)!=str(tenant) for p in pallets):
            raise ValueError('Pallet không thuộc khách thuê')
        if any(p.pallet_code in self.pallets for p in pallets):
            raise ValueError('Mã pallet đã tồn tại')
        levels=[]
        for (rack,bay),owner in self.leases.items():
            if owner!=tenant: continue
            for level in LEVELS:
                if is_forklift_passage(rack, bay, level):
                    # Tầng 1-3 của 69 ô đặc biệt là lối xe nâng, không có slot lưu pallet
                    continue
                used=tuple(slot for slot in SLOTS if (rack,bay,level,slot) in self.placements
                           or (rack,bay,level,slot) in self.reservations
                           and self.reservations[(rack,bay,level,slot)] != proposal_id)
                placed_codes = {
                    self.placements[(rack,bay,level,s)]
                    for s in used
                    if (rack,bay,level,s) in self.placements
                }
                total=sum(
                    self.pallets[code].weight_kg /
                    len([
                        z for z in SLOTS
                        if self.placements.get((rack,bay,level,z)) == code
                    ])
                    for code in placed_codes
                )
                overhang_count = sum(
                    1
                    for code in placed_codes
                    if self.pallets[code].overhang
                )
                # Tính thứ tự từ trái sang phải: mã ô càng lớn càng ở bên trái -> rank càng nhỏ
                bay_rank = get_bay_count_for_rack(rack) - bay + 1
                physical_rank = (rack - 101) * 100 + bay_rank
                levels.append(
                    BayLevel(
                        rack,
                        bay,
                        level,
                        physical_rank,
                        tenant,
                        used,
                        total,
                        True,
                        None,
                        overhang_count,
                    )
                )
        suggestions = assign(pallets, levels, allow_partial=allow_partial)
        if proposal_id is not None:
            for suggestion in suggestions:
                for slot in suggestion.slots:
                    key=(suggestion.rack,suggestion.bay,suggestion.level,slot)
                    owner=self.reservations.get(key)
                    if owner is not None and owner != proposal_id:
                        raise NoSafeSlot('Vị trí vừa được phiếu khác giữ chỗ')
            for suggestion in suggestions:
                for slot in suggestion.slots:
                    self.reservations[(suggestion.rack,suggestion.bay,suggestion.level,slot)] = proposal_id
        return suggestions

    def confirm_pallets(
        self,
        tenant: str,
        pallets: list[Pallet],
        suggestions,
        proposal_id: str | None = None,
        allow_partial: bool = False,
    ) -> ConfirmationResult:
        """Recalculate to reject stale/unsafe proposals; prototype only."""
        current = self.propose_pallets(
            tenant, pallets, proposal_id, allow_partial=allow_partial
        )
        if current!=suggestions: raise ValueError('Đề xuất hết hiệu lực, cần tính lại')
        if len({p.pallet_code for p in pallets})!=len(pallets):
            raise ValueError('Trùng mã pallet trong phiếu')
        confirmed_codes = {s.pallet_code for s in current}
        pallet_by_code = {p.pallet_code: p for p in pallets}
        for s in current:
            p = pallet_by_code[s.pallet_code]
            for slot in s.slots:self.placements[s.rack,s.bay,s.level,slot]=p.pallet_code
            self.pallets[p.pallet_code]=p
        if proposal_id is not None:
            self.reservations = {
                key: value for key, value in self.reservations.items()
                if value != proposal_id
            }
        unconfirmed_codes = tuple(
            p.pallet_code for p in pallets if p.pallet_code not in confirmed_codes
        )
        return ConfirmationResult(
            status='PARTIAL' if unconfirmed_codes else 'CONFIRMED',
            confirmed_pallet_codes=tuple(s.pallet_code for s in current),
            unconfirmed_pallet_codes=unconfirmed_codes,
        )
