**PHÂN TÍCH TRANG KHÁCH HÀNG (admin.huytim.com/khach/) VÀ ĐỀ XUẤT VIẾT LẠI**

Ngày 07/11/2026. Tài liệu kỹ thuật nội bộ, không chứa dữ liệu khách.

**1. Trang đang có gì**

Một file `khach/index.html` 375 dòng (CSS riêng 118 dòng, JS 227 dòng), nạp `theme.css` và `shell.js` chung. Dữ liệu đọc qua 5 view `public.timus_*` (clients, client_requests, client_updates, client_docs, shops), realtime cho 3 bảng (requests, updates, docs). Hiện có 9 khách, 10 việc, 26 ghi chép, 8 tài liệu, 2 bộ điều khoản phí.

Hai màn hình:

- Tất cả: 4 ô chỉ số (khách, việc đang mở, quá hạn, chờ khách) và một bảng 5 cột (khách, giai đoạn, việc xong/tổng, hạn gần nhất, bước tiếp theo). Không lọc, không tìm, không sắp xếp.
- Tab khách: tên và dịch vụ, dãy 5 giai đoạn bấm để đổi, ô "Bước tiếp theo", hai cột: Yêu cầu (nhóm theo trạng thái, thêm nhanh, chọn hàng loạt) và Tiến độ (ghi chép tự do) + Thông tin (liên hệ, hợp đồng, shop, ghi chú), dưới cùng là Tài liệu (bảng tóm tắt 3 cột Khoản / Nội dung / Giá, kèm PDF, in bảng).

Từ 6 khách trở lên, dãy tab thành ô chọn; hiện đang 9 khách nên đã ở chế độ này.

**2. Những chỗ chưa chuyên nghiệp, xếp theo mức ảnh hưởng**

Hồ sơ khách thiếu các trường mà một hồ sơ bán hàng cần:
- Không có người phụ trách phía TIMUS, nguồn khách (giới thiệu, TikTok, inbox), thị trường (Việt Nam, Mỹ), ngành hàng, quy mô (vốn, doanh thu), giá trị hợp đồng hoặc mức phí, ngày tiếp cận đầu tiên, ngày liên hệ gần nhất, lý do tạm dừng.
- Điều khoản phí nằm ở bảng `client_terms` nhưng trang khách không hiển thị; phải sang trang vận hành mới thấy.
- Liên hệ gộp một dòng "tên · số · email", không bấm gọi hay mở Zalo được.

Danh sách khách không dùng làm bảng điều hành được:
- Không có cột phụ trách, thị trường, liên hệ gần nhất, số ngày đang ở giai đoạn; không biết khách nào đang "im lặng".
- Không có chế độ pipeline theo 5 giai đoạn; ô chọn khách khi trên 5 khách kém hơn hẳn một bảng có lọc và tìm.
- Chỉ số đầu trang không có "hôm nay cần làm gì" gom từ mọi khách.

Việc (đang gọi là "Yêu cầu") lẫn hai thứ: việc TIMUS phải làm và yêu cầu khách đưa ra:
- Không có người phụ trách, không gắn được với tài liệu, không có việc con; ghi chú chỉ thấy khi mở ngăn sửa.
- Loại việc cố định 6 giá trị, thiếu "nghiên cứu", "họp", "gửi tài liệu".

Nhật ký tiến độ là ô chữ tự do:
- Không có loại (gọi, gặp, gửi tài liệu, khách phản hồi, quyết định), không gắn với việc, không tự sinh dòng khi đổi giai đoạn, tải tài liệu hay xong việc.
- Nút × xóa ghi chép ngay, không hỏi lại (dòng 323). Đây là lỗi cần sửa trước.

Tài liệu được thiết kế cho báo giá, không hợp với nghiên cứu và hợp đồng:
- Bảng tóm tắt cứng 3 cột Khoản / Nội dung / Giá; báo cáo nghiên cứu phải nhét nội dung vào cột "Giá".
- Không có loại tài liệu, không phân biệt bản gửi khách và bản nội bộ, không có trạng thái "đã gửi ngày nào", không có phiên bản.
- Tải PDF lên thì tiêu đề lấy từ tên file, phải vào SQL mới sửa được tiêu đề và ghi chú (giao diện không có nút sửa tài liệu).
- Mở PDF bằng link 10 phút ở tab mới; không có nút tạo link gửi khách (7 ngày) nên hôm trước phải tạo tay bằng JavaScript.

Giao diện và kỹ thuật:
- CSS riêng 118 dòng ghi đè theme chung bằng bảng màu kiểu Notion cũ (màu `--accent:#2383E2`, `--ink:#37352F`), trong khi theme chung đã chuyển sang bảng màu Atlassian. Hai bộ màu chồng nhau.
- `render()` vẽ lại toàn bộ `innerHTML` mỗi lần có thay đổi, phải vá bằng đoạn lưu giữ ô đang gõ; thêm tính năng sẽ càng dễ lỗi.
- Bảng `clients` không có realtime, hai người cùng sửa sẽ không thấy nhau.
- URL chỉ có `#id`, không có đường dẫn tới từng tab tài liệu, việc; không có breadcrumbs như các trang khác.
- Không in hoặc xuất được hồ sơ khách.
- Chỉ admin TIMUS vào được; nhân viên vận hành không có chế độ chỉ xem.

**3. Đề xuất bản viết lại**

Nguyên tắc: giữ 5 bảng dữ liệu và skill `/khach` đang chạy, chỉ thêm cột; giữ phẳng, ít màu, theo theme Atlassian chung; mỗi khách là một trang có URL riêng.

Trang Danh sách:
- Thanh công cụ: tìm theo tên, lọc theo giai đoạn, thị trường, phụ trách; chuyển chế độ Bảng / Pipeline.
- Chế độ Bảng, cột: Khách (tên, dịch vụ) | Giai đoạn | Thị trường | Phụ trách | Việc mở (đỏ nếu quá hạn) | Liên hệ gần nhất (x ngày, vàng nếu trên 7 ngày) | Bước tiếp theo | Phí. Bấm tiêu đề cột để sắp xếp.
- Chế độ Pipeline: 5 cột theo giai đoạn, thẻ khách có số ngày ở giai đoạn, việc mở, bước tiếp theo; kéo thả để đổi giai đoạn (hỏi xác nhận).
- Chỉ số đầu trang: Tiếp cận, Đàm phán, Đang vận hành, Việc quá hạn, Chờ khách, Khách im lặng trên 7 ngày. Dưới chỉ số là khối "Hôm nay": việc tới hạn hôm nay và tuần này gom từ mọi khách.

Trang Hồ sơ khách (URL `#/<id>` và `#/<id>/tai-lieu`):
- Đầu trang: tên, nhãn giai đoạn, dịch vụ, thị trường, phụ trách, nút Gọi, Zalo, Email, Sửa. Dãy giai đoạn giữ như hiện tại.
- Một hàng 4 ô: ngày ở giai đoạn hiện tại, việc mở / quá hạn, liên hệ gần nhất, tài liệu đã gửi khách.
- Ô "Bước tiếp theo" giữ, thêm ngày hẹn.
- 5 tab: Tổng quan | Việc | Nhật ký | Tài liệu | Phí và hợp đồng.
  - Tổng quan: bước tiếp theo, 5 việc gần hạn, 5 ghi chép mới, 3 tài liệu mới, thông tin liên hệ và ghi chú.
  - Việc: như hiện tại, thêm cột phụ trách và tài liệu liên quan, ghi chú hiện ngay dưới tiêu đề khi bấm mở; hỏi trước khi xóa.
  - Nhật ký: dòng thời gian, mỗi dòng có loại (Gọi, Gặp, Gửi tài liệu, Khách phản hồi, Quyết định, Ghi chú) và dòng hệ thống tự sinh (đổi giai đoạn, tải tài liệu, xong việc); lọc theo loại; hỏi trước khi xóa.
  - Tài liệu: thẻ cho mỗi tài liệu với loại (Nghiên cứu, Báo giá, Hợp đồng, Phụ lục, Khác), đối tượng (Gửi khách / Nội bộ), trạng thái (Nháp / Đã gửi ngày...), phiên bản, kích thước; nút Xem (PDF mở trong ngăn bên), Tải, Link gửi khách 7 ngày (sao chép), Sửa tiêu đề và ghi chú, Thay PDF, Gỡ. Bảng tóm tắt có tiêu đề cột tùy chỉnh (mặc định Khoản / Nội dung / Giá).
  - Phí và hợp đồng: đọc từ `client_terms` (chế độ phí, phí cố định, thưởng), ngày bắt đầu, chỉ admin thấy; sửa vẫn ở trang vận hành.

**4. Dữ liệu cần thêm (một migration, không phá gì đang chạy)**

- `timus.clients`: `owner_email text`, `source text`, `market text` (vn, us, ca_hai), `industry text`, `deal_value numeric`, `first_contact date`, `last_contact_at timestamptz` (trigger cập nhật khi có ghi chép mới), `paused_reason text`.
- `timus.client_requests`: `assignee_email text`, `doc_id uuid`.
- `timus.client_updates`: `kind text` mặc định `ghi_chu` (goi, gap, gui_tai_lieu, khach_phan_hoi, quyet_dinh, he_thong), `request_id uuid`.
- `timus.client_docs`: `kind text` (nghien_cuu, bao_gia, hop_dong, phu_luc, khac), `audience text` (khach, noi_bo), `status text` (nhap, da_gui), `sent_at date`, `version int` mặc định 1, `columns jsonb` (tên cột của bảng tóm tắt).
- Tạo lại 4 view `public.timus_*` tương ứng. Skill `/khach` cập nhật thêm các cột mới nhưng vẫn chạy được với cột cũ.

**5. Kỹ thuật**

- Tách `khach/index.html` thành `index.html` (khung), `khach.css` (chỉ phần riêng, bỏ bảng màu Notion, dùng biến của theme), `khach.js` (dữ liệu và sự kiện), `views.js` (vẽ từng khối). Vẽ từng khối theo thay đổi, không vẽ lại cả trang.
- Realtime thêm bảng `clients`.
- Đường dẫn dạng `#/<id>/<tab>`; breadcrumbs "Huy Tim Quản trị / TIMUS Customers / Tên khách".
- Nút "In hồ sơ" xuất một trang A4 gồm thông tin, việc mở, 10 ghi chép mới, danh sách tài liệu.
- Quyền: admin TIMUS sửa; staff TIMUS chỉ xem (ẩn Phí và hợp đồng, ẩn nút sửa, xóa).
- Hỏi xác nhận mọi thao tác xóa và đổi giai đoạn lùi.

**6. Thứ tự làm**

- Đợt 1 (nửa ngày): sửa lỗi xóa ghi chép không hỏi; thêm nút Sửa tài liệu (tiêu đề, ghi chú) và nút Link gửi khách 7 ngày; migration thêm cột; nhật ký có loại.
- Đợt 2 (một ngày): tách file, trang hồ sơ khách 5 tab, đầu trang và hàng chỉ số, tài liệu có loại và trạng thái gửi.
- Đợt 3 (một ngày): danh sách dạng bảng có lọc, sắp xếp; chế độ Pipeline; khối Hôm nay; in hồ sơ; chế độ chỉ xem cho staff.

Mỗi đợt đẩy lên GitHub Pages riêng, kiểm tra trên localhost:8125 trước.
