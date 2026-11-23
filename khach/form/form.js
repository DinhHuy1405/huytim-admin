/* Form khảo sát TIMUS: một dòng mỗi form, gồm tên, dùng cho ai, nút sao chép link gửi khách.
   Dữ liệu ở bảng timus.forms (công khai trong nhóm TIMUS: tên, đối tượng, link gửi khách) và timus.form_private
   (link sửa form, Sheet câu trả lời, thư mục Drive: chỉ chủ tài khoản đọc được). Link nằm trong Supabase, không ghi cứng trong mã. */
(function () {
  "use strict";
  var GRP = [
    ["hien_hanh", "Đang dùng", "Gửi link khảo sát cho khách hoặc học viên trước buổi làm việc đầu, rồi đọc câu trả lời trong Sheet."],
    ["ban_cu", "Bản cũ", "Đã thay bằng form mới, giữ lại để xem câu trả lời cũ."]
  ];
  var S = { rows: [], priv: {}, q: "", me: "", owner: false, edit: false, names: [] };
  var sb = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var norm = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); };
  var tt = null; function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  var safe = function (u) { return /^https:\/\//.test(u || "") ? u : ""; };
  /* link sửa của Google Form có dạng /forms/d/<id>/edit; link gửi khách là /forms/d/e/<id>/viewform */
  function isEditLink(u) { return /\/forms\/d\/(?!e\/)[^/]+\/edit/.test(u || "") || /\/edit([?#]|$)/.test(u || ""); }
  function byId(id) { return S.rows.filter(function (r) { return r.id === id; })[0]; }

  function nav() {
    if (S.edit) HT.render({ base: "../../", active: "form", user: { email: S.me, actions: [{ icon: "out", label: "Đăng xuất", attrs: "data-ht-signout" }] } });
    else HT.render({ base: "../../", active: "form", admin: false, groups: [{ key: "kh", label: "Khách hàng", items: [{ label: "Khách hàng", href: "../", icon: "users" }, { label: "Form khảo sát", current: true, icon: "file" }] }], user: { email: S.me, actions: [{ icon: "out", label: "Đăng xuất", attrs: "data-ht-signout" }] } });
    HT.onSignout = async function () { await sb.auth.signOut(); location.reload(); };
  }

  function rowHTML(r, i) {
    var p = S.priv[r.id] || {}, a = [], pv = [];
    if (r.fill_url) {
      a.push('<button class="btn sm primary" type="button" data-copy="' + r.id + '">Sao chép link gửi khách</button>');
      a.push('<a class="btn sm" href="' + esc(safe(r.fill_url)) + '" target="_blank" rel="noopener">Mở form</a>');
    } else a.push('<span class="frm-miss">Chưa có link gửi khách</span>');
    if (S.owner) {
      if (safe(p.edit_url)) pv.push('<a class="btn sm" href="' + esc(p.edit_url) + '" target="_blank" rel="noopener">Sửa form</a>');
      if (safe(p.sheet_url)) pv.push('<a class="btn sm" href="' + esc(p.sheet_url) + '" target="_blank" rel="noopener">Sheet câu trả lời</a>');
      if (safe(p.drive_url)) pv.push('<a class="btn sm" href="' + esc(p.drive_url) + '" target="_blank" rel="noopener">Thư mục Drive</a>');
    }
    if (S.edit) pv.push('<button class="btn sm" type="button" data-edit="' + r.id + '">Sửa mục này</button>');
    var pf = r.prefill_entry && safe(r.fill_url) ? '<div class="frm-pf"><label>Tên công ty (điền sẵn vào câu đầu của form)<input type="text" data-pf="' + r.id + '" list="frm-names" placeholder="Ví dụ: Medic Roller" autocomplete="off"></label><button class="btn sm" type="button" data-copypf="' + r.id + '">Sao chép link điền sẵn</button></div>' : "";
    return '<div class="mau-row"><div class="no">' + i + '</div><div><div class="tt">' + esc(r.title) + "</div>"
      + (r.audience ? '<div class="frm-aud"><b>Dùng cho:</b> ' + esc(r.audience) + "</div>" : "")
      + (r.note ? '<div class="nt">' + esc(r.note) + "</div>" : "") + pf
      + '</div><div class="act frm"><div class="act">' + a.join("") + "</div>" + (pv.length ? '<div class="frm-priv">' + pv.join("") + "</div>" : "") + "</div></div>";
  }
  function render() {
    var q = norm(S.q).trim();
    var rows = S.rows.filter(function (r) { return r.grp !== "thu_muc" && (!q || norm(r.title + " " + (r.audience || "") + " " + (r.note || "")).indexOf(q) >= 0); });
    var folders = S.rows.filter(function (r) { return r.grp === "thu_muc"; });
    $("#pcount").textContent = S.rows.filter(function (r) { return r.grp !== "thu_muc"; }).length;
    $("#hact").innerHTML = S.edit ? '<button class="btn primary" type="button" data-new="1">+ Thêm form</button>' : "";
    var html = '<p class="mau-intro">Các form khảo sát gửi khách và học viên. Nút Sao chép link gửi khách lấy đúng link điền; link sửa form, Sheet câu trả lời và thư mục Drive chỉ chủ tài khoản thấy. Dữ liệu lưu trong Supabase, thêm form mới ngay trên trang này.</p>'
      + '<div class="mau-tools"><input type="search" id="frm-q" placeholder="Tìm form: bán hàng, trợ lý AI, học viên..." value="' + esc(S.q) + '" aria-label="Tìm form"></div>';
    if (S.owner && folders.length && !q) {
      html += '<section class="mau-sec"><h2>Thư mục Google Drive</h2><div class="mau-list">' + folders.map(function (r) {
        var p = S.priv[r.id] || {};
        return '<div class="mau-row"><div class="no">·</div><div><div class="tt">' + esc(r.title) + "</div>" + (r.note ? '<div class="nt">' + esc(r.note) + "</div>" : "") + '</div><div class="act">' + (safe(p.drive_url) ? '<a class="btn sm primary" href="' + esc(p.drive_url) + '" target="_blank" rel="noopener">Mở thư mục</a>' : '<span class="frm-miss">Chưa có link thư mục</span>') + (S.edit ? '<button class="btn sm" type="button" data-edit="' + r.id + '">Sửa mục này</button>' : "") + "</div></div>";
      }).join("") + "</div></section>";
    }
    GRP.forEach(function (g) {
      var list = rows.filter(function (r) { return r.grp === g[0]; });
      if (!list.length && q) return;
      html += '<section class="mau-sec"><h2>' + esc(g[1]) + '</h2><p class="sub">' + esc(g[2]) + '</p><div class="mau-list">' + (list.length ? list.map(function (r, i) { return rowHTML(r, i + 1); }).join("") : '<div class="empty">Chưa có form.</div>') + "</div></section>";
    });
    if (q && !rows.length) html += '<div class="empty">Không có form khớp.</div>';
    html += '<datalist id="frm-names">' + S.names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + "</datalist>";
    var keep = $("[data-pf]"), kv = keep ? keep.value : "", kid = keep ? keep.dataset.pf : "", had = keep && document.activeElement === keep;
    $("#app").innerHTML = html;
    if (kv) { var nk = $('[data-pf="' + kid + '"]'); if (nk) { nk.value = kv; if (had) nk.focus(); } }
  }
  async function load() {
    var r = await Promise.all([sb.from("timus_forms").select("*").order("grp").order("seq").order("title"), S.owner ? sb.from("timus_form_private").select("*") : Promise.resolve({ data: [] })]);
    if (r[0].error) { $("#app").innerHTML = '<div class="empty">Chưa tải được danh sách form: ' + esc(r[0].error.message) + "</div>"; return; }
    var nm = await sb.rpc("timus_client_names"); S.names = (nm.data || []).map(function (x) { return x.name; }).filter(Boolean).sort();
    S.rows = r[0].data || []; S.priv = {}; (r[1].data || []).forEach(function (p) { S.priv[p.form_id] = p; });
    render();
  }

  /* ---------- sao chép link gửi khách: từ chối link sửa để không gửi nhầm ---------- */
  function copyLink(id) {
    var r = byId(id); if (!r || !r.fill_url) return;
    if (isEditLink(r.fill_url)) { toast("Đây là link sửa form, không gửi khách. Mở mục này và điền lại link gửi khách."); return; }
    var done = function () { toast("Đã sao chép link gửi khách: " + r.title); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(r.fill_url).then(done, function () { prompt("Sao chép link gửi khách", r.fill_url); });
    else prompt("Sao chép link gửi khách", r.fill_url);
  }

  /* link điền sẵn: <link viewform>?usp=pp_url&entry.N=<tên>; bỏ trống tên thì trả link gốc */
  function prefillUrl(r, name) {
    name = String(name || "").trim().replace(/\s+/g, " ");
    if (!name || !r.prefill_entry) return r.fill_url;
    return r.fill_url + (r.fill_url.indexOf("?") < 0 ? "?" : "&") + "usp=pp_url&" + r.prefill_entry + "=" + encodeURIComponent(name);
  }
  function copyPrefill(id) {
    var r = byId(id); if (!r || !r.fill_url || isEditLink(r.fill_url)) return;
    var inp = $('[data-pf="' + id + '"]'), name = inp ? inp.value : "";
    if (!String(name).trim()) { toast("Nhập tên công ty trước, hoặc dùng nút Sao chép link gửi khách (link gốc)."); if (inp) inp.focus(); return; }
    var u = prefillUrl(r, name), done = function () { toast("Đã sao chép link điền sẵn: " + String(name).trim()); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { prompt("Sao chép link điền sẵn", u); });
    else prompt("Sao chép link điền sẵn", u);
  }

  /* ---------- thêm, sửa ---------- */
  function closeDrawer() { $("#drawerRoot").innerHTML = ""; }
  function edit(r) {
    r = r || { grp: "hien_hanh", seq: (S.rows.length + 1) * 10 };
    var p = S.priv[r.id] || {}, isDir = r.grp === "thu_muc";
    var go = [["hien_hanh", "Đang dùng"], ["ban_cu", "Bản cũ"], ["thu_muc", "Thư mục Drive"]].map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === r.grp ? " selected" : "") + ">" + esc(g[1]) + "</option>"; }).join("");
    $("#drawerRoot").innerHTML = '<div class="scrim" data-close="1"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Form"><div class="hd"><h3>' + (r.id ? "Sửa form" : "Thêm form") + '</h3><button class="btn sm" type="button" data-close="1">Đóng</button></div><form id="frm-f"><div class="body">'
      + '<label class="f">Nhóm<select name="grp">' + go + '</select></label><label class="f">Thứ tự<input name="seq" type="number" value="' + esc(r.seq) + '"></label>'
      + '<label class="f w">Tên form<input name="title" required value="' + esc(r.title) + '"></label>'
      + '<label class="f w">Dùng cho ai<input name="audience" value="' + esc(r.audience) + '" placeholder="Ví dụ: Khách muốn bán hàng trên sàn"></label>'
      + '<label class="f w">Ghi chú (nhánh câu hỏi, lưu ý khi gửi)<textarea name="note" rows="4">' + esc(r.note) + "</textarea></label>"
      + '<label class="f w">Link gửi khách (dạng .../forms/d/e/.../viewform)<input name="fill_url" type="url" value="' + esc(r.fill_url) + '" placeholder="https://docs.google.com/forms/d/e/.../viewform"></label>'
      + '<label class="f w">Mã ô điền sẵn (tùy chọn, dạng entry.123456789: để tạo link điền sẵn tên công ty)<input name="prefill_entry" value="' + esc(r.prefill_entry) + '" placeholder="entry.2017212477"></label>'
      + (S.owner ? '<label class="f w">Link sửa form (chỉ chủ tài khoản thấy)<input name="edit_url" type="url" value="' + esc(p.edit_url) + '"></label><label class="f w">Link Sheet câu trả lời (chỉ chủ tài khoản thấy)<input name="sheet_url" type="url" value="' + esc(p.sheet_url) + '"></label><label class="f w">Link thư mục Google Drive (chỉ chủ tài khoản thấy)<input name="drive_url" type="url" value="' + esc(p.drive_url) + '"></label>' : "")
      + '</div><div class="ft"><div>' + (r.id ? '<button class="btn danger" type="button" data-del="' + r.id + '">Xóa form</button>' : "") + '</div><div style="display:flex;gap:6px"><button class="btn" type="button" data-close="1">Hủy</button><button class="btn primary" type="submit">Lưu</button></div></div></form></aside>';
    $("#frm-f").addEventListener("submit", async function (e) {
      e.preventDefault(); var f = new FormData(e.target), o = {};
      ["grp", "title", "audience", "note", "fill_url", "prefill_entry"].forEach(function (k) { var v = String(f.get(k) || "").trim(); o[k] = v || null; });
      o.seq = parseInt(f.get("seq"), 10) || 0;
      if (o.fill_url && !/^https:\/\//.test(o.fill_url)) { toast("Link gửi khách phải bắt đầu bằng https://"); return; }
      if (o.fill_url && isEditLink(o.fill_url)) { toast("Đây là link sửa form. Link gửi khách có dạng .../forms/d/e/.../viewform (lấy ở nút Gửi trong form)."); return; }
      if (o.prefill_entry && !/^entry\.[0-9]+$/.test(o.prefill_entry)) { toast("Mã ô phải dạng entry.123456789"); return; }
      var pr = {}; if (S.owner) ["edit_url", "sheet_url", "drive_url"].forEach(function (k) { var v = String(f.get(k) || "").trim(); if (v && !/^https:\/\//.test(v)) { pr = null; } else if (pr) pr[k] = v || null; });
      if (pr === null) { toast("Các link phải bắt đầu bằng https://"); return; }
      var res = r.id ? await sb.from("timus_forms").update(o).eq("id", r.id).select("id") : await sb.from("timus_forms").insert(o).select("id");
      if (res.error || !(res.data || []).length) { toast("Chưa lưu được: " + ((res.error && res.error.message) || "không có quyền")); return; }
      var id = r.id || res.data[0].id;
      if (S.owner) { pr.form_id = id; var r2 = await sb.from("timus_form_private").upsert(pr, { onConflict: "form_id" }); if (r2.error) { toast("Đã lưu form nhưng chưa lưu được các link riêng: " + r2.error.message); load(); return; } }
      closeDrawer(); toast("Đã lưu"); load();
    });
  }
  async function del(id) {
    var r = byId(id); if (!r || !confirm("Xóa form «" + r.title + "» khỏi danh sách? Form trên Google không bị xóa. Không khôi phục được trên trang này.")) return;
    var res = await sb.from("timus_forms").delete().eq("id", id).select("id"); if (res.error || !(res.data || []).length) { toast("Chưa xóa được: " + ((res.error && res.error.message) || "không có quyền")); return; }
    closeDrawer(); toast("Đã xóa"); load();
  }

  function bind() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-close],[data-new],[data-edit],[data-del],[data-copy],[data-copypf]"); if (!t) return;
      if (t.dataset.close) return closeDrawer();
      if (t.dataset.new) return edit(null);
      if (t.dataset.edit) return edit(byId(t.dataset.edit));
      if (t.dataset.del) return del(t.dataset.del);
      if (t.dataset.copy) return copyLink(t.dataset.copy);
      if (t.dataset.copypf) return copyPrefill(t.dataset.copypf);
    });
    document.addEventListener("input", function (e) { if (e.target.id === "frm-q") { S.q = e.target.value; var pos = e.target.selectionStart; render(); var q = $("#frm-q"); q.focus(); try { q.setSelectionRange(pos, pos); } catch (_) {} } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
  }
  function loginScreen() {
    return new Promise(function (resolve) {
      var box = document.createElement("div"); box.id = "login";
      box.innerHTML = '<form id="loginform" class="login-card"><div class="ws"><i>H</i>Huy Tim · TIMUS</div><h1>Đăng nhập</h1><p>Form khảo sát dành cho tài khoản TIMUS.</p><label class="f">Email<input id="loginemail" type="email" required autocomplete="username"></label><label class="f">Mật khẩu<input id="loginpw" type="password" required autocomplete="current-password"></label><button class="btn primary" type="submit">Đăng nhập</button><p id="loginmsg" role="status"></p></form>';
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
    (r.data || []).filter(function (x) { return x.email === S.me; }).forEach(function (x) { if (x.area === "all" || x.area === "timus") { best = Math.max(best, lvl(x.role)); if (x.area === "all" && x.role === "owner") S.owner = true; } });
    S.edit = best >= 3;
    if (best < 1) { HT.render({ base: "../../", active: "form", admin: false, groups: [], user: { email: S.me, actions: [{ icon: "out", label: "Đăng xuất", attrs: "data-ht-signout" }] } }); $("#app").innerHTML = '<div class="empty">Tài khoản này chưa có quyền xem Form khảo sát.</div>'; HT.onSignout = async function () { await sb.auth.signOut(); location.reload(); }; return; }
    nav(); if (S.owner) HT.flags(sb, "../../"); bind(); await load();
    sb.channel("timus-forms").on("postgres_changes", { event: "*", schema: "timus", table: "forms" }, load).on("postgres_changes", { event: "*", schema: "timus", table: "form_private" }, load).subscribe();
  })();
})();
