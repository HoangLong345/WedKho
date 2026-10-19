-- Optional next-stage operations. Schema proposal, not a claim these features are approved.
BEGIN;
CREATE TABLE IF NOT EXISTS outbound_orders (
 id BIGSERIAL PRIMARY KEY,
 tenant_id BIGINT NOT NULL REFERENCES tenants(id),
 reference_no TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PROPOSED','CONFIRMED','CANCELLED')),
 created_by BIGINT REFERENCES users_app(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), confirmed_at TIMESTAMPTZ,
 UNIQUE(tenant_id,reference_no)
);
CREATE TABLE IF NOT EXISTS outbound_lines (
 id BIGSERIAL PRIMARY KEY,
 outbound_order_id BIGINT NOT NULL REFERENCES outbound_orders(id),
 pallet_id BIGINT NOT NULL REFERENCES pallets(id),
 UNIQUE(outbound_order_id,pallet_id)
);
CREATE TABLE IF NOT EXISTS pallet_movements (
 id BIGSERIAL PRIMARY KEY,
 pallet_id BIGINT NOT NULL REFERENCES pallets(id),
 operation TEXT NOT NULL CHECK(operation IN ('INBOUND','MOVE','OUTBOUND','CORRECTION')),
 from_bay_id BIGINT REFERENCES bays(id),
 from_level INT CHECK(from_level BETWEEN 1 AND 6),
 from_slots TEXT,
 to_bay_id BIGINT REFERENCES bays(id),
 to_level INT CHECK(to_level BETWEEN 1 AND 6),
 to_slots TEXT,
 performed_by BIGINT REFERENCES users_app(id),
 reason TEXT,
 performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Each item is an event. Do not replace audit_events with this table.
CREATE INDEX IF NOT EXISTS ix_movement_pallet_time ON pallet_movements(pallet_id,performed_at DESC);
COMMIT;
