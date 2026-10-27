# Huy Tim Quản trị

Trang quản trị chung cho các business của Huy Tim. Trang chủ (`index.html`) liệt kê các business; mỗi business một thư mục:
- `timus/`: TIMUS Vận hành (đang chạy).
- Academy: đang ở mentor.huytim.com, gắn vào sau.
- Landing: gắn vào sau.

## TIMUS Vận hành

Trang quản lý vận hành shop Shopee, Lazada, TikTok Shop, Amazon tại Việt Nam và Mỹ: shop, nhân viên, lịch ca (quy đổi giờ Mỹ), công việc, ghi chú, số liệu tháng, phí khách hàng. Trang tĩnh (HTML, CSS, JS thuần), dữ liệu lưu trên Supabase của hệ thống Huy Tim.

## Cấu trúc thư mục timus/
- `timus/index.html`: giao diện kiểu Notion. Nhân viên có mục Việc của tôi: tự thêm việc, checklist, nhật ký thực hiện, ghi chú cá nhân.
- `timus/store.js`: lớp nối Supabase. Đăng nhập bằng email (mật khẩu hoặc link qua email), đọc quyền từ `core.roles`, đọc và ghi các bảng trong schema `timus`, cập nhật trực tiếp qua realtime.
- `timus/config.js`: URL và publishable key của Supabase (khóa công khai, an toàn để nằm trong trang).

## Database (project Supabase dùng chung với mentor.huytim.com)
- `core.members`, `core.roles`: thành viên và quyền theo khu (`all`, `academy`, `timus`, `landing`), mức `owner` > `admin` > `staff` > `viewer`.
- `timus.*`: `shops`, `shop_support`, `staff`, `staff_pay`, `clients`, `client_terms`, `shift_assignments`, `tasks`, `task_notes`, `notes`, `shop_metrics`, `settings`.
- Quyền: viewer xem (trừ lương và phí); staff tự tạo việc, ghi chú, cập nhật shop, lịch ca, số liệu; admin thêm nhân viên, khách hàng, xem lương và phí; chỉ owner toàn hệ thống cấp quyền vào trang. Ghi chú cá nhân chỉ người viết thấy, trừ khi bật chia sẻ.

## Cách trang đọc dữ liệu
Trang gọi các view `public.timus_*` và `public.core_*`. Đây là các view `security_invoker`, trỏ vào bảng trong schema `timus` và `core`, nên mọi quy tắc RLS của bảng gốc vẫn áp dụng. Không cần bật Exposed schemas. Người chưa đăng nhập bị chặn ngay ở view.

## Cài đặt Supabase (làm một lần)
- Authentication, URL Configuration: thêm địa chỉ trang (và `http://localhost:8125/**` khi chạy thử) vào Redirect URLs để link đăng nhập qua email hoạt động.

## Chạy thử trên máy
```
python3 -m http.server 8125
```
Mở http://localhost:8125 (trang chủ) hoặc http://localhost:8125/timus/

## Bảo mật
- Repo không chứa dữ liệu thật. Không commit tên, email, số điện thoại nhân viên hay khách hàng.
- Không lưu mật khẩu tài khoản sàn trong trang; chỉ ghi tên tài khoản phụ.
