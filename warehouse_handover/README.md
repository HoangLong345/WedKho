# BỘ BÀN GIAO PHÂN TÍCH & THIẾT KẾ – WAREHOUSE v2.0

Căn cứ tài liệu **Master Document v2.0 (13/10/2026)** cùng sơ đồ kho thực tế **sodokho.docx** (`sodokho(1).docx`) do khách hàng cung cấp: 24 dãy (101–124), 1.697 ô mặt bằng (dãy 101: 45 ô; 102–109: 49 ô; 110–124: 84 ô), 30.546 slot danh nghĩa (29.925 slot cấu trúc khả dụng sau khi khóa tầng 1–3 của 69 ô đặc biệt làm lối xe nâng), đánh số ô từ PHẢI sang TRÁI, 2 lối đi ngang rộng 4 m giữa ô 72:73 và 77:78, slot nhìn mặt tiền lẻ A→B→C / chẵn C→B→A, khoảng trống sạc xe nâng trung tâm.

## Tài liệu
- `docs/Master_Document_v2.0.md` / `docs/Master_Document_v2.0.docx` — nguồn yêu cầu nghiệp vụ hiện hành tối cao.
- `docs/sodokho.docx` — sơ đồ mặt bằng thực tế do khách hàng cung cấp (kèm hình phác thảo mặt bằng).
- `docs/01_SRS.md` — SRS và tiêu chí nghiệm thu cập nhật v2.0.
- `docs/02_USE_CASE.md` — use case và luồng lỗi cập nhật v2.0.
- `docs/03_WORKFLOWS.md` — workflow chức năng và điểm transaction cập nhật v2.0.
- `docs/04_KE_HOACH_CODE.md` — kiến trúc, API dự kiến, lộ trình và kiểm thử cập nhật v2.0.

## ERD / database / Docker
- `database/erd.mmd` — Mermaid ERD.
- `database/ERD_warehouse.png` — sơ đồ tham khảo.
- `database/001_schema.sql` — bảng chính, khóa, ràng buộc.
- `database/002_seed_geometry.sql` — seed cấu trúc mặt bằng.
- `database/003_operations.sql` — cấu trúc dự phòng cho xuất kho/di chuyển [chưa duyệt nghiệp vụ].
- `database/004_guards.sql` — trigger kiểm tra quyền sở hữu ô và trùng bay/tầng khi chiếm slot.
- `database/005_reservations.sql` — giữ chỗ tạm slot cho đề xuất nhập kho, chống hai phiếu giữ cùng slot.
- `database/006_item_metadata.sql` — bổ sung đơn vị tính của mặt hàng trong dữ liệu SKU.
- `backend/` — FastAPI backend chuẩn cho thuê kho, nhập hàng, tính toán pallet 3D, đề xuất vị trí, sơ đồ 2D và xuất kho.
- `frontend/` — Ứng dụng web React + TypeScript chuẩn hóa theo Module/Feature architecture: Cấp diện tích thuê kho, Nhập hàng & Xếp Pallet 3D, Sơ đồ mặt bằng 2D, Nhật ký vận hành, Xuất kho.
- `docker/compose.yaml` / `.env.example` / `README.md` — PostgreSQL 16 chạy Docker và Adminer.
- `workflows/diagram.mmd` — luồng tổng quan kiểu Mermaid v2.0.

## Lệnh nhanh
```bash
cd docker
cp .env.example .env
# Sửa POSTGRES_PASSWORD trong .env trước khi chạy
docker compose up -d
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM rack_slots;"'
```

## Đọc trước khi triển khai
1. Bộ này là **tài liệu phân tích thiết kế và hồ sơ kỹ thuật**, đồng bộ 100% theo Master Document v2.0 và sơ đồ kho mới.
2. Mặt bằng mới có 69 ô đặc biệt chừa thông tầng 1–3 làm lối đi xe nâng: Dãy 101 ô 12; Dãy 102–109 ô 12 mỗi dãy; Dãy 110–124 ô 12, 26, 43, 60 mỗi dãy. Các tầng này không được gán slot lưu hàng.
3. Hướng đánh số ô từ PHẢI sang TRÁI: Khi duyệt vật lý từ TRÁI sang PHẢI, mã ô GIẢM DẦN (ví dụ 84→01).
4. Thứ tự slot nhìn mặt tiền từ trái sang phải: Dãy lẻ là A-B-C, dãy chẵn là C-B-A. Pallet đôi chỉ chiếm AB hoặc BC liền kề.
5. Hai lối đi ngang rộng 4 m giữa cặp ô 72:73 và 77:78 ở dãy 110–124 là khoảng không, không phải ô tồn kho.


## Chạy backend FastAPI

```powershell
cd backend
python -m pip install -r requirements.txt
$env:PYTHONPATH = "$PWD;$PWD\..\"
python -m uvicorn app.main:app --reload
```

API hiện có:

- `GET /health`
- `GET /api/v1/tenants`
- `GET /api/v1/warehouse/slots?rack_code=110&level_no=1` — đọc trạng thái slot theo dãy/tầng cho sơ đồ kho 2D
- `POST /api/v1/inbounds/manual`
- `POST /api/v1/inbounds/import` — đọc và kiểm tra Excel `.xlsx`, trả preview mặt hàng và pallet plan
- `POST /api/v1/inbounds/{id}/location-preview`
- `POST /api/v1/inbounds/{id}/confirm` với body `{"proposal_id":"<uuid>"}`
- `GET /api/v1/audit-events?tenant_id=<code>&action=<action>&limit=100` — xem
  lịch sử tạo phiếu, xem đề xuất và xác nhận lưu kho; frontend hiển thị ở mục
  **Nhật ký thao tác kho**.

Backend hiện đã có repository PostgreSQL cho health, ghi inbound thủ công và
preview vị trí có reservation và transaction xác nhận placement. Có thể bật
luồng PostgreSQL bằng:

```powershell
$env:WAREHOUSE_USE_POSTGRES = "1"
$env:POSTGRES_PASSWORD = "<local-secret>"
```

Khi bật cờ này, tenant phải tồn tại và đang active trong database; preview yêu
cầu tenant có lease `ACTIVE` và bay assignment `ACTIVE`. Preview tạo proposal và
reservation tạm thời trong PostgreSQL với thời hạn 10 phút. Endpoint confirm
khóa proposal, inbound, pallet và slot theo cùng transaction; kiểm tra lại
reservation, ghi `pallet_placements`/`occupied_slots`, cập nhật pallet thành
`STORED`, inbound thành `CONFIRMED` hoặc `PARTIAL`, kết thúc reservation và ghi
audit event. Nếu có conflict, toàn bộ transaction rollback.

## Chạy frontend

```powershell
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite proxy các đường dẫn `/api` và `/health` tới
FastAPI tại `http://127.0.0.1:8000`. Giao diện hỗ trợ danh sách nhiều mặt hàng
trong một inbound, gồm tạo inbound, preview proposal và confirm placement; đây
là nền tảng để mở rộng thành sơ đồ kho 2D ở bước tiếp theo.
