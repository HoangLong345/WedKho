"""Deterministic proof-of-concept allocator. No DB writes; use transactions in production.

Implements confirmed priority: allowed tenant region -> safety -> preferred level group
(upper levels if suitable, floor if mandatory) -> levels -> all bays left-to-right -> A/B/C.
"""
from dataclasses import dataclass
from typing import Tuple, Optional

SLOT_LETTERS = ('A','B','C')
CAPACITY = {1: 4500, 2: 2100, 3: 2100, 4: 2100, 5: 2100, 6: 2100}
LIMIT = {'single': (1500,700), 'double': (3000,1400), 'timber': (4500,0), 'oversize': (4500,0)}
PATTERNS = {'single': [('A',),('B',),('C',)],
            'double': [('A','B'),('B','C')],
            'timber': [('A','B','C')],
            'oversize': [('A','B','C')]}

def get_slot_patterns(rack: int, kind: str) -> list[tuple[str, ...]]:
    """Mặt tiền từ trái sang phải: Dãy lẻ A->B->C, Dãy chẵn C->B->A."""
    if rack % 2 == 1:
        if kind == 'single':
            return [('A',), ('B',), ('C',)]
        if kind == 'double':
            return [('A', 'B'), ('B', 'C')]
        if kind in ('timber', 'oversize'):
            return [('A', 'B', 'C')]
    else:
        if kind == 'single':
            return [('C',), ('B',), ('A',)]
        if kind == 'double':
            return [('B', 'C'), ('A', 'B')]
        if kind in ('timber', 'oversize'):
            return [('A', 'B', 'C')]
    return []

@dataclass(frozen=True)
class BayLevel:
    rack: int
    bay: int
    level: int
    left_rank: int
    tenant_id: str  # demo: one assigned tenant per bay-level
    occupied: Tuple[str,...] = ()
    existing_weight_kg: float = 0
    enabled: bool = True
    max_level_kg: Optional[float] = None
    existing_overhang_count: int = 0

@dataclass(frozen=True)
class Pallet:
    pallet_code: str
    tenant_id: str
    sku: str
    kind: str
    weight_kg: float
    cargo_height_m: float = 1.65
    overhang: bool = False
    required_level: str = "upper_or_floor"

@dataclass(frozen=True)
class Suggestion:
    pallet_code: str
    rack: int
    bay: int
    level: int
    slots: Tuple[str,...]

class NoSafeSlot(Exception):
    pass

def assign(
    pallets: list[Pallet],
    bay_levels: list[BayLevel],
    allow_partial: bool = False,
) -> list[Suggestion]:
    # Track simulated placements made during this proposal, including other SKUs.
    used = {(b.rack,b.bay,b.level):set(b.occupied) for b in bay_levels}
    loads = {(b.rack,b.bay,b.level):b.existing_weight_kg for b in bay_levels}
    overhangs = {
        (b.rack, b.bay, b.level): b.existing_overhang_count for b in bay_levels
    }
    output=[]
    for p in pallets:
        max_h = 2.0 if (p.kind in ('timber', 'oversize') or getattr(p, "required_level", "") == "floor") else 1.65
        if p.kind not in PATTERNS or p.weight_kg <= 0 or p.cargo_height_m <= 0 or p.cargo_height_m > max_h:
            raise NoSafeSlot(f'{p.pallet_code}: invalid type, mass or height')
        floor_limit,upper_limit = LIMIT[p.kind]
        if p.weight_kg > floor_limit:
            raise NoSafeSlot(f'{p.pallet_code}: exceeds floor pallet load limit')
        req = getattr(p, "required_level", "upper_or_floor")
        levels = ([1] if p.kind in ('timber', 'oversize') or req == 'floor' or p.weight_kg > upper_limit else [2,3,4,5,6,1])
        found=None
        for level in levels:
            # Important: for each level exhaust all rows left-to-right before next level.
            options=sorted((b for b in bay_levels if b.level==level and str(b.tenant_id)==str(p.tenant_id) and b.enabled),
                           key=lambda b:(b.left_rank,b.rack,b.bay))
            for b in options:
                key=(b.rack,b.bay,b.level)
                limit=min(CAPACITY[level], b.max_level_kg or CAPACITY[level])
                if loads[key]+p.weight_kg > limit or (level==1 and p.weight_kg>floor_limit) or (level>1 and p.weight_kg>upper_limit):
                    continue
                if p.overhang and overhangs[key] >= 1:
                    continue
                patterns = get_slot_patterns(b.rack, p.kind)
                for pattern in patterns:
                    if not set(pattern).intersection(used[key]):
                        found=(b,key,pattern)
                        break
                if found:
                    break
            if found:
                break
        if not found:
            if allow_partial:
                continue
            raise NoSafeSlot(f'{p.pallet_code}: no safe free space in assigned tenant region')
        b,key,pattern=found
        used[key].update(pattern)
        loads[key]+=p.weight_kg
        if p.overhang:
            overhangs[key] += 1
        output.append(Suggestion(p.pallet_code,b.rack,b.bay,b.level,pattern))
    return output
