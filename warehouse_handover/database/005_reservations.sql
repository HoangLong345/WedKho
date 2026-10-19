-- Temporary slot reservations for inbound location proposals.
-- Run after 004_guards.sql. Existing init scripts are intentionally unchanged.
BEGIN;

CREATE TABLE IF NOT EXISTS slot_reservations (
 id BIGSERIAL PRIMARY KEY,
 proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
 inbound_order_id BIGINT NOT NULL REFERENCES inbound_orders(id) ON DELETE CASCADE,
 slot_id BIGINT NOT NULL REFERENCES rack_slots(id),
 status TEXT NOT NULL DEFAULT 'ACTIVE'
   CHECK(status IN ('ACTIVE','CONFIRMED','EXPIRED','CANCELLED','RELEASED')),
 reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL,
 released_at TIMESTAMPTZ,
 CHECK(expires_at > reserved_at),
 CHECK(
   (status = 'ACTIVE' AND released_at IS NULL)
   OR status <> 'ACTIVE'
 ),
 UNIQUE(proposal_id,slot_id)
);

-- A slot can have only one active reservation. Expired reservations must be
-- transitioned out of ACTIVE before a new proposal can reserve the slot.
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_slot_reservation
 ON slot_reservations(slot_id)
 WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS ix_slot_reservation_expiry
 ON slot_reservations(status,expires_at);

CREATE INDEX IF NOT EXISTS ix_slot_reservation_order
 ON slot_reservations(inbound_order_id,status);

COMMIT;
