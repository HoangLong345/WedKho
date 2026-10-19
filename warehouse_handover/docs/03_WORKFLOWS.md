# WORKFLOW – LUỒNG XỬ LÝ TỪNG CHỨC NĂNG
**Phiên bản:** 2.0 | Căn cứ Master Document v2.0 (13/10/2026) và sơ đồ kho thực tế `sodokho.docx`. Đánh dấu rõ điểm người dùng xác nhận và điểm thao tác DB transaction.

## WF-01. Khởi tạo kho (Mặt bằng v2.0)
Quản trị khởi tạo 24 dãy (101–124) với 1.697 ô mặt bằng theo 3 nhóm cấu trúc:
- Dãy 101: 45 ô (ô 01–45). Hàng lẻ, cách tường 0,5 m, bắt đầu từ gốc dưới đi lên.
- Dãy 102–109 (8 dãy): 49 ô mỗi dãy (ô 01–49).
- Dãy 110–124 (15 dãy): 84 ô mỗi dãy (ô 01–84).
- Quy ước đánh số ô: Từ PHẢI sang TRÁI cho toàn bộ kho (ô 01 ở mép phải, ô số lớn ở mép trái).
- Tầng kệ: 6 tầng (1–6 từ dưới lên trên). Tầng 1 là sàn, tầng 2–6 là kệ beam.
- Slot vị trí: 3 slot mỗi tầng. Mặt tiền từ trái sang phải: Dãy LẺ là A→B→C; Dãy CHẴN là C→B→A.
- Ô đặc biệt chừa thông tầng 1–3 làm lối xe nâng (chỉ lưu hàng ở tầng 4–6): Dãy 101: ô 12; Dãy 102–109: ô 12 mỗi dãy; Dãy 110–124: ô 12, 26, 43, 60 mỗi dãy (tổng 69 ô đặc biệt = 621 slot bị khóa).
- Lối đi ngang: Dãy 110–124 có 2 lối đi ngang rộng 4 m ở giữa ô 72:73 và giữa ô 77:78 (không tạo ô ảo).
- Khoảng trống trung tâm: Phía dưới giữa dãy 101–109 là khoảng trống lớn (khu sạc xe nâng), không đặt kệ.

## WF-02. Cấp phân khu cho khách thuê (v2.0)
1. Quản trị nhập khách, diện tích thuê và thời hạn.
2. Hệ thống tính `N = ceil(area_m2 * 0.70 / 5.6)`.
3. Duyệt các ô đang AVAILABLE, không có ACTIVE lease, không có hàng, không khóa và không bị đặt trước.
4. Ưu tiên một đoạn liền đủ N ô theo hướng từ TRÁI sang PHẢI (tương đương mã ô GIẢM DẦN, ví dụ 84→22 tại dãy 110 khi cần 63 ô) theo thứ tự dãy 101→124. Nếu không có đoạn đủ dài, chọn nhiều đoạn theo thứ tự duyệt, ưu tiên ít phân mảnh và không nhảy qua ô đã cấp.
5. Hiển thị sơ đồ, các đoạn được chọn, số ô, diện tích quy đổi, phần chênh do làm tròn và cảnh báo phân mảnh nếu có.
6. Người dùng bấm **Xác nhận phân khu**.
7. Backend transaction lock các ô, kiểm tra lại rồi insert lease + bay_assignments; commit và ghi audit. Khách thuê nhận trọn quyền 6 tầng của ô (nhưng tầng 1–3 của ô đặc biệt vẫn bị khóa không lưu pallet).
8. Khi lỗi đồng thời: rollback, trả 409 Conflict, yêu cầu chạy lại đề xuất.

## WF-03. Nhập Excel
1. Nhân viên chọn khách và file Excel.
2. Parser đọc các cột theo tài liệu; chuẩn hóa m, kg; kiểm tra dòng lỗi.
3. Hiển thị preview, cảnh báo sai SKU/đơn vị/số lượng, không tự nhập dòng sai.
4. Nhân viên xác nhận danh sách SKU cho phiếu nhập nháp.
5. Chuyển đến WF-05 tính pallet.

## WF-04. Nhập thủ công
1. Chọn khách; nhập một hoặc nhiều SKU, số kiện, kích thước, G.W/kiện.
2. Backend validate số nguyên dương, kích thước > 0, trọng lượng > 0, SKU thuộc khách.
3. Lưu phiếu nhập DRAFT; không chiếm slot.
4. Chuyển WF-05.

## WF-05. Tính toán pallet
1. Mỗi dòng SKU xử lý độc lập; kiểm tra gỗ thô trước, sau đó đơn/đơn nhô/đôi/quá khổ.
2. Thử đặt D×R và R×D, không lật C; thử TRỘN cả 2 hướng 0°/90° trong cùng một lớp nếu có lợi. Kiểm tra kích thước hàng ≤ 1,65 m (tổng ≤ 1,8 m).
3. Tính số kiện/lớp, số lớp, giới hạn tải (tầng 2–6 vs tầng 1), pallet đầy/lẻ.
4. Kết quả PLANNED kèm số slot cần: đơn = 1, đôi = 2 (AB hoặc BC liền kề), gỗ thô = 3 ở tầng 1.
5. Hàng quá khổ chuyển danh sách xử lý mặt sàn riêng, không gán kệ.

## WF-06. Đề xuất vị trí → xác nhận lưu kho (v2.0)
1. Chọn các pallet dự kiến thuộc khách.
2. Lọc chỉ ô đã cấp hợp lệ cho khách.
3. Bỏ ô bảo trì/khóa, slot đang dùng/giữ chỗ bởi phiếu khác, và KHÓA tầng 1–3 tại 69 ô đặc biệt (chỉ cho phép tầng 4–6).
4. Kiểm tra mặt pallet, chiều cao, tải pallet, tổng tải tầng, giới hạn độ nhô (tối đa 1 pallet đơn nhô/tầng/ô) và kiểu slot liền kề.
5. Lọc tầng: nhẹ ưu tiên tầng 2→3→4→5→6 rồi tầng 1; pallet vượt 700 kg (đơn) hay 1.400 kg (đôi) chỉ tầng 1; gỗ thô chỉ tầng 1.
6. Duyệt theo thứ tự không gian chuẩn v2.0:
   - Tầng hợp lệ;
   - Dãy 101→124 nằm trong vùng thuê;
   - Ô từ TRÁI sang PHẢI vật lý = mã ô GIẢM DẦN (vd 84→01 tại dãy 110–124, 49→01 tại 102–109, 45→01 tại 101);
   - Slot vật lý từ trái sang phải: dãy lẻ A→B→C, dãy chẵn C→B→A (pallet đôi: AB hoặc BC theo vị trí vật lý).
7. Tạo giữ chỗ tạm có thời hạn cấu hình được và trả bảng đề xuất `[Dãy]-[Ô]-[Tầng]-[Slot]`.
8. Nhân viên chọn xác nhận toàn bộ hoặc xác nhận lưu phần hợp lệ khi không đủ chỗ.
9. Backend transaction lock bay/rack_slots theo thứ tự ID nhất quán, kiểm tra lại giữ chỗ, tải/tình trạng/tenancy, chèn pallet_placements + occupied_slots cho phần được xác nhận, ghi audit, giải phóng giữ chỗ tương ứng và commit.
10. Trả trạng thái cập nhật và làm mới sơ đồ 2D/3D. Nếu lưu một phần, giữ trạng thái PARTIAL và báo số pallet còn thiếu; không ghi các pallet chưa được xác nhận.

## WF-07. Xem mô hình 2D / 3D (v2.0)
1. Client lấy cấu trúc toàn kho 24 dãy (1.697 ô) và thống kê trạng thái.
2. Thể hiện hình học kho chuẩn:
   - Cụm trên: Dãy 110–124 dài 84 ô, có 2 lối đi ngang tại 72:73 và 77:78.
   - Cụm dưới: Dãy 101 (45 ô) và 102–109 (49 ô) phân bố hai bên khoảng trống sạc xe nâng ở trung tâm.
   - Các mốc thẳng hàng giữa dãy 101, 102–109 và 110–124 được bảo toàn.
   - Các ô đặc biệt thể hiện rõ tầng 1–3 là lối xe nâng (thông thoáng), tầng 4–6 là kệ chứa hàng.
3. Chỉ render chi tiết phần nhìn thấy (dùng instancing / LOD); chọn dãy/tầng để tải chi tiết ô và pallet.
4. Người dùng lọc khách, SKU, trạng thái, nhập mã vị trí hoặc nhấp pallet để xem thông tin.

## WF-08. Xuất kho và di chuyển [CHƯA CHỐT]
Đề xuất để thiết kế chuẩn bị: tạo phiếu xuất/di chuyển → kiểm quyền và điều kiện an toàn → xác nhận → giải phóng slot cũ và cập nhật slot mới trong CÙNG transaction → ghi pallet_movements. Chưa triển khai vào vận hành cho đến khi khách duyệt.

## 2. Mã trạng thái
| Đối tượng | Trạng thái |
|---|---|
| Phiếu nhập | DRAFT → PROPOSED → CONFIRMED / PARTIAL / CANCELLED |
| Pallet | PLANNED → STORED / FLOOR → OUTBOUND |
| Đề xuất/giữ chỗ | PENDING → CONFIRMED / EXPIRED / CANCELLED; giữ chỗ hết hạn không được tự động xác nhận |
| Cấp khu | DRAFT → ACTIVE → CLOSED; assignments ACTIVE → RELEASED |
| Slot | AVAILABLE, ASSIGNED, RESERVED, OCCUPIED, BLOCKED / FORKLIFT_PASSAGE |

## 3. Xung đột đồng thời bắt buộc xử lý
- Hai yêu cầu cấp cùng ô: chỉ giao dịch đầu thành công; giao dịch sau phải thất bại an toàn.
- Hai phiếu nhập cùng slot: unique occupied_slots.slot_id ngăn ghi trùng; backend khóa trước khi tính tổng tải tầng.
- Pallet đôi: AB hoặc BC phải được xác nhận nguyên tử, không được giữ mỗi một nửa.
- Đề xuất hoặc giữ chỗ hết hiệu lực: không được tự động xác nhận theo dữ liệu cũ.
- Khi thiếu vị trí: chỉ lưu phần hợp lệ sau khi người dùng xác nhận rõ; phần chưa xếp vẫn phải được báo cáo.

