-- Warehouse Layout v2.0 - 24 racks (101-124), 1,697 bays, 30,546 nominal slots
-- Row 101: 45 bays; Rows 102-109: 49 bays each; Rows 110-124: 84 bays each.
INSERT INTO racks(code, physical_order, group_no)
SELECT r, r - 100, CASE WHEN r <= 109 THEN 1 ELSE 2 END
FROM generate_series(101, 124) AS r ON CONFLICT DO NOTHING;

-- Seed bays according to 3 groups:
-- 1) Rack 101: 45 bays
INSERT INTO bays(rack_code, bay_no)
SELECT 101, b FROM generate_series(1, 45) b ON CONFLICT DO NOTHING;

-- 2) Racks 102-109: 49 bays each
INSERT INTO bays(rack_code, bay_no)
SELECT r, b FROM generate_series(102, 109) r CROSS JOIN generate_series(1, 49) b ON CONFLICT DO NOTHING;

-- 3) Racks 110-124: 84 bays each
INSERT INTO bays(rack_code, bay_no)
SELECT r, b FROM generate_series(110, 124) r CROSS JOIN generate_series(1, 84) b ON CONFLICT DO NOTHING;

-- Seed slots (6 levels, 3 slots A, B, C per level): 1,697 bays * 6 levels * 3 slots = 30,546 slots
INSERT INTO rack_slots(bay_id, level_no, slot_code)
SELECT b.id, lv, s
FROM bays b
CROSS JOIN generate_series(1, 6) lv
CROSS JOIN (VALUES ('A'), ('B'), ('C')) v(s)
ON CONFLICT DO NOTHING;

-- Mark 69 special forklift passage bays at levels 1-3 as blocked:
-- Rack 101: bay 12
-- Racks 102-109: bay 12
-- Racks 110-124: bays 12, 26, 43, 60
UPDATE rack_slots rs
SET blocked = TRUE
FROM bays b
WHERE rs.bay_id = b.id
  AND rs.level_no IN (1, 2, 3)
  AND (
    (b.rack_code = 101 AND b.bay_no = 12)
    OR (b.rack_code BETWEEN 102 AND 109 AND b.bay_no = 12)
    OR (b.rack_code BETWEEN 110 AND 124 AND b.bay_no IN (12, 26, 43, 60))
  );

-- Expected totals: 24 racks, 1,697 bays, 30,546 total slots, 621 blocked slots (29,925 available structural slots).

