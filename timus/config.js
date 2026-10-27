/* Kết nối Supabase của hệ thống Huy Tim (dùng chung project với mentor.huytim.com).
 * Đây là khóa công khai (publishable), an toàn để nằm trong trang web; dữ liệu được bảo vệ bằng đăng nhập và quy tắc RLS trong schema core và timus.
 * KHÔNG dán service_role key vào đây. */
window.TIMUS_CONFIG = {
  supabaseUrl: "https://ksjhdksmtfscatwmelva.supabase.co",
  anonKey: "sb_publishable_bqwoCN4UpG7sivr33tYn0Q_Ve6UoOYo"
};
