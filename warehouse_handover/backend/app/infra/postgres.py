import os
from datetime import datetime, timezone
from math import ceil
from uuid import uuid4
from dataclasses import dataclass
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.prototype.allocator import BayLevel, Pallet, Suggestion, assign
from app.domain.service import format_bay_spans


class RepositoryConfigurationError(RuntimeError):
    pass


class TenantNotFoundError(LookupError):
    pass


class InboundNotFoundError(LookupError):
    pass


class ProposalNotFoundError(LookupError):
    pass


class ProposalConflictError(RuntimeError):
    pass


def _is_overhang_single(
    pallet_type: str | None,
    case_length_m: float | None,
    case_width_m: float | None,
) -> bool:
    if pallet_type != "SINGLE" or case_length_m is None or case_width_m is None:
        return False
    return (
        (
            1.2 < case_length_m <= 1.4
            and case_width_m <= 1.8
        )
        or (
            1.2 < case_width_m <= 1.4
            and case_length_m <= 1.8
        )
    )


def _format_vn_num(val: float | int) -> str:
    if float(val).is_integer():
        return f"{int(val):,}".replace(",", ".")
    parts = f"{round(float(val), 2):,.2f}".rstrip("0").rstrip(".").split(".")
    integer_part = parts[0].replace(",", ".")
    return f"{integer_part},{parts[1]}" if len(parts) > 1 else integer_part


@dataclass(frozen=True)
class DatabaseSettings:
    host: str
    port: int
    database: str
    user: str
    password: str

    @classmethod
    def from_environment(cls) -> "DatabaseSettings":
        password = os.getenv("POSTGRES_PASSWORD", "WarehouseLocal_2026!")
        return cls(
            host=os.getenv("POSTGRES_HOST", "127.0.0.1"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            database=os.getenv("POSTGRES_DB", "warehouse"),
            user=os.getenv("POSTGRES_USER", "warehouse_app"),
            password=password,
        )

    def connection_kwargs(self) -> dict[str, Any]:
        return {
            "host": self.host,
            "port": self.port,
            "dbname": self.database,
            "user": self.user,
            "password": self.password,
            "row_factory": dict_row,
        }


class PostgresRepository:
    def __init__(self, settings: DatabaseSettings | None = None) -> None:
        self.settings = settings or DatabaseSettings.from_environment()

    def check_geometry(self) -> dict[str, int]:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      (SELECT COUNT(*) FROM racks) AS racks,
                      (SELECT COUNT(*) FROM bays) AS bays,
                      (SELECT COUNT(*) FROM rack_slots) AS rack_slots
                    """
                )
                row = cursor.fetchone()
        if row is None:
            raise RuntimeError("Geometry query returned no row")
        return {key: int(value) for key, value in row.items()}

    def list_audit_events(
        self,
        tenant_code: str | None = None,
        action: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        conditions: list[str] = []
        params: list[Any] = []
        if tenant_code:
            conditions.append("t.code = %s")
            params.append(tenant_code)
        if action:
            conditions.append("ae.action = %s")
            params.append(action)
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT ae.id, t.code AS tenant_id, ae.action,
                           ae.entity_type, ae.entity_id, ae.details,
                           ae.occurred_at
                    FROM audit_events ae
                    LEFT JOIN tenants t ON t.id = ae.tenant_id
                    {where_clause}
                    ORDER BY ae.occurred_at DESC, ae.id DESC
                    LIMIT %s
                    """,
                    params,
                )
                return [
                    {
                        **row,
                        "occurred_at": row["occurred_at"].isoformat(),
                    }
                    for row in cursor.fetchall()
                ]

    def preview_lease(
        self, tenant_code: str, tenant_name: str, area_m2: float
    ) -> dict[str, Any]:
        if area_m2 <= 0:
            raise ValueError("Diện tích thuê phải lớn hơn 0")
        if not tenant_code:
            raise ValueError("Thiếu mã khách thuê")
        bay_count = ceil(round(area_m2 * 0.70 / 5.6, 10))
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT b.id, b.rack_code, b.bay_no
                    FROM bays b
                    LEFT JOIN bay_assignments ba ON ba.bay_id = b.id AND ba.status = 'ACTIVE'
                    WHERE b.status = 'AVAILABLE' AND ba.id IS NULL
                    ORDER BY b.rack_code ASC, b.bay_no ASC
                    """
                )
                free_bays = cursor.fetchall()
                if len(free_bays) < bay_count:
                    free_count = len(free_bays)
                    avail_m2 = int(free_count * 8)
                    req_m2_str = _format_vn_num(area_m2)
                    avail_m2_str = _format_vn_num(avail_m2)
                    bay_count_str = _format_vn_num(bay_count)
                    free_count_str = _format_vn_num(free_count)
                    raise ValueError(
                        f"Không đủ diện tích: Cần {req_m2_str} m² ({bay_count_str} khoang), kho chỉ còn {avail_m2_str} m² ({free_count_str} khoang)"
                    )
                allocated = free_bays[:bay_count]
                bay_tuples = [(row["rack_code"], row["bay_no"]) for row in allocated]
                return {
                    "tenant_code": tenant_code,
                    "tenant_name": tenant_name,
                    "area_m2": area_m2,
                    "planned_bay_count": bay_count,
                    "formatted_bays": format_bay_spans(bay_tuples),
                    "bays": [{"rack": r, "bay": b} for r, b in bay_tuples],
                }

    def confirm_lease(
        self,
        tenant_code: str,
        tenant_name: str,
        area_m2: float,
        bays: list[dict[str, int]] | None = None,
    ) -> dict[str, Any]:
        if area_m2 <= 0:
            raise ValueError("Diện tích thuê phải lớn hơn 0")
        if not tenant_code:
            raise ValueError("Thiếu mã khách thuê")
        bay_count = ceil(round(area_m2 * 0.70 / 5.6, 10))
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                if bays is None:
                    cursor.execute(
                        """
                        SELECT b.id, b.rack_code, b.bay_no
                        FROM bays b
                        LEFT JOIN bay_assignments ba ON ba.bay_id = b.id AND ba.status = 'ACTIVE'
                        WHERE b.status = 'AVAILABLE' AND ba.id IS NULL
                        ORDER BY b.rack_code ASC, b.bay_no ASC
                        FOR UPDATE OF b
                        LIMIT %s
                        """,
                        (bay_count,),
                    )
                    selected_rows = cursor.fetchall()
                    if len(selected_rows) < bay_count:
                        avail_count = len(selected_rows)
                        avail_m2 = int(avail_count * 8)
                        req_m2_str = _format_vn_num(area_m2)
                        avail_m2_str = _format_vn_num(avail_m2)
                        bay_count_str = _format_vn_num(bay_count)
                        avail_count_str = _format_vn_num(avail_count)
                        raise ValueError(
                            f"Không đủ diện tích còn trống: Cần {req_m2_str} m² ({bay_count_str} khoang), kho chỉ còn {avail_m2_str} m² ({avail_count_str} khoang)"
                        )
                    bay_ids = [row["id"] for row in selected_rows]
                    bay_tuples = [
                        (row["rack_code"], row["bay_no"]) for row in selected_rows
                    ]
                else:
                    bay_ids = []
                    bay_tuples = []
                    for item in bays:
                        r = item["rack"]
                        b = item["bay"]
                        cursor.execute(
                            """
                            SELECT b.id, b.rack_code, b.bay_no
                            FROM bays b
                            LEFT JOIN bay_assignments ba ON ba.bay_id = b.id AND ba.status = 'ACTIVE'
                            WHERE b.rack_code = %s AND b.bay_no = %s AND b.status = 'AVAILABLE' AND ba.id IS NULL
                            FOR UPDATE OF b
                            """,
                            (r, b),
                        )
                        row = cursor.fetchone()
                        if not row:
                            raise ValueError(
                                f"Khoang ({r}, {b}) không còn trống hoặc không tồn tại"
                            )
                        bay_ids.append(row["id"])
                        bay_tuples.append((r, b))

                cursor.execute(
                    """
                    INSERT INTO tenants(code, name, active)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (code) DO UPDATE
                    SET name = EXCLUDED.name, active = TRUE
                    RETURNING id
                    """,
                    (tenant_code, tenant_name or tenant_code),
                )
                tenant_id = cursor.fetchone()["id"]

                cursor.execute(
                    """
                    INSERT INTO leases(tenant_id, area_m2, planned_bay_count, status)
                    VALUES (%s, %s, %s, 'ACTIVE')
                    RETURNING id, created_at
                    """,
                    (tenant_id, area_m2, len(bay_ids)),
                )
                lease_row = cursor.fetchone()
                lease_id = lease_row["id"]
                created_at = lease_row["created_at"].isoformat()

                for bid in bay_ids:
                    cursor.execute(
                        """
                        INSERT INTO bay_assignments(lease_id, bay_id, status)
                        VALUES (%s, %s, 'ACTIVE')
                        """,
                        (lease_id, bid),
                    )

                formatted = format_bay_spans(bay_tuples)
                cursor.execute(
                    """
                    INSERT INTO audit_events(tenant_id, action, entity_type, entity_id, details)
                    VALUES (%s, 'CONFIRM_LEASE', 'LEASE', %s, %s)
                    """,
                    (
                        tenant_id,
                        str(lease_id),
                        Jsonb(
                            {
                                "area_m2": area_m2,
                                "bay_count": len(bay_ids),
                                "formatted_bays": formatted,
                            }
                        ),
                    ),
                )
                connection.commit()
                return {
                    "id": lease_id,
                    "tenant_code": tenant_code,
                    "tenant_name": tenant_name or tenant_code,
                    "area_m2": area_m2,
                    "planned_bay_count": len(bay_ids),
                    "formatted_bays": formatted,
                    "bays": [{"rack": r, "bay": b} for r, b in bay_tuples],
                    "status": "ACTIVE",
                    "created_at": created_at,
                }

    def list_leases(self) -> list[dict[str, Any]]:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT l.id, t.code AS tenant_code, t.name AS tenant_name,
                           l.area_m2, l.planned_bay_count, l.status, l.created_at,
                           COALESCE(
                             json_agg(
                               json_build_object('rack', b.rack_code, 'bay', b.bay_no)
                               ORDER BY b.rack_code, b.bay_no
                             ) FILTER (WHERE b.id IS NOT NULL),
                             '[]'
                           ) AS bays
                    FROM leases l
                    JOIN tenants t ON t.id = l.tenant_id
                    LEFT JOIN bay_assignments ba ON ba.lease_id = l.id AND ba.status = 'ACTIVE'
                    LEFT JOIN bays b ON b.id = ba.bay_id
                    GROUP BY l.id, t.code, t.name, l.area_m2, l.planned_bay_count, l.status, l.created_at
                    ORDER BY l.created_at DESC, l.id DESC
                    """
                )
                results = []
                for row in cursor.fetchall():
                    bays = row["bays"]
                    bay_tuples = [(b["rack"], b["bay"]) for b in bays]
                    results.append(
                        {
                            "id": row["id"],
                            "tenant_code": row["tenant_code"],
                            "tenant_name": row["tenant_name"],
                            "area_m2": float(row["area_m2"]),
                            "planned_bay_count": row["planned_bay_count"],
                            "formatted_bays": format_bay_spans(bay_tuples),
                            "bays": bays,
                            "status": row["status"],
                            "created_at": row["created_at"].isoformat(),
                        }
                    )
                return results

    def list_slots(
        self,
        rack_code: int,
        level_no: int | None = None,
        tenant_code: str | None = None,
    ) -> dict[str, Any]:
        conditions = ["b.rack_code = %s"]
        params: list[Any] = [rack_code]
        if level_no is not None:
            conditions.append("rs.level_no = %s")
            params.append(level_no)
        if tenant_code:
            conditions.append(
                "(tenant.code = %s OR tenant.code IS NULL)"
            )
            params.append(tenant_code)
        where_clause = " AND ".join(conditions)
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT
                      b.rack_code AS rack,
                      b.bay_no AS bay,
                      rs.level_no AS level,
                      rs.slot_code AS slot,
                      b.status AS bay_status,
                      rs.blocked,
                      tenant.code AS tenant_id,
                      p.pallet_code,
                      s.code AS sku,
                      s.name AS sku_name,
                      CASE
                        WHEN rs.blocked OR b.status <> 'AVAILABLE' THEN 'BLOCKED'
                        WHEN p.pallet_code IS NOT NULL THEN 'OCCUPIED'
                        WHEN sr.slot_id IS NOT NULL THEN 'RESERVED'
                        WHEN tenant.code IS NOT NULL THEN 'ASSIGNED'
                        ELSE 'AVAILABLE'
                      END AS status
                    FROM rack_slots rs
                    JOIN bays b ON b.id = rs.bay_id
                    LEFT JOIN bay_assignments ba
                      ON ba.bay_id = b.id AND ba.status = 'ACTIVE'
                    LEFT JOIN leases l ON l.id = ba.lease_id AND l.status = 'ACTIVE'
                    LEFT JOIN tenants tenant ON tenant.id = l.tenant_id
                    LEFT JOIN occupied_slots os ON os.slot_id = rs.id
                    LEFT JOIN pallet_placements pp
                      ON pp.id = os.placement_id AND pp.status = 'ACTIVE'
                    LEFT JOIN pallets p ON p.id = pp.pallet_id
                    LEFT JOIN slot_reservations sr
                      ON sr.slot_id = rs.id
                     AND sr.status = 'ACTIVE'
                     AND sr.expires_at > now()
                    LEFT JOIN skus s ON s.id = p.sku_id
                    WHERE {where_clause}
                    ORDER BY b.bay_no, rs.level_no, rs.slot_code
                    """,
                    params,
                )
                rows = cursor.fetchall()
        return {"rack": rack_code, "level": level_no, "slots": rows}

    def create_manual_inbound(
        self, tenant_code: str, pallets: list[dict[str, Any]]
    ) -> int:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id
                    FROM tenants
                    WHERE code = %s AND active
                    FOR UPDATE
                    """,
                    (tenant_code,),
                )
                tenant = cursor.fetchone()
                if tenant is None:
                    raise TenantNotFoundError(
                        f"Active tenant {tenant_code!r} was not found"
                    )

                cursor.execute(
                    """
                    INSERT INTO inbound_orders(tenant_id, source, status)
                    VALUES (%s, 'MANUAL', 'DRAFT')
                    RETURNING id
                    """,
                    (tenant["id"],),
                )
                inbound_id = cursor.fetchone()["id"]

                pallets_by_sku: dict[str, list[dict[str, Any]]] = {}
                for pallet in pallets:
                    pallets_by_sku.setdefault(pallet["sku"], []).append(pallet)

                line_by_sku: dict[str, int] = {}
                sku_by_code: dict[str, int] = {}
                for sku_code, sku_pallets in pallets_by_sku.items():
                    first = sku_pallets[0]
                    pallet_type = {
                        "single": "SINGLE",
                        "double": "DOUBLE",
                        "timber": "WOOD",
                        "oversize": "OVERSIZE",
                    }.get(pallet["kind"])
                    if pallet_type is None:
                        raise ValueError(f"Unsupported pallet kind: {first['kind']}")
                    cursor.execute(
                        """
                        INSERT INTO skus(
                          tenant_id, code, name, category, unit_of_measure,
                          case_length_m,
                          case_width_m, case_height_m, case_gross_kg
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (tenant_id, code)
                        DO UPDATE SET
                          name = EXCLUDED.name,
                          category = EXCLUDED.category,
                          unit_of_measure = EXCLUDED.unit_of_measure,
                          case_length_m = EXCLUDED.case_length_m,
                          case_width_m = EXCLUDED.case_width_m,
                          case_height_m = EXCLUDED.case_height_m,
                          case_gross_kg = EXCLUDED.case_gross_kg
                        RETURNING id
                        """,
                        (
                            tenant["id"],
                            sku_code,
                            first.get("item_name", sku_code),
                            first.get("item_type", ""),
                            first.get("unit_of_measure", "case"),
                            first.get("length_m", 1),
                            first.get("width_m", 1),
                            first["cargo_height_m"],
                            first.get("gross_weight_kg", first["weight_kg"]),
                        ),
                    )
                    sku_id = cursor.fetchone()["id"]
                    sku_by_code[sku_code] = sku_id
                    cursor.execute(
                        """
                        INSERT INTO inbound_lines(order_id, sku_id, case_count)
                        VALUES (%s, %s, 1)
                        RETURNING id
                        """,
                        (inbound_id, sku_id),
                    )
                    line_id = cursor.fetchone()["id"]
                    line_case_count = sum(
                        int(item.get("case_count", 1)) for item in sku_pallets
                    )
                    cursor.execute(
                        """
                        UPDATE inbound_lines
                        SET case_count = %s
                        WHERE id = %s
                        """,
                        (line_case_count, line_id),
                    )
                    line_by_sku[sku_code] = line_id

                for pallet in pallets:
                    pallet_type = {
                        "single": "SINGLE",
                        "double": "DOUBLE",
                        "timber": "WOOD",
                        "oversize": "OVERSIZE",
                    }.get(pallet["kind"])
                    if pallet_type is None:
                        raise ValueError(f"Unsupported pallet kind: {pallet['kind']}")

                    p_code = pallet["pallet_code"]
                    cursor.execute("SELECT 1 FROM pallets WHERE pallet_code = %s", (p_code,))
                    if cursor.fetchone():
                        cursor.execute("SELECT COUNT(*) as count FROM pallets WHERE pallet_code LIKE %s", (f"{p_code}%",))
                        suffix_cnt = cursor.fetchone()["count"]
                        p_code = f"{p_code}-{suffix_cnt + 1}"
                        pallet["pallet_code"] = p_code

                    cursor.execute(
                        """
                        INSERT INTO pallets(
                          pallet_code, tenant_id, sku_id, inbound_line_id,
                          pallet_type, case_count, cargo_weight_kg
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            p_code,
                            tenant["id"],
                            sku_by_code[pallet["sku"]],
                            line_by_sku[pallet["sku"]],
                            pallet_type,
                            pallet.get("case_count", 1),
                            pallet["weight_kg"],
                        ),
                    )
                cursor.execute(
                    """
                    INSERT INTO audit_events(
                      tenant_id, action, entity_type, entity_id, details
                    )
                    VALUES (%s, 'CREATE_INBOUND', 'INBOUND_ORDER', %s, %s)
                    """,
                    (
                        tenant["id"],
                        str(inbound_id),
                        Jsonb({"pallet_count": len(pallets), "source": "MANUAL"}),
                    ),
                )
        return int(inbound_id)

    def preview_locations(
        self, inbound_id: int, allow_partial: bool = False
    ) -> dict[str, Any]:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT io.id, t.id AS tenant_id, t.code AS tenant_code
                    FROM inbound_orders io
                    JOIN tenants t ON t.id = io.tenant_id
                    WHERE io.id = %s
                    FOR UPDATE
                    """,
                    (inbound_id,),
                )
                inbound = cursor.fetchone()
                if inbound is None:
                    raise InboundNotFoundError(
                        f"Inbound order {inbound_id} was not found"
                    )

                cursor.execute(
                    """
                    SELECT p.pallet_code, p.cargo_weight_kg, p.pallet_type,
                           s.code AS sku, s.case_length_m, s.case_width_m,
                           s.case_height_m
                    FROM pallets p
                    JOIN skus s ON s.id = p.sku_id
                    WHERE p.inbound_line_id IN (
                      SELECT id FROM inbound_lines WHERE order_id = %s
                    )
                    ORDER BY p.id
                    """,
                    (inbound_id,),
                )
                pallet_rows = cursor.fetchall()
                if not pallet_rows:
                    raise ValueError("Inbound order has no pallets")

                cursor.execute(
                    """
                    SELECT b.rack_code AS rack, b.bay_no AS bay,
                           rs.level_no AS level, rs.id AS slot_id,
                           rs.slot_code, COALESCE(p.pallet_code, '') AS pallet_code,
                           COALESCE(p.cargo_weight_kg, 0) AS pallet_weight,
                           p.pallet_type,
                           s.case_length_m, s.case_width_m
                    FROM bay_assignments ba
                    JOIN leases l ON l.id = ba.lease_id
                    JOIN bays b ON b.id = ba.bay_id
                    JOIN rack_slots rs ON rs.bay_id = b.id
                    LEFT JOIN occupied_slots os ON os.slot_id = rs.id
                    LEFT JOIN pallet_placements pp
                      ON pp.id = os.placement_id AND pp.status = 'ACTIVE'
                    LEFT JOIN pallets p ON p.id = pp.pallet_id
                    LEFT JOIN skus s ON s.id = p.sku_id
                    WHERE ba.status = 'ACTIVE' AND l.status = 'ACTIVE'
                      AND l.tenant_id = %s
                      AND b.status = 'AVAILABLE' AND NOT rs.blocked
                    ORDER BY b.rack_code, b.bay_no, rs.level_no, rs.slot_code
                    """,
                    (inbound["tenant_id"],),
                )
                slot_rows = cursor.fetchall()
                if not slot_rows:
                    raise ValueError("Tenant has no available assigned slots")

                cursor.execute(
                    """
                    UPDATE slot_reservations sr
                    SET status = 'CANCELLED', released_at = now()
                    FROM inbound_orders io
                    WHERE sr.inbound_order_id = io.id
                      AND io.tenant_id = %s
                      AND io.status IN ('DRAFT', 'PROPOSED')
                      AND sr.status = 'ACTIVE'
                    """,
                    (inbound["tenant_id"],),
                )
                cursor.execute(
                    """
                    UPDATE slot_reservations
                    SET status = 'EXPIRED', released_at = now()
                    WHERE status = 'ACTIVE' AND expires_at <= now()
                    """
                )
                cursor.execute(
                    """
                    SELECT sr.slot_id
                    FROM slot_reservations sr
                    WHERE sr.status = 'ACTIVE' AND sr.expires_at > now()
                      AND sr.inbound_order_id <> %s
                    """,
                    (inbound_id,),
                )
                reserved_slot_ids = {row["slot_id"] for row in cursor.fetchall()}

                levels: dict[tuple[int, int, int], dict[str, Any]] = {}
                for row in slot_rows:
                    key = (row["rack"], row["bay"], row["level"])
                    level = levels.setdefault(
                        key,
                        {
                            "rack": row["rack"],
                            "bay": row["bay"],
                            "level": row["level"],
                            "tenant_id": str(inbound["tenant_id"]),
                            "left_rank": (row["rack"] - 110) * 87 + row["bay"],
                            "occupied": set(),
                            "existing_weight_kg": 0.0,
                            "existing_overhang_count": 0,
                        },
                    )
                    if row["pallet_code"]:
                        level["occupied"].add(row["slot_code"])
                        level["existing_weight_kg"] = max(
                            level["existing_weight_kg"],
                            float(row["pallet_weight"]),
                        )
                        if _is_overhang_single(
                            row["pallet_type"],
                            float(row["case_length_m"]),
                            float(row["case_width_m"]),
                        ):
                            level["existing_overhang_count"] += 1
                    if row["slot_id"] in reserved_slot_ids:
                        level["occupied"].add(row["slot_code"])

                domain_levels = [
                    BayLevel(
                        occupied=tuple(value["occupied"]),
                        existing_weight_kg=value["existing_weight_kg"],
                        **{
                            key: value[key]
                            for key in (
                                "rack",
                                "bay",
                                "level",
                                "tenant_id",
                                "left_rank",
                                "existing_overhang_count",
                            )
                        },
                    )
                    for value in levels.values()
                ]
                pallets = [
                    Pallet(
                        pallet_code=row["pallet_code"],
                        tenant_id=str(inbound["tenant_id"]),
                        sku=row["sku"],
                        kind={
                            "SINGLE": "single",
                            "DOUBLE": "double",
                            "WOOD": "timber",
                            "OVERSIZE": "oversize",
                        }[row["pallet_type"]],
                        weight_kg=float(row["cargo_weight_kg"]),
                        cargo_height_m=min(
                            2.0 if row["pallet_type"] in ("WOOD", "OVERSIZE") else 1.65,
                            float(row["case_height_m"]),
                        ),
                        overhang=_is_overhang_single(
                            row["pallet_type"],
                            float(row["case_length_m"]),
                            float(row["case_width_m"]),
                        ),
                        required_level=(
                            "floor"
                            if row["pallet_type"] in ("WOOD", "OVERSIZE")
                            or (
                                row["pallet_type"] == "DOUBLE"
                                and (
                                    max(float(row["case_length_m"]), float(row["case_width_m"])) > 2.4
                                    or min(float(row["case_length_m"]), float(row["case_width_m"])) > 1.8
                                    or float(row["cargo_weight_kg"]) > 1400
                                )
                            )
                            else "upper_or_floor"
                        ),
                    )
                    for row in pallet_rows
                ]
                suggestions = assign(
                    pallets, domain_levels, allow_partial=allow_partial
                )
                proposal_id = uuid4()
                cursor.execute(
                    """
                    INSERT INTO audit_events(
                      tenant_id, action, entity_type, entity_id, details
                    )
                    VALUES (%s, 'PREVIEW_PLACEMENT', 'INBOUND_ORDER', %s, %s)
                    """,
                    (
                        inbound["tenant_id"],
                        str(inbound_id),
                        Jsonb(
                            {
                                "proposal_id": str(proposal_id),
                                "suggestion_count": len(suggestions),
                                "allow_partial": allow_partial,
                            }
                        ),
                    ),
                )
                cursor.execute(
                    """
                    INSERT INTO proposals(
                      id, tenant_id, kind, status, payload, expires_at
                    )
                    VALUES (%s, %s, 'PALLET', 'PENDING', %s, now() + interval '10 minutes')
                    """,
                    (
                        proposal_id,
                        inbound["tenant_id"],
                        Jsonb(
                            {
                                "inbound_id": inbound_id,
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
                            }
                        ),
                    ),
                )
                cursor.execute(
                    "UPDATE slot_reservations SET status = 'CANCELLED' WHERE inbound_order_id = %s AND status = 'ACTIVE'",
                    (inbound_id,),
                )
                for suggestion in suggestions:
                    cursor.execute(
                        """
                        SELECT rs.id
                        FROM rack_slots rs
                        JOIN bays b ON b.id = rs.bay_id
                        WHERE b.rack_code = %s AND b.bay_no = %s
                          AND rs.level_no = %s AND rs.slot_code = ANY(%s)
                        """,
                        (
                            suggestion.rack,
                            suggestion.bay,
                            suggestion.level,
                            list(suggestion.slots),
                        ),
                    )
                    slot_ids = [row["id"] for row in cursor.fetchall()]
                    for slot_id in slot_ids:
                        cursor.execute(
                            """
                            INSERT INTO slot_reservations(
                              proposal_id, inbound_order_id, slot_id, expires_at
                            )
                            VALUES (%s, %s, %s, now() + interval '10 minutes')
                            ON CONFLICT (slot_id) WHERE status = 'ACTIVE' AND expires_at > now()
                            DO UPDATE SET proposal_id = EXCLUDED.proposal_id,
                                          inbound_order_id = EXCLUDED.inbound_order_id,
                                          expires_at = EXCLUDED.expires_at
                            """,
                            (proposal_id, inbound_id, slot_id),
                        )
                unplaced = [
                    pallet.pallet_code
                    for pallet in pallets
                    if pallet.pallet_code
                    not in {item.pallet_code for item in suggestions}
                ]
                return {
                    "inbound_id": inbound_id,
                    "proposal_id": str(proposal_id),
                    "status": "PARTIAL" if unplaced else "PROPOSED",
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
                    "unplaced_pallet_codes": unplaced,
                }

    def confirm_locations(self, inbound_id: int, proposal_id: str) -> dict[str, Any]:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, tenant_id, status, expires_at, payload
                    FROM proposals
                    WHERE id = %s AND kind = 'PALLET'
                    FOR UPDATE
                    """,
                    (proposal_id,),
                )
                proposal = cursor.fetchone()
                if proposal is None:
                    raise ProposalNotFoundError(
                        f"Proposal {proposal_id!r} was not found"
                    )
                if proposal["status"] != "PENDING" or proposal["expires_at"] <= datetime.now(
                    timezone.utc
                ):
                    raise ProposalConflictError("Proposal is no longer active")

                payload = proposal["payload"]
                if int(payload.get("inbound_id", -1)) != inbound_id:
                    raise ProposalConflictError(
                        "Proposal does not belong to this inbound order"
                    )
                suggestions = payload.get("suggestions", [])
                if not suggestions:
                    raise ProposalConflictError("Proposal contains no placements")

                cursor.execute(
                    """
                    SELECT id, tenant_id, status
                    FROM inbound_orders
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (inbound_id,),
                )
                inbound = cursor.fetchone()
                if inbound is None:
                    raise InboundNotFoundError(
                        f"Inbound order {inbound_id} was not found"
                    )
                if inbound["tenant_id"] != proposal["tenant_id"]:
                    raise ProposalConflictError("Proposal tenant does not match inbound")

                cursor.execute(
                    """
                    SELECT p.id, p.pallet_code
                    FROM pallets p
                    JOIN inbound_lines il ON il.id = p.inbound_line_id
                    WHERE il.order_id = %s
                    FOR UPDATE
                    """,
                    (inbound_id,),
                )
                pallet_ids = {row["pallet_code"]: row["id"] for row in cursor.fetchall()}
                expected_codes = {item["pallet_code"] for item in suggestions}
                if not expected_codes.issubset(pallet_ids):
                    raise ProposalConflictError("Proposal contains an unknown pallet")

                slot_ids: list[int] = []
                slot_map: dict[tuple[int, int, int, str], int] = {}
                for item in suggestions:
                    cursor.execute(
                        """
                        SELECT rs.id
                        FROM rack_slots rs
                        JOIN bays b ON b.id = rs.bay_id
                        WHERE b.rack_code = %s AND b.bay_no = %s
                          AND rs.level_no = %s AND rs.slot_code = ANY(%s)
                        ORDER BY rs.id
                        """,
                        (
                            item["rack"],
                            item["bay"],
                            item["level"],
                            item["slots"],
                        ),
                    )
                    rows = cursor.fetchall()
                    if len(rows) != len(item["slots"]):
                        raise ProposalConflictError("Proposal references an invalid slot")
                    for row, slot_code in zip(rows, item["slots"]):
                        slot_ids.append(row["id"])
                        slot_map[
                            (item["rack"], item["bay"], item["level"], slot_code)
                        ] = row["id"]

                unique_slot_ids = sorted(set(slot_ids))
                cursor.execute(
                    "SELECT id FROM rack_slots WHERE id = ANY(%s) FOR UPDATE",
                    (unique_slot_ids,),
                )
                locked_slot_ids = {row["id"] for row in cursor.fetchall()}
                if locked_slot_ids != set(unique_slot_ids):
                    raise ProposalConflictError("Proposal references a missing slot")

                cursor.execute(
                    """
                    SELECT slot_id
                    FROM slot_reservations
                    WHERE proposal_id = %s AND status = 'ACTIVE'
                      AND expires_at > now()
                    FOR UPDATE
                    """,
                    (proposal_id,),
                )
                reserved_ids = {row["slot_id"] for row in cursor.fetchall()}
                if reserved_ids != set(unique_slot_ids):
                    raise ProposalConflictError("Reservation is missing or expired")

                for item in suggestions:
                    bay_id_row = cursor.execute(
                        """
                        SELECT id FROM bays
                        WHERE rack_code = %s AND bay_no = %s
                        """,
                        (item["rack"], item["bay"]),
                    ).fetchone()
                    placement_id = cursor.execute(
                        """
                        INSERT INTO pallet_placements(
                          pallet_id, bay_id, level_no, status
                        )
                        VALUES (%s, %s, %s, 'ACTIVE')
                        RETURNING id
                        """,
                        (
                            pallet_ids[item["pallet_code"]],
                            bay_id_row["id"],
                            item["level"],
                        ),
                    ).fetchone()["id"]
                    for slot_code in item["slots"]:
                        cursor.execute(
                            """
                            INSERT INTO occupied_slots(placement_id, slot_id)
                            VALUES (%s, %s)
                            """,
                            (
                                placement_id,
                                slot_map[
                                    (item["rack"], item["bay"], item["level"], slot_code)
                                ],
                            ),
                        )
                    cursor.execute(
                        "UPDATE pallets SET status = 'STORED' WHERE id = %s",
                        (pallet_ids[item["pallet_code"]],),
                    )

                cursor.execute(
                    """
                    UPDATE slot_reservations
                    SET status = 'CONFIRMED', released_at = now()
                    WHERE proposal_id = %s AND status = 'ACTIVE'
                    """,
                    (proposal_id,),
                )
                cursor.execute(
                    """
                    UPDATE proposals SET status = 'CONFIRMED'
                    WHERE id = %s
                    """,
                    (proposal_id,),
                )
                status = (
                    "CONFIRMED"
                    if len(expected_codes) == len(pallet_ids)
                    else "PARTIAL"
                )
                cursor.execute(
                    """
                    UPDATE inbound_orders
                    SET status = %s, confirmed_at = now()
                    WHERE id = %s
                    """,
                    (status, inbound_id),
                )
                cursor.execute(
                    """
                    INSERT INTO audit_events(
                      tenant_id, action, entity_type, entity_id, details
                    )
                    VALUES (%s, 'CONFIRM_PLACEMENT', 'INBOUND_ORDER', %s, %s)
                    """,
                    (
                        inbound["tenant_id"],
                        str(inbound_id),
                        Jsonb(
                            {
                                "proposal_id": proposal_id,
                                "status": status,
                                "confirmed_pallet_codes": sorted(expected_codes),
                            }
                        ),
                    ),
                )
                return {
                    "inbound_id": inbound_id,
                    "proposal_id": proposal_id,
                    "status": status,
                    "confirmed_pallet_codes": sorted(expected_codes),
                    "unconfirmed_pallet_codes": sorted(
                        set(pallet_ids) - expected_codes
                    ),
                }

    def get_tenant_inventory(self, tenant_code: str) -> list[dict[str, Any]]:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 
                        p.id AS pallet_id,
                        p.pallet_code,
                        p.pallet_type,
                        p.case_count,
                        p.cargo_weight_kg,
                        s.code AS sku,
                        s.name AS sku_name,
                        b.rack_code AS rack,
                        b.bay_no AS bay,
                        pp.level_no AS level,
                        string_agg(rs.slot_code, '' ORDER BY rs.slot_code) AS slots
                    FROM pallets p
                    JOIN tenants t ON t.id = p.tenant_id
                    JOIN pallet_placements pp ON pp.pallet_id = p.id AND pp.status = 'ACTIVE'
                    JOIN bays b ON b.id = pp.bay_id
                    JOIN occupied_slots os ON os.placement_id = pp.id
                    JOIN rack_slots rs ON rs.id = os.slot_id
                    JOIN skus s ON s.id = p.sku_id
                    WHERE t.code = %s AND p.status = 'STORED'
                    GROUP BY p.id, p.pallet_code, p.pallet_type, p.case_count, p.cargo_weight_kg, s.code, s.name, b.rack_code, b.bay_no, pp.level_no
                    ORDER BY b.rack_code, b.bay_no, pp.level_no, p.pallet_code
                    """,
                    (tenant_code,),
                )
                rows = cursor.fetchall()
                results = []
                for row in rows:
                    results.append({
                        "pallet_id": row["pallet_id"],
                        "pallet_code": row["pallet_code"],
                        "pallet_type": row["pallet_type"],
                        "case_count": row["case_count"],
                        "cargo_weight_kg": float(row["cargo_weight_kg"]),
                        "sku": row["sku"],
                        "sku_name": row["sku_name"],
                        "rack": row["rack"],
                        "bay": row["bay"],
                        "level": row["level"],
                        "slots": row["slots"],
                        "location_code": f"{row['rack']}-{row['bay']:02d}-{row['level']:02d}-{row['slots']}",
                    })
                return results

    def process_outbound(self, tenant_code: str) -> dict[str, Any]:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id, name FROM tenants WHERE code = %s",
                    (tenant_code,),
                )
                tenant = cursor.fetchone()
                if not tenant:
                    raise TenantNotFoundError(f"Không tìm thấy khách hàng {tenant_code!r}")
                tenant_id = tenant["id"]

                cursor.execute(
                    """
                    SELECT p.id AS pallet_id, p.pallet_code, pp.id AS placement_id
                    FROM pallets p
                    JOIN pallet_placements pp ON pp.pallet_id = p.id AND pp.status = 'ACTIVE'
                    WHERE p.tenant_id = %s AND p.status = 'STORED'
                    FOR UPDATE OF p, pp
                    """,
                    (tenant_id,),
                )
                records = cursor.fetchall()
                if not records:
                    return {
                        "tenant_code": tenant_code,
                        "exported_count": 0,
                        "pallet_codes": [],
                        "message": "Khách hàng không có pallet nào đang lưu trên kệ để xuất kho.",
                    }

                placement_ids = [r["placement_id"] for r in records]
                pallet_ids = [r["pallet_id"] for r in records]
                pallet_codes = [r["pallet_code"] for r in records]

                cursor.execute(
                    "DELETE FROM occupied_slots WHERE placement_id = ANY(%s)",
                    (placement_ids,),
                )
                cursor.execute(
                    """
                    UPDATE pallet_placements
                    SET status = 'RELEASED', released_at = now()
                    WHERE id = ANY(%s)
                    """,
                    (placement_ids,),
                )
                cursor.execute(
                    """
                    UPDATE pallets
                    SET status = 'OUTBOUND'
                    WHERE id = ANY(%s)
                    """,
                    (pallet_ids,),
                )
                cursor.execute(
                    """
                    INSERT INTO audit_events(
                        tenant_id, action, entity_type, entity_id, details
                    )
                    VALUES (%s, 'OUTBOUND_SHIPMENT', 'PALLET', %s, %s)
                    """,
                    (
                        tenant_id,
                        tenant_code,
                        Jsonb({
                            "exported_count": len(pallet_codes),
                            "pallet_codes": pallet_codes,
                        }),
                    ),
                )
                connection.commit()
                return {
                    "tenant_code": tenant_code,
                    "exported_count": len(pallet_codes),
                    "pallet_codes": pallet_codes,
                    "message": f"Đã xuất kho thành công {len(pallet_codes)} pallet cho đối tác {tenant.get('name', tenant_code)}.",
                }

    def terminate_lease(self, tenant_code: str) -> dict[str, Any]:
        with psycopg.connect(**self.settings.connection_kwargs()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id, name FROM tenants WHERE code = %s",
                    (tenant_code,),
                )
                tenant = cursor.fetchone()
                if not tenant:
                    raise TenantNotFoundError(f"Không tìm thấy khách hàng {tenant_code!r}")
                tenant_id = tenant["id"]

                cursor.execute(
                    """
                    SELECT p.id AS pallet_id, pp.id AS placement_id
                    FROM pallets p
                    JOIN pallet_placements pp ON pp.pallet_id = p.id AND pp.status = 'ACTIVE'
                    WHERE p.tenant_id = %s
                    FOR UPDATE OF p, pp
                    """,
                    (tenant_id,),
                )
                records = cursor.fetchall()
                if records:
                    placement_ids = [r["placement_id"] for r in records]
                    pallet_ids = [r["pallet_id"] for r in records]
                    cursor.execute("DELETE FROM occupied_slots WHERE placement_id = ANY(%s)", (placement_ids,))
                    cursor.execute("UPDATE pallet_placements SET status = 'RELEASED', released_at = now() WHERE id = ANY(%s)", (placement_ids,))
                    cursor.execute("UPDATE pallets SET status = 'OUTBOUND' WHERE id = ANY(%s)", (pallet_ids,))

                cursor.execute(
                    """
                    SELECT ba.id, ba.bay_id
                    FROM bay_assignments ba
                    JOIN leases l ON l.id = ba.lease_id
                    WHERE l.tenant_id = %s AND ba.status = 'ACTIVE'
                    FOR UPDATE OF ba
                    """,
                    (tenant_id,),
                )
                assigned_bays = cursor.fetchall()
                bay_count = len(assigned_bays)

                cursor.execute(
                    """
                    UPDATE bay_assignments
                    SET status = 'RELEASED', released_at = now()
                    WHERE id IN (
                        SELECT ba.id FROM bay_assignments ba
                        JOIN leases l ON l.id = ba.lease_id
                        WHERE l.tenant_id = %s AND ba.status = 'ACTIVE'
                    )
                    """,
                    (tenant_id,),
                )
                cursor.execute(
                    """
                    UPDATE leases
                    SET status = 'CLOSED', end_at = now()
                    WHERE tenant_id = %s AND status = 'ACTIVE'
                    """,
                    (tenant_id,),
                )
                cursor.execute(
                    "UPDATE tenants SET active = FALSE WHERE id = %s",
                    (tenant_id,),
                )
                cursor.execute(
                    """
                    INSERT INTO audit_events(
                        tenant_id, action, entity_type, entity_id, details
                    )
                    VALUES (%s, 'TERMINATE_LEASE', 'LEASE', %s, %s)
                    """,
                    (
                        tenant_id,
                        tenant_code,
                        Jsonb({
                            "released_bay_count": bay_count,
                            "message": f"Chấm dứt hợp đồng thuê kho đối tác {tenant.get('name', tenant_code)}, thu hồi {bay_count} khoang kệ.",
                        }),
                    ),
                )
                connection.commit()
                return {
                    "tenant_code": tenant_code,
                    "released_bays": bay_count,
                    "message": f"Đã hủy hợp đồng thuê đối tác {tenant.get('name', tenant_code)} thành công. Đã giải phóng {bay_count} khoang kệ về trạng thái trống khả dụng.",
                }

