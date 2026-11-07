/* TIMUS Customers bản 2.
   Danh sách khách (bảng có lọc, sắp xếp, hoặc pipeline 5 giai đoạn, khối Hôm nay),
   hồ sơ khách có URL riêng (#/<id>/<tab>) với 5 tab: Tổng quan, Việc, Nhật ký, Tài liệu, Phí và hợp đồng.
   Dữ liệu qua view public.timus_* (security_invoker), kho PDF timus-client-files.
   Admin TIMUS sửa; tài khoản chỉ có quyền staff thì xem (nếu chính sách đọc cho phép). */
(function () {
  "use strict";
  var STAGE = [["tiep_can", "Tiếp cận"], ["dam_phan", "Đàm phán"], ["thiet_lap", "Thiết lập"], ["van_hanh", "Vận hành"], ["tam_dung", "Tạm dừng"]];
  var RQ_ST = [["moi", "Mới"], ["dang_lam", "Đang làm"], ["cho_khach", "Chờ khách"], ["xong", "Xong"]];
  var KIND = { bao_gia: "Báo giá", hop_dong: "Hợp đồng", nghien_cuu: "Nghiên cứu", thiet_lap: "Thiết lập", van_hanh: "Vận hành", giay_to: "Giấy tờ", hop: "Họp", gui_tai_lieu: "Gửi tài liệu", khac: "Khác" };
  var PRIO = { cao: "Cao", thuong: "Thường", thap: "Thấp" };
  var UPK = { ghi_chu: "Ghi chú", goi: "Gọi", gap: "Gặp", gui_tai_lieu: "Gửi tài liệu", khach_phan_hoi: "Khách phản hồi", quyet_dinh: "Quyết định", he_thong: "Hệ thống" };
  var DK = { nghien_cuu: "Nghiên cứu", bao_gia: "Báo giá", hop_dong: "Hợp đồng", phu_luc: "Phụ lục", khac: "Khác" };
  var AUD = { khach: "Gửi khách", noi_bo: "Nội bộ" };
  var DST = { nhap: "Nháp", da_gui: "Đã gửi" };
  var MARKET = { vn: "Việt Nam", us: "Mỹ", ca_hai: "Việt Nam và Mỹ" };
  var SOURCE = { gioi_thieu: "Giới thiệu", tiktok: "TikTok", facebook: "Facebook", inbox: "Inbox", hoc_vien: "Học viên", khac: "Khác" };
  var FEE = { standard: "Bảng phí chuẩn", custom: "Thỏa thuận riêng", none: "Chưa có" };
  var TABS = [["tong_quan", "Tổng quan"], ["viec", "Việc"], ["nhat_ky", "Nhật ký"], ["tai_lieu", "Tài liệu"], ["phi", "Phí và hợp đồng"]];
  var FILES = "timus-client-files", SHARE_SEC = 7 * 86400;

  var S = { view: "list", mode: "table", id: null, tab: "tong_quan", q: "", fStage: "", fMarket: "", fOwner: "", sort: "name", dir: 1, lf: "", sel: {}, bulkArm: false,
    clients: [], reqs: [], ups: [], docs: [], shops: [], terms: [], team: [], me: "", ro: false, kind: null, edit: null, delArm: false, upTarget: null };
  var sb = null;
  try { S.mode = localStorage.getItem("khach-mode") || "table"; } catch (_) {}

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function opt(v, l, c) { return '<option value="' + esc(v) + '"' + (String(c == null ? "" : c) === String(v) ? " selected" : "") + ">" + esc(l) + "</option>"; }
  function opts(o, c, blank) { return (blank ? opt("", blank, c) : "") + Object.keys(o).map(function (k) { return opt(k, o[k], c); }).join(""); }
  function today() { var p = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return p.year + "-" + p.month + "-" + p.day; }
  function dm(s) { if (!s) return ""; var a = String(s).slice(0, 10).split("-"); return a[2] + "/" + a[1]; }
  function dmy(s) { if (!s) return ""; var a = String(s).slice(0, 10).split("-"); return a[2] + "/" + a[1] + "/" + a[0]; }
  function when(s) { var p = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(s)).forEach(function (x) { p[x.type] = x.value; }); return p.hour + ":" + p.minute + " · " + p.day + "/" + p.month; }
  function days(s) { if (!s) return null; return Math.floor((Date.now() - new Date(s).getTime()) / 86400000); }
  function addDays(d, n) { var x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function money(n) { return n == null ? "" : Number(n).toLocaleString("vi-VN"); }
  function stageName(k) { var x = STAGE.filter(function (s) { return s[0] === k; })[0]; return x ? x[1] : ""; }
  function stageCls(k) { return k === "van_hanh" ? "ok" : k === "tam_dung" ? "warn" : k === "thiet_lap" ? "night" : "info"; }
  function shortMail(e) { return e ? String(e).split("@")[0] : ""; }
  var tt = null; function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  function fail(e) { toast(e && e.code === "42501" ? "Tài khoản này không có quyền sửa." : e && e.code === "23503" ? "Còn shop đang gắn với khách hàng này, gỡ shop trước khi xóa." : "Chưa lưu được. Thử lại sau ít phút."); }
  function byId(l, id) { return l.filter(function (x) { return x.id === id; })[0] || null; }
  function openOf(id) { return S.reqs.filter(function (r) { return r.client_id === id && r.status !== "xong"; }); }
  function clientStatus(st) { return st === "tam_dung" ? "ended" : (st === "thiet_lap" || st === "van_hanh") ? "active" : "deal"; }
  function lastContact(c) { var u = S.ups.filter(function (x) { return x.client_id === c.id && x.kind !== "he_thong"; })[0]; return c.last_contact_at || (u && u.created_at) || null; }
  function stageSince(c) { var u = S.ups.filter(function (x) { return x.client_id === c.id && x.kind === "he_thong" && /giai đoạn/.test(x.body); })[0]; return days(u ? u.created_at : c.created_at); }

  /* ---------- dữ liệu ---------- */
  async function load() {
    var r = await Promise.all([
      sb.from("timus_clients").select("*").order("created_at"),
      sb.from("timus_client_requests").select("*").order("created_at"),
      sb.from("timus_client_updates").select("*").order("created_at", { ascending: false }),
      sb.from("timus_shops").select("id,name,platform,market,status,client_id"),
      sb.from("timus_client_docs").select("*").order("created_at", { ascending: false }),
      sb.from("timus_client_terms").select("*")
    ]);
    if (r.slice(0, 5).some(function (x) { return x.error; })) { toast("Chưa tải được dữ liệu. Tải lại trang thử lại."); return; }
    S.clients = r[0].data || []; S.reqs = r[1].data || []; S.ups = r[2].data || []; S.shops = r[3].data || []; S.docs = r[4].data || []; S.terms = r[5].error ? [] : (r[5].data || []);
    render();
  }
  var rT = null; function reload() { clearTimeout(rT); rT = setTimeout(load, 150); }
  async function save(q, msg) { var r = await q; if (r.error || (r.data && !r.data.length)) { fail(r.error || { code: "42501" }); return false; } if (msg) toast(msg); await load(); return true; }
  function sysLog(cid, body) { return sb.from("timus_client_updates").insert({ client_id: cid, body: body, kind: "he_thong", author_email: S.me }); }

  /* ---------- đường dẫn ---------- */
  function route() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var p = h.split("/").filter(Boolean);
    if (!p.length) { S.view = "list"; S.id = null; }
    else { S.view = "client"; S.id = p[0]; S.tab = TABS.some(function (t) { return t[0] === p[1]; }) ? p[1] : "tong_quan"; }
  }
  function go(id, tab) { var h = id ? "#/" + id + (tab ? "/" + tab : "") : "#/"; if (location.hash !== h) location.hash = h; else { route(); render(); } }

  /* ---------- vẽ ---------- */
  function render() {
    var a = document.activeElement, fid = a && a.id, val = fid && a.value;
    var drafts = {}; ["up-new", "rq-title", "q"].forEach(function (k) { var e = document.getElementById(k); if (e) drafts[k] = e.value; });
    $("#pcount").textContent = S.clients.length;
    var c = S.view === "client" ? byId(S.clients, S.id) : null;
    if (S.view === "client" && !c) { S.view = "list"; S.id = null; try { history.replaceState(null, "", "#/"); } catch (_) {} }
    $("#hact").innerHTML = S.view === "client" ? '<button class="btn" type="button" data-go="">' + HT.ic("left") + "Danh sách</button>" + (S.ro ? '<span class="ro">Chỉ xem</span>' : '<button class="btn" type="button" data-print-client="1">' + HT.ic("file") + '</button><button class="btn" type="button" data-edit-client="' + c.id + '">Sửa hồ sơ</button>')
      : (S.ro ? '<span class="ro">Chỉ xem</span>' : '<button class="btn primary" type="button" data-new="client">+ Khách hàng</button>');
    $("#app").innerHTML = S.view === "client" ? vClient(c) : vList();
    HT.render({ base: "../", active: "khach", user: { email: S.me, actions: [{ icon: "out", label: "Đăng xuất", attrs: "data-ht-signout" }] }, groups: c ? [{ key: "kh", label: "Khách hàng", items: [{ label: c.name, current: true }] }] : null });
    document.title = (c ? c.name + " · " : "") + "TIMUS Customers";
    renderBulk();
    Object.keys(drafts).forEach(function (k) { var e = document.getElementById(k); if (e && drafts[k] && !e.value) e.value = drafts[k]; });
    if (fid && document.getElementById(fid)) { var el = document.getElementById(fid); if (val != null && (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && !el.value) el.value = val; el.focus(); }
  }
  function visible() {
    var q = S.q.trim().toLowerCase();
    return S.clients.filter(function (c) {
      if (S.fStage && c.stage !== S.fStage) return false;
      if (S.fMarket && c.market !== S.fMarket) return false;
      if (S.fOwner && c.owner_email !== S.fOwner) return false;
      if (q && [c.name, c.services, c.contact_name, c.industry, c.notes].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function owners() { var m = {}; S.clients.forEach(function (c) { if (c.owner_email) m[c.owner_email] = 1; }); S.team.forEach(function (e) { m[e] = 1; }); return Object.keys(m).sort(); }
  function vList() {
    var t = today(), open = S.reqs.filter(function (r) { return r.status !== "xong"; });
    var late = open.filter(function (r) { return r.due_date && r.due_date < t; }), wait = open.filter(function (r) { return r.status === "cho_khach"; });
    var cnt = function (k) { return S.clients.filter(function (c) { return c.stage === k; }).length; };
    var quiet = S.clients.filter(function (c) { var d = days(lastContact(c)); return c.stage !== "tam_dung" && (d === null || d > 7); });
    var stat = function (v, l, cls, d) { return '<div class="stat ' + (cls || "") + '"><div class="l">' + l + '</div><div class="v">' + v + "</div>" + (d ? '<div class="d">' + d + "</div>" : "") + "</div>"; };
    var h = '<div class="stats">' + stat(cnt("tiep_can"), "Tiếp cận") + stat(cnt("dam_phan"), "Đàm phán") + stat(cnt("thiet_lap") + cnt("van_hanh"), "Đang làm", "", cnt("thiet_lap") + " thiết lập · " + cnt("van_hanh") + " vận hành") + stat(late.length, "Việc quá hạn", late.length ? "bad" : "") + stat(wait.length, "Chờ khách phản hồi", wait.length ? "warn" : "") + stat(quiet.length, "Khách im lặng trên 7 ngày", quiet.length ? "warn" : "") + "</div>";
    /* Hôm nay: việc quá hạn, tới hạn trong 7 ngày, khách im lặng */
    var soon = open.filter(function (r) { return r.due_date && r.due_date >= t && r.due_date <= addDays(t, 7); });
    var rows = late.concat(soon).sort(function (a, b) { return (a.due_date < b.due_date ? -1 : 1); }).map(function (r) { var c = byId(S.clients, r.client_id); return '<div class="row" data-go="' + r.client_id + '/viec"><div><div>' + esc(r.title) + '</div><div class="who">' + esc(c ? c.name : "") + (r.assignee_email ? " · " + esc(shortMail(r.assignee_email)) : "") + '</div></div><span class="pill ' + (r.status === "cho_khach" ? "warn" : r.status === "dang_lam" ? "info" : "mute") + '">' + esc(RQ_ST.filter(function (s) { return s[0] === r.status; })[0][1]) + '</span><span class="d ' + (r.due_date < t ? "late" : "") + '">' + (r.due_date < t ? "Quá hạn " : "Hạn ") + dm(r.due_date) + "</span></div>"; });
    rows = rows.concat(quiet.slice(0, 5).map(function (c) { var d = days(lastContact(c)); return '<div class="row" data-go="' + c.id + '/nhat_ky"><div><div>Liên hệ lại ' + esc(c.name) + '</div><div class="who">' + esc(c.next_action || "Chưa ghi bước tiếp theo") + '</div></div><span class="pill warn">Im lặng</span><span class="d">' + (d === null ? "Chưa có ghi chép" : d + " ngày") + "</span></div>"; }));
    h += '<div class="today"><h2>Hôm nay<span> ' + dmy(t) + " · việc quá hạn, tới hạn trong 7 ngày, khách cần liên hệ lại</span></h2>" + (rows.length ? rows.join("") : '<p class="t2" style="margin:4px 0">Không có việc gấp. Mở từng khách để xem bước tiếp theo.</p>') + "</div>";
    if (!S.clients.length) return h + '<div class="empty">Chưa có khách hàng. Bấm + Khách hàng để thêm khách đầu tiên.</div>';
    h += '<div class="toolbar"><div class="filters"><input id="q" type="search" placeholder="Tìm khách, dịch vụ, ngành" value="' + esc(S.q) + '" aria-label="Tìm">'
      + '<select id="f-stage" aria-label="Giai đoạn">' + opt("", "Mọi giai đoạn", S.fStage) + STAGE.map(function (s) { return opt(s[0], s[1], S.fStage); }).join("") + "</select>"
      + '<select id="f-market" aria-label="Thị trường">' + opts(MARKET, S.fMarket, "Mọi thị trường") + "</select>"
      + '<select id="f-owner" aria-label="Phụ trách">' + opt("", "Mọi người phụ trách", S.fOwner) + owners().map(function (e) { return opt(e, shortMail(e), S.fOwner); }).join("") + "</select>"
      + '<div class="seg" role="group" aria-label="Chế độ xem"><button type="button" data-mode="table" class="' + (S.mode === "table" ? "on" : "") + '">' + HT.ic("menu") + 'Bảng</button><button type="button" data-mode="pipe" class="' + (S.mode === "pipe" ? "on" : "") + '">' + HT.ic("board") + "Pipeline</button></div></div></div>";
    return h + (S.mode === "pipe" ? vPipe(visible()) : vTable(visible()));
  }
  function vTable(list) {
    var t = today();
    var key = { name: function (c) { return c.name.toLowerCase(); }, stage: function (c) { return STAGE.map(function (s) { return s[0]; }).indexOf(c.stage); }, market: function (c) { return c.market || "z"; }, owner: function (c) { return c.owner_email || "z"; }, open: function (c) { return openOf(c.id).length; }, last: function (c) { return days(lastContact(c)); if (false) return 0; }, value: function (c) { return Number(c.deal_value || 0); } };
    var f = key[S.sort] || key.name;
    list = list.slice().sort(function (a, b) { var x = f(a), y = f(b); if (x === null) x = 1e9; if (y === null) y = 1e9; return (x < y ? -1 : x > y ? 1 : 0) * S.dir; });
    var th = function (k, l, cls) { return '<th class="' + (cls || "") + '"><button type="button" class="sortb' + (S.sort === k ? " on" : "") + '" data-sort="' + k + '">' + l + (S.sort === k ? HT.ic(S.dir > 0 ? "down" : "right") : "") + "</button></th>"; };
    if (!list.length) return '<div class="empty">Không có khách nào khớp bộ lọc.</div>';
    return '<div class="tbl"><table><thead><tr>' + th("name", "Khách hàng") + th("stage", "Giai đoạn") + th("market", "Thị trường") + th("owner", "Phụ trách") + th("open", "Việc mở", "num") + th("last", "Liên hệ gần nhất", "num") + "<th>Bước tiếp theo</th>" + th("value", "Giá trị, phí", "num") + "</tr></thead><tbody>"
      + list.map(function (c) {
        var op = openOf(c.id), late = op.filter(function (r) { return r.due_date && r.due_date < t; }).length, d = days(lastContact(c));
        return '<tr data-go="' + c.id + '"><td><div class="t1">' + esc(c.name) + '</div><div class="t2">' + esc([c.services, c.industry].filter(Boolean).join(" · ")) + '</div></td><td><span class="pill ' + stageCls(c.stage) + '">' + stageName(c.stage) + '</span><div class="t2">' + stageSince(c) + ' ngày</div></td><td>' + esc(MARKET[c.market] || "") + "</td><td>" + esc(shortMail(c.owner_email)) + '</td><td class="num">' + (op.length || "") + (late ? ' <span class="late">(' + late + " quá hạn)</span>" : "") + '</td><td class="num ' + (c.stage !== "tam_dung" && (d === null || d > 7) ? "warnc" : "") + '">' + (d === null ? "Chưa có" : d === 0 ? "Hôm nay" : d + " ngày") + '</td><td class="t2">' + esc(c.next_action || "") + '</td><td class="num">' + (c.deal_value ? money(c.deal_value) : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function vPipe(list) {
    var t = today();
    return '<div class="pipe">' + STAGE.map(function (s) {
      var l = list.filter(function (c) { return c.stage === s[0]; });
      return '<div class="col" data-col="' + s[0] + '"><h2>' + s[1] + "<b>" + l.length + "</b></h2>" + l.map(function (c) {
        var op = openOf(c.id), late = op.filter(function (r) { return r.due_date && r.due_date < t; }).length, d = days(lastContact(c));
        return '<div class="card" draggable="' + (!S.ro) + '" data-go="' + c.id + '" data-card="' + c.id + '"><div class="n">' + esc(c.name) + '</div><div class="m"><span>' + stageSince(c) + ' ngày</span><span' + (late ? ' class="late"' : "") + ">" + op.length + " việc" + (late ? ", " + late + " quá hạn" : "") + '</span><span' + (d === null || d > 7 ? ' class="warnc"' : "") + '">' + (d === null ? "chưa liên hệ" : "liên hệ " + d + " ngày trước") + "</span></div>" + (c.next_action ? '<div class="nx">' + esc(c.next_action) + "</div>" : "") + "</div>";
      }).join("") + "</div>";
    }).join("") + "</div>";
  }

  /* ---------- hồ sơ khách ---------- */
  function vClient(c) {
    var t = today(), idx = STAGE.map(function (s) { return s[0]; }).indexOf(c.stage);
    var reqs = S.reqs.filter(function (r) { return r.client_id === c.id; }), op = reqs.filter(function (r) { return r.status !== "xong"; }), late = op.filter(function (r) { return r.due_date && r.due_date < t; });
    var docs = S.docs.filter(function (d) { return d.client_id === c.id; }), sent = docs.filter(function (d) { return d.status === "da_gui"; });
    var d = days(lastContact(c));
    var tel = (c.phone || "").replace(/[^\d+]/g, "");
    var h = '<div class="chead"><div class="l"><h3>' + esc(c.name) + '<span class="pill ' + stageCls(c.stage) + '">' + stageName(c.stage) + '</span></h3><div class="meta">' + [c.services ? "<b>" + esc(c.services) + "</b>" : "", c.market ? esc(MARKET[c.market]) : "", c.industry ? esc(c.industry) : "", c.owner_email ? "Phụ trách " + esc(shortMail(c.owner_email)) : "", c.source ? "Nguồn " + esc(SOURCE[c.source] || c.source) : ""].filter(Boolean).join("<span>·</span>") + "</div></div>"
      + '<div class="acts">' + (tel ? '<a class="btn" href="tel:' + esc(tel) + '">Gọi</a><a class="btn" href="https://zalo.me/' + esc(tel.replace(/^\+84/, "0")) + '" target="_blank" rel="noopener">Zalo</a>' : "") + (c.email ? '<a class="btn" href="mailto:' + esc(c.email) + '">Email</a>' : "") + "</div></div>";
    h += '<div class="track">' + STAGE.map(function (s, i) { return '<button type="button" data-stage="' + s[0] + '" class="' + (i === idx ? "cur" : i < idx ? "past" : "") + (s[0] === "tam_dung" ? " pause" : "") + '"' + (S.ro ? " disabled" : "") + ">" + s[1] + "</button>"; }).join("") + "</div>";
    h += '<div class="kpis"><div class="kpi"><div class="l">Ở giai đoạn này</div><div class="v">' + stageSince(c) + "<small>ngày</small></div></div><div class=\"kpi\"><div class=\"l\">Việc mở</div><div class=\"v\">" + op.length + (late.length ? '<small class="late">' + late.length + " quá hạn</small>" : "") + '</div></div><div class="kpi"><div class="l">Liên hệ gần nhất</div><div class="v">' + (d === null ? "Chưa có" : d === 0 ? "Hôm nay" : d + "<small>ngày trước</small>") + '</div></div><div class="kpi"><div class="l">Tài liệu</div><div class="v">' + docs.length + "<small>" + sent.length + " đã gửi khách</small></div></div></div>";
    h += '<div class="next"><b>Bước tiếp theo:</b> ' + esc(c.next_action || "Chưa ghi. Bấm Sửa hồ sơ để điền.") + "</div>";
    h += '<nav class="tabs ctabs" role="tablist">' + TABS.map(function (tb) { var n = tb[0] === "viec" ? op.length : tb[0] === "tai_lieu" ? docs.length : tb[0] === "nhat_ky" ? S.ups.filter(function (u) { return u.client_id === c.id; }).length : 0; if (tb[0] === "phi" && S.ro) return ""; return '<button role="tab" aria-selected="' + (S.tab === tb[0]) + '" data-tab="' + tb[0] + '">' + tb[1] + (n ? "<small" + (tb[0] === "viec" && late.length ? ' class="bad"' : "") + ">" + n + "</small>" : "") + "</button>"; }).join("") + "</nav>";
    var body = { tong_quan: vOverview, viec: vReqs, nhat_ky: vLog, tai_lieu: vDocs, phi: vFee }[S.tab];
    return h + '<div id="panel">' + body(c) + "</div>";
  }
  function reqRow(r, t, full) {
    var late = r.due_date && r.due_date < t && r.status !== "xong";
    return '<div class="rq' + (r.status === "xong" ? " done" : "") + '" tabindex="0" data-rq="' + r.id + '"><input type="checkbox" data-rqsel="' + r.id + '" aria-label="Chọn"' + (S.sel[r.id] ? " checked" : "") + (S.ro ? " disabled" : "") + '><div><div class="t1">' + esc(r.title) + '</div><div class="t2">' + [KIND[r.kind] || r.kind, r.priority === "cao" ? '<span class="pill bad">Cao</span>' : "", r.due_date ? '<span class="' + (late ? "late" : "") + '">Hạn ' + dm(r.due_date) + "</span>" : "", r.assignee_email ? esc(shortMail(r.assignee_email)) : "", r.doc_id && byId(S.docs, r.doc_id) ? "Tài liệu: " + esc(byId(S.docs, r.doc_id).title) : "", esc(r.next_step || "")].filter(Boolean).join(" · ") + "</div></div>"
      + '<select data-st="' + r.id + '" aria-label="Đổi trạng thái"' + (S.ro ? " disabled" : "") + ">" + RQ_ST.map(function (x) { return opt(x[0], x[1], r.status); }).join("") + "</select>" + (full && r.notes ? '<div class="nt">' + esc(r.notes) + "</div>" : "") + "</div>";
  }
  function vOverview(c) {
    var t = today(), reqs = S.reqs.filter(function (r) { return r.client_id === c.id && r.status !== "xong"; }).sort(function (a, b) { return ((a.due_date || "9") < (b.due_date || "9") ? -1 : 1); }).slice(0, 5);
    var ups = S.ups.filter(function (u) { return u.client_id === c.id; }).slice(0, 5), docs = S.docs.filter(function (d) { return d.client_id === c.id; }).slice(0, 3);
    var shops = S.shops.filter(function (s) { return s.client_id === c.id; });
    return '<div class="ov"><div><section><h2>Việc gần hạn<span>' + reqs.length + ' hiện</span></h2>' + (reqs.length ? reqs.map(function (r) { return reqRow(r, t, false); }).join("") : '<p class="t2">Không có việc đang mở.</p>') + '</section><section><h2>Nhật ký mới</h2>' + (ups.length ? '<div class="tl">' + ups.map(logRow).join("") + "</div>" : '<p class="t2">Chưa có ghi chép.</p>') + "</section></div>"
      + '<div><section><h2>Thông tin</h2><dl class="kv"><dt>Liên hệ</dt><dd>' + esc([c.contact_name, c.phone, c.email].filter(Boolean).join(" · ") || "Chưa có") + "</dd><dt>Tiếp cận từ</dt><dd>" + (c.first_contact ? dmy(c.first_contact) : dmy(c.created_at)) + "</dd><dt>Hợp đồng</dt><dd>" + (c.contract_start ? "từ " + dmy(c.contract_start) : "Chưa ký") + "</dd><dt>Giá trị, phí</dt><dd>" + (c.deal_value ? money(c.deal_value) + " đ" : "Chưa ghi") + "</dd><dt>Shop</dt><dd>" + (shops.length ? esc(shops.map(function (s) { return s.name; }).join(", ")) : "Chưa có shop") + "</dd>" + (c.stage === "tam_dung" && c.paused_reason ? "<dt>Lý do tạm dừng</dt><dd>" + esc(c.paused_reason) + "</dd>" : "") + (c.notes ? '<dt>Ghi chú</dt><dd class="pre">' + esc(c.notes) + "</dd>" : "") + "</dl></section>"
      + '<section><h2>Tài liệu mới<span><button class="btn sm" type="button" data-tab="tai_lieu">Xem tất cả</button></span></h2>' + (docs.length ? docs.map(function (d) { return '<div class="mini" data-tab="tai_lieu"><div class="t1">' + esc(d.title) + '</div><div class="t2">' + [DK[d.kind], AUD[d.audience], d.status === "da_gui" ? "đã gửi " + dm(d.sent_at) : "nháp", d.file_path ? "PDF" : ""].filter(Boolean).join(" · ") + "</div></div>"; }).join("") : '<p class="t2">Chưa có tài liệu.</p>') + "</section></div></div>";
  }
  function vReqs(c) {
    var t = today(), reqs = S.reqs.filter(function (r) { return r.client_id === c.id; });
    var add = S.ro ? "" : '<form class="add" id="rq-add"><input class="t" id="rq-title" placeholder="Thêm việc cho khách này" aria-label="Việc mới" autocomplete="off" required><select id="rq-kind" aria-label="Loại">' + opts(KIND, "khac") + '</select><input type="date" id="rq-due" aria-label="Hạn"><button class="btn primary" type="submit">Thêm</button></form>';
    var groups = RQ_ST.map(function (s) {
      var l = reqs.filter(function (r) { return r.status === s[0]; }).sort(function (a, b) { return (a.priority === "cao" ? 0 : 1) - (b.priority === "cao" ? 0 : 1) || ((a.due_date || "9") < (b.due_date || "9") ? -1 : 1); });
      if (!l.length) return "";
      return '<div class="grp">' + s[1] + " (" + l.length + ")</div>" + l.map(function (r) { return reqRow(r, t, true); }).join("");
    }).join("");
    return '<div class="one"><section>' + add + (groups || '<div class="empty">Chưa có việc nào.</div>') + "</section></div>";
  }
  function logRow(u) {
    var cls = u.kind === "he_thong" ? "sys" : u.kind === "khach_phan_hoi" ? "kh" : u.kind === "quyet_dinh" ? "qd" : "";
    return '<div class="lg ' + cls + '"><div class="h"><span>' + when(u.created_at) + "</span><span>" + esc(UPK[u.kind] || "Ghi chú") + "</span>" + (u.author_email && u.kind !== "he_thong" ? "<span>" + esc(shortMail(u.author_email)) + "</span>" : "") + (S.ro || u.kind === "he_thong" ? "" : '<button class="x" type="button" data-del-up="' + u.id + '" aria-label="Xóa ghi chép">×</button>') + "</div><p>" + esc(u.body) + "</p></div>";
  }
  function vLog(c) {
    var all = S.ups.filter(function (u) { return u.client_id === c.id; }), l = S.lf ? all.filter(function (u) { return u.kind === S.lf; }) : all;
    var add = S.ro ? "" : '<div class="logadd"><select id="up-kind" aria-label="Loại">' + Object.keys(UPK).filter(function (k) { return k !== "he_thong"; }).map(function (k) { return opt(k, UPK[k], "ghi_chu"); }).join("") + '</select><textarea id="up-new" placeholder="Hôm nay đã làm gì, khách phản hồi gì, chốt được gì..." aria-label="Ghi nhật ký"></textarea><button class="btn primary" type="button" id="up-add">Ghi</button></div>';
    var f = '<div class="lf"><button type="button" data-lf="" class="' + (S.lf ? "" : "on") + '">Tất cả ' + all.length + "</button>" + Object.keys(UPK).map(function (k) { var n = all.filter(function (u) { return u.kind === k; }).length; return n ? '<button type="button" data-lf="' + k + '" class="' + (S.lf === k ? "on" : "") + '">' + UPK[k] + " " + n + "</button>" : ""; }).join("") + "</div>";
    return '<div class="one"><section>' + add + f + (l.length ? '<div class="tl">' + l.map(logRow).join("") + "</div>" : '<p class="t2">Chưa có ghi chép.</p>') + "</section></div>";
  }
  function fsize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function docTable(d) { var col = (d.columns && d.columns.length === 3) ? d.columns : ["Khoản", "Nội dung", "Giá"]; return "<table><thead><tr>" + col.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" + (d.rows || []).map(function (r) { return r.length === 1 ? '<tr><td class="g" colspan="3">' + esc(r[0]) + "</td></tr>" : "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + '</td><td class="p">' + esc(r[2]) + "</td></tr>"; }).join("") + "</tbody></table>"; }
  function vDocs(c) {
    var l = S.docs.filter(function (d) { return d.client_id === c.id; });
    var top = '<div class="dtop"><span class="t2">' + l.length + " tài liệu · " + l.filter(function (d) { return d.audience === "khach"; }).length + " bản gửi khách</span>" + (S.ro ? "" : '<div style="display:flex;gap:6px"><button class="btn" type="button" data-up-file="new">' + HT.ic("file") + 'Tải PDF lên</button><button class="btn" type="button" data-new-doc="1">+ Tài liệu</button></div>') + "</div>";
    var cards = l.map(function (d) {
      var hasRows = (d.rows || []).length > 0;
      var bar = (d.file_path ? '<button class="btn primary" type="button" data-view-file="' + d.id + '">Xem PDF</button><button class="btn" type="button" data-open-file="' + d.id + '">Tải về</button>' + (S.ro ? "" : '<button class="btn" type="button" data-share-file="' + d.id + '">Link gửi khách 7 ngày</button>') : "")
        + (S.ro ? "" : '<button class="btn" type="button" data-edit-doc="' + d.id + '">Sửa</button>' + (d.file_path ? '<button class="btn" type="button" data-up-file="' + d.id + '">Thay PDF</button>' : '<button class="btn" type="button" data-up-file="' + d.id + '">Đính kèm PDF</button>'))
        + (hasRows ? '<button class="btn" type="button" data-print-doc="' + d.id + '">In bảng</button>' : "");
      return '<div class="doc"><div class="ttl">' + esc(d.title) + '</div><div class="tags"><span class="pill mute">' + esc(DK[d.kind] || "Khác") + '</span><span class="pill ' + (d.audience === "khach" ? "info" : "mute") + '">' + esc(AUD[d.audience] || "Nội bộ") + '</span><span class="pill ' + (d.status === "da_gui" ? "ok" : "warn") + '">' + (d.status === "da_gui" ? "Đã gửi" + (d.sent_at ? " " + dm(d.sent_at) : "") : "Nháp") + "</span>" + (d.version > 1 ? '<span class="pill mute">v' + d.version + "</span>" : "") + "</div>"
        + (d.file_path ? '<div class="fn">' + esc(d.file_name || "") + (d.file_size ? " · " + fsize(d.file_size) : "") + "</div>" : '<div class="fn">Chưa có file PDF</div>') + (d.note ? '<div class="nt">' + esc(d.note) + "</div>" : "") + (hasRows ? '<details class="sum"><summary>Bảng tóm tắt (' + d.rows.length + ' dòng)</summary><div class="tbl" style="margin-top:6px">' + docTable(d) + "</div></details>" : "") + '<div class="t2">' + dmy(d.created_at) + (d.created_by ? " · " + esc(shortMail(d.created_by)) : "") + '</div><div class="bar">' + bar + "</div></div>";
    }).join("");
    return '<div class="one"><section>' + top + (l.length ? '<div class="docgrid">' + cards + "</div>" : '<p class="t2">Chưa có tài liệu. Tải PDF lên hoặc thêm tài liệu có bảng tóm tắt.</p>') + '<input type="file" id="doc-file" accept="application/pdf" hidden></section></div>';
  }
  function vFee(c) {
    var tm = S.terms.filter(function (x) { return x.client_id === c.id; })[0];
    return '<div class="one fee"><section><h2>Phí và hợp đồng<span>sửa mức phí ở trang TIMUS Vận hành, mục Khách hàng</span></h2><dl class="kv"><dt>Hợp đồng bắt đầu</dt><dd>' + (c.contract_start ? dmy(c.contract_start) : "Chưa ký") + "</dd><dt>Giá trị, phí thỏa thuận</dt><dd>" + (c.deal_value ? money(c.deal_value) + " đ" : "Chưa ghi") + "</dd>" + (tm ? "<dt>Cách tính phí</dt><dd>" + esc(FEE[tm.fee_mode] || tm.fee_mode || "") + "</dd><dt>Phí cố định riêng</dt><dd>" + (tm.custom_fixed != null ? money(tm.custom_fixed) + " đ" : "Không") + "</dd><dt>Thưởng tháng đầu</dt><dd>" + (tm.bonus_first != null ? money(tm.bonus_first) : "Không") + "</dd><dt>Thưởng các tháng sau</dt><dd>" + (tm.bonus_after != null ? money(tm.bonus_after) : "Không") + "</dd>" + (tm.terms_note ? '<dt>Ghi chú phí</dt><dd class="pre">' + esc(tm.terms_note) + "</dd>" : "") : "<dt>Cách tính phí</dt><dd>Chưa thiết lập ở trang vận hành</dd>") + "</dl></section></div>";
  }

  /* ---------- việc hàng loạt ---------- */
  function selIds() { return S.reqs.filter(function (r) { return S.sel[r.id] && r.client_id === S.id; }).map(function (r) { return r.id; }); }
  function renderBulk() {
    var n = S.view === "client" ? selIds().length : 0, b = $("#bulk"); b.hidden = !n; if (!n) { S.bulkArm = false; b.innerHTML = ""; return; }
    b.innerHTML = "<span>Đã chọn: " + n + "</span>" + RQ_ST.map(function (s) { return '<button type="button" data-rqbulk="' + s[0] + '">' + s[1] + "</button>"; }).join("") + '<i></i><button type="button" data-rqbulk="del">' + HT.ic("trash") + (S.bulkArm ? "Bấm lần nữa để xóa" : "Xóa") + '</button><button type="button" class="end" data-rqbulk="clear">Bỏ chọn</button>';
  }
  async function rqBulk(k) {
    if (k === "clear") { S.sel = {}; render(); return; }
    var ids = selIds(); if (!ids.length) return;
    if (k === "del" && !S.bulkArm) { S.bulkArm = true; renderBulk(); return; }
    var q = sb.from("timus_client_requests"), ok = await save((k === "del" ? q.delete() : q.update({ status: k, done_at: k === "xong" ? new Date().toISOString() : null })).in("id", ids).select("id"), k === "del" ? "Đã xóa " + ids.length + " việc" : "Đã chuyển " + ids.length + " việc");
    if (ok) { S.sel = {}; render(); }
  }
  async function setReqStatus(id, st) {
    var r = byId(S.reqs, id); if (!r) return;
    var ok = await save(sb.from("timus_client_requests").update({ status: st, done_at: st === "xong" ? new Date().toISOString() : null }).eq("id", id).select("id"), "Đã cập nhật");
    if (ok && st === "xong" && r.status !== "xong") { await sysLog(r.client_id, "Xong việc: " + r.title); reload(); }
  }

  /* ---------- tài liệu ---------- */
  function safeName(n) { return String(n).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) || "tai-lieu.pdf"; }
  async function uploadDoc(target, f) {
    if (!f) return; if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) { toast("Chỉ nhận file PDF."); return; }
    if (f.size > 52428800) { toast("File lớn hơn 50 MB."); return; }
    var cid = S.id, path = cid + "/" + Date.now() + "-" + safeName(f.name); toast("Đang tải lên...");
    var up = await sb.storage.from(FILES).upload(path, f, { upsert: false, contentType: "application/pdf" }); if (up.error) { fail(up.error); return; }
    var meta = { file_path: path, file_name: f.name, file_size: f.size }, old = target !== "new" ? byId(S.docs, target) : null, ok;
    if (old) { if (old.file_path) meta.version = (old.version || 1) + 1; ok = await save(sb.from("timus_client_docs").update(meta).eq("id", old.id).select("id"), "Đã lưu PDF"); if (ok && old.file_path) await sb.storage.from(FILES).remove([old.file_path]); }
    else { meta.client_id = cid; meta.title = f.name.replace(/\.pdf$/i, ""); meta.created_by = S.me; ok = await save(sb.from("timus_client_docs").insert(meta).select("id"), "Đã tải PDF lên"); }
    if (!ok) { await sb.storage.from(FILES).remove([path]); return; }
    await sysLog(cid, (old ? "Thay PDF của tài liệu: " + old.title : "Tải lên tài liệu: " + meta.title) + " (" + fsize(f.size) + ")"); reload();
  }
  async function signed(d, sec) { var r = await sb.storage.from(FILES).createSignedUrl(d.file_path, sec); if (r.error) { fail(r.error); return null; } return r.data.signedUrl; }
  async function openDoc(id) { var d = byId(S.docs, id); if (!d || !d.file_path) return; var w = window.open("", "_blank"); var u = await signed(d, 600); if (!u) { if (w) w.close(); return; } if (w) w.location.href = u; else location.href = u; }
  async function viewDoc(id) {
    var d = byId(S.docs, id); if (!d || !d.file_path) return; var u = await signed(d, 600); if (!u) return;
    S.kind = "view";
    $("#drawerRoot").innerHTML = '<div class="scrim" data-close="1"></div><aside class="drawer wide" role="dialog" aria-modal="true" aria-label="Xem PDF"><div class="hd"><h3>' + esc(d.title) + '</h3><div style="display:flex;gap:6px"><button class="btn sm" type="button" data-open-file="' + d.id + '">Mở tab mới</button><button class="btn sm" type="button" data-close="1">Đóng</button></div></div><div class="body one"><iframe src="' + esc(u) + '#toolbar=1" title="PDF"></iframe></div></aside>';
  }
  async function shareDoc(id) {
    var d = byId(S.docs, id); if (!d || !d.file_path) return; var u = await signed(d, SHARE_SEC); if (!u) return;
    var ok = false; try { await navigator.clipboard.writeText(u); ok = true; } catch (_) {}
    if (!ok) prompt("Sao chép link gửi khách (hạn 7 ngày):", u);
    else toast("Đã sao chép link, hạn 7 ngày");
    if (d.status !== "da_gui" && confirm("Đánh dấu tài liệu này là đã gửi khách hôm nay?")) {
      await save(sb.from("timus_client_docs").update({ status: "da_gui", sent_at: today(), audience: "khach" }).eq("id", id).select("id"), "Đã đánh dấu đã gửi");
      await sysLog(d.client_id, "Gửi khách tài liệu: " + d.title); reload();
    }
  }
  function printDoc(id) {
    var d = byId(S.docs, id); if (!d) return; var w = window.open("", "_blank"); if (!w) { toast("Trình duyệt đang chặn cửa sổ in."); return; }
    w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>' + esc(d.title) + '</title><style>@page{size:A4;margin:1.3cm 1.5cm}body{font-family:"Times New Roman",serif;font-size:10pt;color:#000;margin:16px}h1{font-size:14pt;text-align:center;margin:0 0 7pt}table{border-collapse:collapse;width:100%}th,td{border:.7pt solid #000;padding:2pt 4pt;text-align:left;vertical-align:top;font-size:9.5pt}th,td.g,td.p{font-weight:bold}th:first-child{width:22%}th:last-child{width:24%}tr{page-break-inside:avoid}p{font-size:9pt}</style></head><body><h1>' + esc(d.title).toUpperCase() + "</h1>" + docTable(d) + (d.note ? "<p>" + esc(d.note) + "</p>" : "") + "</body></html>"); w.document.close(); w.focus(); w.print();
  }
  function printClient(c) {
    var t = today(), reqs = S.reqs.filter(function (r) { return r.client_id === c.id && r.status !== "xong"; }), ups = S.ups.filter(function (u) { return u.client_id === c.id && u.kind !== "he_thong"; }).slice(0, 10), docs = S.docs.filter(function (d) { return d.client_id === c.id; });
    var w = window.open("", "_blank"); if (!w) { toast("Trình duyệt đang chặn cửa sổ in."); return; }
    var row = function (k, v) { return v ? "<tr><th>" + k + "</th><td>" + esc(v) + "</td></tr>" : ""; };
    w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>' + esc(c.name) + '</title><style>@page{size:A4;margin:1.5cm}body{font-family:Inter,Arial,sans-serif;font-size:10.5pt;color:#111;margin:0}h1{font-size:16pt;margin:0 0 2pt}h2{font-size:12pt;margin:14pt 0 4pt;border-bottom:1px solid #999;padding-bottom:2pt}table{border-collapse:collapse;width:100%;font-size:10pt}th,td{text-align:left;vertical-align:top;padding:3pt 6pt;border-bottom:.5pt solid #ccc}th{width:28%;font-weight:600;color:#444}.s{color:#666;font-size:9pt}</style></head><body><h1>' + esc(c.name) + '</h1><div class="s">' + esc([stageName(c.stage), c.services, MARKET[c.market]].filter(Boolean).join(" · ")) + " · in ngày " + dmy(t) + "</div><h2>Thông tin</h2><table>" + row("Liên hệ", [c.contact_name, c.phone, c.email].filter(Boolean).join(" · ")) + row("Phụ trách", shortMail(c.owner_email)) + row("Nguồn", SOURCE[c.source]) + row("Ngành", c.industry) + row("Hợp đồng", c.contract_start ? "từ " + dmy(c.contract_start) : "") + row("Giá trị, phí", c.deal_value ? money(c.deal_value) + " đ" : "") + row("Bước tiếp theo", c.next_action) + row("Ghi chú", c.notes) + "</table>"
      + "<h2>Việc đang mở (" + reqs.length + ")</h2><table>" + reqs.map(function (r) { return "<tr><td>" + esc(r.title) + (r.next_step ? '<div class="s">' + esc(r.next_step) + "</div>" : "") + "</td><td>" + esc(RQ_ST.filter(function (s) { return s[0] === r.status; })[0][1]) + (r.due_date ? ", hạn " + dmy(r.due_date) : "") + "</td></tr>"; }).join("") + "</table>"
      + "<h2>Nhật ký gần đây</h2><table>" + ups.map(function (u) { return "<tr><th>" + when(u.created_at) + " · " + esc(UPK[u.kind] || "") + "</th><td>" + esc(u.body) + "</td></tr>"; }).join("") + "</table>"
      + "<h2>Tài liệu (" + docs.length + ")</h2><table>" + docs.map(function (d) { return "<tr><td>" + esc(d.title) + "</td><td>" + [DK[d.kind], AUD[d.audience], d.status === "da_gui" ? "đã gửi " + dmy(d.sent_at) : "nháp"].filter(Boolean).join(", ") + "</td></tr>"; }).join("") + "</table></body></html>");
    w.document.close(); w.focus(); w.print();
  }

  /* ---------- ngăn sửa ---------- */
  function drawer(title, body, del) {
    S.delArm = false;
    $("#drawerRoot").innerHTML = '<div class="scrim" data-close="1"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="d-h"><form id="d-form"><div class="hd"><h3 id="d-h">' + esc(title) + '</h3><button class="btn sm" type="button" data-close="1">Đóng</button></div><div class="body">' + body + '</div><div class="ft"><div>' + (del ? '<button class="btn danger" type="button" id="d-del">Xóa</button>' : "") + '</div><div style="display:flex;gap:6px"><button class="btn" type="button" data-close="1">Hủy</button><button class="btn primary" type="submit">Lưu</button></div></div></form></aside>';
    var f = $(".drawer input,.drawer textarea"); if (f) f.focus();
  }
  var inp = function (k, l, type, v, w, hint) { return '<label class="f' + (w ? " w" : "") + '">' + l + (hint ? ' <span class="hint">' + hint + "</span>" : "") + '<input id="d-' + k + '" type="' + type + '" value="' + esc(v || "") + '"></label>'; };
  var ta = function (k, l, v, cls, hint) { return '<label class="f w">' + l + (hint ? ' <span class="hint">' + hint + "</span>" : "") + '<textarea id="d-' + k + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(v || "") + "</textarea></label>"; };
  var sel = function (k, l, html, w) { return '<label class="f' + (w ? " w" : "") + '">' + l + '<select id="d-' + k + '">' + html + "</select></label>"; };
  function teamOpts(cur) { var l = owners(); if (cur && l.indexOf(cur) < 0) l.push(cur); if (S.me && l.indexOf(S.me) < 0) l.push(S.me); return opt("", "Chưa phân", cur) + l.map(function (e) { return opt(e, shortMail(e), cur); }).join(""); }
  function clientForm(c) {
    S.kind = "client"; S.edit = c ? c.id : null; c = c || { stage: "tiep_can", first_contact: today(), owner_email: S.me };
    drawer(S.edit ? "Sửa hồ sơ khách hàng" : "Thêm khách hàng",
      inp("name", "Tên khách hàng, thương hiệu", "text", c.name, true) + sel("stage", "Giai đoạn", STAGE.map(function (s) { return opt(s[0], s[1], c.stage); }).join("")) + sel("market", "Thị trường", opts(MARKET, c.market, "Chưa rõ")) + inp("services", "Dịch vụ", "text", c.services, true) + inp("industry", "Ngành hàng", "text", c.industry) + sel("source", "Nguồn khách", opts(SOURCE, c.source, "Chưa rõ")) + sel("owner_email", "Phụ trách phía TIMUS", teamOpts(c.owner_email)) + inp("deal_value", "Giá trị, phí (đ)", "number", c.deal_value) + inp("first_contact", "Tiếp cận từ ngày", "date", c.first_contact) + inp("contract_start", "Hợp đồng bắt đầu", "date", c.contract_start) + ta("next_action", "Bước tiếp theo", c.next_action) + inp("contact_name", "Người liên hệ", "text", c.contact_name) + inp("phone", "Điện thoại, Zalo", "text", c.phone) + inp("email", "Email", "email", c.email, true) + (c.stage === "tam_dung" ? ta("paused_reason", "Lý do tạm dừng", c.paused_reason) : "") + ta("notes", "Ghi chú", c.notes), !!S.edit);
  }
  function reqForm(r) {
    S.kind = "req"; S.edit = r.id;
    var docs = S.docs.filter(function (d) { return d.client_id === r.client_id; });
    drawer("Sửa việc", inp("title", "Việc", "text", r.title, true) + sel("status", "Trạng thái", RQ_ST.map(function (s) { return opt(s[0], s[1], r.status); }).join("")) + sel("kind", "Loại", opts(KIND, r.kind)) + sel("priority", "Ưu tiên", opts(PRIO, r.priority)) + inp("due_date", "Hạn", "date", r.due_date) + sel("assignee_email", "Phụ trách", teamOpts(r.assignee_email)) + sel("doc_id", "Tài liệu liên quan", opt("", "Không", r.doc_id) + docs.map(function (d) { return opt(d.id, d.title, r.doc_id); }).join("")) + ta("next_step", "Bước tiếp theo", r.next_step) + ta("notes", "Chi tiết, nội dung trao đổi", r.notes), true);
  }
  function docForm(d) {
    S.kind = "doc"; S.edit = d ? d.id : null; d = d || { kind: "khac", audience: "noi_bo", status: "nhap", version: 1 };
    var rowsTxt = (d.rows || []).map(function (r) { return r.join(" | "); }).join("\n"), colTxt = (d.columns || []).join(" | ");
    drawer(S.edit ? "Sửa tài liệu" : "Thêm tài liệu", inp("title", "Tiêu đề", "text", d.title, true) + sel("kind", "Loại", opts(DK, d.kind)) + sel("audience", "Đối tượng", opts(AUD, d.audience)) + sel("status", "Trạng thái", opts(DST, d.status)) + inp("sent_at", "Ngày gửi khách", "date", d.sent_at) + inp("version", "Phiên bản", "number", d.version) + inp("columns", "Tên 3 cột bảng tóm tắt", "text", colTxt, false, "cách nhau bằng |") + ta("note", "Ghi chú", d.note) + ta("rows", "Bảng tóm tắt", rowsTxt, "rows", "mỗi dòng: Khoản | Nội dung | Giá; dòng chỉ có một phần là dòng nhóm. Để trống nếu không cần"), !!S.edit);
  }
  function closeDrawer() { S.kind = null; S.edit = null; $("#drawerRoot").innerHTML = ""; }
  async function saveDrawer() {
    var v = function (k) { var e = $("#d-" + k); return e ? e.value.trim() : ""; }, n = function (k) { return v(k) || null; }, ok;
    if (S.kind === "client") {
      if (!v("name")) { toast("Điền tên khách hàng"); return; }
      var o = { name: v("name"), stage: v("stage"), status: clientStatus(v("stage")), market: n("market"), services: n("services"), industry: n("industry"), source: n("source"), owner_email: n("owner_email"), deal_value: n("deal_value"), first_contact: n("first_contact"), contract_start: n("contract_start"), next_action: n("next_action"), contact_name: n("contact_name"), phone: n("phone"), email: n("email"), notes: n("notes") };
      if ($("#d-paused_reason")) o.paused_reason = n("paused_reason");
      if (S.edit) ok = await save(sb.from("timus_clients").update(o).eq("id", S.edit).select("id"), "Đã lưu");
      else { var r = await sb.from("timus_clients").insert(o).select("id"); if (r.error || !(r.data || []).length) { fail(r.error); return; } ok = true; toast("Đã thêm khách hàng"); await sysLog(r.data[0].id, "Tạo hồ sơ khách, giai đoạn " + stageName(o.stage)); closeDrawer(); go(r.data[0].id); await load(); return; }
    } else if (S.kind === "req") {
      if (!v("title")) { toast("Điền tên việc"); return; }
      var old = byId(S.reqs, S.edit), st = v("status");
      ok = await save(sb.from("timus_client_requests").update({ title: v("title"), status: st, kind: v("kind"), priority: v("priority"), due_date: n("due_date"), assignee_email: n("assignee_email"), doc_id: n("doc_id"), next_step: n("next_step"), notes: n("notes"), done_at: st === "xong" ? (old && old.done_at) || new Date().toISOString() : null }).eq("id", S.edit).select("id"), "Đã lưu");
      if (ok && st === "xong" && old && old.status !== "xong") { await sysLog(old.client_id, "Xong việc: " + v("title")); reload(); }
    } else if (S.kind === "doc") {
      if (!v("title")) { toast("Điền tiêu đề"); return; }
      var rows = v("rows") ? v("rows").split("\n").map(function (l) { return l.split("|").map(function (x) { return x.trim(); }); }).filter(function (r) { return r[0]; }).map(function (r) { return r.length === 1 ? [r[0]] : [r[0], r[1] || "", r[2] || ""]; }) : [];
      var cols = v("columns") ? v("columns").split("|").map(function (x) { return x.trim(); }) : null; if (cols && cols.length !== 3) cols = null;
      var dv = { title: v("title"), kind: v("kind"), audience: v("audience"), status: v("status"), sent_at: n("sent_at"), version: +v("version") || 1, note: n("note"), rows: rows, columns: cols };
      if (dv.status === "da_gui" && !dv.sent_at) dv.sent_at = today();
      if (S.edit) ok = await save(sb.from("timus_client_docs").update(dv).eq("id", S.edit).select("id"), "Đã lưu");
      else { dv.client_id = S.id; dv.created_by = S.me; ok = await save(sb.from("timus_client_docs").insert(dv).select("id"), "Đã thêm tài liệu"); }
    }
    if (ok) closeDrawer();
  }
  async function delItem() {
    if (!S.delArm) { S.delArm = true; $("#d-del").textContent = "Bấm lần nữa để xóa"; return; }
    var t = { client: "timus_clients", req: "timus_client_requests", doc: "timus_client_docs" }[S.kind];
    if (S.kind === "doc") { var d = byId(S.docs, S.edit); if (d && d.file_path) await sb.storage.from(FILES).remove([d.file_path]); }
    var wasClient = S.kind === "client";
    if (await save(sb.from(t).delete().eq("id", S.edit).select("id"), "Đã xóa")) { closeDrawer(); if (wasClient) go(null); }
  }

  /* ---------- sự kiện ---------- */
  function bind() {
    window.addEventListener("hashchange", function () { route(); S.sel = {}; render(); window.scrollTo(0, 0); });
    document.addEventListener("input", function (e) { if (e.target.id === "q") { S.q = e.target.value; var t = $("#app .tbl,#app .pipe,#app .empty:last-child"); render(); } });
    document.addEventListener("change", async function (e) {
      var t = e.target;
      if (t.id === "f-stage") { S.fStage = t.value; render(); return; }
      if (t.id === "f-market") { S.fMarket = t.value; render(); return; }
      if (t.id === "f-owner") { S.fOwner = t.value; render(); return; }
      if (t.id === "doc-file") { uploadDoc(S.upTarget || "new", t.files && t.files[0]); return; }
      if (t.dataset.rqsel) { S.sel[t.dataset.rqsel] = t.checked; S.bulkArm = false; renderBulk(); return; }
      if (t.dataset.st) { setReqStatus(t.dataset.st, t.value); }
    });
    document.addEventListener("click", async function (e) {
      var t = e.target, x;
      if (t.closest("[data-close]")) { closeDrawer(); return; }
      if (t.id === "d-del") { delItem(); return; }
      if (t.closest("[data-new]")) { clientForm(); return; }
      if ((x = t.closest("[data-mode]"))) { S.mode = x.dataset.mode; try { localStorage.setItem("khach-mode", S.mode); } catch (_) {} render(); return; }
      if ((x = t.closest("[data-sort]"))) { if (S.sort === x.dataset.sort) S.dir = -S.dir; else { S.sort = x.dataset.sort; S.dir = 1; } render(); return; }
      if ((x = t.closest("[data-tab]"))) { S.lf = ""; go(S.id, x.dataset.tab); return; }
      if ((x = t.closest("[data-lf]"))) { S.lf = x.dataset.lf; render(); return; }
      if ((x = t.closest("[data-edit-client]"))) { clientForm(byId(S.clients, x.dataset.editClient)); return; }
      if (t.closest("[data-print-client]")) { printClient(byId(S.clients, S.id)); return; }
      if ((x = t.closest("[data-stage]")) && !x.disabled) {
        var st = x.dataset.stage, c = byId(S.clients, S.id); if (!c || c.stage === st) return;
        var order = STAGE.map(function (s) { return s[0]; });
        if ((order.indexOf(st) < order.indexOf(c.stage) || st === "tam_dung") && !confirm("Chuyển " + c.name + " sang " + stageName(st) + "?")) return;
        var o = { stage: st, status: clientStatus(st) };
        if (st === "tam_dung") { var why = prompt("Lý do tạm dừng (để trống nếu chưa rõ):", c.paused_reason || ""); if (why === null) return; o.paused_reason = why || null; }
        if (await save(sb.from("timus_clients").update(o).eq("id", S.id).select("id"), "Đã chuyển sang " + stageName(st))) { await sysLog(S.id, "Đổi giai đoạn: " + stageName(c.stage) + " sang " + stageName(st) + (o.paused_reason ? ". Lý do: " + o.paused_reason : "")); reload(); }
        return;
      }
      if (t.id === "up-add") { var u = $("#up-new"), b = u.value.trim(); if (!b) return; var k = $("#up-kind") ? $("#up-kind").value : "ghi_chu"; u.value = ""; if (!await save(sb.from("timus_client_updates").insert({ client_id: S.id, body: b, kind: k, author_email: S.me }).select("id"), "Đã ghi")) $("#up-new").value = b; return; }
      if ((x = t.closest("[data-del-up]"))) { var up = byId(S.ups, x.dataset.delUp); if (!confirm("Xóa ghi chép này?\n\n" + (up ? up.body.slice(0, 120) : ""))) return; await save(sb.from("timus_client_updates").delete().eq("id", x.dataset.delUp).select("id"), "Đã xóa ghi chép"); return; }
      if ((x = t.closest("[data-print-doc]"))) { printDoc(x.dataset.printDoc); return; }
      if ((x = t.closest("[data-up-file]"))) { S.upTarget = x.dataset.upFile; var fi = $("#doc-file"); fi.value = ""; fi.click(); return; }
      if ((x = t.closest("[data-open-file]"))) { openDoc(x.dataset.openFile); return; }
      if ((x = t.closest("[data-view-file]"))) { viewDoc(x.dataset.viewFile); return; }
      if ((x = t.closest("[data-share-file]"))) { shareDoc(x.dataset.shareFile); return; }
      if ((x = t.closest("[data-edit-doc]"))) { docForm(byId(S.docs, x.dataset.editDoc)); return; }
      if (t.closest("[data-new-doc]")) { docForm(null); return; }
      if ((x = t.closest("[data-rqbulk]"))) { rqBulk(x.dataset.rqbulk); return; }
      if (t.closest("select") || t.dataset.rqsel || t.closest("a")) return;
      if ((x = t.closest("[data-rq]"))) { if (!S.ro) reqForm(byId(S.reqs, x.dataset.rq)); return; }
      if ((x = t.closest("[data-go]")) !== null && x) { var p = x.dataset.go.split("/"); go(p[0] || null, p[1]); return; }
    });
    document.addEventListener("submit", async function (e) {
      if (e.target.id === "d-form") { e.preventDefault(); saveDrawer(); return; }
      if (e.target.id === "rq-add") {
        e.preventDefault(); var ti = $("#rq-title"), title = ti.value.trim(); if (!title) return;
        var o = { client_id: S.id, title: title, kind: $("#rq-kind").value, due_date: $("#rq-due").value || null, created_by: S.me };
        ti.value = ""; if (await save(sb.from("timus_client_requests").insert(o).select("id"), "Đã thêm việc")) { var y = $("#rq-title"); if (y) y.focus(); } else $("#rq-title").value = title;
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && S.kind) { closeDrawer(); return; }
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("rq")) { e.preventDefault(); if (!S.ro) reqForm(byId(S.reqs, e.target.dataset.rq)); }
    });
    /* kéo thả thẻ khách giữa các cột pipeline */
    document.addEventListener("dragstart", function (e) { var c = e.target.closest && e.target.closest("[data-card]"); if (!c) return; e.dataTransfer.setData("text/plain", c.dataset.card); c.classList.add("drag"); });
    document.addEventListener("dragend", function (e) { var c = e.target.closest && e.target.closest("[data-card]"); if (c) c.classList.remove("drag"); });
    document.addEventListener("dragover", function (e) { var col = e.target.closest && e.target.closest("[data-col]"); if (col) { e.preventDefault(); col.classList.add("over"); } });
    document.addEventListener("dragleave", function (e) { var col = e.target.closest && e.target.closest("[data-col]"); if (col) col.classList.remove("over"); });
    document.addEventListener("drop", async function (e) {
      var col = e.target.closest && e.target.closest("[data-col]"); if (!col) return; e.preventDefault(); col.classList.remove("over");
      var id = e.dataTransfer.getData("text/plain"), c = byId(S.clients, id), st = col.dataset.col; if (!c || c.stage === st || S.ro) return;
      if (!confirm("Chuyển " + c.name + " sang " + stageName(st) + "?")) return;
      if (await save(sb.from("timus_clients").update({ stage: st, status: clientStatus(st) }).eq("id", id).select("id"), "Đã chuyển sang " + stageName(st))) { await sysLog(id, "Đổi giai đoạn: " + stageName(c.stage) + " sang " + stageName(st)); reload(); }
    });
    window.addEventListener("focus", reload);
    HT.onSignout = async function () { await sb.auth.signOut(); location.reload(); };
  }

  /* ---------- đăng nhập ---------- */
  function loginScreen() {
    return new Promise(function (resolve) {
      var box = document.createElement("div"); box.id = "login";
      box.innerHTML = '<form id="loginform" class="login-card"><div class="ws"><i>H</i>Huy Tim · TIMUS</div><h1>Đăng nhập</h1><p>Trang khách hàng dành cho admin TIMUS.</p><label class="f">Email<input id="loginemail" type="email" required autocomplete="username"></label><label class="f">Mật khẩu<input id="loginpw" type="password" required autocomplete="current-password"></label><button class="btn primary" type="submit">Đăng nhập</button><p id="loginmsg" role="status"></p></form>';
      document.body.appendChild(box);
      var msg = $("#loginmsg");
      $("#loginform").addEventListener("submit", async function (e) { e.preventDefault(); msg.textContent = "Đang đăng nhập..."; var res = await sb.auth.signInWithPassword({ email: $("#loginemail").value.trim(), password: $("#loginpw").value }); if (res.error) msg.textContent = "Sai email hoặc mật khẩu."; });
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
    HT.render({ base: "../", active: "khach", user: { email: S.me, actions: [{ icon: "out", label: "Đăng xuất", attrs: "data-ht-signout" }] } }); HT.flags(sb, "../");
    var r = await sb.from("core_roles").select("email,area,role");
    var mine = (r.data || []).filter(function (x) { return x.email === S.me; });
    var lvl = function (role) { return { owner: 4, admin: 3, staff: 2, viewer: 1 }[role] || 0; };
    var best = 0; mine.forEach(function (x) { if (x.area === "all" || x.area === "timus") best = Math.max(best, lvl(x.role)); });
    if (best < 2) { $("#app").innerHTML = '<div class="empty">Tài khoản này không có quyền xem trang khách hàng.</div>'; return; }
    S.ro = best < 3;
    S.team = (r.data || []).filter(function (x) { return (x.area === "timus" || x.area === "all") && lvl(x.role) >= 2; }).map(function (x) { return x.email; });
    var legacy = (location.hash || "").replace("#", ""); if (legacy && legacy.indexOf("/") < 0 && legacy !== "all") { try { history.replaceState(null, "", "#/" + legacy); } catch (_) {} }
    route(); bind(); await load();
    sb.channel("timus-customers").on("postgres_changes", { event: "*", schema: "timus", table: "clients" }, reload).on("postgres_changes", { event: "*", schema: "timus", table: "client_requests" }, reload).on("postgres_changes", { event: "*", schema: "timus", table: "client_updates" }, reload).on("postgres_changes", { event: "*", schema: "timus", table: "client_docs" }, reload).subscribe();
  })();
})();
