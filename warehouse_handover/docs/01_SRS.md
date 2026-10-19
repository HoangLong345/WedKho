# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
**Dự án:** Website tối ưu xếp pallet và phân bổ kho 3D  
**Bản:** 2.0 – Hồ sơ kỹ thuật triển khai  
**Căn cứ:** Master Document v2.0 (13/10/2026), sơ đồ kho thực tế `sodokho.docx` (sodokho(1).docx) do khách hàng cung cấp.  
**Phân loại:** [Đã chốt] = yêu cầu nghiệp vụ; [Đề xuất] = quyết định thiết kế hoặc phạm vi chưa xác nhận.

**Thứ tự ưu tiên tài liệu:** Khi có khác biệt giữa các tài liệu, Master Document v2.0 và phụ lục sơ đồ kho mới nhất là nguồn yêu cầu nghiệp vụ tối cao; SRS, Use Case, Workflow, Database và Code phải được đồng bộ theo đó. Mô tả mặt bằng cũ 15 dãy × 87 ô và lối đi 43–44 bị bãi bỏ hoàn toàn.

## 1. Mục tiêu và phạm vi
Hệ thống hỗ trợ nhiều khách thuê trong một kho tổng; hoạch định cấp ô theo diện tích thuê; đọc Excel hoặc nhập mặt hàng thủ công; tính số pallet; tự động tìm vị trí pallet an toàn, đúng vùng thuê; hiển thị danh sách vị trí và mô phỏng kho 3D theo đúng mặt bằng 24 dãy thực tế. Trước khi lưu kho, người dùng kiểm tra kết quả và nhấn **Xác nhận lưu kho**. Hệ thống không tự ý ghi nhận tồn kho từ một đề xuất chưa xác nhận.

**Không nằm trong phạm vi đã chốt:** kế toán, tính phí thuê kho, tối ưu đường đi xe nâng, ERP, quản lý vận tải, IoT, đăng nhập và phân quyền tài khoản. Xuất kho/di chuyển pallet được đưa vào thiết kế chuẩn bị, cần nghiệm thu phạm vi riêng.

## 2. Cấu hình và quy tắc nghiệp vụ đã chốt (Mặt bằng v2.0)
| ID | Nội dung | Quy tắc |
|---|---|---|
| BR-01 | Sơ đồ kho | 24 dãy (101–124); số ô phân theo 3 nhóm: Dãy 101 có 45 ô; Dãy 102–109 (8 dãy) có 49 ô/dãy; Dãy 110–124 (15 dãy) có 84 ô/dãy. Tổng: 45 + (8 × 49) + (15 × 84) = 1.697 ô mặt bằng. Mỗi ô 6 tầng, mỗi tầng 3 slot (A, B, C). Sức chứa danh nghĩa 30.546 slot; sức chứa cấu trúc tối đa 29.925 slot sau khi khóa tầng 1–3 của 69 ô đặc biệt |
| BR-02 | Hướng đánh số & tọa độ | Hàng 101 ở gốc dưới đi lên. Số ô trong TOÀN BỘ KHO đánh số từ PHẢI sang TRÁI (ô 01 ở mép phải, ô số lớn ở mép trái). Tầng 1→6 từ DƯỚI lên TRÊN. Thứ tự slot nhìn mặt tiền từ trái sang phải: Dãy LẺ (101, 103,...) là A→B→C; Dãy CHẴN (102, 104,...) là C→B→A |
| BR-03 | Ô đặc biệt (lối xe nâng) | Có 69 ô đặc biệt có tầng 1–3 dành làm lối xe nâng (KHÔNG có slot lưu trữ pallet); tầng 4–6 vẫn bố trí lưu trữ: Dãy 101: ô 12 (1 ô); Dãy 102–109: ô 12 mỗi dãy (8 ô); Dãy 110–124: ô 12, 26, 43, 60 mỗi dãy (60 ô). Tổng 69 ô × 3 tầng × 3 slot = 621 slot bị khóa |
| BR-04 | Lối đi ngang & vùng trống | Dãy 110–124 có 2 lối đi ngang rộng 4 m: giữa ô 72 và 73, giữa ô 77 và 78 (không phải ô/slot tồn kho, không tạo ô ảo). Phía dưới trung tâm có khoảng trống lớn (khu sạc xe nâng), hai bên là cụm kệ ngắn hơn của dãy 101–109 |
| BR-05 | Mốc thẳng hàng | Dãy 101: ô 26 thẳng hàng ô 65 của nhóm 110–124; ô 33-34 thẳng ô 72-73; ô 38-39 thẳng ô 77-78; ô 45 thẳng ô 84. Dãy 102–109: ô 26 thẳng ô 61 của nhóm 110–124; ô 37-38 thẳng ô 72-73; ô 42-43 thẳng ô 77-78; ô 49 thẳng ô 84 |
| BR-06 | Cấp ô khách thuê | N = ceil(diện tích thuê × 0,70 / 5,6); cấp trọn quyền 6 tầng của ô cho một khách trong thời gian hiệu lực (tuy nhiên tầng 1–3 của ô đặc biệt vẫn bị khóa không lưu pallet); chống cấp trùng |
| BR-07 | Vùng thuê | Cấp toàn bộ ô vật lý cho một khách, ưu tiên đoạn liên tiếp từ TRÁI sang PHẢI (tương đương mã ô GIẢM DẦN, ví dụ 84→22 ở dãy 110 khi cần 63 ô); duyệt dãy 101→124; cảnh báo nếu phân mảnh |
| BR-08 | SKU | Mỗi pallet chỉ một SKU; các pallet khác nhau trong cùng một ô được phép mang SKU khác nhau |
| BR-09 | Pallet & độ nhô | Đơn 1,2×1,8×0,15 m; đơn nhô ngang X′ từ trên 1,2 đến 1,4 m (tối đa 1 pallet nhô/tầng/ô); đôi có X′ trên 1,4 đến 2,6 m và Y′ ≤ 1,8 m, chiếm 2 slot liền kề AB hoặc BC; gỗ thô chiếm cả 3 slot ABC tại tầng 1 |
| BR-10 | Chiều cao & hướng đặt | Hàng ≤ 1,65 m, tổng hàng + pallet ≤ 1,8 m; được thử xoay 0°/90° trong mặt phẳng ngang và TRỘN cả 2 hướng trong cùng một lớp nếu có lợi; không lật thùng; Y′ ≤ 1,8 m |
| BR-11 | Tải trọng pallet | Đơn ≤ 700 kg ở tầng 2–6, ≤ 1.500 kg ở tầng 1; đôi ≤ 1.400 kg ở tầng 2–6, ≤ 3.000 kg ở tầng 1; gỗ thô ≤ 4.500 kg ở tầng 1 |
| BR-12 | Tổng tải tầng | Tầng 1 (sàn) tối đa 4.500 kg hàng/ô/tầng (hoặc 5.000 kg theo tài liệu gốc); tầng 2–6 tối đa 2.100 kg hàng/ô/tầng |
| BR-13 | Thứ tự ưu tiên vị trí | 1. Lọc an toàn: trong vùng thuê, slot tồn tại, khóa tầng 1–3 ô đặc biệt, trống, đúng kích thước/tải/độ nhô; 2. Nhóm tầng: nhẹ ưu tiên tầng 2→3→4→5→6 rồi tầng 1; nặng vượt ngưỡng trên chỉ tầng 1; gỗ thô chỉ tầng 1; 3. Duyệt dãy: 101→124; 4. Duyệt ô: từ TRÁI sang PHẢI vật lý = mã ô GIẢM DẦN (84→01); 5. Duyệt slot: dãy lẻ A→B→C, dãy chẵn C→B→A |
| BR-14 | Người dùng xác nhận | Hệ thống tự đề xuất vị trí; người dùng chỉ cần xác nhận; trước khi ghi dữ liệu phải kiểm tra lại trong transaction |
| BR-15 | Quá khổ (OOG) | Nếu không có hướng hợp lệ với X′ ≤ 2,6 m, Y′ ≤ 1,8 m, Z_a ≤ 1,8 m hoặc vượt tải tầng sàn thì không gán lên kệ; báo lý do và chuyển sang khu lưu mặt sàn riêng |

### 2.1. Điều kiện an toàn chưa được chứng nhận
Khung kệ sâu 1,4 m, pallet sâu 1,8 m và đặt giữa kệ dẫn tới nhô danh nghĩa 0,2 m mỗi phía. Các thông số tải trọng, độ võng, khoảng hở beam, xe nâng, PCCC, thoát hiểm và kết cấu nền cần được bộ phận kỹ thuật kho kiểm định thực tế trước khi dùng mô phỏng 3D chỉ đạo vận hành thực tế.

## 3. Người vận hành hệ thống
Hệ thống hiện phục vụ trực tiếp cho việc quản lý kho, không yêu cầu màn hình đăng nhập, tài khoản người dùng hoặc phân quyền API. Người vận hành có thể thực hiện các thao tác nhập hàng, tính pallet, xem đề xuất vị trí, xác nhận lưu kho và xem sơ đồ kho.

## 4. Yêu cầu chức năng
| Mã | Chức năng | Điều kiện nghiệm thu chính |
|---|---|---|
| FR-01 | Danh mục khách thuê | Tạo/sửa danh mục khách, phân biệt mã duy nhất |
| FR-02 | Quản trị kho v2.0 | Khởi tạo đầy đủ 24 dãy (101–124), 1.697 ô (101: 45 ô; 102–109: 49 ô; 110–124: 84 ô), 6 tầng, 3 slot A/B/C theo tính chẵn/lẻ; khóa tầng 1–3 của 69 ô đặc biệt; thể hiện 2 lối đi ngang giữa ô 72:73 và 77:78 |
| FR-03 | Tính khu thuê | Với 500 m² trả về ceil(500×0,7/5,6) = 63 ô; thể hiện diện tích làm tròn |
| FR-04 | Đề xuất cấp ô | Chỉ ô hợp lệ, chưa cấp, chưa khóa; ưu tiên đoạn liên tiếp từ trái sang phải (mã ô giảm dần, vd 84→22 tại dãy 110); duyệt dãy 101→124 |
| FR-05 | Xác nhận cấp ô | Khóa và kiểm tra lại trước ghi; không cấp một ô đang hiệu lực cho hai khách |
| FR-06 | Nhập từ Excel | Đọc cột theo tài liệu; đối chiếu loại/đơn vị; phản hồi lỗi theo dòng |
| FR-07 | Nhập hàng thủ công | Cho nhập nhiều SKU trên một phiếu; yêu cầu SKU, số kiện, D×R×C, G.W/kiện, khách thuê |
| FR-08 | Tính pallet | Thử hai hướng xoay 0°/90° và bố trí phối hợp trong cùng lớp; kiểm tra hình học, điểm tựa, tải, ổn định, số lớp, giới hạn tải, pallet đầy/lẻ |
| FR-09 | Phân loại hàng | Đơn, đơn nhô, đôi, gỗ thô, quá khổ theo Master v2.0; không trộn SKU trong một pallet |
| FR-10 | Đề xuất vị trí | Chỉ trong ô của khách; giữ chỗ tạm; khóa tầng 1–3 ô đặc biệt; kiểm tra tải pallet và tổng tải tầng; thứ tự tầng hợp lệ → dãy 101→124 → mã ô giảm dần → slot chẵn/lẻ |
| FR-11 | Xác nhận nhập kho | Chống đua dữ liệu bằng khóa transaction; ghi pallet, slot, lịch sử chỉ khi hợp lệ; cho phép xác nhận phần hợp lệ khi người dùng chấp nhận lưu một phần |
| FR-12 | Theo dõi trạng thái | Thể hiện ô cấp khách, ô trống, vị trí trống, vị trí dùng, giữ chỗ, ô đặc biệt bị khóa tầng 1–3 |
| FR-13 | Xem 2D/3D | Thể hiện toàn kho 24 dãy, giữ đúng hình dạng vùng trống trung tâm (khu sạc xe nâng), 2 lối đi ngang và các mốc thẳng hàng; xem chi tiết tầng/slot; lọc theo khách, SKU |
| FR-14 | Báo cáo kết quả | Bảng đề xuất mã vị trí dạng `[Dãy]-[Ô]-[Tầng]-[Slot]`; cảnh báo không đủ chỗ/quá khổ |
| FR-15 | Lịch sử | Lưu ai thao tác, thời gian, khách, SKU, vị trí trước/sau, hành động |
| FR-16 | Xuất kho / di chuyển | [Đề xuất cho vòng sau] Chỉ làm sau khi chốt quy tắc nghiệp vụ |

## 5. Dữ liệu đầu vào, đầu ra
**Excel đầu vào theo tài liệu:** Mã hàng, Tên hàng, Loại hàng, ĐVT, Số lượng, Quy cách 1 kiện (D×R×C), Tổng CBM, G.W/kiện, N.W/kiện, Tổng G.W, Tổng N.W, Khách hàng, Khách hàng (ghi tắt). Chuẩn hóa kích thước về m và G.W về kg; không âm thầm đoán nếu đơn vị thiếu hoặc mâu thuẫn.

**Bảng đầu ra:** Mã khách, mã SKU, số kiện, số kiện/lớp, số lớp, số kiện/pallet, loại pallet, tổng pallet, khối lượng, tầng được phép, dãy-ô-tầng-slot đề xuất, trạng thái/cảnh báo. Mã theo mẫu `110-64-4-A`, `110-64-4-AB`, `110-64-1-ABC`.

## 6. Yêu cầu phi chức năng
| Mã | Tiêu chí | Ghi chú |
|---|---|---|
| NFR-01 | Dữ liệu nhất quán | Mọi thao tác xác nhận dùng transaction, ràng buộc DB và kiểm tra lại trạng thái |
| NFR-02 | Vận hành trực tiếp | Không yêu cầu đăng nhập hoặc phân quyền tài khoản trong phiên bản quản lý kho này |
| NFR-03 | Nhật ký | Lưu thời gian, tenant, hành động và lịch sử thay đổi vị trí |
| NFR-04 | Khả năng khôi phục | PostgreSQL trong Docker với named volume; sao lưu và thử phục hồi định kỳ |
| NFR-05 | Mô phỏng 3D | Hỗ trợ mô hình 24 dãy, 1.697 ô, 30.546 slot danh nghĩa (29.925 slot cấu trúc); dùng instancing/LOD/lọc theo dãy-tầng để vận hành mượt |
| NFR-06 | Định lượng hiệu năng | [Đề xuất] Đặt mục tiêu và đo bằng dữ liệu thực; chưa có SLA đã xác nhận |
| NFR-07 | Độ tin cậy dữ liệu | Không coi cấu hình vị trí 3D là chứng nhận an toàn kết cấu |

## 7. Quy tắc tính pallet phiên bản đầu
Số kiện/lớp phải thử hai hướng 0°/90° và các bố trí phối hợp hai hướng trong cùng lớp; chỉ chọn phương án có số kiện hợp lệ cao nhất sau khi kiểm tra không chồng lấn, điểm tựa, tải và ổn định. Số lớp = floor(1,65/h). Số kiện/pallet = min(giới hạn hình học, giới hạn tải/G.W). Ưu tiên cấu hình pallet tầng trên nếu tải hợp lệ; trường hợp quá nặng cho tầng trên chỉ cân nhắc tầng sàn.

## 8. Tiêu chí kiểm thử và nghiệm thu mẫu (v2.0)
| ID | Đầu vào | Kết quả kỳ vọng |
|---|---|---|
| AT-01 | Khách thuê 500 m², dãy 110 còn trống | 63 ô; đề xuất các ô từ trái sang phải = mã ô 84→22 (không phải 01–63) |
| AT-02 | KH-A có quyền ô 110-01, KH-B xin cùng ô | Giao dịch thứ hai thất bại, không ghi đè |
| AT-03 | Dãy 101, ô 12, kiểm tra tầng 2 và tầng 5 | Tầng 2 bị khóa lối xe nâng (không có slot lưu hàng); tầng 5 có thể lưu hàng nếu đủ điều kiện |
| AT-04 | Dãy 110, ô 26, kiểm tra tầng 1 và tầng 6 | Tầng 1 bị khóa lối xe nâng; tầng 6 vẫn bố trí lưu trữ bình thường |
| AT-05 | Lối đi giữa ô 72:73 và 77:78 (dãy 110–124) | Là 2 khoảng trống rộng 4 m; không tạo ô hoặc slot ảo; số ô dãy vẫn là 84 |
| AT-06 | Thứ tự slot dãy 110 (chẵn) vs dãy 111 (lẻ) | Dãy 110 từ trái sang phải là C-B-A; Dãy 111 từ trái sang phải là A-B-C |
| AT-07 | Pallet đơn 200 kg, hợp lệ ô 110-64 | Đề xuất tầng 2–6 theo thứ tự 2→3→4→5→6 trước khi xét tầng 1 |
| AT-08 | Pallet đơn 900 kg | Không đề xuất tầng 2–6; chỉ tầng 1 |
| AT-09 | Pallet đôi | Chỉ chiếm AB hoặc BC liền kề; không dùng AC |
| AT-10 | SKU A và SKU B ở hai pallet cùng ô | Được phép nếu không vượt giới hạn tổng tải tầng |
| AT-11 | Hai giao dịch xác nhận cùng slot | Một giao dịch thành công, giao dịch kia rollback báo conflict |
| AT-12 | Hàng quá khổ (OOG) | Báo lý do và chuyển sang khu lưu mặt sàn riêng; không gán mã kệ |

## 9. Vấn đề mở / cần chủ kho duyệt
- Sơ đồ kỹ thuật, khoảng cách thực tế giữa các dãy, beam và quy trình an toàn xe nâng/PCCC.
- Danh mục vị trí lưu mặt sàn quá khổ và cách hoạch định vùng đó.
- Bản đồ ô thuộc từng vùng thuê cụ thể của từng khách.
- Định dạng xuất file báo cáo (Excel, PDF hay cả hai).
- Giới hạn tải tầng sàn là 4,5 tấn hay 5 tấn theo thiết kế kết cấu cuối cùng.


## 10. Quy tắc xác nhận theo Master v2.0
- Mỗi ô vật lý được cấp trọn quyền 6 tầng cho một khách tại một thời điểm; tuy nhiên các ô đặc biệt bị khóa tầng 1–3 không được lưu pallet.
- Khi đề xuất cấp khu, ưu tiên đoạn liền kề từ TRÁI sang PHẢI (mã ô GIẢM DẦN) theo thứ tự dãy 101→124; nếu không đủ đoạn liền thì chọn nhiều đoạn, ưu tiên ít phân mảnh và hiển thị rõ phần chênh diện tích làm tròn.
- Vị trí đã đề xuất cho phiếu nhập phải được giữ chỗ tạm. Giữ chỗ hết hạn hoặc bị hủy phải được giải phóng trước khi vị trí được đề xuất lại.
- Nếu thiếu vị trí, hệ thống phải báo số pallet chưa xếp và chỉ lưu phần hợp lệ khi người dùng xác nhận rõ phương án lưu một phần.
- Thuật toán đóng gói: Mỗi lớp chỉ xếp đồng nhất theo 1 hướng (hoặc toàn bộ kiện 0°, hoặc toàn bộ kiện 90°), không trộn 2 hướng cùng một mặt phẳng lớp pallet để khớp câu trả lời chốt Mục 12.
- Hàng nhô ngang: tối đa 01 pallet đơn nhô/tầng/ô (1,2 < X′ ≤ 1,4 m); pallet đôi nhận hàng 1,4 < X′ ≤ 2,6 m; Y′ ≤ 1,8 m; phải hiển thị cảnh báo an toàn.
- Hàng quá khổ lên kệ Tầng 1: Nếu hàng có 2,6 m < X′ ≤ 3,8 m (và Y′ ≤ 1,8 m, Za ≤ 1,8 m, Mpal ≤ 4.500 kg) thì vẫn được phép gán lên kệ Tầng 1, khóa trọn khoang mã [Dãy]-[ô]-1-ABC. Chỉ khi nào bề ngang X′ > 3,8 m (không lọt lòng khoang kệ 4 m) hoặc sâu Y′ > 1,8 m thì mới bắt buộc đẩy ra khu sàn ngoài (Khu vực OOG).

