# KẾ HOẠCH TRIỂN KHAI CODE
**Bản:** 2.0 | Căn cứ Master Document v2.0 (13/10/2026) và sơ đồ kho thực tế `sodokho.docx`.  
Đề xuất stack: React + TypeScript + Three.js, FastAPI + Python, PostgreSQL 16 + Docker Compose, SQLAlchemy/Alembic, Pytest.

## 1. Kiến trúc
- **Frontend:** React/TypeScript, form Excel và nhập thủ công, dashboard, bảng phân khu, ma trận vị trí 2D và mô phỏng kho 3D với Three.js (24 dãy 101–124, 1.697 ô, khoảng trống sạc xe nâng, 2 lối đi ngang).
- **Backend:** FastAPI REST; lớp Domain cho thuật toán tính pallet, cấp ô (mã ô giảm dần), phân bổ vị trí an toàn (khóa tầng 1–3 ô đặc biệt); tách Repository/Transaction cho ghi database.
- **Database:** PostgreSQL 16 (Docker) làm nguồn dữ liệu chính; quản lý cấu trúc 24 dãy, 1.697 ô, 30.546 slot danh nghĩa (29.925 slot cấu trúc).
- **Xử lý Excel:** openpyxl hoặc pandas; chuẩn hóa kích thước/khối lượng; kiểm tra hợp lệ từng dòng.
- **Quy tắc bất biến:** Client không tự quyết định ô được cấp hay slot đặt pallet; API server revalidate toàn bộ trong transaction an toàn.

## 2. Lộ trình và sản phẩm bàn giao (v2.0)
| Giai đoạn | Mục tiêu | Hạng mục code | Kết quả nghiệm thu |
|---|---|---|---|
| P0 | Khởi tạo mặt bằng v2.0 | Git, Docker PG, migration, seed cấu trúc 24 dãy (101–124), 1.697 ô, 6 tầng, 3 slot | DB chạy, seed đúng 1.697 ô, 30.546 slot danh nghĩa; đánh dấu 69 ô đặc biệt chừa lối xe nâng tầng 1–3 |
| P1 | Danh mục kho | Tenants, SKU và dữ liệu danh mục cần cho vận hành | Tạo và tra cứu đúng mã khách/SKU |
| P2 | Phân khu khách thuê | Lease, tính 70%, propose từ trái sang phải (mã ô giảm dần), confirm transaction | 500 m² → 63 ô (vd dãy 110: ô 84→22), không cấp trùng |
| P3 | Nhập Excel/thủ công | Parser/validate, phiếu nhập, SKU | Báo lỗi dòng rõ; không ghi sai đơn vị |
| P4 | Thuật toán pallet | Đơn, đơn nhô (≤1,4m), đôi (≤2,6m), gỗ thô (sàn), quá khổ; thử 0°/90° và TRỘN 2 hướng trong 1 lớp; kiểm tra tải | Test các ví dụ Master v2.0 và dữ liệu thật; chặn bố trí chồng lấn |
| P5 | Vị trí pallet | Lọc an toàn, khóa tầng 1–3 ô đặc biệt, propose theo tầng→dãy 101-124→mã ô giảm→slot chẵn/lẻ, confirm tx | Không trùng, không vượt tải, đúng vùng thuê |
| P6 | Frontend 2D | Dashboard, khách thuê, nhập liệu, sơ đồ ma trận 2D hỗ trợ 24 dãy với số ô 45/49/84 | Toàn bộ luồng xác nhận chạy đầu-cuối |
| P7 | Mô phỏng 3D | Dựng toàn kho 24 dãy, thể hiện khoảng trống sạc xe nâng, 2 lối ngang và các mốc gióng; instancing/LOD | Vị trí trùng khớp DB, mượt mà khi xem |
| P8 | QA và nghiệm thu | Test cạnh tranh, bảo mật, import file thật, backup/restore | Báo cáo test và bàn giao hướng dẫn |

## 3. API đề xuất
| Phương thức | Đường dẫn | Mục đích |
|---|---|---|
| POST | /api/v1/tenants | Tạo khách thuê |
| POST | /api/v1/leases/preview | Tính và đề xuất ô theo diện tích (mã ô giảm dần) |
| POST | /api/v1/leases/{id}/confirm | Xác nhận cấp khu, giao dịch nguyên tử |
| GET | /api/v1/warehouse/racks | Danh sách 24 dãy (101–124) và thống kê |
| GET | /api/v1/warehouse/racks/{rack}/bays | Đọc danh sách ô theo dãy (45/49/84 ô), tầng/slot và tình trạng |
| POST | /api/v1/inbounds/import | Đọc, kiểm tra Excel, trả preview |
| POST | /api/v1/inbounds/manual | Nhập nhiều dòng SKU thủ công |
| POST | /api/v1/inbounds/{id}/pallet-plan | Tính kế hoạch pallet |
| POST | /api/v1/inbounds/{id}/location-preview | Đề xuất vị trí hợp lệ (khóa tầng 1–3 ô đặc biệt) |
| POST | /api/v1/inbounds/{id}/confirm | Lưu kho nguyên tử, ghi lịch sử |
| GET | /api/v1/pallets/{id} | Chi tiết pallet |
| GET | /api/v1/audit-events | Xem nhật ký theo tenant/action |

## 4. Cấu trúc repo
```text
warehouse/
  backend/app/api/       # endpoints
  backend/app/domain/    # packing, leasing, placement
  backend/app/models/    # ORM
  backend/app/services/  # application and tx management
  backend/alembic/       # migrations
  backend/tests/         # unit/integration/concurrency
  frontend/src/pages/    # Dashboard/Tenants/Inbound/Warehouse
  frontend/src/three/    # instanced 3D warehouse viewer (24 racks)
  docker/compose.yaml
  docs/                  # SRS / Use Case / Workflows / Kế hoạch code / Master Document v2.0
```

## 5. Definition of Done cho một chức năng
- Quy tắc được dẫn từ BR/FR Master Document v2.0.
- Có validate input, kiểm tra nhất quán ở backend, migration, tests cả thành công và lỗi.
- Ghi DB ở transaction; từ chối xung đột và rollback.
- Có endpoint OpenAPI, giao diện thông báo rõ, logging/audit nếu thay dữ liệu.
- Với chức năng xếp kệ: đối chiếu dữ liệu thật và người phụ trách an toàn xác nhận trước vận hành.

## 6. Kiểm thử bắt buộc theo Master Document v2.0
| Mã test | Tình huống kiểm thử | Kết quả bắt buộc |
|---|---|---|
| TC-MB-01 | Khởi tạo mặt bằng kho | Đủ 24 dãy (101–124), 1.697 ô (101: 45 ô; 102–109: 49 ô; 110–124: 84 ô), 30.546 slot danh nghĩa |
| TC-MB-02 | Hướng đánh số ô tại dãy 110 | Ô 84 ở ngoài cùng bên trái, ô 01 ở ngoài cùng bên phải; duyệt vật lý trái→phải là mã ô giảm dần |
| TC-MB-03 | Thứ tự slot chẵn / lẻ | Dãy 110 (chẵn) từ trái qua phải là C, B, A; Dãy 111 (lẻ) từ trái qua phải là A, B, C |
| TC-MB-04 | Dãy 101, ô 12, tầng 2 và 5 | Tầng 2 bị khóa làm lối xe nâng (không có slot lưu hàng); tầng 5 có thể lưu hàng nếu đủ điều kiện |
| TC-MB-05 | Dãy 110, ô 26, tầng 1 và 6 | Tầng 1 không được đặt pallet (lối xe nâng); tầng 6 vẫn bố trí vị trí lưu trữ bình thường |
| TC-MB-06 | Lối đi giữa ô 72:73 và 77:78 (110–124) | Là 2 khoảng trống 4 m giữa ô; không tạo ô hoặc slot ảo; số ô dãy vẫn là 84 |
| TC-MB-07 | 500 m² tại dãy 110 còn trống | Đề xuất 63 ô từ trái sang phải = mã ô 84→22, không cấp trùng khách khác |
| TC-MB-08 | Dựng mô hình 2D / 3D | Giữ khoảng trống sạc xe nâng trung tâm và các mốc thẳng hàng; không sinh kệ tại khoảng trống |
| TC-MB-09 | Phân bổ đồng thời cùng slot | Một giao dịch thành công, giao dịch kia rollback báo xung đột |
| TC-MB-10 | Pallet đơn nhô ngang (1,2 < X′ ≤ 1,4 m) | Tối đa 1 pallet nhô/tầng/ô; hiển thị cảnh báo an toàn |
| TC-MB-11 | Quá khổ (OOG) | Chuyển luồng lưu mặt sàn riêng, không cấp slot kệ |

## 7. Rủi ro và điểm dừng bắt buộc
- **An toàn kết cấu:** Beam, độ võng, lối xe nâng, PCCC phải do đơn vị kỹ thuật/an toàn kho kiểm định thực địa.
- **Nghiệp vụ:** Xuất kho, di dời, thu hồi quyền thuê và lưu sàn quá khổ cần phê duyệt quy trình chi tiết.
- **Tọa độ vật lý:** Khoảng cách mét chính xác giữa các dãy cần đối chiếu bản vẽ CAD/hiện trạng khi triển khai 3D chi tiết.

