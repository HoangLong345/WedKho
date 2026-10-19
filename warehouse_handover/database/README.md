# PostgreSQL baseline
Run 001_schema.sql, 002_seed_geometry.sql, 003_operations.sql, 004_guards.sql,
then 005_reservations.sql in that order.

Tất cả kích thước tính theo mét, khối lượng hàng tính theo kg.  
Mặt bằng kho v2.0 gồm 24 dãy (101–124), 1.697 ô (dãy 101: 45 ô; 102–109: 49 ô/dãy; 110–124: 84 ô/dãy), 30.546 slot danh nghĩa (tối đa 29.925 slot cấu trúc lưu trữ sau khi loại trừ tầng 1–3 của 69 ô đặc biệt làm lối xe nâng).

Important limits & V2.0 updates:
- Số dãy và phân nhóm ô: Dãy 101 (45 ô), Dãy 102–109 (49 ô), Dãy 110–124 (84 ô). Đánh số từ PHẢI sang TRÁI toàn kho (01 ở mép phải).
- 69 ô đặc biệt chừa lối xe nâng ở tầng 1–3: Dãy 101: ô 12; Dãy 102–109: ô 12 mỗi dãy; Dãy 110–124: ô 12, 26, 43, 60 mỗi dãy. Các ô này chỉ bố trí lưu trữ pallet tại tầng 4–6.
- Thứ tự slot vật lý từ trái sang phải: Dãy lẻ là A-B-C; Dãy chẵn là C-B-A.
- Lối đi ngang: Dãy 110–124 có 2 lối đi ngang rộng 4m giữa ô 72:73 và 77:78 (không phải ô lưu trữ).
- The active assignment unique partial index prevents *simultaneous ACTIVE* allocations of the same bay.
- Unique occupied_slots(slot_id) prevents concurrent confirmed double occupancy as long as released placements free their occupied_slots in the same transaction.
- 005_reservations.sql adds temporary slot reservations for inbound proposals.
- guard_pallet_placement_tenant enforces that a pallet's tenant owns the chosen bay when a placement row is inserted; slot-to-placement guard checks same bay+level.
- Checking pallet type slot sets (A/B/C vs AB/BC/ABC), level totals (700/1400/2100 kg), inventory reservation and 3D geometry safety REQUIRES domain-level validation in the backend inside the same transaction.
- Database seeding initializes geometry, not rental contracts or pallet occupancy.

Validation:

```bash
docker compose -f docker/compose.yaml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -f /dev/stdin < database/validate_reservations.sql
```

