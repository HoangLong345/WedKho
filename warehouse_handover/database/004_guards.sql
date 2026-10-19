-- Guards for ownership checks. Application MUST additionally lock slot/level rows
-- and recompute load within a SERIALIZABLE or well-designed row-locking transaction.
BEGIN;
CREATE OR REPLACE FUNCTION guard_pallet_placement_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pallet_tenant BIGINT; assigned_tenant BIGINT;
BEGIN
 SELECT tenant_id INTO pallet_tenant FROM pallets WHERE id=NEW.pallet_id;
 SELECT l.tenant_id INTO assigned_tenant
 FROM bay_assignments ba JOIN leases l ON l.id=ba.lease_id
 WHERE ba.bay_id=NEW.bay_id AND ba.status='ACTIVE' AND l.status='ACTIVE'
 LIMIT 1;
 IF assigned_tenant IS NULL OR pallet_tenant IS DISTINCT FROM assigned_tenant THEN
   RAISE EXCEPTION 'Pallet tenant does not own target bay';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_pallet_placement_tenant ON pallet_placements;
CREATE TRIGGER trg_pallet_placement_tenant BEFORE INSERT OR UPDATE OF pallet_id,bay_id
ON pallet_placements FOR EACH ROW EXECUTE FUNCTION guard_pallet_placement_tenant();

CREATE OR REPLACE FUNCTION guard_slot_same_bay_level() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pb BIGINT; pl INT; sb BIGINT; sl INT;
BEGIN
 SELECT bay_id,level_no INTO pb,pl FROM pallet_placements WHERE id=NEW.placement_id;
 SELECT bay_id,level_no INTO sb,sl FROM rack_slots WHERE id=NEW.slot_id;
 IF pb IS DISTINCT FROM sb OR pl IS DISTINCT FROM sl THEN
   RAISE EXCEPTION 'Occupied slot does not match placement bay and level';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_slot_same_bay_level ON occupied_slots;
CREATE TRIGGER trg_slot_same_bay_level BEFORE INSERT OR UPDATE
ON occupied_slots FOR EACH ROW EXECUTE FUNCTION guard_slot_same_bay_level();
COMMIT;
