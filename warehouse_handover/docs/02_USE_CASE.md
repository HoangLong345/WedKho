# USE CASE SPECIFICATION
**Dự án:** Website tối ưu xếp pallet và phân bổ kho 3D  
**Phiên bản:** 2.0 | Căn cứ: Master Document v2.0 (13/10/2026) và sơ đồ kho thực tế `sodokho.docx`.

## 1. Tác nhân và sơ đồ tổng quát
| Tác nhân | Chức năng chính | Ghi chú |
|---|---|---|
| Quản trị kho | Quản lý khách, cấp khu thuê, xác nhận dữ liệu kho, xem báo cáo | [Đề xuất vai trò] |
| Nhân viên kho | Nhập Excel, nhập thủ công, xem gợi ý, xác nhận lưu kho | [Đề xuất vai trò] |
| Khách thuê | Tra cứu hàng/vị trí của chính mình | [Đề xuất, cần duyệt quyền] |
| Bộ máy tính toán | Tính nhu cầu ô, pallet, vị trí và cảnh báo | Thành phần hệ thống, không phải con người |

## UC-01 – Tạo khách thuê
**Tác nhân:** Người vận hành kho. **Tiền điều kiện:** API và cơ sở dữ liệu kho đang hoạt động.  
**Luồng chính:** (1) Nhập mã, tên khách; (2) Kiểm tra trùng mã; (3) Lưu; (4) Hiển thị khách vừa tạo.  
**Ngoại lệ:** Trùng mã hoặc dữ liệu thiếu → báo lỗi, không lưu.  
**Hậu điều kiện:** Khách thuê sẵn sàng tạo yêu cầu cấp khu.

## UC-02 – Tính và đề xuất khu thuê (v2.0)
**Tác nhân:** Quản trị kho. **Tiền điều kiện:** Khách hợp lệ, diện tích > 0.  
**Luồng chính:** (1) Nhập diện tích m²; (2) Tính số ô N = ceil(S × 0,70 / 5,6); (3) Lọc ô chưa thuộc hợp đồng hoạt động, chưa khóa/bảo trì; (4) Ưu tiên đoạn ô liên tiếp từ TRÁI sang PHẢI (tương đương mã ô GIẢM DẦN, vd: 84→22 tại dãy 110 nếu cần 63 ô) theo thứ tự dãy 101→124; nếu không đủ một đoạn liền thì chọn nhiều đoạn theo thứ tự duyệt và cảnh báo phân mảnh; (5) Hiển thị sơ đồ và danh sách ô đề xuất.  
**Ngoại lệ:** Không đủ ô trống → hiển thị số thiếu; không lấy ô khách khác.  
**Hậu điều kiện:** Đề xuất chưa làm phát sinh quyền thuê cho đến khi xác nhận.

## UC-03 – Xác nhận cấp ô cho khách
**Tác nhân:** Quản trị kho. **Tiền điều kiện:** Có đề xuất UC-02 chưa hết hạn.  
**Luồng chính:** (1) Bấm xác nhận; (2) Mở transaction; (3) Khóa ô đề xuất theo thứ tự nhất quán; (4) Kiểm tra lại quyền thuê, trạng thái ô; (5) Ghi hợp đồng và quyền sử dụng 6 tầng của ô (tuy nhiên tầng 1–3 của các ô đặc biệt không cấp slot lưu hàng); (6) Commit và cập nhật 2D/3D.  
**Ngoại lệ:** Ô đã cấp bởi phiên khác → rollback, thông báo tính lại.  
**Hậu điều kiện:** Mỗi ô cấp cho tối đa một khách tại thời điểm hiệu lực.

## UC-04 – Nhập file Excel
**Tác nhân:** Nhân viên kho. **Tiền điều kiện:** Khách có khu thuê.  
**Luồng chính:** (1) Chọn khách và file; (2) Đọc cột yêu cầu; (3) Kiểm tra số lượng/kích thước/khối lượng/đơn vị; (4) Xem bản xem trước từng dòng; (5) Chấp nhận dữ liệu hợp lệ để tính pallet.  
**Ngoại lệ:** Sai cột/đơn vị không rõ/số lượng không hợp lệ → báo lỗi từng dòng, không tự ép về số tùy tiện.  
**Hậu điều kiện:** Phiếu nhập nháp với các dòng hợp lệ.

## UC-05 – Nhập mặt hàng thủ công
**Tác nhân:** Nhân viên kho.  
**Luồng chính:** (1) Chọn khách; (2) Nhập một hoặc nhiều SKU, số kiện, D×R×C, G.W/kiện; (3) Kiểm tra hợp lệ; (4) Lưu nháp; (5) Chuyển UC-06.  
**Ngoại lệ:** SKU khác khách, thiếu cân nặng, kích thước ≤ 0 → từ chối.  
**Hậu điều kiện:** Phiếu nháp chưa chiếm vị trí kho.

## UC-06 – Tính số pallet
**Tác nhân:** Nhân viên kho gọi hệ thống tính toán.  
**Luồng chính:** (1) Phân loại đơn/đơn nhô/đôi/gỗ thô/quá khổ theo SKU; (2) Thử hai hướng xoay 0°/90° không lật, bao gồm phương án TRỘN hai hướng trong một lớp; (3) Tính kiện/lớp, số lớp ≤ 1,65 m, giới hạn tải; (4) Kiểm tra chồng lấn, điểm tựa, tải và ổn định; (5) Chia pallet đầy/lẻ; (6) Hiển thị loại pallet, số lượng và cảnh báo hàng nhô/quá khổ.  
**Ngoại lệ:** Hàng quá khổ, không xếp được, quá tải một kiện → chỉ định quy trình sàn riêng hoặc báo từ chối lên kệ.  
**Hậu điều kiện:** Danh sách pallet dự kiến, chưa tạo chiếm dụng vị trí.

## UC-07 – Tự động tìm vị trí pallet (v2.0)
**Tác nhân:** Nhân viên kho.  
**Luồng chính:** (1) Chọn kết quả UC-06; (2) Chỉ xét các ô khách đang được cấp quyền; (3) Lọc an toàn: bỏ ô khóa/bảo trì, slot đang dùng/giữ chỗ, và KHÓA tầng 1–3 tại 69 ô đặc biệt (101: ô 12; 102–109: ô 12; 110–124: ô 12, 26, 43, 60); (4) Kiểm tra loại pallet (đơn 1 slot, đôi 2 slot AB/BC liền kề, gỗ thô 3 slot ABC tầng 1), chiều cao, tải pallet, giới hạn tối đa 01 pallet đơn nhô/tầng/ô, và tổng tải tầng; (5) Duyệt tầng ưu tiên: pallet nhẹ ưu tiên tầng 2→3→4→5→6 rồi tầng 1; pallet nặng vượt ngưỡng hoặc gỗ thô chỉ tầng 1; (6) Duyệt dãy 101→124; (7) Duyệt ô theo hướng vật lý TRÁI sang PHẢI = mã ô GIẢM DẦN (vd 84→01 tại dãy 110–124); (8) Duyệt slot theo tính chẵn/lẻ: dãy lẻ A→B→C, dãy chẵn C→B→A; (9) Tạo giữ chỗ tạm có thời hạn; (10) Trả mã vị trí đề xuất `[Dãy]-[Ô]-[Tầng]-[Slot]`.  
**Ngoại lệ:** Hết chỗ, chỉ còn chỗ không an toàn, thiếu vùng thuê hoặc giữ chỗ đã hết hạn → báo lý do và cho phép tính lại.  
**Hậu điều kiện:** Vị trí được giữ chỗ tạm cho phiếu nhập, chưa ghi nhận là đang sử dụng.

## UC-08 – Xác nhận lưu kho
**Tác nhân:** Nhân viên kho. **Tiền điều kiện:** Đề xuất còn hiệu lực, có quyền.  
**Luồng chính:** (1) Bấm Xác nhận lưu kho; (2) Chọn xác nhận toàn bộ hoặc lưu phần hợp lệ nếu có pallet chưa được xếp; (3) Mở transaction; (4) Khóa dữ liệu ô/tầng/slot nhất quán; (5) Kiểm tra lại quyền thuê, giữ chỗ, loại pallet, tải trọng toàn tầng và tình trạng slot; (6) Ghi các pallet hợp lệ, placements, occupied slots và lịch sử; (7) Giải phóng giữ chỗ đã chuyển thành chiếm dụng; (8) Commit; (9) Cập nhật bảng/3D.  
**Ngoại lệ:** Đề xuất cũ, mất chỗ, giữ chỗ hết hạn hoặc vượt tải do phiên khác → rollback phần giao dịch, hủy phương án cũ và đề xuất lại; không ghi đè.  
**Hậu điều kiện:** Không trùng slot; không pallet nào ở sai khu thuê; nếu lưu một phần thì phiếu có trạng thái PARTIAL và số pallet chưa xếp được hiển thị rõ.

## UC-09 – Tra cứu sơ đồ kho 2D / 3D (v2.0)
**Tác nhân:** Quản trị, nhân viên kho; khách thuê nếu được cấp quyền.  
**Luồng chính:** (1) Mở giao diện 2D / 3D toàn kho 24 dãy (101–124); (2) Hệ thống thể hiện đúng cấu trúc hình học: 3 nhóm ô (101: 45 ô; 102–109: 49 ô; 110–124: 84 ô), khoảng trống trung tâm phía dưới (khu sạc xe nâng), 2 lối đi ngang giữa ô 72:73 và 77:78, các mốc thẳng hàng, và tầng 1–3 của 69 ô đặc biệt được thể hiện là lối xe nâng; (3) Lọc theo dãy, tầng, khách, SKU; (4) Xem mã vị trí với slot chẵn C-B-A, slot lẻ A-B-C; (5) Chọn slot/pallet để xem chi tiết mã hàng, số kiện, khối lượng.  
**Ngoại lệ:** Không có quyền dữ liệu khách khác → ẩn thông tin nhạy cảm.  
**Hậu điều kiện:** Không thay đổi tồn kho chỉ bằng thao tác xem.

## UC-10 – Xem lịch sử và cảnh báo
**Tác nhân:** Quản trị hoặc nhân viên được phép.  
**Luồng chính:** Chọn khoảng thời gian/khách/SKU → xem ai nhập, lúc nào, pallet nào, vị trí nào, lý do từ chối.  
**Ngoại lệ:** Dữ liệu nằm ngoài quyền → ẩn.  
**Hậu điều kiện:** Nhật ký không thể bị sửa từ giao diện bình thường.

## 2. Use Case cần duyệt thêm
- UC-11: Xuất kho, giảm tồn, giải phóng vị trí.
- UC-12: Di chuyển pallet giữa vị trí; lưu lịch sử và kiểm tra tải.
- UC-13: Thu hồi/điều chỉnh ô thuê; chỉ thực hiện sau khi xử lý hàng còn trên ô.
- UC-14: Kiểm kê và điều chỉnh sai lệch.

## 3. Truy vết Use Case – yêu cầu
| Use Case | Requirement |
|---|---|
| UC-01 | FR-01 |
| UC-02/03 | FR-03, FR-04, FR-05 |
| UC-04/05 | FR-06, FR-07 |
| UC-06 | FR-08, FR-09 |
| UC-07/08 | FR-10, FR-11 |
| UC-09 | FR-12, FR-13 |
| UC-10 | FR-15 |

