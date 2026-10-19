import os

def _load_env_defaults() -> None:
    env_paths = [
        os.path.join(os.path.dirname(__file__), "..", "..", "docker", ".env"),
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip()
                        if k and k not in os.environ:
                            os.environ[k] = v

_load_env_defaults()

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field, model_validator
import psycopg

from app.prototype.allocator import NoSafeSlot
from app.domain.service import InMemoryWarehouseService
from app.domain.pallet_calculator import (
    ItemCalculationError,
    ItemInput,
    calculate_pallets,
)
from app.domain.excel_import import ExcelImportError, parse_items, parse_excel_inbound
from app.infra.postgres import (
    DatabaseSettings,
    InboundNotFoundError,
    PostgresRepository,
    ProposalConflictError,
    ProposalNotFoundError,
    RepositoryConfigurationError,
    TenantNotFoundError,
)


class ItemInputModel(BaseModel):
    item_code: str = Field(min_length=1)
    item_name: str = Field(min_length=1)
    item_type: str = ""
    unit_of_measure: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    length_m: float = Field(gt=0)
    width_m: float = Field(gt=0)
    height_m: float = Field(gt=0)
    gross_weight_kg: float = Field(gt=0)
    dimension_unit: str = Field(pattern="^(m|cm|mm)$")

    @model_validator(mode="after")
    def validate_converted_height(self) -> "ItemInputModel":
        factor = {"m": 1.0, "cm": 0.01, "mm": 0.001}.get(self.dimension_unit.lower(), 1.0)
        h_m = self.height_m * factor
        normalized = (
            f"{self.item_type} {self.unit_of_measure} {self.item_name}"
        ).strip().lower()
        is_floor = any(
            kw in normalized
            for kw in (
                "gỗ thô",
                "go tho",
                "gỗ súc",
                "go suc",
                "timber",
                "raw wood",
                "ngoại cỡ",
                "ngoai co",
                "oversize",
                "oversized",
                "khung gỗ",
                "khung go",
                "mặt sàn",
                "mat san",
            )
        )
        if not is_floor and h_m > 1.65:
            raise ValueError(
                f"Mã hàng '{self.item_code}': Chiều cao kiện hàng ({h_m:.3f} m) vượt quá giới hạn tối đa của khoang kệ (1.65 m)"
            )
        return self


class InboundInput(BaseModel):
    tenant_id: str = Field(min_length=1)
    items: list[ItemInputModel] = Field(min_length=1)
    exclude_oversized: bool = False


class LeasePreviewInput(BaseModel):
    tenant_code: str = Field(min_length=1)
    tenant_name: str = Field(default="")
    area_m2: float = Field(gt=0)


class LeaseConfirmInput(BaseModel):
    tenant_code: str = Field(min_length=1)
    tenant_name: str = Field(default="")
    area_m2: float = Field(gt=0)
    bays: list[dict[str, int]] | None = None


class PreviewInput(BaseModel):
    allow_partial: bool = False


class ConfirmInput(BaseModel):
    proposal_id: str = Field(min_length=1)


class OutboundProcessInput(BaseModel):
    tenant_code: str = Field(min_length=1)


class LeaseTerminateInput(BaseModel):
    tenant_code: str = Field(min_length=1)


service = InMemoryWarehouseService()
app = FastAPI(title="Warehouse Allocation API", version="0.1.0")


def use_postgres() -> bool:
    val = os.getenv("WAREHOUSE_USE_POSTGRES", "").strip().lower()
    return val in ("1", "true", "yes")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def database_health() -> dict[str, str | int]:
    try:
        geometry = PostgresRepository(DatabaseSettings.from_environment()).check_geometry()
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "ok", **geometry}


@app.get("/api/v1/tenants")
def list_tenants() -> list[dict[str, str]]:
    if not use_postgres():
        return service.list_tenants()
    try:
        with psycopg.connect(
            **PostgresRepository().settings.connection_kwargs()
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT code, name FROM tenants WHERE active ORDER BY name, code"
                )
                return [
                    {"code": row["code"], "name": row["name"]}
                    for row in cursor.fetchall()
                ]
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/v1/leases")
def list_leases() -> list[dict]:
    try:
        return (
            PostgresRepository().list_leases()
            if use_postgres()
            else service.list_leases()
        )
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/v1/leases/preview")
def preview_lease(payload: LeasePreviewInput) -> dict:
    try:
        if use_postgres():
            return PostgresRepository().preview_lease(
                payload.tenant_code.strip(),
                payload.tenant_name.strip(),
                payload.area_m2,
            )
        return service.preview_lease(
            payload.tenant_code.strip(),
            payload.tenant_name.strip(),
            payload.area_m2,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/v1/leases/confirm", status_code=201)
def confirm_lease(payload: LeaseConfirmInput) -> dict:
    try:
        bays_input = (
            [(b["rack"], b["bay"]) for b in payload.bays]
            if payload.bays is not None
            else None
        )
        if use_postgres():
            return PostgresRepository().confirm_lease(
                payload.tenant_code.strip(),
                payload.tenant_name.strip(),
                payload.area_m2,
                payload.bays,
            )
        return service.confirm_lease(
            payload.tenant_code.strip(),
            payload.tenant_name.strip(),
            payload.area_m2,
            bays_input,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/v1/outbounds/inventory")
def get_tenant_inventory(tenant_code: str = Query(..., min_length=1)) -> dict:
    try:
        items = (
            PostgresRepository().get_tenant_inventory(tenant_code.strip())
            if use_postgres()
            else service.get_tenant_inventory(tenant_code.strip())
        )
        return {"tenant_code": tenant_code, "items": items, "count": len(items)}
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/v1/outbounds/process")
def process_outbound(payload: OutboundProcessInput) -> dict:
    try:
        return (
            PostgresRepository().process_outbound(payload.tenant_code.strip())
            if use_postgres()
            else service.process_outbound(payload.tenant_code.strip())
        )
    except TenantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/v1/leases/terminate")
def terminate_lease(payload: LeaseTerminateInput) -> dict:
    try:
        return (
            PostgresRepository().terminate_lease(payload.tenant_code.strip())
            if use_postgres()
            else service.terminate_lease(payload.tenant_code.strip())
        )
    except TenantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/v1/audit-events")
def list_audit_events(
    tenant_id: str | None = Query(None, min_length=1),
    action: str | None = Query(None, min_length=1, max_length=80),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, object]:
    try:
        events = (
            PostgresRepository().list_audit_events(tenant_id, action, limit)
            if use_postgres()
            else service.list_audit_events(tenant_id, action, limit)
        )
    except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"events": events, "count": len(events)}


@app.get("/api/v1/warehouse/slots")
def warehouse_slots(
    rack_code: int = Query(110, ge=101, le=124),
    level_no: int | None = Query(None, ge=1, le=6),
    tenant_id: str | None = Query(None, min_length=1),
) -> dict:
    if use_postgres():
        try:
            return PostgresRepository().list_slots(rack_code, level_no, tenant_id)
        except (RepositoryConfigurationError, psycopg.Error, OSError) as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    from app.prototype.integration import get_bay_count_for_rack, is_forklift_passage

    slots = []
    assigned_bays = {
        (rack, bay): tenant
        for (rack, bay), tenant in service.warehouse.leases.items()
        if rack == rack_code
    }
    bay_count = get_bay_count_for_rack(rack_code)
    for bay in range(1, bay_count + 1):
        tenant = assigned_bays.get((rack_code, bay))
        if tenant_id and tenant != tenant_id:
            tenant = None
        bay_state = "ASSIGNED" if tenant else "AVAILABLE"
        for level in range(1, 7):
            if level_no is not None and level != level_no:
                continue
            is_blocked = is_forklift_passage(rack_code, bay, level)
            for slot_code in ("A", "B", "C"):
                key = (rack_code, bay, level, slot_code)
                pallet_code = service.warehouse.placements.get(key)
                reservation = service.warehouse.reservations.get(key)
                status = (
                    "BLOCKED"
                    if is_blocked
                    else "OCCUPIED"
                    if pallet_code
                    else "RESERVED"
                    if reservation
                    else bay_state
                )
                pallet_meta = (
                    service.pallet_metadata.get(pallet_code, {})
                    if pallet_code
                    else {}
                )
                slots.append(
                    {
                        "rack": rack_code,
                        "bay": bay,
                        "level": level,
                        "slot": slot_code,
                        "status": status,
                        "tenant_id": tenant,
                        "pallet_code": pallet_code,
                        "sku": pallet_meta.get("sku"),
                        "sku_name": pallet_meta.get("sku_name"),
                        "is_forklift_passage": is_blocked,
                    }
                )
    return {"rack": rack_code, "level": level_no, "slots": slots}


@app.post("/api/v1/inbounds/import")
async def import_inbound(file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=422, detail="Chỉ hỗ trợ file Excel .xlsx")
    content = await file.read()
    try:
        parsed = parse_excel_inbound(content)
        items = parsed["items"]
        detected_tenant_code = parsed.get("detected_tenant_code")
        detected_tenant_name = parsed.get("detected_tenant_name")
        oversized_items = parsed.get("oversized_items", [])
    except ExcelImportError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    plans = []
    errors: list[str] = []
    try:
        plans = calculate_pallets("", items)
    except ItemCalculationError:
        for item in items:
            try:
                item_plans = calculate_pallets("", [item])
                plans.extend(item_plans)
            except ItemCalculationError as item_exc:
                err_text = str(item_exc)
                if "oversized" in err_text or "lọt lòng khoang kệ" in err_text:
                    err_text = f"Mã kiện '{item.item_code}' ({item.item_name}): Hàng quá khổ vượt kích thước lọt lòng khoang kệ (tối đa 3.8m x 1.8m hoặc quá 4500kg). Bắt buộc chuyển sang khu sàn ngoài (Khu vực OOG)."
                elif "height exceeds" in err_text:
                    err_text = f"Mã kiện '{item.item_code}' ({item.item_name}): Chiều cao vượt quá giới hạn khoang kệ 1.65m."
                if err_text not in errors:
                    errors.append(err_text)

    return {
        "filename": file.filename,
        "item_count": len(items),
        "pallet_count": len(plans),
        "items": [item.__dict__ for item in items],
        "pallet_plans": [_plan_response(plan) for plan in plans],
        "errors": errors,
        "detected_tenant_code": detected_tenant_code,
        "detected_tenant_name": detected_tenant_name,
        "oversized_items": oversized_items,
    }


def _plan_response(plan) -> dict[str, int | float | str | bool]:
    return {
        "item_code": plan.item_code,
        "pallet_code": plan.pallet.pallet_code,
        "cases": plan.cases,
        "cases_per_layer": plan.cases_per_layer,
        "layers": plan.layers,
        "kind": plan.pallet.kind,
        "required_level": plan.required_level,
        "weight_kg": plan.pallet.weight_kg,
        "footprint_x_m": plan.footprint_x_m,
        "footprint_y_m": plan.footprint_y_m,
        "safety_review_required": plan.safety_review_required,
        "note": getattr(plan, "note", ""),
        "case_length_m": getattr(plan, "case_length_m", 0.0),
        "case_width_m": getattr(plan, "case_width_m", 0.0),
        "case_height_m": getattr(plan, "case_height_m", 0.0),
        "pallet_length_m": getattr(plan, "pallet_length_m", 1.2),
        "pallet_width_m": getattr(plan, "pallet_width_m", 1.8),
    }


@app.post("/api/v1/inbounds/manual", status_code=201)
def create_inbound(payload: InboundInput) -> dict:
    item_inputs = [ItemInput(**item.model_dump()) for item in payload.items]
    excluded_items = []
    if payload.exclude_oversized:
        valid_inputs = []
        for it in item_inputs:
            u_factor = {"m": 1.0, "cm": 0.01, "mm": 0.001}.get(it.dimension_unit.lower(), 1.0)
            max_d = max(it.length_m, it.width_m) * u_factor
            if max_d > 3.8 or it.gross_weight_kg > 4500:
                excluded_items.append(it)
            else:
                valid_inputs.append(it)
        if not valid_inputs:
            raise HTTPException(status_code=422, detail="Tất cả các kiện hàng đều vượt quá kích thước khoang kệ 3.8m!")
        item_inputs = valid_inputs

    try:
        plans = calculate_pallets(payload.tenant_id, item_inputs)
    except ItemCalculationError as exc:
        msg = str(exc)
        if "oversized" in msg or "lọt lòng khoang kệ" in msg:
            code = msg.split(":")[0] if ":" in msg else "Hàng quá khổ"
            msg = f"Mã kiện '{code}': Kích thước kiện vượt quá kích thước lọt lòng khoang kệ (tối đa 3.8m x 1.8m hoặc quá 4500kg). Đây là hàng quá khổ OOG, bắt buộc chuyển sang khu sàn ngoài (Khu vực OOG)."
        elif "height exceeds" in msg:
            code = msg.split(":")[0] if ":" in msg else "Quá chiều cao"
            msg = f"Mã kiện '{code}': Chiều cao kiện hàng vượt quá giới hạn tầng kệ (1.65m)."
        raise HTTPException(status_code=422, detail=msg) from exc
    if use_postgres():
        try:
            item_by_code = {item.item_code: item for item in payload.items}
            inbound_id = PostgresRepository().create_manual_inbound(
                payload.tenant_id,
                [
                    {
                        "pallet_code": plan.pallet.pallet_code,
                        "sku": plan.item_code,
                        "kind": plan.pallet.kind,
                        "weight_kg": plan.pallet.weight_kg,
                        "cargo_height_m": plan.pallet.cargo_height_m,
                        "overhang": plan.pallet.overhang,
                        "case_count": plan.cases,
                        "item_name": item_by_code[plan.item_code].item_name,
                        "item_type": item_by_code[plan.item_code].item_type,
                        "unit_of_measure": item_by_code[
                            plan.item_code
                        ].unit_of_measure,
                        "length_m": item_by_code[plan.item_code].length_m
                        * {"m": 1, "cm": 0.01, "mm": 0.001}[
                            item_by_code[plan.item_code].dimension_unit
                        ],
                        "width_m": item_by_code[plan.item_code].width_m
                        * {"m": 1, "cm": 0.01, "mm": 0.001}[
                            item_by_code[plan.item_code].dimension_unit
                        ],
                        "gross_weight_kg": item_by_code[
                            plan.item_code
                        ].gross_weight_kg,
                    }
                    for plan in plans
                ],
            )
        except RepositoryConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except psycopg.errors.ForeignKeyViolation as exc:
            raise HTTPException(status_code=409, detail="Inbound data conflicts with existing data") from exc
        except psycopg.errors.UniqueViolation as exc:
            raise HTTPException(status_code=409, detail="Pallet code already exists") from exc
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        return {
            "inbound_id": inbound_id,
            "status": "DRAFT",
            "pallet_count": len(plans),
            "pallet_plans": [_plan_response(plan) for plan in plans],
        }

    pallets = [plan.pallet for plan in plans]
    inbound = service.create_inbound(payload.tenant_id, pallets)
    return {
        "inbound_id": inbound.inbound_id,
        "status": "DRAFT",
        "pallet_count": len(plans),
        "pallet_plans": [_plan_response(plan) for plan in plans],
    }


@app.post("/api/v1/inbounds/{inbound_id}/location-preview")
def preview_locations(inbound_id: int, payload: PreviewInput) -> dict:
    if use_postgres():
        try:
            return PostgresRepository().preview_locations(
                inbound_id, payload.allow_partial
            )
        except InboundNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except (RepositoryConfigurationError, psycopg.Error, ValueError, NoSafeSlot) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        return service.preview_locations(inbound_id, payload.allow_partial)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (ValueError, NoSafeSlot) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/inbounds/{inbound_id}/confirm")
def confirm_locations(inbound_id: int, payload: ConfirmInput) -> dict:
    if use_postgres():
        try:
            return PostgresRepository().confirm_locations(inbound_id, payload.proposal_id)
        except ProposalNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except InboundNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except (ProposalConflictError, psycopg.IntegrityError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
    raise HTTPException(
        status_code=501,
        detail="PostgreSQL confirmation is not enabled",
    )
