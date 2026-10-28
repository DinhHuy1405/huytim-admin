/* Lớp lưu trữ cho TIMUS Vận hành.
 * Trang chính gọi window.claude.use("db" | "user" | "downloads") như khi chạy trong claude.ai;
 * file này trả về cùng giao diện đó nhưng đọc và ghi vào các bảng thật trong schema timus của Supabase,
 * đăng nhập bằng Supabase Auth, phân quyền theo bảng core.roles.
 */
(function () {
  "use strict";
  var cfg = window.TIMUS_CONFIG || {};
  var sb = null, me = { email: "", roles: [] };

  /* ---------- lỗi: đổi lỗi Supabase sang mã trang chính hiểu ---------- */
  function wrapErr(e) {
    var code = (e && e.code) || "";
    if (code === "42501" || code === "PGRST301" || code === "denied") return { code: "invalid_argument", message: (e && e.message) || "Không có quyền" };
    if (code === "23503") return { code: "conflict_ref", message: "Còn dữ liệu khác đang liên kết tới mục này" };
    if (code === "23505") return { code: "conflict_dup", message: "Trùng với dữ liệu đã có" };
    if (code === "23514" || code === "23502" || code === "22P02" || code === "22007") return { code: "bad_value", message: (e && e.message) || "Giá trị không hợp lệ" };
    return { code: "unavailable", message: (e && e.message) || "Lỗi kết nối" };
  }
  function must(res) { if (res.error) throw wrapErr(res.error); return res.data; }
  function denyIfEmpty(rows) { if (!rows || !rows.length) throw { code: "invalid_argument", message: "Không có quyền hoặc không tìm thấy" }; return rows; }

  /* ---------- ánh xạ tên trường của trang <-> cột trong bảng ---------- */
  var MAPS = {
    shops: { name: "name", platform: "platform", market: "market", clientId: "client_id", category: "category", shopCode: "shop_code",
      shopUrl: "shop_url", loginEmail: "login_account", status: "status", health: "health", healthNote: "health_note",
      handoverDate: "handover_date", launchDate: "launch_date", ownerId: "owner_id", warehouse: "warehouse", skuCount: "sku_count",
      adBudget: "ad_budget", notes: "notes" },
    staff: { name: "name", role: "role_title", market: "market", status: "status", phone: "phone", email: "email", chat: "chat",
      startDate: "start_date", defaultShift: "default_shift", platforms: "platforms", uid: "login_email", notes: "notes" },
    tasks: { title: "title", shopId: "shop_id", assigneeId: "assignee_id", type: "task_type", priority: "priority", due: "due_date",
      status: "status", notes: "notes", reviewSince: "review_since", doneAt: "done_at", checklist: "checklist", createdBy: "created_by", planWeek: "plan_week" },
    task_notes: { taskId: "task_id", author: "author_email", body: "body" },
    notes: { author: "author_email", shopId: "shop_id", title: "title", body: "body", pinned: "pinned", shared: "shared" },
    reports: { author: "author_email", kind: "kind", periodStart: "period_start", periodEnd: "period_end", shopId: "shop_id", summary: "summary",
      numbers: "numbers", issues: "issues", ideas: "ideas", ideasCount: "ideas_count", nextPlan: "next_plan", status: "status",
      submittedAt: "submitted_at", reviewedAt: "reviewed_at" },
    report_comments: { reportId: "report_id", author: "author_email", body: "body" },
    work_sessions: { author: "author_email", startedAt: "started_at", endedAt: "ended_at", note: "note" },
    staff_docs: { staffId: "staff_id", title: "title", kind: "kind", path: "path", sizeBytes: "size_bytes", signedOn: "signed_on", uploadedBy: "uploaded_by" },
    kpi_reviews: { critA: "crit_a", critB: "crit_b", critC: "crit_c", critD: "crit_d", bonus: "bonus", note: "note" },
    clients: { name: "name", contactName: "contact_name", phone: "phone", email: "email", status: "status", contractStart: "contract_start", notes: "notes" },
    staff_pay: { salary: "salary", allowance: "allowance", commission: "commission", payNote: "pay_note" },
    client_terms: { feeMode: "fee_mode", customFixed: "custom_fixed", bonusFirst: "bonus_first", bonusAfter: "bonus_after", termsNote: "terms_note" },
    shop_metrics: { orders: "orders", gmv: "gmv", netSales: "net_sales", adSpend: "ad_spend", adSales: "ad_sales", violation: "violation_rate", ontime: "ontime_rate" },
    settings: { fx: "fx_rate", overload: "overload_limit" }
  };
  /* cột chữ bắt buộc có giá trị: ô trống gửi chuỗi rỗng thay vì null */
  var NOT_NULL_TEXT = { reports: ["summary", "issues", "ideas", "next_plan"], notes: ["body"] };
  function toRow(table, obj) {
    var m = MAPS[table], r = {}, keep = NOT_NULL_TEXT[table] || [];
    Object.keys(m).forEach(function (k) {
      if (!(k in obj)) return;
      var v = obj[k];
      if (v === "" || v === undefined) v = keep.indexOf(m[k]) >= 0 ? "" : null;
      if (k === "uid" && v) v = String(v).toLowerCase();
      r[m[k]] = v;
    });
    return r;
  }
  function fromRow(table, row) {
    var m = MAPS[table], o = {};
    Object.keys(m).forEach(function (k) { var v = row[m[k]]; if (v !== null && v !== undefined) o[k] = (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) && /numeric|sku|orders|gmv|sales|spend|rate|salary|allowance|commission|fixed|bonus|fx|overload|budget/i.test(m[k])) ? Number(v) : v; });
    if (row.created_at) o.createdAt = Date.parse(row.created_at);
    if (row.updated_at) o.updatedAt = Date.parse(row.updated_at);
    return o;
  }
  /* đọc ghi qua view public.timus_* (security_invoker, RLS của bảng gốc vẫn áp dụng) */
  var GEN = ["staff", "tasks", "clients", "task_notes", "notes", "reports", "report_comments", "work_sessions", "staff_docs"];
  function T(name) { return sb.from("timus_" + name); }
  function C(name) { return sb.from("core_" + name); }
  var PK = { staff_docs: "id", kpi_reviews: "staff_id,month_start", reports: "id", report_comments: "id", work_sessions: "id", shops: "id", staff: "id", tasks: "id", clients: "id", task_notes: "id", notes: "id", staff_pay: "staff_id", client_terms: "client_id", shop_metrics: "shop_id,month", shift_assignments: "staff_id,work_date" };
  function up(name, rows) { return T(name).upsert(rows, { onConflict: PK[name] }); }

  /* ---------- ảnh chụp dữ liệu giống claude db ---------- */
  function docSnap(id, data) { return { id: id, exists: data != null, data: function () { return data == null ? undefined : JSON.parse(JSON.stringify(data)); }, metadata: { fromCache: false, hasPendingWrites: false } }; }
  function querySnap(list) { var docs = list.map(function (x) { return docSnap(x.id, x.data); }); return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: { fromCache: false, hasPendingWrites: false } }; }

  /* ---------- theo dõi thay đổi: mỗi bảng một kênh realtime, đọc lại khi có thay đổi ---------- */
  var listeners = {}, channels = {};
  function onTable(table, fn) {
    (listeners[table] = listeners[table] || []).push(fn);
    if (!channels[table]) {
      channels[table] = sb.channel("timus-" + table)
        .on("postgres_changes", { event: "*", schema: "timus", table: table }, function () { bump(table); })
        .subscribe();
    }
    return function () { listeners[table] = (listeners[table] || []).filter(function (f) { return f !== fn; }); };
  }
  var bumpT = {};
  function bump(table) { clearTimeout(bumpT[table]); bumpT[table] = setTimeout(function () { (listeners[table] || []).forEach(function (f) { f(); }); }, 120); }
  function watch(tables, load, next, err) {
    var alive = true;
    var run = function () { load().then(function (v) { if (alive) next(v); }, function (e) { if (alive && err) err(wrapErr(e)); }); };
    var offs = tables.map(function (t) { return onTable(t, run); });
    run();
    return function () { alive = false; offs.forEach(function (o) { o(); }); };
  }

  /* ---------- đọc ---------- */
  async function loadCollection(name, where) {
    if (name === "shops") {
      var r = await Promise.all([T("shops").select("*"), T("shop_support").select("shop_id,staff_id")]);
      var shops = must(r[0]), sup = must(r[1]), by = {};
      sup.forEach(function (s) { (by[s.shop_id] = by[s.shop_id] || []).push(s.staff_id); });
      return shops.map(function (row) { var o = fromRow("shops", row); o.supportIds = by[row.id] || []; return { id: row.id, data: o }; });
    }
    if (GEN.indexOf(name) >= 0) {
      return must(await T(name).select("*")).map(function (row) { return { id: row.id, data: fromRow(name, row) }; });
    }
    if (name === "secure/hr/pay") return must(await T("staff_pay").select("*")).map(function (row) { return { id: row.staff_id, data: fromRow("staff_pay", row) }; });
    if (name === "secure/biz/terms") return must(await T("client_terms").select("*")).map(function (row) { return { id: row.client_id, data: fromRow("client_terms", row) }; });
    if (name === "kpi_reviews") return must(await T("kpi_reviews").select("*")).map(function (row) { var o = fromRow("kpi_reviews", row); o.staffId = row.staff_id; o.month = String(row.month_start).slice(0, 10); return { id: row.staff_id + "__" + o.month, data: o }; });
    if (name === "metrics") {
      var q = T("shop_metrics").select("*");
      if (where && where.month) q = q.eq("month", where.month + "-01");
      return must(await q).map(function (row) { var o = fromRow("shop_metrics", row); o.shopId = row.shop_id; o.month = String(row.month).slice(0, 7); return { id: row.shop_id + "__" + o.month, data: o }; });
    }
    throw { code: "invalid_argument", message: "Không có bảng " + name };
  }
  var TABLES_OF = { shops: ["shops", "shop_support"], staff: ["staff"], tasks: ["tasks"], clients: ["clients"], task_notes: ["task_notes"], notes: ["notes"], staff_docs: ["staff_docs"], reports: ["reports"], report_comments: ["report_comments"], work_sessions: ["work_sessions"], kpi_reviews: ["kpi_reviews"], "secure/hr/pay": ["staff_pay"], "secure/biz/terms": ["client_terms"], metrics: ["shop_metrics"] };

  function addDays(s, k) { var a = s.split("-").map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2] + k)).toISOString().slice(0, 10); }
  async function loadWeek(w) {
    var rows = must(await T("shift_assignments").select("staff_id,work_date,shift_code").gte("work_date", w).lte("work_date", addDays(w, 6)));
    var cells = {};
    rows.forEach(function (r) { var d = Math.round((Date.parse(r.work_date) - Date.parse(w)) / 864e5); (cells[r.staff_id] = cells[r.staff_id] || {})[d] = r.shift_code; });
    return rows.length ? { week: w, cells: cells } : null;
  }
  async function loadSettings() {
    var rows = must(await T("settings").select("*").eq("id", 1));
    return rows.length ? fromRow("settings", rows[0]) : null;
  }

  /* ---------- ghi ---------- */
  async function setDoc(col, id, obj) {
    if (col === "shops") {
      var row = toRow("shops", obj); row.id = id;
      denyIfEmpty(must(await up("shops", row).select("id")));
      var want = (obj.supportIds || []).filter(function (x) { return x && x !== obj.ownerId; });
      must(await T("shop_support").delete().eq("shop_id", id));
      if (want.length) must(await T("shop_support").insert(want.map(function (s) { return { shop_id: id, staff_id: s }; })));
      bump("shops"); return;
    }
    if (GEN.indexOf(col) >= 0) {
      var r2 = toRow(col, obj); r2.id = id;
      denyIfEmpty(must(await up(col, r2).select("id")));
      bump(col); return;
    }
    if (col === "secure/hr/pay") { var p = toRow("staff_pay", obj); p.staff_id = id; denyIfEmpty(must(await up("staff_pay", p).select("staff_id"))); bump("staff_pay"); return; }
    if (col === "secure/biz/terms") { var t = toRow("client_terms", obj); t.client_id = id; if (!t.fee_mode) t.fee_mode = "standard"; denyIfEmpty(must(await up("client_terms", t).select("client_id"))); bump("client_terms"); return; }
    if (col === "kpi_reviews") {
      var kp = id.split("__"), k = toRow("kpi_reviews", obj); k.staff_id = kp[0]; k.month_start = kp[1];
      denyIfEmpty(must(await up("kpi_reviews", k).select("staff_id"))); bump("kpi_reviews"); return;
    }
    if (col === "metrics") {
      var parts = id.split("__"), m = toRow("shop_metrics", obj);
      m.shop_id = parts[0]; m.month = parts[1] + "-01";
      denyIfEmpty(must(await up("shop_metrics", m).select("shop_id"))); bump("shop_metrics"); return;
    }
    if (col === "settings") {
      var s = toRow("settings", obj);
      Object.keys(s).forEach(function (k) { if (s[k] === null) delete s[k]; });
      denyIfEmpty(must(await T("settings").update(s).eq("id", 1).select("id"))); bump("settings"); return;
    }
    if (col === "schedules") { await replaceWeek(id, (obj && obj.cells) || {}); return; }
    throw { code: "invalid_argument", message: "Không ghi được vào " + col };
  }
  async function delDoc(col, id) {
    var map = { shops: ["shops", "id"], staff: ["staff", "id"], tasks: ["tasks", "id"], clients: ["clients", "id"], task_notes: ["task_notes", "id"], notes: ["notes", "id"], staff_docs: ["staff_docs", "id"], reports: ["reports", "id"], report_comments: ["report_comments", "id"], work_sessions: ["work_sessions", "id"], "secure/hr/pay": ["staff_pay", "staff_id"], "secure/biz/terms": ["client_terms", "client_id"] };
    var m = map[col]; if (!m) throw { code: "invalid_argument", message: "Không xóa được" };
    var rows = must(await T(m[0]).delete().eq(m[1], id).select(m[1]));
    if (!rows.length && col !== "secure/hr/pay" && col !== "secure/biz/terms") {
      var still = must(await T(m[0]).select(m[1]).eq(m[1], id));
      if (still.length) throw { code: "invalid_argument", message: "Không có quyền xóa" };
    }
    bump(m[0]);
  }
  async function patchWeek(w, cells) {
    var ups = [], dels = [];
    Object.keys(cells || {}).forEach(function (sid) {
      Object.keys(cells[sid] || {}).forEach(function (d) {
        var date = addDays(w, Number(d)), code = cells[sid][d];
        if (code) ups.push({ staff_id: sid, work_date: date, shift_code: code }); else dels.push([sid, date]);
      });
    });
    if (ups.length) denyIfEmpty(must(await up("shift_assignments", ups).select("staff_id")));
    for (var i = 0; i < dels.length; i++) must(await T("shift_assignments").delete().eq("staff_id", dels[i][0]).eq("work_date", dels[i][1]));
    bump("shift_assignments");
  }
  async function replaceWeek(w, cells) {
    must(await T("shift_assignments").delete().gte("work_date", w).lte("work_date", addDays(w, 6)));
    var ups = [];
    Object.keys(cells).forEach(function (sid) { Object.keys(cells[sid] || {}).forEach(function (d) { var c = cells[sid][d]; if (c) ups.push({ staff_id: sid, work_date: addDays(w, Number(d)), shift_code: c }); }); });
    if (ups.length) denyIfEmpty(must(await T("shift_assignments").insert(ups).select("staff_id")));
    bump("shift_assignments");
  }

  /* ---------- giao diện db giống claude ---------- */
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }); }
  function splitPath(p) { var i = p.lastIndexOf("/"); return [p.slice(0, i), p.slice(i + 1)]; }
  function docRef(path) {
    var sp = splitPath(path), col = sp[0], id = sp[1];
    return {
      id: id, path: path,
      get: async function () {
        if (col === "schedules") return docSnap(id, await loadWeek(id));
        if (col === "settings") return docSnap(id, await loadSettings());
        var all = await loadCollection(col); var hit = all.filter(function (x) { return x.id === id; })[0];
        return docSnap(id, hit ? hit.data : null);
      },
      set: function (obj) { return setDoc(col, id, obj); },
      update: function (obj) { if (col === "schedules") return patchWeek(id, obj.cells); return setDoc(col, id, obj); },
      delete: function () { return delDoc(col, id); },
      onSnapshot: function (next, err) {
        if (col === "schedules") return watch(["shift_assignments"], function () { return loadWeek(id); }, function (v) { next(docSnap(id, v)); }, err);
        if (col === "settings") return watch(["settings"], loadSettings, function (v) { next(docSnap(id, v)); }, err);
        return watch(TABLES_OF[col] || [], function () { return loadCollection(col); }, function (all) { var hit = all.filter(function (x) { return x.id === id; })[0]; next(docSnap(id, hit ? hit.data : null)); }, err);
      },
      collection: function () { throw new TypeError("Không hỗ trợ"); }
    };
  }
  function colRef(name, where) {
    return {
      path: name,
      where: function (f, op, v) { var w = Object.assign({}, where); if (op === "==") w[f] = v; return colRef(name, w); },
      orderBy: function () { return colRef(name, where); },
      limit: function () { return colRef(name, where); },
      doc: function (id) { return docRef(name + "/" + (id || uuid())); },
      add: async function (obj) { var id = uuid(); await setDoc(name, id, obj); return docRef(name + "/" + id); },
      get: async function () { return querySnap(await loadCollection(name, where)); },
      onSnapshot: function (next, err) { return watch(TABLES_OF[name] || [], function () { return loadCollection(name, where); }, function (l) { next(querySnap(l)); }, err); }
    };
  }
  var db = {
    doc: docRef,
    collection: function (n) { return colRef(n, {}); },
    /* file riêng tư (hợp đồng, phụ lục) trong bucket timus-docs */
    files: {
      upload: async function (path, file) { must(await sb.storage.from("timus-docs").upload(path, file, { contentType: file.type || "application/pdf", upsert: false })); },
      url: async function (path) { return must(await sb.storage.from("timus-docs").createSignedUrl(path, 120)).signedUrl; },
      remove: async function (path) { must(await sb.storage.from("timus-docs").remove([path])); }
    },
    /* quyền vào trang TIMUS (chỉ owner toàn hệ thống ghi được, theo RLS của core) */
    access: {
      get: async function (email) {
        email = String(email || "").toLowerCase(); if (!email) return "";
        var rows = must(await C("roles").select("role").eq("email", email).eq("area", "timus"));
        return rows.length ? rows[0].role : "";
      },
      set: async function (email, name, role) {
        email = String(email || "").toLowerCase(); if (!email) return;
        if (!role) { must(await C("roles").delete().eq("email", email).eq("area", "timus")); return; }
        must(await C("members").upsert({ email: email, display_name: name || "" }, { onConflict: "email" }));
        denyIfEmpty(must(await C("roles").upsert({ email: email, area: "timus", role: role }, { onConflict: "email,area" }).select("email")));
      }
    }
  };

  /* ---------- người đang xem ---------- */
  var RANK = { owner: 4, admin: 3, staff: 2, viewer: 1 };
  function level(area) { var best = 0; me.roles.forEach(function (r) { if (r.area === area || r.area === "all") best = Math.max(best, RANK[r.role] || 0); }); return best; }
  var user = {
    id: function () { return Promise.resolve(me.email || null); },
    isOwner: function () { return Promise.resolve(level("all") >= 4 && me.roles.some(function (r) { return r.area === "all" && r.role === "owner"; })); },
    canEdit: function () { return Promise.resolve(level("timus") >= 3); },
    can: function (n) { return Promise.resolve(n === "data.write" ? level("timus") >= 2 : null); },
    me: function () { return Promise.resolve({ id: me.email || null, name: "", email: me.email || null }); },
    profiles: function (ids) { var o = {}; [].concat(ids).forEach(function (i) { o[i] = { id: i, name: "", isMe: i === me.email }; }); return Promise.resolve(o); }
  };

  /* ---------- tải file CSV ---------- */
  var downloads = {
    save: function (o) {
      return new Promise(function (resolve) {
        var blob = new Blob([o.data], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = o.filename;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        resolve({ status: "saved" });
      });
    }
  };

  /* ---------- đăng nhập ---------- */
  function overlay(html) {
    var box = document.getElementById("login");
    if (!box) { box = document.createElement("div"); box.id = "login"; document.body.appendChild(box); }
    box.innerHTML = html; return box;
  }
  function loginScreen() {
    return new Promise(function (resolve) {
      var box = overlay('<form id="loginform" class="login-card">' +
        '<div class="ws"><i>H</i>Huy Tim · TIMUS</div><h1>Đăng nhập</h1>' +
        '<p>Dùng email Huy đã cấp quyền vào trang vận hành.</p>' +
        '<label class="f">Email<input id="loginemail" type="email" required autocomplete="username"></label>' +
        '<label class="f">Mật khẩu<input id="loginpw" type="password" autocomplete="current-password"></label>' +
        '<button class="btn primary" id="loginbtn" type="submit">Đăng nhập</button>' +
        '<button class="btn" id="linkbtn" type="button">Gửi link đăng nhập qua email</button>' +
        '<p id="loginmsg" role="status"></p></form>');
      var msg = box.querySelector("#loginmsg");
      var email = function () { return box.querySelector("#loginemail").value.trim(); };
      box.querySelector("#loginform").addEventListener("submit", async function (e) {
        e.preventDefault();
        var pw = box.querySelector("#loginpw").value;
        if (!pw) { msg.textContent = "Nhập mật khẩu, hoặc bấm Gửi link đăng nhập qua email."; return; }
        box.querySelector("#loginbtn").disabled = true; msg.textContent = "Đang đăng nhập...";
        var res = await sb.auth.signInWithPassword({ email: email(), password: pw });
        box.querySelector("#loginbtn").disabled = false;
        if (res.error) msg.textContent = "Sai email hoặc mật khẩu. Thử lại, hoặc dùng link đăng nhập qua email.";
      });
      box.querySelector("#linkbtn").addEventListener("click", async function () {
        if (!email()) { msg.textContent = "Nhập email trước."; return; }
        msg.textContent = "Đang gửi...";
        var res = await sb.auth.signInWithOtp({ email: email(), options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
        msg.textContent = res.error ? "Chưa gửi được: " + res.error.message : "Đã gửi. Mở email và bấm vào link để vào trang.";
      });
      sb.auth.onAuthStateChange(function (ev, session) { if (session) setTimeout(function () { box.remove(); resolve(session); }, 0); });
    });
  }
  function noAccess(email) {
    var box = overlay('<div class="login-card"><div class="ws"><i>H</i>Huy Tim · TIMUS</div><h1>Chưa có quyền vào</h1>' +
      '<p>Tài khoản <b></b> đã đăng nhập nhưng chưa được cấp quyền vào trang vận hành TIMUS. Nhắn Huy thêm email này vào danh sách nhân viên.</p>' +
      '<button class="btn" id="outbtn" type="button">Đăng xuất</button></div>');
    box.querySelector("b").textContent = email;
    box.querySelector("#outbtn").addEventListener("click", async function () { await sb.auth.signOut(); location.reload(); });
  }

  var dbPromise = null;
  async function boot() {
    if (!cfg.supabaseUrl || !cfg.anonKey || !window.supabase) return null;
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.anonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    var cur = await sb.auth.getSession();
    var session = cur.data && cur.data.session;
    if (!session) session = await loginScreen();
    me.email = String(session.user.email || "").toLowerCase();
    var r = await C("roles").select("area,role").eq("email", me.email);
    if (r.error) {
      var b = document.getElementById("banner");
      if (b) { b.textContent = "Chưa đọc được quyền (" + r.error.message + "). Tải lại trang thử lại."; b.hidden = false; }
      return null;
    }
    me.roles = r.data || [];
    if (level("timus") < 1) { noAccess(me.email); return null; }
    return db;
  }
  window.TIMUS_AUTH = {
    email: function () { return me.email; },
    signOut: async function () { if (sb) await sb.auth.signOut(); location.reload(); }
  };
  window.claude = {
    use: function (name) {
      if (name === "downloads") return Promise.resolve(downloads);
      dbPromise = dbPromise || boot();
      if (name === "db") return dbPromise;
      if (name === "user") return dbPromise.then(function (d) { return d ? user : null; });
      return Promise.resolve(null);
    }
  };
})();
