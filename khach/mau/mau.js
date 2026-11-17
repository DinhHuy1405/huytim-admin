/* Thư viện mẫu TIMUS: phiếu khảo sát, đề xuất, bảng giá, nghiên cứu, hợp đồng, báo cáo dùng lại cho mọi khách.
   Dữ liệu ở bảng timus.templates (view public.timus_templates, security_invoker); file ở kho riêng tư timus-client-files, thư mục mau/.
   Chỉ admin TIMUS xem và sửa (đối tác không thấy vì có bảng giá và hợp đồng). */
(function () {
  "use strict";
  var GRP = [
    ["tiep_can", "1. Tiếp cận khách mới", "Gửi phiếu khảo sát trước, đọc câu trả lời, rồi dựng đề xuất và báo giá từ các mẫu dưới."],
    ["nghien_cuu", "2. Nghiên cứu sản phẩm", "Báo cáo mẫu đã gửi khách và phương pháp chấm điểm Làm, Cân nhắc, Bỏ."],
    ["trien_khai", "3. Triển khai, thiết lập", "Kế hoạch thương hiệu, phạm vi công việc, hợp đồng, thư ủy quyền và quy chuẩn bộ hồ sơ."],
    ["van_hanh", "4. Vận hành và báo cáo", "Mẫu báo cáo tháng cho khách đang vận hành và quy ước lưu báo cáo."]
  ];
  var FILES = "timus-client-files";
  var S = { rows: [], q: "", me: "", busy: false, upFor: null };
  var sb = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var norm = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); };
  var tt = null; function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  function ext(n) { var m = /\.([a-z0-9]+)$/i.exec(n || ""); return m ? m[1].toLowerCase() : ""; }
  function fsize(b) { return !b ? "" : b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function dmy(s) { if (!s) return ""; var a = String(s).slice(0, 10).split("-"); return a[2] + "/" + a[1] + "/" + a[0]; }
  function key(n) { return norm(n).replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, ""); }

  function nav() { HT.render({ base: "../../", active: "mau", user: { email: S.me, actions: [{ icon: "out", label: "Đăng xuất", attrs: "data-ht-signout" }] } }); }

  function rowHTML(r, i) {
    var a = [];
    if (r.link_url) { a.push('<a class="btn sm primary" href="' + esc(r.link_url) + '" target="_blank" rel="noopener">' + esc(r.link_label || "Mở link") + "</a>"); a.push('<button class="btn sm" type="button" data-copy="' + esc(r.link_url) + '">Chép link</button>'); }
    if (r.file_path) a.push('<button class="btn sm" type="button" data-open="' + r.id + '" data-side="f">' + (ext(r.file_name) === "pdf" ? "Mở PDF" : "Mở " + esc(ext(r.file_name).toUpperCase())) + "</button>");
    if (r.alt_path) a.push('<button class="btn sm" type="button" data-open="' + r.id + '" data-side="a" data-dl="1">' + (ext(r.alt_name) === "docx" ? "Tải Word" : "Tải " + esc(ext(r.alt_name).toUpperCase())) + "</button>");
    a.push('<button class="btn sm" type="button" data-up="' + r.id + '">Tải file</button><button class="btn sm" type="button" data-edit="' + r.id + '">Sửa</button>');
    var miss = [];
    if (r.file_name && !r.file_path) miss.push(r.file_name);
    if (r.alt_name && !r.alt_path) miss.push(r.alt_name);
    var meta = [];
    if (r.file_path) meta.push(esc(r.file_name) + (r.file_size ? " · " + fsize(r.file_size) : ""));
    if (r.alt_path) meta.push(esc(r.alt_name) + (r.alt_size ? " · " + fsize(r.alt_size) : ""));
    if (miss.length) meta.push('<span class="miss">Chưa tải: ' + miss.map(esc).join(", ") + "</span>");
    if (r.src) meta.push("Bản gốc trên máy: " + esc(r.src));
    meta.push("Cập nhật " + dmy(r.updated_at));
    return '<div class="mau-row"><div class="no">' + i + '</div><div><div class="tt">' + esc(r.title) + "</div>" + (r.note ? '<div class="nt">' + esc(r.note) + "</div>" : "") + '<div class="meta">' + meta.join(" · ") + '</div></div><div class="act">' + a.join("") + "</div></div>";
  }
  function render() {
    var q = norm(S.q).trim();
    var rows = S.rows.filter(function (r) { return !q || norm(r.title + " " + (r.note || "") + " " + (r.file_name || "") + " " + (r.alt_name || "")).indexOf(q) >= 0; });
    $("#pcount").textContent = S.rows.length;
    $("#hact").innerHTML = '<button class="btn" type="button" data-many="1">Tải nhiều file</button><button class="btn primary" type="button" data-new="1">+ Thêm mẫu</button>';
    var html = '<p class="mau-intro">Bộ mẫu dùng lại cho mọi khách TIMUS. Khi tư vấn khách mới: gửi phiếu khảo sát, đọc câu trả lời trong sheet, rồi lấy đề xuất, bảng giá, báo cáo mẫu ở đây làm khung. Trang chỉ admin TIMUS xem được.</p>'
      + '<div class="mau-tools"><input type="search" id="mau-q" placeholder="Tìm mẫu: báo giá, hợp đồng, nghiên cứu..." value="' + esc(S.q) + '" aria-label="Tìm mẫu"></div>';
    GRP.forEach(function (g) {
      var list = rows.filter(function (r) { return r.grp === g[0]; });
      if (!list.length && q) return;
      html += '<section class="mau-sec"><h2>' + esc(g[1]) + '</h2><p class="sub">' + esc(g[2]) + '</p><div class="mau-list">' + (list.length ? list.map(function (r, i) { return rowHTML(r, i + 1); }).join("") : '<div class="empty">Chưa có mẫu.</div>') + "</div></section>";
    });
    if (q && !rows.length) html += '<div class="empty">Không có mẫu khớp.</div>';
    $("#app").innerHTML = html;
  }
  async function load() {
    var r = await sb.from("timus_templates").select("*").order("grp").order("seq").order("title");
    if (r.error) { $("#app").innerHTML = '<div class="empty">Chưa tải được thư viện: ' + esc(r.error.message) + "</div>"; return; }
    S.rows = r.data || []; render();
  }
  function byId(id) { return S.rows.filter(function (r) { return r.id === id; })[0]; }

  /* ---------- sửa, thêm ---------- */
  function closeDrawer() { $("#drawerRoot").innerHTML = ""; }
  function edit(r) {
    r = r || { grp: "tiep_can", seq: (S.rows.length + 1) * 10 };
    var go = GRP.map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === r.grp ? " selected" : "") + ">" + esc(g[1]) + "</option>"; }).join("");
    $("#drawerRoot").innerHTML = '<div class="scrim" data-close="1"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Mẫu"><div class="hd"><h3>' + (r.id ? "Sửa mẫu" : "Thêm mẫu") + '</h3><button class="btn sm" type="button" data-close="1">Đóng</button></div><form id="mau-f"><div class="body">'
      + '<label class="f">Nhóm<select name="grp">' + go + '</select></label><label class="f">Thứ tự<input name="seq" type="number" value="' + esc(r.seq) + '"></label>'
      + '<label class="f w">Tên mẫu<input name="title" required value="' + esc(r.title) + '"></label>'
      + '<label class="f w">Ghi chú (dùng khi nào, lưu ý)<textarea name="note" rows="4">' + esc(r.note) + "</textarea></label>"
      + '<label class="f w">Link (Google Form, Sheet, trang web)<input name="link_url" type="url" value="' + esc(r.link_url) + '"></label><label class="f">Chữ trên nút link<input name="link_label" value="' + esc(r.link_label) + '"></label>'
      + '<label class="f">Tên file PDF cần tải<input name="file_name" value="' + esc(r.file_name) + '"></label><label class="f">Tên file Word hoặc khác<input name="alt_name" value="' + esc(r.alt_name) + '"></label>'
      + '<label class="f w">Bản gốc trên máy Huy<input name="src" value="' + esc(r.src) + '"></label>'
      + '</div><div class="ft"><div>' + (r.id ? '<button class="btn danger" type="button" data-del="' + r.id + '">Xóa mẫu</button>' : "") + '</div><div style="display:flex;gap:6px"><button class="btn" type="button" data-close="1">Hủy</button><button class="btn primary" type="submit">Lưu</button></div></div></form></aside>';
    $("#mau-f").addEventListener("submit", async function (e) {
      e.preventDefault(); var f = new FormData(e.target), o = {};
      ["grp", "title", "note", "link_url", "link_label", "file_name", "alt_name", "src"].forEach(function (k) { var v = String(f.get(k) || "").trim(); o[k] = v || null; });
      o.seq = parseInt(f.get("seq"), 10) || 0; o.updated_at = new Date().toISOString();
      var q = r.id ? sb.from("timus_templates").update(o).eq("id", r.id) : sb.from("timus_templates").insert(o);
      var res = await q; if (res.error) { toast("Chưa lưu được: " + res.error.message); return; }
      closeDrawer(); toast("Đã lưu"); load();
    });
  }
  async function del(id) {
    var r = byId(id); if (!r || !confirm("Xóa mẫu «" + r.title + "» và file đã tải lên? Không khôi phục được.")) return;
    var paths = [r.file_path, r.alt_path].filter(Boolean); if (paths.length) await sb.storage.from(FILES).remove(paths);
    var res = await sb.from("timus_templates").delete().eq("id", id); if (res.error) { toast("Chưa xóa được: " + res.error.message); return; }
    closeDrawer(); toast("Đã xóa"); load();
  }

  /* ---------- tải file: PDF vào ô chính, Word hoặc file khác vào ô phụ (trừ khi mẫu chỉ có một file không phải PDF) ---------- */
  function side(r, name) {
    var e = ext(name);
    if (r.file_name && norm(r.file_name) === norm(name)) return "f";
    if (r.alt_name && norm(r.alt_name) === norm(name)) return "a";
    if (e === "pdf") return "f";
    return r.file_name && ext(r.file_name) !== "pdf" ? "f" : "a";
  }
  async function putFile(r, file, sd) {
    var path = "mau/" + r.id + "/" + Date.now() + "-" + key(file.name);
    var up = await sb.storage.from(FILES).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (up.error) { toast("Chưa tải được " + file.name + ": " + up.error.message); return false; }
    var old = sd === "f" ? r.file_path : r.alt_path;
    var o = sd === "f" ? { file_path: path, file_name: file.name, file_size: file.size } : { alt_path: path, alt_name: file.name, alt_size: file.size };
    o.updated_at = new Date().toISOString();
    var res = await sb.from("timus_templates").update(o).eq("id", r.id);
    if (res.error) { toast("Chưa ghi được: " + res.error.message); return false; }
    if (old && old !== path) await sb.storage.from(FILES).remove([old]);
    Object.assign(r, o); return true;
  }
  async function upMany(files) {
    var ok = 0, skip = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i], n = norm(f.name);
      var r = S.rows.filter(function (x) { return norm(x.file_name) === n || norm(x.alt_name) === n; })[0];
      if (!r) { skip.push(f.name); continue; }
      toast("Đang tải " + (i + 1) + "/" + files.length + ": " + f.name);
      if (await putFile(r, f, side(r, f.name))) ok++;
    }
    render(); toast("Đã tải " + ok + " file" + (skip.length ? ", bỏ qua " + skip.length + " file không khớp tên mẫu" : ""));
    if (skip.length) console.warn("Không khớp mẫu:", skip);
  }
  async function openFile(id, sd, dl) {
    var r = byId(id), p = sd === "a" ? r.alt_path : r.file_path, n = sd === "a" ? r.alt_name : r.file_name; if (!p) return;
    var w = dl ? null : window.open("", "_blank");
    var s = await sb.storage.from(FILES).createSignedUrl(p, 600, dl ? { download: n } : undefined);
    if (s.error) { if (w) w.close(); toast("Chưa mở được: " + s.error.message); return; }
    if (w) w.location = s.data.signedUrl; else location.href = s.data.signedUrl;
  }

  function bind() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-close],[data-new],[data-edit],[data-del],[data-up],[data-many],[data-open],[data-copy]"); if (!t) return;
      if (t.dataset.close) return closeDrawer();
      if (t.dataset.new) return edit(null);
      if (t.dataset.edit) return edit(byId(t.dataset.edit));
      if (t.dataset.del) return del(t.dataset.del);
      if (t.dataset.up) { S.upFor = t.dataset.up; return $("#up-one").click(); }
      if (t.dataset.many) return $("#up-many").click();
      if (t.dataset.open) return openFile(t.dataset.open, t.dataset.side, !!t.dataset.dl);
      if (t.dataset.copy) { navigator.clipboard.writeText(t.dataset.copy).then(function () { toast("Đã chép link"); }, function () { prompt("Chép link này", t.dataset.copy); }); }
    });
    document.addEventListener("input", function (e) { if (e.target.id === "mau-q") { S.q = e.target.value; var pos = e.target.selectionStart; render(); var q = $("#mau-q"); q.focus(); try { q.setSelectionRange(pos, pos); } catch (_) {} } });
    $("#up-many").addEventListener("change", function (e) { var fs = Array.prototype.slice.call(e.target.files); e.target.value = ""; if (fs.length) upMany(fs); });
    $("#up-one").addEventListener("change", async function (e) { var f = e.target.files[0], r = byId(S.upFor); e.target.value = ""; if (!f || !r) return; toast("Đang tải " + f.name); if (await putFile(r, f, side(r, f.name))) { render(); toast("Đã tải " + f.name); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
    HT.onSignout = async function () { await sb.auth.signOut(); location.reload(); };
  }
  function loginScreen() {
    return new Promise(function (resolve) {
      var box = document.createElement("div"); box.id = "login";
      box.innerHTML = '<form id="loginform" class="login-card"><div class="ws"><i>H</i>Huy Tim · TIMUS</div><h1>Đăng nhập</h1><p>Thư viện mẫu dành cho admin TIMUS.</p><label class="f">Email<input id="loginemail" type="email" required autocomplete="username"></label><label class="f">Mật khẩu<input id="loginpw" type="password" required autocomplete="current-password"></label><button class="btn primary" type="submit">Đăng nhập</button><p id="loginmsg" role="status"></p></form>';
      document.body.appendChild(box);
      $("#loginform").addEventListener("submit", async function (e) { e.preventDefault(); $("#loginmsg").textContent = "Đang đăng nhập..."; var res = await sb.auth.signInWithPassword({ email: $("#loginemail").value.trim(), password: $("#loginpw").value }); if (res.error) $("#loginmsg").textContent = "Sai email hoặc mật khẩu."; });
      sb.auth.onAuthStateChange(function (ev, session) { if (session) setTimeout(function () { box.remove(); resolve(session); }, 0); });
    });
  }
  (async function () {
    var cfg = window.TIMUS_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl) { $("#app").textContent = "Chưa tải được thư viện kết nối. Tải lại trang."; return; }
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.anonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    var cur = await sb.auth.getSession(), session = cur.data && cur.data.session;
    if (!session) session = await loginScreen();
    S.me = String(session.user.email || "").toLowerCase();
    var r = await sb.from("core_roles").select("email,area,role");
    var lvl = function (x) { return { owner: 4, admin: 3, staff: 2, viewer: 1 }[x] || 0; }, best = 0;
    (r.data || []).filter(function (x) { return x.email === S.me; }).forEach(function (x) { if (x.area === "all" || x.area === "timus") best = Math.max(best, lvl(x.role)); });
    if (best < 3) { HT.render({ base: "../../", active: "khach", admin: false, groups: [], user: { email: S.me, actions: [{ icon: "out", label: "Đăng xuất", attrs: "data-ht-signout" }] } }); $("#app").innerHTML = '<div class="empty">Thư viện mẫu chỉ dành cho admin TIMUS.</div>'; HT.onSignout = async function () { await sb.auth.signOut(); location.reload(); }; return; }
    nav(); HT.flags(sb, "../../"); bind(); await load();
    sb.channel("timus-templates").on("postgres_changes", { event: "*", schema: "timus", table: "templates" }, load).subscribe();
  })();
})();
