/* Huy Tim Content: trang Báo cáo. Vẽ biểu đồ từ các snapshot có data.report (số TikTok Studio theo từng video). Hàm thuần: nhận danh sách snapshot, trả HTML. */
(function(){
"use strict";
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
function vi(n,d){return Number(n||0).toLocaleString("vi-VN",{maximumFractionDigits:d==null?0:d})}
function short(n){n=Number(n||0);return n>=1e6?vi(n/1e6,1)+"tr":n>=1e3?vi(n/1e3,1)+"K":vi(n)}
function dm(s){var a=String(s||"").slice(0,10).split("-");return a.length<3?"":a[2]+"/"+a[1]}
var COL={loi:"#2C5FD4",tool:"#C0392B",khac:"#9AA3AF"};
var GROUP={van_hanh_that:"loi",tim_ngach:"loi",chuyen_ca_nhan:"loi",hop_tac_tool:"tool"};
var GNAME={van_hanh_that:"Vận hành thật",tim_ngach:"Tìm ngách",chuyen_ca_nhan:"Chuyện cá nhân",quy_trinh_list:"List kiến thức",so_sanh:"So sánh",bai_hoc_list:"Bài học chung",hop_tac_tool:"Hợp tác tour công cụ",hoc_bong:"Học bổng",hoc_tap:"Học tập",doi_song:"Đời sống",dong_luc:"Động lực"};
function col(v){return COL[GROUP[v.nhom]||"khac"]}
function legend(){return '<p class="note" style="margin:6px 0 0"><span style="color:'+COL.loi+'">●</span> Chuyện thật, vận hành, tìm ngách &nbsp; <span style="color:'+COL.tool+'">●</span> Hợp tác kiểu tour công cụ &nbsp; <span style="color:'+COL.khac+'">●</span> Khác</p>'}
function svg(W,H,body,label){return '<div class="dchart"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(label)+'">'+body+'</svg></div>'}
function axisY(L,R,W,y,ticks,fmt){return ticks.map(function(v){return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+fmt(v)+'</text>'}).join("")}

/* 1. Chấm: thời gian xem TB (x) và follower/1K view (y), cỡ chấm theo view */
function scatter(V){
  var W=900,H=380,L=46,R=16,T=14,B=38,l=V.filter(function(v){return v.ngay>="2026-08-01"});
  var mx=20,my=18,x=function(v){return L+(W-L-R)*v/mx},y=function(v){return T+(H-T-B)*(1-v/my)};
  var g=axisY(L,R,W,y,[0,3,6,9,12,15,18],function(v){return v});
  for(var i=0;i<=20;i+=2.5)g+='<text x="'+x(i)+'" y="'+(H-18)+'" text-anchor="middle">'+vi(i,1)+'s</text>';
  g+='<text x="'+(W-R)+'" y="'+(H-3)+'" text-anchor="end">Thời gian xem trung bình</text><text x="'+L+'" y="10">Follower mới / 1.000 view</text>';
  g+='<rect x="'+x(15)+'" y="'+T+'" width="'+(x(mx)-x(15))+'" height="'+(H-T-B)+'" fill="#2C5FD4" fill-opacity=".05"/><text x="'+(x(mx)-6)+'" y="'+(H-B-8)+'" text-anchor="end" fill="#2C5FD4">Vùng mục tiêu: xem ≥ 15s</text>';
  var seenTool=false,labs=[],pts=l.slice().sort(function(a,b){return b.view-a.view}).map(function(v){
    var r=Math.max(4,Math.min(26,Math.sqrt(v.view)/18)),cx=x(Math.min(mx,v.xem_tb_s)),cy=y(Math.min(my,v.follower_per_1k));
    var tool=v.nhom==="hop_tac_tool",show=v.follower_per_1k>7||v.view>100000;if(tool&&show){if(seenTool)show=false;seenTool=true}
    if(show)labs.push({end:cx>560,x:cx>560?cx-r-5:cx+r+5,y:cy+(tool?-r-4:4),t:tool?"2 video hợp tác FastMoss: xem 1,3–1,7s":v.tieu_de.slice(0,30)});
    return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col(v)+'" fill-opacity=".55" stroke="'+col(v)+'"><title>'+esc(v.tieu_de)+' ('+dm(v.ngay)+'): '+short(v.view)+' view, xem TB '+vi(v.xem_tb_s,1)+'s, '+vi(v.follower_moi)+' follower mới ('+vi(v.follower_per_1k,1)+'/1K)</title></circle>'}).join("");
  labs.sort(function(a,b){return a.y-b.y});for(var j=1;j<labs.length;j++)if(labs[j].end===labs[j-1].end&&labs[j].y-labs[j-1].y<15)labs[j].y=labs[j-1].y+15;
  pts+=labs.map(function(q){return '<text x="'+q.x+'" y="'+q.y+'" text-anchor="'+(q.end?"end":"start")+'" font-size="11">'+esc(q.t)+'</text>'}).join("");
  return svg(W,H,g+pts,"Thời gian xem trung bình và follower mới trên 1.000 view")+legend();
}
/* 2. Cột view từng video theo ngày đăng (thang log) + đường % For You */
function timeline(V){
  var W=900,H=300,L=46,R=40,T=14,B=30,l=V.filter(function(v){return v.ngay>="2026-08-01"}).sort(function(a,b){return a.ngay<b.ngay?-1:1}),n=l.length,sw=(W-L-R)/n;
  var ly=function(v){return T+(H-T-B)*(1-(Math.log10(Math.max(100,v))-2)/(5.6-2))},py=function(p){return T+(H-T-B)*(1-p/100)};
  var g=axisY(L,R,W,ly,[100,1000,10000,100000],short);
  [0,50,100].forEach(function(p){g+='<text x="'+(W-R+6)+'" y="'+(py(p)+4)+'" fill="#E08A00">'+p+'%</text>'});
  var bars=l.map(function(v,i){var cx=L+sw*(i+.5),bw=Math.min(18,sw*.7);return '<rect x="'+(cx-bw/2)+'" y="'+ly(v.view)+'" width="'+bw+'" height="'+(ly(100)-ly(v.view))+'" rx="2" fill="'+col(v)+'" fill-opacity=".8"><title>'+esc(v.tieu_de)+' ('+dm(v.ngay)+'): '+short(v.view)+' view, '+vi(v.fyp_pct,1)+'% từ For You</title></rect>'+(i%3===0?'<text x="'+cx+'" y="'+(H-8)+'" text-anchor="middle">'+dm(v.ngay)+'</text>':"")}).join("");
  var path=l.map(function(v,i){return (i?"L":"M")+(L+sw*(i+.5)).toFixed(1)+" "+py(v.fyp_pct).toFixed(1)}).join(" ");
  var cut=l.findIndex(function(v){return v.ngay>="2026-10-18"}),cx=L+sw*cut;
  var mark=cut>0?'<line x1="'+cx+'" x2="'+cx+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--ink,#111)" stroke-dasharray="4 4"/><text x="'+(cx+6)+'" y="'+(T+12)+'">Từ 18/10: For You giảm</text>':"";
  return svg(W,H,g+bars+'<path d="'+path+'" fill="none" stroke="#E08A00" stroke-width="2"/>'+mark,"View từng video và tỉ lệ từ For You")+'<p class="note" style="margin:6px 0 0">Cột: view từng video (thang log). <span style="color:#E08A00">Đường cam</span>: % view đến từ For You.</p>';
}
/* 3. Cột theo tuần */
function weekly(Wk){
  var W=900,H=230,L=46,R=10,T=14,B=28,n=Wk.length,sw=(W-L-R)/n,max=Math.max.apply(null,Wk.map(function(w){return w.profile_views}))||1,top=Math.ceil(max/1000)*1000;
  var y=function(v){return T+(H-T-B)*(1-v/top)},t=[];for(var v=0;v<=top;v+=1000)t.push(v);
  return svg(W,H,axisY(L,R,W,y,t,short)+Wk.map(function(w,i){var cx=L+sw*(i+.5),bw=Math.min(34,sw*.66);return '<rect x="'+(cx-bw/2)+'" y="'+y(w.profile_views)+'" width="'+bw+'" height="'+(y(0)-y(w.profile_views))+'" rx="2" fill="#B8C9EE"><title>Tuần '+dm(w.tuan)+': '+vi(w.profile_views)+' lượt vào trang cá nhân, '+short(w.views)+' view</title></rect><text x="'+cx+'" y="'+(y(w.profile_views)-5)+'" text-anchor="middle" font-size="11">'+short(w.profile_views)+'</text><text x="'+cx+'" y="'+(H-8)+'" text-anchor="middle">'+dm(w.tuan)+'</text>'}).join(""),"Lượt vào trang cá nhân theo tuần");
}
/* 4. Thanh ngang theo nhóm chủ đề */
function topics(Tp){
  var M=[["fol_1k","Follower/1K","#2C5FD4"],["save_1k","Lưu/1K","#7BA0E8"],["cmt_1k","Comment/1K","#B8C9EE"]],max=Math.max.apply(null,Tp.map(function(t){return Math.max(t.fol_1k,t.save_1k,t.cmt_1k)}))||1;
  return '<div class="tbl"><table><thead><tr><th>Nhóm chủ đề</th><th class="num">Số video</th><th class="num">Xem TB</th>'+M.map(function(m){return '<th style="width:20%">'+m[1]+'</th>'}).join("")+'</tr></thead><tbody>'+Tp.map(function(t){
    return '<tr><td><b>'+esc(GNAME[t.nhom]||t.nhom)+'</b></td><td class="num">'+t.n+'</td><td class="num">'+vi(t.xem_tb,1)+'s</td>'+M.map(function(m){return '<td><div style="display:flex;align-items:center;gap:6px"><i style="display:block;height:10px;border-radius:2px;background:'+m[2]+';width:'+Math.max(1,t[m[0]]/max*100)+'%"></i><span>'+vi(t[m[0]],1)+'</span></div></td>'}).join("")+'</tr>'}).join("")+'</tbody></table></div>';
}
/* 5. Nguồn lượt xem từng video (cột chồng 100%) */
function sources(V){
  var l=V.filter(function(v){return v.ngay>="2026-09-20"}).sort(function(a,b){return a.ngay<b.ngay?-1:1}),P=[["fyp_pct","For You","#B8C9EE"],["profile_pct","Trang cá nhân","#2C5FD4"],["search_pct","Tìm kiếm","#E08A00"]];
  return '<div class="dbars">'+l.map(function(v){var o=Math.max(0,100-v.fyp_pct-v.profile_pct-v.search_pct);return '<div class="dbar"><span class="n" title="'+esc(v.tieu_de)+'">'+dm(v.ngay)+' '+esc(v.tieu_de.slice(0,26))+'</span><div class="t" style="display:flex;overflow:hidden">'+P.map(function(p){return '<i style="width:'+v[p[0]]+'%;background:'+p[2]+';border-radius:0" title="'+p[1]+' '+vi(v[p[0]],1)+'%"></i>'}).join("")+'<i style="width:'+o+'%;background:var(--line);border-radius:0"></i></div><span class="v">'+short(v.view)+'</span></div>'}).join("")+'</div><p class="note" style="margin:8px 0 0">'+P.map(function(p){return '<span style="color:'+p[2]+'">■</span> '+p[1]}).join(" &nbsp; ")+' &nbsp; <span style="color:#bbb">■</span> Khác. Số bên phải: view.</p>';
}
function table(V){
  return '<details class="dn"><summary>Xem bảng số '+V.length+' video</summary><div class="tbl"><table><thead><tr><th>Đăng</th><th>Video</th><th>Nhóm</th><th class="num">View</th><th class="num">Xem TB</th><th class="num">Xem hết</th><th class="num">Follower mới</th><th class="num">Follower/1K</th><th class="num">Lưu/1K</th><th class="num">Comment/1K</th><th class="num">For You</th><th class="num">Tìm kiếm</th></tr></thead><tbody>'+V.slice().sort(function(a,b){return a.ngay<b.ngay?1:-1}).map(function(v){
    return '<tr><td class="t2">'+dm(v.ngay)+'</td><td><div class="t1">'+esc(v.tieu_de)+'</div></td><td class="t2">'+esc(GNAME[v.nhom]||v.nhom)+(v.hop_tac?' <span class="pill warn">Hợp tác</span>':"")+'</td><td class="num">'+short(v.view)+'</td><td class="num"><span class="pill '+(v.xem_tb_s>=15?"ok":v.xem_tb_s<8?"bad":"")+'">'+vi(v.xem_tb_s,1)+'s</span></td><td class="num">'+vi(v.xem_het_pct,1)+'%</td><td class="num">'+vi(v.follower_moi)+'</td><td class="num">'+vi(v.follower_per_1k,1)+'</td><td class="num">'+vi(v.save_per_1k,1)+'</td><td class="num">'+vi(v.cmt_per_1k,1)+'</td><td class="num">'+vi(v.fyp_pct,0)+'%</td><td class="num">'+vi(v.search_pct,0)+'%</td></tr>'}).join("")+'</tbody></table></div></details>';
}
function stat(v,l,d,c){return '<div class="stat '+(c||"")+'"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':"")+'</div>'}
function sec(t,body,sub){return '<section class="dsec"><div class="chead"><h2 class="sec">'+t+'</h2></div>'+(sub?'<p class="note" style="margin:0 0 10px">'+sub+'</p>':"")+body+'</section>'}
function list(l){return '<ol style="margin:0;padding-left:20px;line-height:1.65">'+l.map(function(x){return '<li><b>'+esc(x[0])+'</b> '+esc(x[1])+'</li>'}).join("")+'</ol>'}

window.HTReport=function(snaps,pick){
  var L=(snaps||[]).filter(function(s){return s.data&&s.data.report});
  if(!L.length)return '<div class="empty">Chưa có báo cáo nào. Báo cáo được ghi vào Content khi phân tích số liệu TikTok Studio.</div>';
  var s=L.filter(function(x){return x.id===pick})[0]||L[0],r=s.data.report,V=r.videos,k=r.kpi;
  var h='<div class="dtop"><div class="filters">'+(L.length>1?'<select id="rp-pick" aria-label="Chọn báo cáo">'+L.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===s.id?" selected":"")+'>Báo cáo '+dm(x.taken_on)+'</option>'}).join("")+'</select>':'<span class="dlab">Báo cáo '+dm(s.taken_on)+'</span>')+'</div><span class="dlab">'+esc(r.nguon)+'</span></div>';
  h+='<div class="stats">'+stat(vi(k.followers),"Follower")+stat(short(k.views_365),"View 365 ngày")+stat(short(k.viewers_365),"Người xem 365 ngày")+stat(vi(k.median_truoc),"Trung vị view trước 18/10")+stat(vi(k.median_sau),"Trung vị view từ 18/10","","bad")+stat(vi(k.profile_tuan_dau)+" → "+vi(k.profile_tuan_cuoi),"Vào trang cá nhân/tuần","","bad")+'</div>';
  h+=sec("Kết luận chính",list(r.ket_luan));
  h+=sec("Giữ chân càng lâu, càng ra follower",scatter(V),"Mỗi chấm là một video; chấm càng to càng nhiều view. Video giữ người xem 16–19 giây ra 15–17 follower mỗi 1.000 view; video bị bỏ sau 6–7 giây gần như không ra follower dù rất nhiều view.");
  h+=sec("TikTok đẩy For You ít hẳn từ 18/10",timeline(V),"Người xem video mới vẫn ở lại lâu như trước, nhưng video không được mang tới người lạ.");
  h+=sec("Sự quan tâm tới kênh theo tuần",weekly(r.tuan),"Lượt vào trang cá nhân là thước đo không bị view quảng cáo làm méo.");
  h+=sec("Chủ đề nào ra follower",topics(r.chu_de));
  h+=sec("Nguồn lượt xem từng video",sources(V),"Video mới có 20–37% view từ người tự vào trang cá nhân; vài video ăn 22–26% từ Tìm kiếm.");
  h+='<div class="cols3 dsec" style="margin-top:10px"><section><h2 class="sec">Từ khoá tìm ra kênh</h2><div style="display:flex;flex-wrap:wrap;gap:6px">'+r.tu_khoa.map(function(x){return '<span class="pill info">'+esc(x)+'</span>'}).join("")+'</div></section><section><h2 class="sec">Người xem (365 ngày)</h2><p class="note" style="margin:0">'+esc(r.nguoi_xem)+'</p></section><section><h2 class="sec">Giới hạn dữ liệu</h2><p class="note" style="margin:0">'+esc(r.gioi_han)+'</p></section></div>';
  h+=sec("Việc nên làm 2 tuần tới",list(r.de_xuat));
  h+=sec("Bảng số từng video",table(V));
  return h;
};
})();
