from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.prototype.allocator import Pallet, Suggestion
from app.prototype.integration import Warehouse


def format_bay_spans(bays: list[tuple[int, int]]) -> str:
    """Format danh sách (rack, bay) thành chuỗi trực quan dễ đọc.
    Hỗ trợ cả dải tăng dần và giảm dần (ví dụ 'Dãy 110: Ô 84 → 22').
    """
    if not bays:
        return "Chưa có ô khoang"
    by_rack: dict[int, list[int]] = {}
    for r, b in bays:
        by_rack.setdefault(r, []).append(b)

    parts: list[str] = []
    for rack, bay_list in by_rack.items():
        if not bay_list:
            continue
        spans: list[str] = []
        start = bay_list[0]
        prev = bay_list[0]
        direction = 0  # 1: tăng, -1: giảm
        for b in bay_list[1:]:
            if direction == 0:
                if b == prev + 1:
                    direction = 1
                    prev = b
                elif b == prev - 1:
                    direction = -1
                    prev = b
                else:
                    spans.append(f"Ô {start:02d}")
                    start = b
                    prev = b
            elif direction == 1:
                if b == prev + 1:
                    prev = b
                else:
                    spans.append(f"Ô {start:02d} → {prev:02d}")
                    start = b
                    prev = b
                    direction = 0
            elif direction == -1:
                if b == prev - 1:
                    prev = b
                else:
                    spans.append(f"Ô {start:02d} → {prev:02d}")
                    start = b
                    prev = b
                    direction = 0
        if start == prev:
            spans.append(f"Ô {start:02d}")
        else:
            spans.append(f"Ô {start:02d} → {prev:02d}")
        parts.append(f"Dãy {rack}: {', '.join(spans)}")
    return "; ".join(parts)



@dataclass
class Inbound:
    inbound_id: int
    tenant_id: str
    pallets: list[Pallet]
    proposal_id: str | None = None
    last_suggestions: list[Suggestion] = field(default_factory=list)
    status: str = "DRAFT"


class InMemoryWarehouseService:
    """Temporary application service until the PostgreSQL repository is added."""

    def __init__(self) -> None:
        self.warehouse = Warehouse()
        self.tenants: dict[str, str] = {}
        self.leases: list[dict[str, Any]] = []
        self.pallet_metadata: dict[str, dict[str, str]] = {}
        self.inbounds: dict[int, Inbound] = {}
        self.audit_events: list[dict[str, Any]] = []
        self._next_inbound_id = 1
        self._next_lease_id = 1

    def preview_lease(
        self, tenant_code: str, tenant_name: str, area_m2: float
    ) -> dict[str, Any]:
        bay_count = self.warehouse.required_bays(area_m2)
        suggested = self.warehouse.propose_lease(tenant_code, area_m2)
        return {
            "tenant_code": tenant_code,
            "tenant_name": tenant_name,
            "area_m2": area_m2,
            "planned_bay_count": bay_count,
            "formatted_bays": format_bay_spans(suggested),
            "bays": [{"rack": r, "bay": b} for r, b in suggested],
        }

    def confirm_lease(
        self,
        tenant_code: str,
        tenant_name: str,
        area_m2: float,
        bays: list[tuple[int, int]] | None = None,
    ) -> dict[str, Any]:
        if bays is None:
            bays = self.warehouse.propose_lease(tenant_code, area_m2)
        self.warehouse.confirm_lease(tenant_code, bays)
        self.tenants[tenant_code] = tenant_name or tenant_code
        lease_record = {
            "id": self._next_lease_id,
            "tenant_code": tenant_code,
            "tenant_name": self.tenants[tenant_code],
            "area_m2": area_m2,
            "planned_bay_count": len(bays),
            "formatted_bays": format_bay_spans(bays),
            "bays": [{"rack": r, "bay": b} for r, b in bays],
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.leases.append(lease_record)
        self._next_lease_id += 1
        self.audit_events.append(
            {
                "tenant_id": tenant_code,
                "action": "CONFIRM_LEASE",
                "entity_type": "LEASE",
                "entity_id": str(lease_record["id"]),
                "details": {
                    "area_m2": area_m2,
                    "bay_count": len(bays),
                    "formatted_bays": lease_record["formatted_bays"],
                },
            }
        )
        return lease_record

    def list_leases(self) -> list[dict[str, Any]]:
        return list(reversed(self.leases))

    def list_tenants(self) -> list[dict[str, str]]:
        tenant_codes = set(self.tenants.keys()) | set(self.warehouse.leases.values())
        return [
            {"code": code, "name": self.tenants.get(code, code)}
            for code in sorted(tenant_codes)
        ]

    def assign_bays(self, tenant_id: str, bays: list[tuple[int, int]]) -> None:
        self.warehouse.confirm_lease(tenant_id, bays)

    def create_inbound(
        self,
        tenant_id: str,
        pallets: list[Pallet],
        metadata: dict[str, dict[str, str]] | None = None,
    ) -> Inbound:
        inbound = Inbound(self._next_inbound_id, tenant_id, pallets)
        self.inbounds[inbound.inbound_id] = inbound
        if metadata:
            self.pallet_metadata.update(metadata)
        else:
            for p in pallets:
                self.pallet_metadata[p.pallet_code] = {"sku": p.sku, "sku_name": p.sku}
        self.audit_events.append(
            {
                "tenant_id": tenant_id,
                "action": "CREATE_INBOUND",
                "entity_type": "INBOUND_ORDER",
                "entity_id": str(inbound.inbound_id),
                "details": {"pallet_count": len(pallets)},
            }
        )
        self._next_inbound_id += 1
        return inbound

    def preview_locations(
        self, inbound_id: int, allow_partial: bool = False
    ) -> dict[str, Any]:
        inbound = self.inbounds.get(inbound_id)
        if inbound is None:
            raise KeyError(f"Inbound order {inbound_id} was not found")
        if inbound.proposal_id is None:
            inbound.proposal_id = f"inbound-{inbound_id}-proposal"
        suggestions = self.warehouse.propose_pallets(
            inbound.tenant_id,
            inbound.pallets,
            proposal_id=inbound.proposal_id,
            allow_partial=allow_partial,
        )
        inbound.last_suggestions = suggestions
        inbound.status = "PARTIAL" if len(suggestions) < len(inbound.pallets) else "PROPOSED"
        self.audit_events.append(
            {
                "tenant_id": inbound.tenant_id,
                "action": "PREVIEW_PLACEMENT",
                "entity_type": "INBOUND_ORDER",
                "entity_id": str(inbound_id),
                "details": {
                    "proposal_id": inbound.proposal_id,
                    "suggestion_count": len(suggestions),
                    "allow_partial": allow_partial,
                },
            }
        )
        return {
            "inbound_id": inbound_id,
            "status": inbound.status,
            "suggestions": [
                {
                    "pallet_code": item.pallet_code,
                    "rack": item.rack,
                    "bay": item.bay,
                    "level": item.level,
                    "slots": list(item.slots),
                    "location_code": f"{item.rack}-{item.bay:02d}-{item.level:02d}-{''.join(item.slots)}",
                }
                for item in suggestions
            ],
            "unplaced_pallet_codes": [
                pallet.pallet_code
                for pallet in inbound.pallets
                if pallet.pallet_code not in {item.pallet_code for item in suggestions}
            ],
        }

    def confirm_locations(
        self, inbound_id: int, proposal_id: str
    ) -> dict[str, Any]:
        inbound = self.inbounds.get(inbound_id)
        if inbound is None:
            raise KeyError(f"Inbound order {inbound_id} was not found")
        if inbound.proposal_id != proposal_id:
            raise ValueError("Mã đề xuất không khớp hoặc đã hết hạn")
        if not inbound.last_suggestions:
            raise ValueError("Phiếu nhập chưa có đề xuất vị trí để xác nhận")

        confirmation = self.warehouse.confirm_pallets(
            inbound.tenant_id,
            inbound.pallets,
            inbound.last_suggestions,
            proposal_id=proposal_id,
            allow_partial=True,
        )
        inbound.status = confirmation.status
        self.audit_events.append(
            {
                "tenant_id": inbound.tenant_id,
                "action": "CONFIRM_PLACEMENT",
                "entity_type": "INBOUND_ORDER",
                "entity_id": str(inbound_id),
                "details": {
                    "proposal_id": proposal_id,
                    "status": confirmation.status,
                    "confirmed_pallet_count": len(confirmation.confirmed_pallet_codes),
                    "confirmed_pallet_codes": list(confirmation.confirmed_pallet_codes),
                },
            }
        )
        return {
            "inbound_id": inbound_id,
            "proposal_id": proposal_id,
            "status": confirmation.status,
            "confirmed_pallet_codes": list(confirmation.confirmed_pallet_codes),
            "unconfirmed_pallet_codes": list(confirmation.unconfirmed_pallet_codes),
        }

    def get_inbound(self, inbound_id: int) -> dict[str, Any] | None:
        inbound = self.inbounds.get(inbound_id)
        if not inbound:
            return None
        return {
            "inbound_id": inbound.inbound_id,
            "tenant_id": inbound.tenant_id,
            "status": inbound.status,
            "proposal_id": inbound.proposal_id,
            "pallet_count": len(inbound.pallets),
        }

    def list_audit_events(
        self,
        tenant_id: str | None = None,
        action: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        events = self.audit_events
        if tenant_id:
            events = [event for event in events if event["tenant_id"] == tenant_id]
        if action:
            events = [event for event in events if event["action"] == action]
        return list(reversed(events[-limit:]))

    def get_tenant_inventory(self, tenant_code: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for (r, b, lvl, s), p_code in self.warehouse.placements.items():
            if self.warehouse.leases.get((r, b)) == tenant_code:
                meta = self.pallet_metadata.get(p_code, {})
                pallet_obj = self.warehouse.pallets.get(p_code)
                weight = pallet_obj.weight_kg if pallet_obj else 0.0
                results.append({
                    "pallet_id": 0,
                    "pallet_code": p_code,
                    "pallet_type": getattr(pallet_obj, "kind", "SINGLE") if pallet_obj else "SINGLE",
                    "case_count": 1,
                    "cargo_weight_kg": weight,
                    "sku": meta.get("sku", p_code),
                    "sku_name": meta.get("sku_name", p_code),
                    "rack": r,
                    "bay": b,
                    "level": lvl,
                    "slots": s,
                    "location_code": f"{r}-{b:02d}-{lvl:02d}-{s}",
                })
        return results

    def process_outbound(self, tenant_code: str) -> dict[str, Any]:
        keys_to_remove = [
            k for k, p_code in self.warehouse.placements.items()
            if self.warehouse.leases.get((k[0], k[1])) == tenant_code
        ]
        pallet_codes = list({self.warehouse.placements[k] for k in keys_to_remove})
        for k in keys_to_remove:
            del self.warehouse.placements[k]
        self.audit_events.append({
            "tenant_id": tenant_code,
            "action": "OUTBOUND_SHIPMENT",
            "entity_type": "PALLET",
            "entity_id": tenant_code,
            "details": {
                "exported_count": len(pallet_codes),
                "pallet_codes": pallet_codes,
            },
        })
        return {
            "tenant_code": tenant_code,
            "exported_count": len(pallet_codes),
            "pallet_codes": pallet_codes,
            "message": f"Đã xuất kho thành công {len(pallet_codes)} pallet cho đối tác {tenant_code}.",
        }

    def terminate_lease(self, tenant_code: str) -> dict[str, Any]:
        # Xóa placements nếu còn
        keys_to_remove = [
            k for k in self.warehouse.placements.keys()
            if self.warehouse.leases.get((k[0], k[1])) == tenant_code
        ]
        for k in keys_to_remove:
            del self.warehouse.placements[k]

        # Thu hồi khoang thuê
        bays_to_remove = [
            k for k, t in self.warehouse.leases.items()
            if t == tenant_code
        ]
        for k in bays_to_remove:
            del self.warehouse.leases[k]

        # Cập nhật status lease
        for l in self.leases:
            if l.get("tenant_code") == tenant_code and l.get("status") == "ACTIVE":
                l["status"] = "CLOSED"

        self.audit_events.append({
            "tenant_id": tenant_code,
            "action": "TERMINATE_LEASE",
            "entity_type": "LEASE",
            "entity_id": tenant_code,
            "details": {
                "released_bay_count": len(bays_to_remove),
                "message": f"Chấm dứt hợp đồng thuê kho đối tác {tenant_code}, thu hồi {len(bays_to_remove)} khoang kệ.",
            },
        })
        return {
            "tenant_code": tenant_code,
            "released_bays": len(bays_to_remove),
            "message": f"Đã hủy hợp đồng thuê đối tác {tenant_code} thành công. Đã giải phóng {len(bays_to_remove)} khoang kệ về trạng thái trống khả dụng.",
        }

