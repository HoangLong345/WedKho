# Master Document – Website tối ưu xếp pallet và phân bổ kho

Phiên bản 2.0 – 13/10/2026 \| Cập nhật theo sodokho(1).docx: 24 dãy 101–124, số ô theo ba nhóm, quy ước đánh số từ phải sang trái, lối đi và ô đặc biệt theo tầng. Các thuật toán xếp pallet, tải trọng, khách thuê và xác nhận lưu kho giữ nguyên nếu không bị các thay đổi mặt bằng ảnh hưởng.

## 1. Mục tiêu dự án

Xây dựng website có hai chức năng cốt lõi:

1.  **Tối ưu xếp hàng lên pallet:** nhận dữ liệu Excel, tính số kiện mỗi lớp, số lớp, số kiện mỗi pallet, tải trọng và phân loại pallet đơn, pallet đôi, gỗ thô, quá khổ.

2.  **Phân bổ pallet vào kho:** chọn vị trí phù hợp, quản lý nhiều khách thuê trên cùng kho tổng và mô phỏng không gian kho 3D.

## 2. Thông số kho (mặt bằng mới – cập nhật v2.0)

| Hạng mục                         | Giá trị – cấu hình kho v2.0                                                                                                      |
|----------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Số dãy / hướng mã                | 24 dãy: 101–124; hàng 101 bắt đầu từ gốc dưới đi lên theo tài liệu sơ đồ                                                         |
| Số ô theo nhóm                   | Dãy 101: 45 ô; dãy 102–109: 49 ô/dãy; dãy 110–124: 84 ô/dãy                                                                      |
| Tổng ô (khoang) mặt bằng         | 45 + (8 × 49) + (15 × 84) = 1.697 ô                                                                                              |
| Số tầng mỗi ô                    | 6 tầng: tầng 1 là sàn, tầng 2–6 là beam; các ô đặc biệt chỉ lưu tầng 4–6                                                         |
| Vị trí pallet mỗi tầng           | 3 slot A, B, C; dãy lẻ A→B→C từ trái sang phải; dãy chẵn A→B→C từ phải sang trái                                                 |
| Sức chứa lý thuyết               | 30.546 slot trước khi chừa thông tầng; 29.925 slot sau khi khóa tầng 1–3 của 69 ô đặc biệt                                       |
| Khoang kệ tiêu chuẩn             | Mặt tiền 4,0 m, sâu khung 1,4 m, cao tổng thể 10,5 m (chờ đối chiếu cấu kiện thực tế)                                            |
| Bước tầng                        | 2,1 m (theo quy chuẩn Master hiện hành)                                                                                          |
| Khoảng hở an toàn trên đỉnh hàng | 0,3 m                                                                                                                            |
| Diện tích kho tổng               | 30.375 m² là số liệu hoạch định từ tài liệu cũ, chưa xác minh tương ứng sơ đồ 24 dãy; KHÔNG dùng để khẳng định diện tích thực tế |

Nguồn cấu trúc mặt bằng: “sodokho(1).docx” do khách hàng cung cấp. Thông tin 15 dãy × 87 ô và lối đi 43–44 ở các phiên bản cũ KHÔNG còn áp dụng. Ví dụ kho thuê 10.000 m² trong Input ban đầu chỉ là minh họa hoạch định, không phải số lượng ô thực tế.

Sức chứa lý thuyết 30.546 slot là mức thô (chưa loại trừ tầng bị chừa thông xe nâng). Sau khi trừ các vị trí bị khóa ở tầng 1–3 của những ô đặc biệt: còn tối đa 29.925 slot về mặt cấu trúc. Cả hai con số chưa xét pallet đôi, pallet nhô, gỗ thô, OOG, tải trọng, quyền thuê và khả năng tiếp cận.

## 3. Quy tắc pallet và cách đặt (đã chốt)

| Hạng mục                 | Quy tắc                                                                                                                                                                                                                                                            |
|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Pallet đơn               | Mặt pallet X_pal = 1,2 m, Y_pal = 1,8 m, cao 0,15 m.                                                                                                                                                                                                               |
| Cách đặt trong khoang    | Trục X mặt tiền mỗi ô rộng 4,0 m; ba vị trí vật lý A/B/C theo quy ước dãy: dãy lẻ A-B-C từ trái qua phải, dãy chẵn C-B-A từ trái qua phải. Trục Y sâu khung 1,4 m; cạnh pallet gác theo chiều sâu 1,8 m. Mã ô kệ luôn tăng từ PHẢI qua TRÁI, độc lập thứ tự A/B/C. |
| Pallet nhô khỏi khung kệ | Pallet 1,8 m so với khoang sâu 1,4 m: nhô đều hai phía, 0,2 m ra lối đi và 0,2 m ra phía sau. Cho phép ở mọi tầng, kể cả tầng sàn                                                                                                                                  |
| Pallet đôi               | Chiếm 2 vị trí liền kề AB hoặc BC; pallet ghép vật lý rộng 2,4 m × sâu 1,8 m; ngưỡng phân loại khối hàng theo ảnh: 1,4 \< X′ ≤ 2,6 m, Y′ ≤ 1,8 m (có kiểm soát phần nhô).                                                                                          |
| Hàng nhô khỏi mặt pallet | Theo ảnh thuật toán: cho phép hàng nhô ngang X′ đến 1,4 m với pallet đơn (tối đa 01 pallet nhô/tầng/ô); với pallet đôi, khối hàng X′ đến 2,6 m. Chiều sâu Y′ không vượt 1,8 m; các cấu hình nhô phải kiểm định an toàn.                                            |
| Chiều cao hàng           | Tối đa 1,65 m (hàng + pallet ≤ 1,8 m)                                                                                                                                                                                                                              |
| Xoay thùng               | Được xoay 90° trên mặt phẳng ngang để thử hai hướng; không được lật thùng.                                                                                                                                                                                         |
| Mã hàng trên pallet      | Mỗi pallet chỉ một mã hàng (SKU); không trộn mã                                                                                                                                                                                                                    |
| Mã hàng trong một ô      | Ba vị trí A, B, C trong cùng ô được khác mã hàng                                                                                                                                                                                                                   |
| Gỗ thô                   | Mặc định chiếm trọn một khoang tầng 1 (A+B+C)                                                                                                                                                                                                                      |

QUY TẮC THAY THẾ THEO ẢNH (v1.6): Cho phép pallet đơn có hàng nhô chiều X từ trên 1,2 m đến tối đa 1,4 m (mỗi tầng ô kệ tối đa 01 pallet loại này); pallet đôi nhận hàng có 1,4 \< X′ ≤ 2,6 m và Y′ ≤ 1,8 m. Không dùng quy tắc v1.5 “hàng luôn nằm gọn trên mặt pallet” hay chỉ giới hạn hàng ở bề ngang 2,4 m khi phân loại. Việc vượt mép pallet phải qua kiểm định an toàn tại kho.

Về khung kệ: pallet sâu 1,8 m trên khung sâu 1,4 m có thể nhô 0,2 m trước/sau nếu được phê duyệt. Giả định cũ về cặp kệ quay lưng cách 0,5 m vẫn chỉ là đầu vào dự kiến; sơ đồ 24 dãy mới không xác nhận tọa độ và hướng của từng cặp. Phải đối chiếu bản vẽ/kết cấu trước khi suy ra khe hở an toàn.

## 4. Phân loại pallet

Sử dụng trục X = ngang mặt tiền ô kệ, Y = chiều sâu kê pallet, Z = chiều cao. X_pal = 1,2 m, Y_pal = 1,8 m, Z_pal = 0,15 m. Xét đủ hai hướng xoay kiện 90° trên mặt phẳng ngang (không lật) trước khi phân loại theo X′, Y′, Z_a.

1.  Pallet đơn chuẩn: X′ ≤ 1,2 m, Y′ ≤ 1,8 m, Z_a ≤ 1,8 m; chiếm 1 slot A/B/C và phải đạt tải trọng.

2.  Pallet đơn nhô ngang: 1,2 \< X′ ≤ 1,4 m, Y′ ≤ 1,8 m, Z_a ≤ 1,8 m; chiếm 1 slot, nhưng tối đa 01 pallet nhô trên mỗi tầng của một ô kệ. Pallet đôi: 1,4 \< X′ ≤ 2,6 m, Y′ ≤ 1,8 m, Z_a ≤ 1,8 m; chiếm 2 slot liền kề AB hoặc BC.

3.  Hàng quá khổ (OOG): nếu không có hướng đặt hợp lệ và X′ > 2,6 m hoặc Y′ > 1,8 m hoặc Z_a > 1,8 m, không xếp kệ; đề xuất chuyển sang khu mặt sàn riêng và cảnh báo. Lưu ý ký hiệu FLOOR-[Dãy]-OOG trong ảnh chỉ là mẫu mã loại vị trí, phải gắn với vị trí sàn thực tế khi triển khai.
    
    **Bổ sung:**
    Nếu hàng có 2,6 m < X′ ≤ 3,8 m (và Y′ ≤ 1,8 m, Za ≤ 1,8 m, Mpal ≤ 4.500 kg) thì vẫn được phép gán lên kệ Tầng 1, khóa trọn khoang mã [Dãy]-[ô]-1-ABC.
    Chỉ khi nào bề ngang X′ > 3,8 m (không lọt lòng khoang kệ 4 m) hoặc sâu Y′ > 1,8 m thì mới bắt buộc đẩy ra khu sàn ngoài (Khu vực OOG).

4.  Gỗ thô: nếu mã hàng/loại hàng = “Gỗ thô”, chỉ lưu tầng 1, khóa cả ba slot A+B+C của một ô; tải trọng hàng trong phạm vi giới hạn 4.500 kg đã được quy định.

Ví dụ hàng 1,95 × 1,1 m: xoay để bề ngang X′ = 1,95 m và chiều sâu Y′ = 1,1 m; vì 1,4 \< X′ ≤ 2,6 và Y′ ≤ 1,8 nên phân loại pallet đôi (không đặt chiều sâu Y′ = 1,95 m).

## 5. Tải trọng (tính theo khối lượng hàng, chưa tính pallet)

| Loại pallet       | Tầng 2–6      | Tầng sàn (tầng 1) |
|-------------------|---------------|-------------------|
| Pallet đơn        | ≤ 700 kg      | ≤ 1.500 kg        |
| Pallet đôi        | ≤ 1.400 kg    | ≤ 3.000 kg        |
| Gỗ thô (3 vị trí) | Không áp dụng | ≤ 4.500 kg        |

Tải trọng theo ô kệ: tầng sàn tối đa khoảng 4,5 tấn hàng (5 tấn theo tài liệu gốc); mỗi tầng từ tầng 2 trở lên tối đa 2,1 tấn.

Quy tắc chọn tầng: pallet có khối lượng hàng trên 700 kg (pallet đơn) hoặc trên 1.400 kg (pallet đôi) chỉ được đặt ở tầng sàn. Pallet đúng 700 kg có thể ưu tiên tầng 2–6.

## 6. Dữ liệu đầu vào (Excel)

Các cột: Mã hàng, Tên hàng, Loại hàng, ĐVT, Số lượng, Quy cách 1 kiện (D×R×C), Tổng CBM, G.W/kiện, N.W/kiện, Tổng G.W, Tổng N.W, Khách hàng, Khách hàng (ghi tắt).

Quy ước xử lý:

- Khối lượng 1 kiện dùng để kiểm tải là **G.W/kiện**.

- Đơn vị kích thước tự nhận (cm, mm hoặc m) và cho phép chọn thủ công.

- Mỗi dòng mã hàng được xử lý độc lập, không ghép với mã khác.

### 6.1 Nhập từng mặt hàng và lưu vào vị trí kho trống

Ngoài nhập file Excel, người dùng nhập một hoặc nhiều mặt hàng bằng biểu mẫu; hệ thống tính pallet rồi đề xuất vị trí trống để lưu ngay.

| Trường nhập              | Bắt buộc | Ghi chú                                |
|--------------------------|----------|----------------------------------------|
| Mã hàng, tên hàng        | Có       | Mã hàng là SKU của pallet              |
| Loại hàng, ĐVT           | Không    | Loại "Gỗ thô" kích hoạt quy tắc gỗ thô |
| Số lượng (số kiện)       | Có       | Số nguyên lớn hơn 0                    |
| Quy cách D×R×C và đơn vị | Có       | Cm, mm hoặc m                          |
| G.W/kiện (kg)            | Có       | Dùng để kiểm tải trọng                 |
| Khách hàng               | Có       | Chọn từ danh sách khách thuê           |

Quy trình:

1.  Người dùng nhập một hoặc nhiều mã hàng vào cùng một phiếu nhập.

2.  Hệ thống chạy thuật toán mục 7: loại pallet, số pallet đầy, pallet lẻ, tầng bắt buộc.

3.  Hệ thống lọc các vị trí trống đủ điều kiện: pallet đơn cần 1 vị trí; pallet đôi cần AB hoặc BC liền kề cùng tầng đều trống; gỗ thô cần cả 3 vị trí tầng 1 của một ô còn trống hoàn toàn.

4.  Sau khi lọc đầy đủ điều kiện an toàn, các ô thuộc vùng thuê và ô/tầng không bị chặn lối xe nâng, hệ thống tự chọn vị trí theo từng tầng trên các dãy, ưu tiên từ TRÁI sang PHẢI theo tọa độ vật lý. Vì mã ô được đánh từ PHẢI sang TRÁI, trong một dãy quét theo mã ô GIẢM DẦN (vd. 84→01 ở dãy 110–124). Tiêu chí gần cùng SKU chỉ là tiêu chí phụ.

5.  Hệ thống tự động đề xuất toàn bộ vị trí phù hợp; người dùng chỉ xem danh sách và bấm “Xác nhận lưu kho”, không phải chọn vị trí thủ công. Ngay trước khi ghi nhận, hệ thống kiểm tra lại các điều kiện và trạng thái vị trí trong một giao dịch an toàn.

6.  Sau khi xác nhận, vị trí chuyển sang trạng thái "đang dùng" và lưu lịch sử nhập (người nhập, thời gian, khách, mã hàng, số kiện).

Quy tắc đi kèm:

- Không ghi đè vị trí đang dùng.

- Vị trí đang được đề xuất cho một phiếu nhập được giữ chỗ tạm, để hai người nhập cùng lúc không trùng vị trí.

- Không đủ vị trí trống: báo số pallet còn thiếu, cho phép lưu phần đã xếp được.

- Hàng quá khổ không vào kệ: ghi nhận lưu mặt sàn và quản lý riêng.

Đã chốt: hệ thống tự chọn vị trí trống; một phiếu nhập được chứa nhiều mã hàng, mỗi mã hàng tính pallet riêng và không trộn mã trên cùng pallet.

## 7. Thuật toán xếp hàng lên pallet (Giai đoạn 2)

Với mỗi dòng mã hàng:

1.  Xác định loại pallet theo mục 4.

2.  Tính số kiện/lớp: tạo các phương án: (A) mọi kiện cùng hướng 0°, (B) mọi kiện cùng hướng xoay 90°.
    **Sửa chốt:** Mỗi lớp chỉ xếp đồng nhất theo 1 hướng (hoặc toàn bộ kiện 0 độ, hoặc toàn bộ kiện 90 độ), không trộn 2 hướng cùng một mặt phẳng lớp pallet để khớp câu trả lời chốt Mục 12. Dùng công thức u_lưới = max(⌊X_s/x_k⌋×⌊Y_s/y_k⌋, ⌊X_s/y_k⌋×⌊Y_s/x_k⌋); X_s×Y_s là vùng kê đã được duyệt theo loại pallet. u = số kiện lớn nhất trong các bố trí hợp lệ, không vượt vùng kê/độ nhô đã phê duyệt.

3.  Số lớp tối đa theo chiều cao: k_max = ⌊1,65/z_k⌋, Z′ = k × z_k và Z_a = 0,15 + Z′ ≤ 1,8 m (không được lật thùng).

4.  Số kiện tối đa theo tải trọng: C_tải = ⌊M_max / m_k⌋, với m_k = G.W/kiện; M_max theo mức tầng 2–6 (đơn 700 kg, đôi 1.400 kg) hoặc tầng 1 (đơn 1.500 kg, đôi 3.000 kg). Nếu 1 kiện vượt khả năng chịu tải của tầng trên nhưng còn trong giới hạn sàn thì chỉ xét tầng 1.

5.  Sức chứa hình học C_geo = u × k_max (ước tính theo cấu hình lớp đã chọn). Sức chứa theo tải C_tải = ⌊M_max/m_k⌋. Số kiện đề xuất C_thực ≤ min(C_geo, C_tải), chỉ chấp nhận nếu lập được toàn bộ lớp, kể cả lớp cuối ít kiện, thỏa phân bố tải, điểm tựa và ổn định. Có thể giảm số kiện trong một lớp thay vì chỉ giảm nguyên số lớp. Kiện dư chuyển sang pallet kế tiếp.

6.  Với mỗi SKU: số pallet đầy = ⌊N_tổng / C_thực⌋; số kiện dư = N_tổng mod C_thực và nếu số dư \> 0 thì thêm một pallet lẻ. Mỗi pallet chỉ chứa 01 SKU.

7.  Mỗi pallet có khối lượng hàng trên ngưỡng tầng 2–6 được đánh dấu bắt buộc tầng sàn.

8.  Tổng hợp số vị trí cần (đơn 1, đôi 2, gỗ thô 3) và so với sức chứa.

9.  Không xếp kệ các trường hợp OOG theo X′, Y′, Z_a, hoặc khối lượng một kiện vượt tải trọng tối đa cho loại pallet/tầng sàn. Phải nêu lý do và chuyển xử lý ngoại lệ hoặc khu mặt sàn phù hợp; không tự gán mã vị trí kệ.

Bố trí kiện trong một lớp (quy tắc chốt v2.0): Mỗi lớp chỉ xếp đồng nhất theo 1 hướng (toàn bộ 0° hoặc toàn bộ 90°), không trộn 2 hướng cùng một mặt phẳng lớp pallet. Lưu sơ đồ tọa độ (x, y, góc xoay) từng kiện để hiển thị và kiểm thử.

Trạng thái: đã có bản chạy thử trên web (xem https://claude.ai/artifact/8bTjXUViNwyUYSZknkTPxS), đã kiểm tra trên 5 dòng mẫu.

## 8. Thuật toán phân bổ vị trí (theo sơ đồ 24 dãy cập nhật v2.0)

- Mã vị trí: \[Dãy\]-\[Ô\]-\[Tầng\]-\[Pallet\], ví dụ 110-64-4-A. Pallet đôi: ...-AB hoặc ...-BC; gỗ thô: ...-1-ABC. Dãy 101: ô 01–45; 102–109: 01–49; 110–124: 01–84. Định danh vị trí không đổi, nhưng phải đối chiếu thứ tự slot theo tính chẵn/lẻ của dãy.

- Bộ lọc an toàn áp dụng TRƯỚC ưu tiên: (1) đúng khu khách thuê; (2) đúng dãy/ô/tầng/slot tồn tại trong mặt bằng; (3) khóa các tầng 1–3 tại ô 12 của dãy 101–109 và các ô 12, 26, 43, 60 thuộc dãy 110–124; (4) trạng thái trống, không khóa/giữ chỗ; (5) pallet đơn/đôi/gỗ thô đúng số slot liền kề; (6) kích thước, tối đa 01 pallet đơn nhô/tầng/ô, tải trọng pallet và tổng tải tầng; (7) lối đi/điều kiện tiếp cận và phê duyệt an toàn.

- Sau lọc an toàn, xác định nhóm tầng hợp lệ: pallet đơn ≤ 700 kg hoặc pallet đôi ≤ 1.400 kg ưu tiên tầng 2–6; nặng hơn các ngưỡng này chỉ được vào tầng 1, trong giới hạn tầng sàn. Gỗ thô chỉ tầng 1. Không được đưa pallet xuống tầng khác trái các giới hạn an toàn chỉ để đi đúng thứ tự.

- Thứ tự ưu tiên đã chốt: xét các TẦNG hợp lệ lần lượt trên toàn vùng thuê (pallet nhẹ ưu tiên 2→3→4→5→6, sau đó tầng 1 nếu hợp lệ; hàng buộc sàn chỉ tầng 1). Trong từng tầng, duyệt dãy theo trình tự không gian trên sơ đồ 101→124 nếu nằm trong vùng thuê, rồi duyệt ô theo thứ tự vật lý TRÁI→PHẢI, tương đương mã ô lớn→nhỏ. Với dãy lẻ xét slot A→B→C, dãy chẵn xét C→B→A khi quét trái→phải; pallet đôi xét các cặp liền kề hợp lệ theo vị trí vật lý. Không cấp slot trong vùng lối đi.

- Khách thuê: toàn kho 24 dãy và 1.697 ô mặt bằng, nhiều khách cùng sử dụng. Cấp quyền trọn 6 tầng của các ô được thuê theo công thức diện tích đã chốt, nhưng KHÔNG đồng nghĩa khách được dùng tầng 1–3 của ô đặc biệt. Chỉ phân bổ pallet vào tập slot cho phép và còn trống của khách thuê đó. Chiều trái–phải và sự thẳng hàng phải dựa trên tọa độ mặt bằng mới.

- **Hàng quá khổ:** lưu mặt sàn, quản lý vị trí riêng.

- Giao dịch xác nhận: hệ thống đề xuất và tạm giữ vị trí cho phiếu nhập; khi bấm “Xác nhận lưu kho”, kiểm tra lại quyền khu thuê, trạng thái giữ chỗ, số slot, kích thước, chiều cao và tải trọng; ghi pallet, chiếm slot, cập nhật 3D và lịch sử nhập theo một giao dịch. Khi xung đột, hủy phương án cũ và tính lại, không ghi đè. Khi thiếu chỗ, báo rõ pallet chưa được xếp và chỉ lưu phần hợp lệ khi người dùng xác nhận.

Minh họa: pallet nhẹ ở tầng 2 chỉ xét slot hợp lệ (không xét ô 12 của nhóm 101–109 và các ô 12/26/43/60 của nhóm 110–124). Ở dãy 110, quét ô 84→01 từ trái sang phải, đồng thời đi qua hai khoảng lối đi giữa cặp 77–78 và 72–73 mà không tạo ô ảo; hết các dãy thuê ở tầng 2 mới xét tầng 3. Với pallet nặng buộc sàn, xét tầng 1 theo nguyên tắc tương tự.

Một phiếu nhập nhiều SKU: mỗi pallet được bố trí độc lập; tuyệt đối không trộn SKU trên cùng pallet. Quy tắc Master hiện tại cho phép các slot A/B/C trong cùng ô chứa SKU khác nhau; giữ nguyên quy định này cho đến khi có xác nhận thay đổi.

Quy tắc chọn vị trí không được coi là cam kết xếp an toàn nếu chưa xác minh dữ liệu thiết kế kệ, khoảng nhô pallet và giới hạn tải trọng thực tế. Các thông số an toàn của Master vẫn là điều kiện bắt buộc.

## 9. Mô phỏng 3D (Giai đoạn 4)

- Hiển thị toàn kho 24 dãy với số ô theo nhóm (101:45; 102–109:49; 110–124:84), mỗi ô 6 tầng và mỗi tầng 3 slot, ngoại trừ tầng bị chừa lối xe nâng. Bảo toàn hình dạng khoảng trống trung tâm ở phía dưới theo bản phác mặt bằng do khách hàng cung cấp; không vẽ như 24 dãy chữ nhật đồng đều.

- Chọn xem từng dãy, từng tầng; nhấn vào pallet để xem thông tin (mã hàng, khách, số kiện, khối lượng).

- Phân biệt màu vị trí trống, đang dùng, pallet đôi, gỗ thô.

- Khối lượng dữ liệu: 1.697 ô × 6 tầng × 3 vị trí = 30.546 slot danh nghĩa, 29.925 slot sau khi loại các tầng chừa thông; áp dụng lọc hiển thị theo dãy/tầng, LOD hoặc instancing để vận hành mượt.

## 10. Mô hình dữ liệu đề xuất

| Bảng          | Trường chính                                                                                            |
|---------------|---------------------------------------------------------------------------------------------------------|
| Khách thuê    | Mã, tên, tên viết tắt                                                                                   |
| Mã hàng (SKU) | Mã, tên, loại, kích thước kiện, G.W, N.W                                                                |
| Lô nhập       | Mã lô, khách, ngày nhập, file nguồn                                                                     |
| Pallet        | Mã pallet, SKU, số kiện, khối lượng, loại (đơn, đôi, gỗ thô), tầng bắt buộc                             |
| Vị trí        | Dãy, ô, tầng 1–6, slot A/B/C, tọa độ, trạng thái khả dụng/khóa lối xe nâng, khách thuê, pallet đang giữ |
| Lịch sử       | Nhập, xuất, di chuyển theo thời gian                                                                    |

## 11. Lộ trình triển khai

| Giai đoạn | Nội dung                                           | Trạng thái                           |
|-----------|----------------------------------------------------|--------------------------------------|
| 1         | Chốt quy tắc kho, kích thước, tải trọng, phân loại | Hoàn thành                           |
| 2         | Thuật toán xếp pallet từ Excel                     | Có bản chạy thử, chờ file Excel thật |
| 3         | Thuật toán phân bổ vị trí                          | Chưa bắt đầu                         |
| 4         | Mô phỏng 3D                                        | Chưa bắt đầu                         |
| 5         | Kiểm thử đối chiếu dữ liệu thật                    | Chưa bắt đầu                         |
|           |                                                    |                                      |

## 12. Việc còn mở cần chốt

1.  Thông số khe lưng kệ cũ 0,5 m và pallet nhô sau khung 0,2 m cần đối chiếu với sơ đồ 24 dãy mới; tài liệu sodokho(1) không cung cấp đầy đủ tọa độ/góc quay từng khung. Chưa có biên bản xác nhận an toàn kết cấu, độ võng và lối xe nâng.

2.  File Excel thật để kiểm tra tên cột và đơn vị kích thước.

3.  Đã chốt sửa: Mỗi lớp chỉ xếp đồng nhất theo 1 hướng (hoặc toàn bộ kiện 0 độ, hoặc toàn bộ kiện 90 độ), không trộn 2 hướng cùng một mặt phẳng lớp pallet.

4.  Khách thuê: cần bản đồ ô thuộc từng vùng thuê. Đã chốt mã dãy 101–124; ô tăng từ phải sang trái (01 ở bên phải); slot A/B/C đổi hướng theo chẵn/lẻ dãy. Hình thức vật lý “từ trái sang phải” phải ánh xạ thành mã ô giảm dần.

5.  Ưu tiên vị trí sau khi lọc an toàn: theo tầng → các dãy hợp lệ trong vùng thuê theo thứ tự sơ đồ → ô từ TRÁI sang PHẢI (mã số GIẢM dần) → slot vật lý từ trái sang phải (lẻ A/B/C, chẵn C/B/A). Không được đề xuất tầng 1–3 của các ô có lối xe nâng bên dưới.

6.  Xuất kết quả: Excel, PDF hay cả hai.

7.  Phân quyền: quản trị, nhân viên kho, khách thuê.

8.  Có tải nhiều file hoặc nhiều lô cùng lúc không.

9.  Giới hạn tải theo ô: 4,5 tấn hay 5 tấn ở tầng sàn.

## 13. Tiêu chí nghiệm thu mẫu

| Trường hợp                        | Kết quả mong đợi                                                                   |
|-----------------------------------|------------------------------------------------------------------------------------|
| Kiện 60×40×30 cm, 12 kg, 500 kiện | Pallet đơn, 9 kiện/lớp, 5 lớp, 45 kiện/pallet, 11 pallet đầy và 1 pallet lẻ 5 kiện |
| Hàng 195×110×80 cm, 300 kg        | Pallet đôi, vì dài hơn 1,8 m                                                       |
| Kiện 100×100×100 cm, 900 kg       | Pallet đơn, bắt buộc tầng sàn                                                      |
| Hàng 300×150×100 cm, ≤ 4.500 kg   | Quá khổ lọt lòng khoang kệ: Gán kệ Tầng 1, khóa trọn khoang mã [Dãy]-[ô]-1-ABC    |
| Gỗ thô                            | Khóa cả 3 vị trí tầng 1, mã \[Dãy\]-\[Ô\]-1-ABC                                    |

## 14. Sơ đồ kho thực tế 101–124 – nguồn sodokho(1).docx

Mục này thay thế TOÀN BỘ các mô tả mặt bằng thuộc bản Master v1.7: 15 dãy 110–124, 87 ô/dãy, ngắt giữa ô 43–44 và giả định dãy 124 đơn nằm trên sát tường. Cấu trúc và quy tắc trong tài liệu “sodokho(1).docx” là nguồn mới nhất cho sơ đồ kho. Các quy tắc xếp pallet/tải trọng không bị tài liệu này thay đổi vẫn được giữ nguyên.

### 14.1. Số hàng, số ô và hướng đánh số

| **Dãy**  | **Số ô**   | **Quy tắc**                                                    |
|----------|------------|----------------------------------------------------------------|
| 101      | 45         | Hàng lẻ, cách tường 0,5 m; ô 01 ở phía phải; ô 45 ở phía trái. |
| 102–109  | 49 mỗi dãy | 8 dãy; mỗi dãy đánh số ô 01–49 từ phải qua trái.               |
| 110–124  | 84 mỗi dãy | 15 dãy; mỗi dãy đánh số ô 01–84 từ phải qua trái.              |
| Toàn kho | 1.697 ô    | 45 + 8 × 49 + 15 × 84.                                         |

Theo ghi chú mới: hàng 101 “bắt đầu từ gốc dưới đi lên”. Khi chuyển sang hệ tọa độ 2D/3D, lưu hướng và trật tự tăng dãy theo bản phác thực tế, không suy luận rằng dãy 101 nằm ở mép trên chỉ từ cách hiển thị trang giấy.

### 14.2. Bố cục không gian và hình dạng vùng trống

Giữ đúng hình dạng trên sơ đồ gốc: phần trên có các hàng kệ kéo dài ngang; phần dưới bên trái có các cụm kệ ngắn hơn; phần dưới trung tâm là khoảng trống lớn không đặt kệ; phần dưới bên phải vẫn có cụm kệ. Các dãy và ô cần căn theo các mốc thẳng hàng ở mục 14.4. Đây là ràng buộc trực tiếp cho giao diện 2D và mô hình 3D; không được tự chia ba vùng thành ba kho độc lập.

<img src="assets/media/image1.png" style="width:6.05in;height:2.4527in" />

Hình 14.1 – Sơ đồ phác thảo trực tiếp từ tài liệu sodokho(1).docx (tham khảo bố cục; chưa phải bản vẽ CAD có tỷ lệ).

### 14.3. Lối đi và các ô có tầng chừa thông

| **Dãy áp dụng** | **Vị trí**                       | **Quy tắc mô hình và phân bổ**                                                      |
|-----------------|----------------------------------|-------------------------------------------------------------------------------------|
| 101             | Ô 12                             | Tầng 1, 2, 3 là lối xe nâng: không có slot lưu pallet; tầng 4, 5, 6 được lưu hàng.  |
| 102–109         | Ô 12 mỗi dãy                     | Tầng 1–3 là lối xe nâng; tầng 4–6 có thể chứa pallet nếu qua kiểm tra tải/tiếp cận. |
| 110–124         | Ô 12, 26, 43, 60 mỗi dãy         | Tầng 1–3 chừa lối xe nâng; tầng 4–6 giữ vị trí lưu trữ.                             |
| 110–124         | Giữa ô 77 và 78; giữa ô 72 và 73 | Lối đi ngang rộng 4 m ở giữa cặp ô; không được coi là ô hay slot tồn kho.           |

Không được chuyển những ô đặc biệt thành “ô cấm toàn bộ”: vị trí tầng 4–6 vẫn tồn tại. Đồng thời không được áp dụng máy móc lối đi 4 m tại ô 43–44 của v1.7; lối đi ngang mới nằm giữa cặp 72–73 và 77–78.

### 14.4. Mốc thẳng hàng bắt buộc

| **Hàng nguồn** | **Mốc của hàng nguồn** | **Thẳng hàng với nhóm 110–124** |
|----------------|------------------------|---------------------------------|
| 101            | Ô 26                   | Ô 65                            |
| 101            | Ô 33 và 34             | Ô 72 và 73 tương ứng            |
| 101            | Ô 38 và 39             | Ô 77 và 78 tương ứng            |
| 102–109        | Ô 26                   | Ô 61                            |
| 102–109        | Ô 37 và 38             | Ô 72 và 73 tương ứng            |
| 102–109        | Ô 42 và 43             | Ô 77 và 78 tương ứng            |

Đây là các ràng buộc thẳng hàng giữa các dãy khi dựng bản đồ. Không tự nội suy toàn bộ khoảng cách mét giữa mọi ô chỉ từ các điểm mốc; cần CAD/số đo hiện trạng để xác định tọa độ chính xác.

### 14.5. Chiều tăng số ô, tầng và vị trí pallet A/B/C

• Số ô trong tất cả các dãy tăng theo hướng PHẢI → TRÁI. Duyệt vật lý TRÁI → PHẢI tương ứng số ô từ lớn xuống nhỏ.

• Tầng 1→6 được đánh số theo hướng DƯỚI → TRÊN. Chỉ áp dụng điều kiện chừa thông 1–3 tại các ô đặc biệt đã nêu.

• Trong mỗi ô: với dãy LẺ (101,103,...,123), mặt tiền từ trái sang phải là A–B–C; với dãy CHẴN (102,104,...,124), mặt tiền từ trái sang phải là C–B–A.

• Mỗi pallet chứa đúng một SKU; các pallet khác nhau trong cùng khoang được phép khác SKU. Pallet đôi chỉ chiếm AB hoặc BC liền kề đúng mặt bằng; không dùng AC.

## 15. Cấp khoang thuê theo diện tích và thứ tự mặt bằng mới

Giữ phương pháp A đã xác nhận: số ô nguyên cần cấp N = ceil(S_thuê × 0,70 / 5,6), trong đó S_thuê tính theo m². Cấp trọn quyền khu vực một ô theo dãy/ô, không chia quyền ba slot hoặc sáu tầng cho hai khách thuê; tuy nhiên quyền thuê không làm mất giới hạn không lưu ở tầng 1–3 của ô đặc biệt.

Ví dụ 500 m²: S_kệ = 350 m², N = ceil(350 / 5,6) = 63 ô. Nếu kho còn đủ 63 ô chưa cấp, hệ thống cố gắng cấp ô liền nhau trên mặt bằng, từ trái sang phải, và chỉ mở rộng qua dãy khác nếu cần. Con số 63 ô không đồng nghĩa 63 × 18 = 1.134 slot đều sử dụng được: phải trừ tầng bị chừa thông nếu chọn các ô đặc biệt.

Dữ liệu đầu vào ngoài diện tích: danh sách các ô có quyền cấp, trạng thái khách thuê đang sử dụng, sơ đồ hướng trái–phải và tập dãy thực tế. Ưu tiên vùng liền mạch, không cấp trùng quyền ô đã cấp cho khách khác hoặc ô không được phép cho thuê. Sau xác nhận, ghi lịch sử, phiên bản phân khu và trạng thái ô trong một giao dịch PostgreSQL.

Ví dụ minh họa khi dãy 110 hoàn toàn chưa được cấp quyền: muốn cấp 63 ô liền nhau từ bên trái sang phải trên dãy 110 thì ô sẽ được duyệt từ 84 xuống 22 (tổng 63 ô), không còn là ô 01–63 như trong Master v1.7. Minh họa này chỉ xét quyền cấp ô, không bảo đảm mọi tầng/slot đều sử dụng được.

## 16. Ảnh hưởng đến database, API và sơ đồ 2D/3D

| **Thực thể / thành phần** | **Thông tin cần có hoặc ràng buộc**                                                                                 |
|---------------------------|---------------------------------------------------------------------------------------------------------------------|
| warehouse_row             | row_code (101–124), bay_count (45 / 49 / 84), row_order, segment_geometry, wall_clearance_if_known                  |
| warehouse_bay             | row_code, bay_no, x/y vị trí thực tế, in_tenant_zone, vùng cho thuê; UNIQUE(row_code,bay_no)                        |
| rack_level                | row_code, bay_no, level_no (1..6), has_storage (bool), is_forklift_passage (bool), clearance_status                 |
| rack_slot                 | level_id, slot_code A/B/C, physical_order (lẻ A-B-C; chẵn C-B-A), occupied_by_pallet_id, state                      |
| aisle                     | type=BETWEEN_BAYS; row 110–124; gap (77,78)/(72,73); width_m=4; vùng polygon/tọa độ (cần đo)                        |
| tenant_bay_assignment     | tenant_id, row_code, bay_no, thời gian hiệu lực; chống cấp trùng khi đồng thời                                      |
| pallet + occupancy        | Không gán tầng 1–3 của ô có lối đi, kiểm tra tải, chiều cao, loại pallet, số slot và người thuê                     |
| 3D visualization          | Dùng bản phác vùng trống trung tâm + căn chỉnh theo mốc; không vẽ kệ xuyên các hành lang; cho click dãy/ô/tầng/slot |

Thứ tự tìm chỗ: chỉ xét các slot nằm trong vùng thuê, còn khả dụng và có thể tiếp cận. Trước hết lọc theo trạng thái đặc biệt, lối đi, chiều cao, tải trọng, kích thước, độ nhô và cấu trúc pallet. Sau đó chọn theo tầng ưu tiên → thứ tự dãy trong bản đồ → từ trái sang phải (mã ô giảm) → slot theo hướng chẵn/lẻ. Xác nhận theo giao dịch để tránh trùng pallet và trùng ô thuê.

## 17. Bài kiểm thử nghiệp vụ bổ sung cho v2.0

| **Mã**   | **Đầu vào / tình huống**                 | **Kết quả mong đợi**                                                            |
|----------|------------------------------------------|---------------------------------------------------------------------------------|
| TC-MB-01 | Khởi tạo đầy đủ các dãy 101–124          | 24 dãy và 1.697 ô; nhóm 101=45, 102–109=49, 110–124=84.                         |
| TC-MB-02 | Số ô trong dãy 110                       | 84 ở ngoài cùng trái, 01 ở ngoài cùng phải; đánh số giảm từ trái sang phải.     |
| TC-MB-03 | Mã slot tại dãy 110 chẵn / 111 lẻ        | 110 trái→phải C,B,A; 111 trái→phải A,B,C.                                       |
| TC-MB-04 | Dãy 101, ô 12, tầng 2 và 5               | Tầng 2 bị khóa lối xe nâng; tầng 5 có thể được cân nhắc nếu đạt an toàn.        |
| TC-MB-05 | Dãy 110, ô 26, tầng 1 và 6               | Tầng 1 không được đặt pallet; tầng 6 vẫn có vị trí.                             |
| TC-MB-06 | Lối đi giữa ô 72/73 và 77/78             | Có hai khoảng trống 4 m giữa ô; không có ô/slot ảo; số ô vẫn 84.                |
| TC-MB-07 | 500 m², đủ ô trống liên tiếp ở dãy 110   | Đề xuất 63 ô từ trái sang phải = mã 84→22, không cấp trùng khách.               |
| TC-MB-08 | Khi dựng 2D/3D                           | Giữ vùng trống trung tâm và các mốc thẳng hàng; không sinh kệ tại khoảng trống. |
| TC-MB-09 | Phân bổ 2 pallet đồng thời vào cùng slot | Một giao dịch thắng, giao dịch khác tính lại; không ghi đè.                     |

Tính toán kiểm kê: có 69 ô đặc biệt có ba tầng dưới không được lưu pallet = 1 + 8×1 + 15×4. 30.546 slot danh nghĩa trừ 69×3 tầng×3 slot = 29.925 slot tối đa theo trạng thái cấu trúc. Đây không phải sức chứa vận hành đã kiểm định.

## 18. Những thông tin còn cần xác nhận / đo thực địa

• Khoảng cách thực giữa từng dãy và hướng mặt tiền của mỗi dãy; kế hoạch “7 cặp quay lưng + 1 dãy đơn” thuộc phiên bản 15 dãy cũ, không dùng làm chân lý cho sơ đồ 24 dãy mới.

• Tọa độ XY thực tế, chiều rộng lối ngang/dọc bên ngoài hai cặp 72–73 và 77–78, khoảng cách xung quanh vùng trống trung tâm, đường đi xe nâng và cột chịu lực.

• Bề rộng thông thủy 4 m sau khi đặt pallet nhô, yêu cầu xe nâng/PCCC, độ võng, khe hở sau kệ và giới hạn tải trọng trên nhãn kệ.

• Diện tích tổng kho 30.375 m² là số cũ: cần đối chiếu hiện trạng trước khi dùng làm chỉ số kiểm soát tổng diện tích thuê, trong khi công thức hoạch định theo diện tích vẫn giữ 70%/5,6 m².

• File Excel hàng hóa thật, danh sách khách thuê, bản đồ phân khu được cấp và lối vận hành hàng quá khổ ngoài kệ.

## 19. Nhật ký thay đổi phiên bản

v1.7: chốt thuật toán kết hợp kiện xoay 0°/90° trong cùng một lớp, không lật thùng; giữ các giới hạn tải/pallet đã xác định.

v2.0: dùng sodokho(1).docx thay cấu hình mặt bằng 15×87 bằng 24 dãy phân nhóm 45/49/84; đánh số ô từ phải qua trái và slot chẵn/lẻ; bổ sung ô có tầng chừa thông, hai lối ngang 4 m, mốc thẳng hàng, quy tắc phân khu, database và kiểm thử.
