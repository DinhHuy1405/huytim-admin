/* Khung dùng chung của các trang quản trị Huy Tim: thanh bên, thanh trên, tìm trang, bộ chọn ngày, menu điện thoại.
   Trang gọi HT.render({base, active, groups, user}) mỗi khi cần vẽ lại. */
(function () {
  "use strict";
  var P = {
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    check: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h14v-3"/>',
    grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    store: '<path d="M4 9 5.5 4h13L20 9"/><path d="M4 9a3 3 0 0 0 5.3 2A3 3 0 0 0 12 12a3 3 0 0 0 2.7-1A3 3 0 0 0 20 9"/><path d="M5 12v8h14v-8"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4.5a4 4 0 0 1 0 7M18 15a7 7 0 0 1 4 6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V4h6v3M3 13h18"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 2M12 17h.01"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    out: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    bars: '<path d="M6 20v-7M12 20V5M18 20v-10"/>',
    line: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    warn: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v5M12 18h.01"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
  };
  function ic(n, cls) { return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || "") + "</svg>"; }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  /* đường xu hướng nhỏ từ một dãy số, không có trục */
  function spark(v) {
    if (!v || v.length < 2) return "";
    var w = 76, h = 26, mx = Math.max.apply(null, v), mn = Math.min.apply(null, v), r = (mx - mn) || 1;
    var d = v.map(function (n, i) { return (i ? "L" : "M") + (i / (v.length - 1) * w).toFixed(1) + " " + (h - 2 - (n - mn) / r * (h - 4)).toFixed(1); }).join(" ");
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  var shut = {};
  try { shut = JSON.parse(localStorage.getItem("ht-shut") || "{}") || {}; } catch (_) {}
  var query = "";

  function item(x) {
    if (x.disabled) return '<a aria-disabled="true"><i class="dot"></i><span>' + esc(x.label) + "</span>" + (x.badge ? '<small class="t">' + esc(x.badge) + "</small>" : "") + "</a>";
    return '<a class="' + (x.dim ? "dim" : "") + '"' + (x.href ? ' href="' + esc(x.href) + '"' : "") + (x.current ? ' aria-current="page"' : "") + (x.attrs ? " " + x.attrs : "") + (x.title ? ' title="' + esc(x.title) + '"' : "") + (x.ext ? ' target="_blank" rel="noopener"' : "") + ">"
      + (x.dot ? '<i class="dot" style="background:' + esc(x.dot) + '"></i>' : x.icon ? ic(x.icon) : "") + "<span>" + esc(x.label) + "</span>"
      + (x.badge !== undefined && x.badge !== "" && x.badge !== 0 ? "<small" + (x.textBadge ? ' class="t"' : "") + ">" + esc(x.badge) + "</small>" : "") + "</a>";
  }
  function group(g) {
    var open = !shut[g.key];
    return '<div class="nsb-g' + (open ? "" : " shut") + '" data-g="' + esc(g.key) + '"><button type="button" class="nsb-h" aria-expanded="' + open + '">' + ic("down") + "<span>" + esc(g.label) + '</span></button><div class="nsb-i">' + g.items.map(item).join("") + "</div></div>";
  }
  function topbar() {
    var tb = document.querySelector(".topbar");
    if (tb) return tb;
    var wrap = document.querySelector(".wrap");
    if (!wrap) return null;
    tb = document.createElement("div");
    tb.className = "topbar";
    tb.innerHTML = '<button type="button" class="menu-btn" aria-label="Mở menu">' + ic("menu") + '</button><div class="tb-q">' + ic("search") + '<input id="nsb-q" type="search" placeholder="Tìm trang" aria-label="Tìm trang" autocomplete="off"><div class="qres" id="qres" hidden></div></div><div class="tb-m" id="tb-m"></div><div class="tb-r" id="tb-r"></div>';
    wrap.insertBefore(tb, wrap.firstChild);
    var c = document.getElementById("clocks");
    if (c) document.getElementById("tb-m").appendChild(c);
    return tb;
  }
  function render(o) {
    var base = o.base || "", el = document.getElementById("side");
    if (!el) return;
    var chung = [{ label: "Trang chủ", href: base || "./", icon: "home", current: o.active === "home" }];
    if (o.owner !== false) chung.push({ label: "To do", href: base + "viec/", icon: "check", current: o.active === "viec" });
    if (o.owner !== false) chung.push({ label: "Kiểm soát", href: base + "kiemsoat/", icon: "warn", current: o.active === "kiemsoat" && !o.groups });
    var biz = [{ label: "TIMUS Vận hành", href: base + "timus/", dot: "#9CA3B0", current: o.active === "timus" && !o.groups }];
    if (o.admin !== false) biz.push({ label: "TIMUS Customers", href: base + "khach/", dot: "#9CA3B0", current: o.active === "khach" });
    if (o.owner !== false) biz.push({ label: "Content", href: base + "content/", dot: "#9CA3B0", current: o.active === "content" });
    biz.push({ label: "Academy", href: "https://mentor.huytim.com", dot: "#9CA3B0", ext: true });
    biz.push({ label: "Landing", disabled: true, badge: "Sắp gắn" });
    var all = [{ key: "chung", label: "Menu", items: chung }].concat(o.groups || []).concat([{ key: "biz", label: "Business", items: biz }]);
    if (o.admin === false) all = o.groups || []; /* nhân viên chỉ thấy trang của mình */
    el.innerHTML = '<a class="ws" href="' + esc(base || "./") + '"><i>H</i><span>Huy Tim</span></a><div class="nsb-scroll">' + all.map(group).join("") + "</div>"
      + (o.foot ? '<div class="nsb-foot">' + o.foot.map(function (f) { return '<button type="button" ' + f.attrs + ">" + ic(f.icon) + esc(f.label) + "</button>"; }).join("") + "</div>" : "");
    var tb = topbar();
    if (tb) {
      var u = o.user || {}, name = u.name || u.email || "";
      document.getElementById("tb-r").innerHTML = (o.top || "") + (u.actions || []).map(function (a) { return '<button type="button" class="tb-ib" title="' + esc(a.label) + '" aria-label="' + esc(a.label) + '" ' + a.attrs + ">" + ic(a.icon) + "</button>"; }).join("")
        + (name ? '<div class="tb-u" title="' + esc(u.email || name) + '"><div class="av" aria-hidden="true">' + esc(name.trim().split(/\s+/).pop().charAt(0).toUpperCase()) + "</div><b>" + esc(name) + "</b></div>" : "");
    }
    if (!document.querySelector(".nsb-scrim")) { var s = document.createElement("div"); s.className = "nsb-scrim"; document.body.appendChild(s); }
  }
  /* tìm trang: lấy danh sách từ chính các mục ở thanh bên */
  function results() {
    var q = query.trim().toLowerCase(), box = document.getElementById("qres");
    if (!box) return;
    if (!q) { box.hidden = true; return; }
    var l = [].filter.call(document.querySelectorAll(".nsb-i a:not([aria-disabled])"), function (a) { return a.textContent.toLowerCase().indexOf(q) >= 0; }).slice(0, 8);
    box.hidden = false;
    box.innerHTML = l.length ? l.map(function (a, i) { return '<button type="button" data-qi="' + [].indexOf.call(document.querySelectorAll(".nsb-i a"), a) + '"' + (i ? "" : ' class="on"') + ">" + esc(a.querySelector("span").textContent) + "</button>"; }).join("") : "<p>Không có trang nào khớp.</p>";
  }
  function pick(i) {
    var a = document.querySelectorAll(".nsb-i a")[i];
    query = ""; var q = document.getElementById("nsb-q"); if (q) q.value = ""; results();
    if (a) a.click();
  }

  /* bộ chọn khoảng ngày: o = {anchor, from, to, min, max, presets:[[nhãn, từ, đến]], onApply} */
  var dp = null;
  function ymd(y, m, d) { return y + "-" + ("0" + (m + 1)).slice(-2) + "-" + ("0" + d).slice(-2); }
  function dm(s) { var a = String(s || "").split("-"); return a.length === 3 ? a[2] + "/" + a[1] + "/" + a[0] : ""; }
  function dpClose() { if (dp) { dp.el.remove(); dp = null; } }
  function dpDraw() {
    var y = dp.y, m = dp.m, first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), c = "";
    for (var i = 0; i < first; i++) c += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var s = ymd(y, m, d), off = (dp.min && s < dp.min) || (dp.max && s > dp.max);
      var cls = s === dp.from || s === dp.to ? "end" : dp.from && dp.to && s > dp.from && s < dp.to ? "in" : "";
      c += '<button type="button" data-d="' + s + '" class="' + cls + '"' + (off ? " disabled" : "") + ">" + d + "</button>";
    }
    dp.el.innerHTML = "<h4>Chọn khoảng ngày</h4>"
      + (dp.presets.length ? '<div class="pre">' + dp.presets.map(function (p, i) { return '<button type="button" data-p="' + i + '" class="' + (p[1] === dp.from && p[2] === dp.to ? "on" : "") + '">' + esc(p[0]) + "</button>"; }).join("") + "</div>" : "")
      + '<div class="mon"><button type="button" data-mv="-1" aria-label="Tháng trước">' + ic("left") + "</button><span>Tháng " + (m + 1) + ", " + y + '</span><button type="button" data-mv="1" aria-label="Tháng sau">' + ic("right") + "</button></div>"
      + '<div class="grid">' + ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(function (t) { return "<b>" + t + "</b>"; }).join("") + c + "</div>"
      + '<div class="ftr"><span>Khoảng: <b>' + (dp.from ? dm(dp.from) : "") + (dp.to && dp.to !== dp.from ? " đến " + dm(dp.to) : "") + '</b></span><button type="button" class="btn sm" data-dp="x">Hủy</button><button type="button" class="btn sm primary" data-dp="ok"' + (dp.from ? "" : " disabled") + ">Áp dụng</button></div>";
  }
  function range(o) {
    dpClose();
    var el = document.createElement("div");
    el.className = "dp"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Chọn khoảng ngày");
    var ref = String(o.to || o.max || "").split("-");
    dp = { el: el, from: o.from, to: o.to, min: o.min, max: o.max, presets: o.presets || [], onApply: o.onApply, anchor: o.anchor, y: +ref[0], m: +ref[1] - 1 };
    document.body.appendChild(el); dpDraw();
    var r = o.anchor.getBoundingClientRect();
    el.style.top = Math.max(12, Math.min(r.bottom + 6, innerHeight - el.offsetHeight - 12)) + "px";
    el.style.left = Math.max(12, Math.min(r.left, innerWidth - el.offsetWidth - 12)) + "px";
  }
  function dpClick(e) {
    if (!dp) return false;
    if (!e.target.closest(".dp")) { if (!e.target.closest(".rbtn")) dpClose(); return false; }
    var b = e.target.closest("button"); if (!b) return true;
    if (b.dataset.d) { var v = b.dataset.d; if (!dp.from || dp.to) { dp.from = v; dp.to = ""; } else if (v < dp.from) { dp.to = dp.from; dp.from = v; } else dp.to = v; dpDraw(); }
    else if (b.dataset.p) { var p = dp.presets[+b.dataset.p]; dp.from = p[1]; dp.to = p[2]; dpDraw(); }
    else if (b.dataset.mv) { dp.m += +b.dataset.mv; if (dp.m < 0) { dp.m = 11; dp.y--; } if (dp.m > 11) { dp.m = 0; dp.y++; } dpDraw(); }
    else if (b.dataset.dp === "x") dpClose();
    else if (b.dataset.dp === "ok") { var f = dp.from, t = dp.to || dp.from, fn = dp.onApply; dpClose(); fn(f, t); }
    return true;
  }
  function drawerToggle(on) { document.documentElement.classList.toggle("nsb-open", on); }

  document.addEventListener("click", function (e) {
    if (dpClick(e)) return;
    var h = e.target.closest(".nsb-h");
    if (h) {
      var g = h.parentNode, k = g.dataset.g;
      shut[k] = !shut[k];
      g.classList.toggle("shut", shut[k]); h.setAttribute("aria-expanded", String(!shut[k]));
      try { localStorage.setItem("ht-shut", JSON.stringify(shut)); } catch (_) {}
      return;
    }
    var qi = e.target.closest("[data-qi]");
    if (qi) { pick(+qi.dataset.qi); return; }
    if (!e.target.closest(".tb-q")) { var box = document.getElementById("qres"); if (box) box.hidden = true; }
    if (e.target.closest(".menu-btn")) { drawerToggle(true); return; }
    if (e.target.closest(".nsb-scrim") || e.target.closest(".nsb a")) drawerToggle(false);
    if (e.target.closest("[data-ht-signout]") && window.HT.onSignout) window.HT.onSignout();
  });
  document.addEventListener("input", function (e) { if (e.target.id === "nsb-q") { query = e.target.value; results(); } });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { drawerToggle(false); dpClose(); }
    var t = e.target, tag = t && t.tagName;
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !(t && t.isContentEditable)) {
      var q = document.getElementById("nsb-q");
      if (q) { e.preventDefault(); q.focus(); }
    }
    if (e.key === "Enter" && t && t.id === "nsb-q") {
      var first = document.querySelector("#qres [data-qi]");
      if (first) { e.preventDefault(); pick(+first.dataset.qi); }
    }
  });
  window.HT = { render: render, ic: ic, spark: spark, range: range, onSignout: null };
})();
