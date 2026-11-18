/* Huy Tim Content: trang Báo cáo dạng dashboard tương tác.
   Dữ liệu: snapshot có data.report (số TikTok Studio từng video, kèm đường giữ chân `ret` = "giây,%;giây,%").
   window.HTReport(snaps, pick) trả HTML; mọi tương tác (lọc, chọn trục, chọn video, sắp xếp) tự vẽ lại trong #rp-root. */
(function(){
"use strict";
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
function vi(n,d){return Number(n||0).toLocaleString("vi-VN",{maximumFractionDigits:d==null?0:d})}
function short(n){n=Number(n||0);return n>=1e6?vi(n/1e6,1)+"tr":n>=1e3?vi(n/1e3,1)+"K":vi(n)}
function dm(s){var a=String(s||"").slice(0,10).split("-");return a.length<3?"":a[2]+"/"+a[1]}
function has(x){return x!=null&&!isNaN(x)}
function med(a){a=a.filter(has).sort(function(x,y){return x-y});if(!a.length)return null;var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function sum(a){return a.reduce(function(s,x){return s+(x||0)},0)}
function pearson(P){var n=P.length;if(n<4)return null;var mx=sum(P.map(function(p){return p[0]}))/n,my=sum(P.map(function(p){return p[1]}))/n,a=0,b=0,c=0;P.forEach(function(p){a+=(p[0]-mx)*(p[1]-my);b+=(p[0]-mx)*(p[0]-mx);c+=(p[1]-my)*(p[1]-my)});return b&&c?a/Math.sqrt(b*c):null}

var COL={loi:"#2C5FD4",tool:"#C0392B",khac:"#9AA3AF"},SEL="#E08A00",CUT="2026-10-18",FROM="2026-08-01";
var GROUP={van_hanh_that:"loi",tim_ngach:"loi",chuyen_ca_nhan:"loi",hop_tac_tool:"tool"};
var GLAB={loi:"Chuyện thật, vận hành, tìm ngách",tool:"Hợp tác tour công cụ",khac:"Khác"};
var GNAME={van_hanh_that:"Vận hành thật",tim_ngach:"Tìm ngách",chuyen_ca_nhan:"Chuyện cá nhân",quy_trinh_list:"List kiến thức",so_sanh:"So sánh",bai_hoc_list:"Bài học chung",hop_tac_tool:"Hợp tác tour công cụ",hoc_bong:"Học bổng",hoc_tap:"Học tập",doi_song:"Đời sống",dong_luc:"Động lực"};
function grp(v){return GROUP[v.nhom]||"khac"}
function col(v){return COL[grp(v)]}

/* Chỉ số dùng cho trục biểu đồ, bảng và thẻ số */
var M={
  xem_tb:{n:"Thời gian xem trung bình",s:"Xem TB",u:"s",d:1,f:function(v){return v.xem_tb_s}},
  r3:{n:"Còn lại ở giây 3",s:"Giây 3",u:"%",d:0,f:function(v){return v.r3}},
  r5:{n:"Còn lại ở giây 5",s:"Giây 5",u:"%",d:0,f:function(v){return v.r5}},
  r10:{n:"Còn lại ở giây 10",s:"Giây 10",u:"%",d:0,f:function(v){return v.r10}},
  r30:{n:"Còn lại ở giây 30",s:"Giây 30",u:"%",d:0,f:function(v){return v.r30}},
  het:{n:"Xem hết video",s:"Xem hết",u:"%",d:1,f:function(v){return v.xem_het_pct}},
  view:{n:"Lượt xem (thang log)",s:"View",u:"",d:0,log:1,f:function(v){return v.view}},
  fol:{n:"Follower mới / 1.000 view",s:"Fol/1K",u:"",d:1,f:function(v){return v.follower_per_1k}},
  save:{n:"Lượt lưu / 1.000 view",s:"Lưu/1K",u:"",d:1,f:function(v){return v.save_per_1k}},
  cmt:{n:"Bình luận / 1.000 view",s:"Cmt/1K",u:"",d:1,f:function(v){return v.cmt_per_1k}},
  fyp:{n:"View từ For You",s:"For You",u:"%",d:0,f:function(v){return v.fyp_pct}},
  search:{n:"View từ Tìm kiếm",s:"Tìm kiếm",u:"%",d:0,f:function(v){return v.search_pct}},
  profile:{n:"View từ trang cá nhân",s:"Trang CN",u:"%",d:0,f:function(v){return v.profile_pct}},
  moi:{n:"Người xem mới",s:"Người mới",u:"%",d:0,f:function(v){return v.new_pct}},
  nonfol:{n:"Người xem chưa follow",s:"Chưa follow",u:"%",d:0,f:function(v){return v.nonfol_pct}},
  a2534:{n:"Người xem 25–34 tuổi",s:"25–34 tuổi",u:"%",d:0,f:function(v){return v.age?v.age[1]:null}},
  nam:{n:"Người xem nam",s:"Nam",u:"%",d:0,f:function(v){return v.male}}
};
var AXES=["xem_tb","r3","r5","r10","r30","het","view","fol","save","cmt","fyp","search","profile","moi","nonfol","a2534","nam"];
function fm(k,x){return has(x)?(M[k].log?short(x):vi(x,M[k].d))+M[k].u:"–"}

var ST={per:"all",grp:"all",x:"xem_tb",y:"fol",sel:null,rmax:30,line:"fyp",sort:"ngay",dir:-1},CUR={snaps:[],pick:null};

function retArr(v){if(v._r===undefined)v._r=v.ret?String(v.ret).split(";").map(function(p){p=p.split(",");return[+p[0],+p[1]]}):null;return v._r}
function retAt(v,t){var a=retArr(v);if(!a||t>a[a.length-1][0])return null;for(var i=1;i<a.length;i++)if(t<=a[i][0]){var p=a[i-1],q=a[i];return p[1]+(q[1]-p[1])*(t-p[0])/((q[0]-p[0])||1)}return a[0][1]}
function inPer(v,p){return p==="pre"?v.ngay>=FROM&&v.ngay<CUT:p==="post"?v.ngay>=CUT:true}
function flt(V){return V.filter(function(v){return inPer(v,ST.per)&&(ST.grp==="all"||grp(v)===ST.grp)})}

function seg(key,opts,cur){return '<span class="seg">'+opts.map(function(o){return '<button type="button" data-rp="'+key+':'+o[0]+'"'+(String(cur)===String(o[0])?' class="on"':"")+'>'+o[1]+'</button>'}).join("")+'</span>'}
function sel(key,cur,label){return '<label class="rp-sel">'+label+' <select data-rpsel="'+key+'">'+AXES.map(function(k){return '<option value="'+k+'"'+(k===cur?" selected":"")+'>'+M[k].n+'</option>'}).join("")+'</select></label>'}
function stat(v,l,d,c){return '<div class="stat '+(c||"")+'"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':"")+'</div>'}
function sec(t,body,sub,ctl){return '<section class="dsec"><div class="chead"><h2 class="sec">'+t+'</h2>'+(ctl?'<div class="rp-ctl">'+ctl+'</div>':"")+'</div>'+(sub?'<p class="note" style="margin:0 0 10px">'+sub+'</p>':"")+body+'</section>'}
function list(l){return '<ol style="margin:0;padding-left:20px;line-height:1.65">'+l.map(function(x){return '<li><b>'+esc(x[0])+'</b> '+esc(x[1])+'</li>'}).join("")+'</ol>'}
function svg(W,H,body,label){return '<div class="dchart rp-sc"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(label)+'">'+body+'</svg></div>'}
function legend(){return '<p class="note" style="margin:6px 0 0">'+["loi","tool","khac"].map(function(g){return '<span style="color:'+COL[g]+'">●</span> '+GLAB[g]}).join(" &nbsp; ")+' &nbsp; <span style="color:'+SEL+'">◉</span> Video đang chọn</p>'}
function tipV(v){return '<b>'+esc(v.tieu_de)+'</b><small>'+dm(v.ngay)+' · '+esc(GNAME[v.nhom]||v.nhom)+'</small>'+short(v.view)+' view · xem TB '+vi(v.xem_tb_s,1)+'s'+(has(v.r5)?' · giây 5 còn '+vi(v.r5)+'%':'')+'<br>'+vi(v.follower_moi)+' follower mới ('+vi(v.follower_per_1k,1)+'/1K)'+(has(v.new_pct)?' · '+vi(v.new_pct)+'% người mới':'')}

/* Thang đo */
function scale(k,vals,a,b){
  var mx=Math.max.apply(null,vals.concat([0]));
  if(M[k].log){var lo=2,hi=Math.max(3,Math.ceil(Math.log10(Math.max(mx,100))*10)/10+.1),t=[];for(var e=lo;e<=hi;e++)t.push(Math.pow(10,e));return{p:function(x){return a+(b-a)*(Math.log10(Math.max(x,100))-lo)/(hi-lo)},t:t,n:function(x){return Math.log10(Math.max(x,1))}}}
  var step=[.5,1,2,2.5,5,10,20,25,50].filter(function(s){return mx/s<=6})[0]||100,top=M[k].u==="%"&&mx>80?100:Math.max(step,Math.ceil(mx*1.04/step)*step),t2=[];for(var x=0;x<=top+1e-9;x+=step)t2.push(x);
  return{p:function(x){return a+(b-a)*x/top},t:t2,n:function(x){return x}};
}

/* 1. Khám phá: chọn hai chỉ số bất kỳ, mỗi chấm một video */
function explore(V){
  var W=900,H=430,L=52,R=18,T=18,B=44,kx=ST.x,ky=ST.y,l=V.filter(function(v){return has(M[kx].f(v))&&has(M[ky].f(v))});
  if(l.length<2)return '<div class="empty">Không đủ video có cả hai chỉ số này trong bộ lọc hiện tại.</div>';
  var sx=scale(kx,l.map(M[kx].f),L,W-R),sy=scale(ky,l.map(M[ky].f),H-B,T),g="";
  sy.t.forEach(function(t){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+sy.p(t)+'" y2="'+sy.p(t)+'" stroke="var(--line)"/><text x="'+(L-8)+'" y="'+(sy.p(t)+4)+'" text-anchor="end">'+fm(ky,t)+'</text>'});
  sx.t.forEach(function(t){g+='<line x1="'+sx.p(t)+'" x2="'+sx.p(t)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)" stroke-opacity=".5"/><text x="'+sx.p(t)+'" y="'+(H-B+16)+'" text-anchor="middle">'+fm(kx,t)+'</text>'});
  g+='<text x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end" font-weight="600">'+esc(M[kx].n)+' →</text><text x="'+L+'" y="11" font-weight="600">↑ '+esc(M[ky].n)+'</text>';
  var top=l.slice().sort(function(a,b){return M[ky].f(b)-M[ky].f(a)}).slice(0,5).concat(l.slice().sort(function(a,b){return b.view-a.view}).slice(0,2)),labs=[];
  var pts=l.slice().sort(function(a,b){return b.view-a.view}).map(function(v){
    var r=Math.max(5,Math.min(24,Math.sqrt(v.view)/19)),cx=sx.p(M[kx].f(v)),cy=sy.p(M[ky].f(v)),on=v.video_id===ST.sel;
    if(on||top.indexOf(v)>=0)labs.push({on:on,end:cx>W*.62,x:cx>W*.62?cx-r-5:cx+r+5,y:cy+4,t:v.tieu_de.length>32?v.tieu_de.slice(0,31)+"…":v.tieu_de});
    return '<circle class="rp-pt" data-rp="sel:'+v.video_id+'" data-tip="'+esc(tipV(v))+'" cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col(v)+'" fill-opacity="'+(on?.9:.5)+'" stroke="'+(on?SEL:col(v))+'" stroke-width="'+(on?3.5:1)+'"/>'}).join("");
  labs.sort(function(a,b){return a.y-b.y});for(var j=1;j<labs.length;j++)for(var q=0;q<j;q++)if(labs[j].end===labs[q].end&&Math.abs(labs[j].y-labs[q].y)<14)labs[j].y=labs[q].y+14;
  pts+=labs.map(function(q){return '<text x="'+q.x+'" y="'+q.y+'" text-anchor="'+(q.end?"end":"start")+'" font-size="11"'+(q.on?' font-weight="700" style="fill:var(--ink)"':"")+' pointer-events="none" stroke="#fff" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">'+esc(q.t)+'</text>'}).join("");
  var r=pearson(l.map(function(v){return[sx.n(M[kx].f(v)),sy.n(M[ky].f(v))]})),note="";
  if(r!=null){var ar=Math.abs(r),w=ar>=.6?"liên hệ mạnh":ar>=.35?"liên hệ vừa":"liên hệ yếu";note='<p class="rp-r"><span class="pill '+(ar>=.6?"ok":ar>=.35?"info":"mute")+'">r = '+vi(r,2)+'</span> '+esc(M[kx].s)+' và '+esc(M[ky].s)+': '+w+(ar>=.35?(r>0?", cùng chiều":", ngược chiều"):"")+' trên '+l.length+' video. Số video ít nên chỉ coi là gợi ý, chưa phải quy luật.</p>'}
  return svg(W,H,g+pts,M[kx].n+" và "+M[ky].n)+legend()+note;
}
var PRESET=[["xem_tb","fol","Giữ chân → follower"],["a2534","fol","Đúng tuổi → follower"],["nonfol","view","Người lạ → view"],["r5","xem_tb","Giây 5 → xem TB"],["search","save","Tìm kiếm → lưu"]];
function presets(){return '<div class="rp-pre">Góc nhìn nhanh: '+PRESET.map(function(p){return '<button type="button" class="rp-chip'+(ST.x===p[0]&&ST.y===p[1]?" on":"")+'" data-rp="xy:'+p[0]+','+p[1]+'">'+p[2]+'</button>'}).join("")+'</div>'}

/* 2. Đường giữ chân: video đang chọn so với nhóm ra follower và nhóm không ra follower */
function refCurve(L,mx,st){var o=[];for(var t=0;t<=mx;t+=st){var m=med(L.map(function(v){return retAt(v,t)}));if(m==null)break;o.push([t,m])}return o}
function retention(ALL,v){
  var W=620,H=340,L=40,R=12,T=14,B=38,mx=ST.rmax==="full"?110:30,st=mx>30?2:1,x=function(t){return L+(W-L-R)*t/mx},y=function(p){return T+(H-T-B)*(1-p/100)};
  var HR=ALL.filter(retArr),win=HR.filter(function(q){return q.follower_per_1k>=12}),los=HR.filter(function(q){return q.follower_per_1k<2&&q.view>=15000});
  var cw=refCurve(win,mx,st),cl=refCurve(los,mx,st),cv=[],a=v&&retArr(v);
  if(a){for(var t=0;t<=mx;t+=st){var p=retAt(v,t);if(p==null)break;cv.push([t,p])}}
  var g="";[0,25,50,75,100].forEach(function(p){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(p)+'" y2="'+y(p)+'" stroke="var(--line)"/><text x="'+(L-8)+'" y="'+(y(p)+4)+'" text-anchor="end">'+p+'%</text>'});
  for(var s=0;s<=mx;s+=(mx>30?10:5))g+='<text x="'+x(s)+'" y="'+(H-B+16)+'" text-anchor="middle">'+s+'s</text>';
  g+='<text x="'+(W-R)+'" y="'+(H-4)+'" text-anchor="end">Giây thứ mấy của video</text>';
  [3,5].forEach(function(s){g+='<line x1="'+x(s)+'" x2="'+x(s)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--n80)" stroke-dasharray="2 4" stroke-opacity=".6"/>'});
  function path(c,stroke,w,dash){return c.length?'<path d="'+c.map(function(p,i){return (i?"L":"M")+x(p[0]).toFixed(1)+" "+y(p[1]).toFixed(1)}).join("")+'" fill="none" stroke="'+stroke+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':"")+' stroke-linejoin="round"/>':""}
  if(cv.length)g+='<path d="M'+x(0)+" "+y(0)+cv.map(function(p){return "L"+x(p[0]).toFixed(1)+" "+y(p[1]).toFixed(1)}).join("")+"L"+x(cv[cv.length-1][0])+" "+y(0)+'Z" fill="'+SEL+'" fill-opacity=".08"/>';
  g+=path(cl,COL.tool,2,"5 4")+path(cw,COL.loi,2,"5 4")+path(cv,SEL,3);
  var at=function(c,t){for(var i=0;i<c.length;i++)if(c[i][0]===t)return c[i][1];return null},bw=(W-L-R)/(mx/st);
  for(var k=0;k<=mx;k+=st){var pv=at(cv,k),pw=at(cw,k),pl=at(cl,k);if(pv==null&&pw==null&&pl==null)continue;
    g+='<rect class="rp-band" x="'+(x(k)-bw/2)+'" y="'+T+'" width="'+bw+'" height="'+(H-T-B)+'" fill="transparent" data-tip="'+esc('<b>Giây '+k+'</b>'+(pv!=null?'Video đang chọn: còn '+vi(pv)+'%<br>':'')+(pw!=null?'Nhóm ra follower: '+vi(pw)+'%<br>':'')+(pl!=null?'Nhóm không ra follower: '+vi(pl)+'%':''))+'"/>'}
  var lg='<p class="note" style="margin:6px 0 0"><span style="color:'+SEL+'">━</span> '+(v?esc(v.tieu_de):"Chưa chọn video")+(v&&!a?" (TikTok chưa trả đường giữ chân cho video này)":"")+' &nbsp; <span style="color:'+COL.loi+'">┅</span> Trung vị '+win.length+' video ra từ 12 follower/1K &nbsp; <span style="color:'+COL.tool+'">┅</span> Trung vị '+los.length+' video trên 15K view nhưng dưới 2 follower/1K</p>';
  return svg(W,H,g,"Đường giữ chân theo giây").replace("rp-sc","rp-sc rp-sc2")+lg;
}

/* 3. Hồ sơ một video */
function bar2(parts){var tot=sum(parts.map(function(p){return p[1]}))||1;return '<div class="rp-bar">'+parts.map(function(p){return p[1]>0?'<i style="width:'+(100*p[1]/tot)+'%;background:'+p[2]+'" data-tip="'+esc(p[0]+": "+vi(p[1],1)+"%")+'"></i>':""}).join("")+'</div><div class="rp-bl">'+parts.map(function(p){return '<span><b style="color:'+p[2]+'">■</b> '+p[0]+' '+vi(p[1],0)+'%</span>'}).join("")+'</div>'}
function diag(v,ref){
  var o=[],add=function(c,t){o.push('<li><span class="pill '+c+'">'+(c==="ok"?"Tốt":c==="bad"?"Yếu":"Lưu ý")+'</span> '+t+'</li>')};
  if(has(v.r3)){var lost=100-v.r3;add(v.r3>=50?"ok":v.r3<40?"bad":"warn","Ba giây đầu mất "+vi(lost)+"% người xem (trung vị các video: "+vi(100-ref.r3)+"%).")}
  if(has(v.r5))add(v.r5>=40?"ok":v.r5<28?"bad":"warn","Giây 5 còn "+vi(v.r5)+"% ("+(v.r5>=40?"ngang các video ra nhiều follower, 41–50%":v.r5<28?"ngang nhóm bị lướt qua, 13–27%":"mức giữa, chưa bật lên được")+").");
  add(v.xem_tb_s>=15?"ok":v.xem_tb_s<8?"bad":"warn","Thời gian xem trung bình "+vi(v.xem_tb_s,1)+" giây"+(v.xem_tb_s>=15?", đạt mục tiêu 15 giây.":v.xem_tb_s<8?", người xem bỏ đi rất sớm.":", chưa tới mục tiêu 15 giây."));
  if(v.age)add(v.age[1]>=50?"ok":v.age[1]<42?"bad":"warn",vi(v.age[1])+"% người xem ở tuổi 25–34"+(v.age[1]>=50?", đúng nhóm hay follow kênh.":v.age[1]<42?"; video bị đẩy lệch khỏi nhóm hay follow kênh.":"."));
  if(has(v.new_pct))add(v.new_pct>=50?"ok":v.new_pct<35?"bad":"warn",vi(v.new_pct)+"% là người xem mới"+(has(v.nonfol_pct)?", "+vi(v.nonfol_pct)+"% chưa follow":"")+(v.new_pct<35?": video chủ yếu quay vòng trong người đã biết kênh.":"."));
  if(has(v.fyp_pct)&&v.fyp_pct<70)add("warn","Chỉ "+vi(v.fyp_pct)+"% view đến từ For You; "+vi(v.profile_pct)+"% do người xem tự vào trang cá nhân.");
  if(v.search_pct>=10)add("ok",vi(v.search_pct)+"% view đến từ Tìm kiếm, nguồn này ăn view lâu dài.");
  add(v.follower_per_1k>=12?"ok":v.follower_per_1k<2?"bad":"warn",vi(v.follower_moi)+" follower mới, tức "+vi(v.follower_per_1k,1)+" trên 1.000 view"+(v.follower_per_1k<2&&v.view>=15000?": nhiều view nhưng gần như không ai ở lại theo dõi.":"."));
  return '<ul class="rp-diag">'+o.join("")+'</ul>';
}
function detail(V,v,ref){
  if(!v)return '<div class="empty">Bấm vào một chấm, một cột hoặc một dòng trong bảng để xem hồ sơ video.</div>';
  var i=V.indexOf(v),oth=Math.max(0,100-(v.fyp_pct||0)-(v.profile_pct||0)-(v.search_pct||0));
  var h='<div class="rp-dh"><div><h3>'+esc(v.tieu_de)+'</h3><p class="note" style="margin:2px 0 0">'+dm(v.ngay)+"/"+String(v.ngay).slice(0,4)+' · <span style="color:'+col(v)+'">●</span> '+esc(GNAME[v.nhom]||v.nhom)+(v.hop_tac?' · <span class="pill info">Hợp tác</span>':"")+(v.do_dai_s?' · dài '+v.do_dai_s+'s':"")+(v.video_id?' · <a href="https://www.tiktok.com/@huytimdata/video/'+esc(v.video_id)+'" target="_blank" rel="noopener">Mở trên TikTok</a>':"")+'</p></div><div class="rp-nav"><button type="button" class="rp-chip" data-rp="step:-1"'+(i<=0?" disabled":"")+'>← Trước</button><button type="button" class="rp-chip" data-rp="step:1"'+(i<0||i>=V.length-1?" disabled":"")+'>Sau →</button></div></div>';
  h+='<div class="stats rp-mini">'+stat(short(v.view),"View")+stat(vi(v.xem_tb_s,1)+"s","Xem TB","",v.xem_tb_s>=15?"ok":v.xem_tb_s<8?"bad":"")+stat(has(v.r5)?vi(v.r5)+"%":"–","Giây 5 còn","",has(v.r5)?(v.r5>=40?"ok":v.r5<28?"bad":""):"")+stat(vi(v.xem_het_pct,1)+"%","Xem hết")+stat(vi(v.follower_moi),"Fol mới")+stat(vi(v.follower_per_1k,1),"Fol/1K","",v.follower_per_1k>=12?"ok":v.follower_per_1k<2?"bad":"")+stat(vi(v.save_per_1k,1),"Lưu/1K")+stat(vi(v.cmt_per_1k,1),"Cmt/1K")+'</div>';
  h+='<div class="rp-2"><div><h4>Chẩn đoán</h4>'+diag(v,ref)+'</div><div><h4>Nguồn lượt xem</h4>'+bar2([["For You",v.fyp_pct||0,"#2C5FD4"],["Trang cá nhân",v.profile_pct||0,"#E08A00"],["Tìm kiếm",v.search_pct||0,"#1F9D63"],["Khác",oth,"#C9CED6"]]);
  if(has(v.new_pct)){h+='<h4>Ai đã xem</h4>'+bar2([["Người mới",v.new_pct,"#2C5FD4"],["Đã từng xem kênh",100-v.new_pct,"#C9CED6"]])+bar2([["Chưa follow",v.nonfol_pct,"#1F9D63"],["Follower",100-v.nonfol_pct,"#C9CED6"]]);
    if(v.age)h+=bar2([["18–24",v.age[0],"#8FB1F0"],["25–34",v.age[1],"#2C5FD4"],["35–44",v.age[2],"#173A8A"],["Tuổi khác",Math.max(0,100-v.age[0]-v.age[1]-v.age[2]),"#C9CED6"]]);
    if(has(v.male))h+=bar2([["Nam",v.male,"#2C5FD4"],["Nữ và khác",100-v.male,"#E9A0B8"]])}
  else h+='<p class="note">TikTok chưa trả số người xem chi tiết cho video này.</p>';
  return h+'</div></div>';
}

/* 4. Dòng thời gian: cột view (log) + đường tỉ lệ tuỳ chọn */
var LINES={fyp:"% view từ For You",moi:"% người xem mới",nonfol:"% người xem chưa follow"};
function timeline(V){
  var W=900,H=310,L=46,R=40,T=14,B=30,l=V.slice().sort(function(a,b){return a.ngay<b.ngay?-1:1}),n=l.length;if(!n)return '<div class="empty">Không có video trong bộ lọc.</div>';
  var sw=(W-L-R)/n,ly=function(v){return T+(H-T-B)*(1-(Math.log10(Math.max(100,v))-2)/3.6)},py=function(p){return T+(H-T-B)*(1-p/100)},g="",f=M[ST.line].f;
  [100,1000,10000,100000].forEach(function(t){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ly(t)+'" y2="'+ly(t)+'" stroke="var(--line)"/><text x="'+(L-8)+'" y="'+(ly(t)+4)+'" text-anchor="end">'+short(t)+'</text>'});
  [0,50,100].forEach(function(p){g+='<text x="'+(W-R+6)+'" y="'+(py(p)+4)+'" style="fill:'+SEL+'">'+p+'%</text>'});
  var ci=-1;l.forEach(function(v,i){if(ci<0&&v.ngay>=CUT)ci=i});
  if(ci>0){var cx0=L+sw*ci;g+='<rect x="'+cx0+'" y="'+T+'" width="'+(W-R-cx0)+'" height="'+(H-T-B)+'" fill="#C0392B" fill-opacity=".05"/><line x1="'+cx0+'" x2="'+cx0+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#C0392B" stroke-dasharray="4 4"/><text x="'+(cx0+6)+'" y="'+(T+12)+'" style="fill:#C0392B">Từ 18/10</text>'}
  var every=Math.max(1,Math.ceil(n/11)),bars=l.map(function(v,i){var cx=L+sw*(i+.5),bw=Math.min(20,sw*.72),on=v.video_id===ST.sel;return '<rect class="rp-pt" data-rp="sel:'+v.video_id+'" data-tip="'+esc(tipV(v))+'" x="'+(cx-bw/2)+'" y="'+ly(v.view)+'" width="'+bw+'" height="'+Math.max(1,ly(100)-ly(v.view))+'" rx="2" fill="'+col(v)+'" fill-opacity="'+(on?1:.75)+'"'+(on?' stroke="'+SEL+'" stroke-width="3"':"")+'/>'+(i%every===0?'<text x="'+cx+'" y="'+(H-8)+'" text-anchor="middle">'+dm(v.ngay)+'</text>':"")}).join("");
  var pp=[];l.forEach(function(v,i){if(has(f(v)))pp.push([L+sw*(i+.5),py(f(v)),v])});
  var path=pp.length?'<path d="'+pp.map(function(p,i){return (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)}).join("")+'" fill="none" stroke="'+SEL+'" stroke-width="2"/>'+pp.map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#fff" stroke="'+SEL+'" stroke-width="2" pointer-events="none"/>'}).join(""):"";
  return svg(W,H,g+bars+path,"Lượt xem từng video theo ngày đăng")+'<p class="note" style="margin:6px 0 0">Cột: lượt xem từng video, thang log, theo thứ tự ngày đăng. <span style="color:'+SEL+'">━</span> '+LINES[ST.line]+' (trục phải).</p>';
}

/* 5. Trước và sau 18/10 */
function compare(V){
  var a=V.filter(function(v){return inPer(v,"pre")}),b=V.filter(function(v){return inPer(v,"post")});if(!a.length||!b.length)return "";
  var rows=["view","xem_tb","r3","r5","r30","fyp","moi","nonfol","a2534","fol","save"].map(function(k){
    var x=med(a.map(M[k].f)),y=med(b.map(M[k].f));if(!has(x)||!has(y))return "";var ch=x?(y-x)/x*100:0,c=Math.abs(ch)<8?"mute":ch>0?"ok":"bad",mxv=Math.max(x,y)||1;
    return '<tr><td>'+esc(M[k].n.replace(" (thang log)",""))+'</td><td class="num">'+fm(k,x)+'</td><td class="rp-cb"><i style="width:'+(100*x/mxv)+'%;background:#9AA3AF"></i><i style="width:'+(100*y/mxv)+'%;background:'+(c==="bad"?"#C0392B":"#2C5FD4")+'"></i></td><td class="num">'+fm(k,y)+'</td><td class="num"><span class="pill '+c+'">'+(ch>0?"+":"")+vi(ch,0)+'%</span></td></tr>'}).join("");
  return '<div class="tbl"><table><thead><tr><th>Trung vị mỗi video</th><th class="num">01/08 – 17/10 ('+a.length+' video)</th><th></th><th class="num">Từ 18/10 ('+b.length+' video)</th><th class="num">Thay đổi</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

/* 6. Chủ đề */
function topics(V){
  var by={};V.forEach(function(v){(by[v.nhom]=by[v.nhom]||[]).push(v)});
  var rows=Object.keys(by).map(function(k){var l=by[k],tv=sum(l.map(function(v){return v.view}))||1;return{k:k,n:l.length,xem:med(l.map(M.xem_tb.f)),r5:med(l.map(M.r5.f)),fol:1000*sum(l.map(function(v){return v.follower_moi}))/tv,save:1000*sum(l.map(function(v){return v.save}))/tv,moi:med(l.map(M.moi.f)),view:med(l.map(M.view.f))}}).sort(function(a,b){return b.fol-a.fol});
  var mf=Math.max.apply(null,rows.map(function(r){return r.fol}))||1,ms=Math.max.apply(null,rows.map(function(r){return r.save}))||1;
  var cb=function(x,m,c,d){return '<span style="display:inline-block;width:70px;height:8px;border-radius:3px;background:var(--line);vertical-align:middle;margin-right:6px"><span style="display:block;height:8px;border-radius:3px;background:'+c+';width:'+Math.max(2,100*x/m)+'%"></span></span>'+vi(x,d)};
  return '<div class="tbl"><table><thead><tr><th>Nhóm chủ đề</th><th class="num">Video</th><th class="num">Trung vị view</th><th class="num">Xem TB</th><th class="num">Giây 5</th><th class="num">Follower/1K</th><th class="num">Lưu/1K</th><th class="num">Người mới</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td><span style="color:'+COL[GROUP[r.k]||"khac"]+'">●</span> '+esc(GNAME[r.k]||r.k)+'</td><td class="num">'+r.n+'</td><td class="num">'+short(r.view)+'</td><td class="num">'+vi(r.xem,1)+'s</td><td class="num">'+(has(r.r5)?vi(r.r5)+"%":"–")+'</td><td class="num">'+cb(r.fol,mf,"#2C5FD4",1)+'</td><td class="num">'+cb(r.save,ms,"#E08A00",1)+'</td><td class="num">'+(has(r.moi)?vi(r.moi)+"%":"–")+'</td></tr>'}).join("")+'</tbody></table></div><p class="note" style="margin:26px 0 0">Follower/1K và Lưu/1K tính trên tổng view của cả nhóm; các cột còn lại là trung vị.</p>';
}

/* 7. Lượt vào trang cá nhân theo tuần */
function weekly(TW){
  var W=900,H=230,L=46,R=16,T=14,B=30,l=TW.slice(-13),n=l.length;if(!n)return "";var mx=Math.max.apply(null,l.map(function(w){return w.profile_views}))*1.1||1,sw=(W-L-R)/n,y=function(v){return T+(H-T-B)*(1-v/mx)};
  var t=[0,1000,2000,3000].filter(function(v){return v<mx}),g="";t.forEach(function(v){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+vi(v)+'</text>'});
  g+=l.map(function(w,i){var cx=L+sw*(i+.5),bw=sw*.62;return '<rect class="rp-band" data-tip="'+esc("<b>Tuần "+dm(w.tuan)+"</b>"+vi(w.profile_views)+" lượt vào trang cá nhân<br>"+short(w.views)+" view cả kênh")+'" x="'+(cx-bw/2)+'" y="'+y(w.profile_views)+'" width="'+bw+'" height="'+(y(0)-y(w.profile_views))+'" rx="2" fill="#2C5FD4" fill-opacity=".85"/><text x="'+cx+'" y="'+(y(w.profile_views)-5)+'" text-anchor="middle">'+vi(w.profile_views)+'</text><text x="'+cx+'" y="'+(H-8)+'" text-anchor="middle">'+dm(w.tuan)+'</text>'}).join("");
  return svg(W,H,g,"Lượt vào trang cá nhân theo tuần");
}

/* 8. Bảng xếp hạng: bấm tiêu đề cột để sắp xếp */
var TCOL=[["ngay","Ngày"],["view","View"],["xem_tb","Xem TB"],["r3","Giây 3"],["r5","Giây 5"],["r30","Giây 30"],["het","Xem hết"],["folm","Fol mới"],["fol","Fol/1K"],["save","Lưu/1K"],["fyp","For You"],["search","Tìm kiếm"],["moi","Người mới"],["nonfol","Chưa follow"],["a2534","25–34"]];
function tval(v,k){return k==="ngay"?v.ngay:k==="folm"?v.follower_moi:M[k].f(v)}
function heat(k,x){if(!has(x))return "";var r={xem_tb:[8,15],r3:[40,50],r5:[28,40],r30:[8,14],fol:[2,12],moi:[35,50],nonfol:[70,95],a2534:[42,50],fyp:[70,88]}[k];return r?(x>=r[1]?"ok":x<r[0]?"bad":""):""}
function table(V){
  var k=ST.sort,d=ST.dir,l=V.slice().sort(function(a,b){var x=tval(a,k),y=tval(b,k);if(!has(x)&&k!=="ngay")return 1;if(!has(y)&&k!=="ngay")return -1;return (x<y?-1:x>y?1:0)*d});
  var mv=Math.max.apply(null,V.map(function(v){return Math.log10(Math.max(v.view,100))-2}))||1;
  return '<div class="tbl rp-tbl"><table><thead><tr>'+TCOL.map(function(c,i){return '<th class="'+(i?"num ":"")+'rp-th'+(k===c[0]?" on":"")+'" data-rp="sort:'+c[0]+'">'+c[1]+(k===c[0]?(d>0?" ↑":" ↓"):"")+'</th>'+(i===0?'<th>Video</th>':"")}).join("")+'</tr></thead><tbody>'+l.map(function(v){
    var cell=function(c){var x=tval(v,c),h=heat(c,x),t=fm(c,x);return '<td class="num">'+(h?'<span class="pill '+h+'">'+t+'</span>':t)+'</td>'};
    return '<tr class="rp-row'+(v.video_id===ST.sel?" on":"")+'" data-rp="sel:'+v.video_id+'"><td>'+dm(v.ngay)+'</td><td><span style="color:'+col(v)+'">●</span> '+esc(v.tieu_de)+'</td><td class="num"><span class="rp-vb"><i style="width:'+(100*(Math.log10(Math.max(v.view,100))-2)/mv)+'%"></i></span>'+short(v.view)+'</td>'+["xem_tb","r3","r5","r30","het"].map(cell).join("")+'<td class="num">'+vi(v.follower_moi)+'</td>'+["fol","save","fyp","search","moi","nonfol","a2534"].map(cell).join("")+'</tr>'}).join("")+'</tbody></table></div><p class="note" style="margin:26px 0 0">Bấm tiêu đề cột để sắp xếp, bấm một dòng để xem hồ sơ video. Ô xanh: đạt ngưỡng của nhóm video ra follower; ô đỏ: dưới ngưỡng.</p>';
}

var CSS='<style>.rp .rp-sc{overflow-x:auto}.rp .rp-sc svg{min-width:640px}.rp .rp-sc2 svg{min-width:440px}.rp-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.rp-kpi .stat{min-width:0}.rp .pill{text-transform:none}.rp-tbl table{font-size:13px}.rp-tbl td:first-child,.rp-tbl th:first-child{min-width:0}.rp-tbl td,.rp-tbl th{padding-left:8px;padding-right:8px}.rp .dchart text{font-size:12px}.rp-bar0{position:sticky;top:0;z-index:4;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;padding:10px 12px;margin:0 0 12px;border:1px solid var(--n30);border-radius:3px;background:#fff}.rp-bar0 .dlab{margin-left:auto}.rp-bar0 .seg{flex-wrap:wrap;max-width:100%}.rp-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rp-sel{font-size:13px;color:var(--n80)}.rp-sel select{font:inherit;font-size:13px;padding:3px 6px;border:1px solid var(--n30);border-radius:3px;background:#fff;color:var(--ink);max-width:210px}.rp-pre{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:var(--n80);margin:0 0 10px}.rp-chip{font:inherit;font-size:12.5px;padding:3px 10px;border:1px solid var(--n30);border-radius:999px;background:#fff;color:var(--n80);cursor:pointer}.rp-chip:hover:not(:disabled){border-color:var(--b400);color:var(--b400)}.rp-chip.on{background:var(--b400);border-color:var(--b400);color:#fff}.rp-chip:disabled{opacity:.4;cursor:default}.rp-pt{cursor:pointer;transition:fill-opacity .12s}.rp-pt:hover{fill-opacity:1}.rp-band:hover{fill:rgba(9,30,66,.06)}.rp-r{margin:8px 0 0;font-size:13px;color:var(--n80)}.rp-g{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:12px;align-items:start}.rp-g>section{margin-top:12px}.rp-dh{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}.rp-dh h3{margin:0;font-size:16px;line-height:1.3}.rp-nav{display:flex;gap:6px;flex:none}.rp-mini{margin:12px 0 4px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.rp-mini .stat{min-width:0;padding:8px 10px}.rp-mini .stat .v{font-size:18px}.rp-2 h4{margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--n80)}.rp-diag{list-style:none;margin:0;padding:0;font-size:13.5px;line-height:1.5}.rp-diag li{padding:5px 0;border-bottom:1px solid var(--line)}.rp-diag li:last-child{border:0}.rp-diag .pill{margin-right:4px}.rp-bar{display:flex;height:12px;border-radius:3px;overflow:hidden;background:var(--line);margin-top:8px}.rp-bar i{display:block;height:100%}.rp-bl{display:flex;flex-wrap:wrap;gap:2px 12px;font-size:12px;color:var(--n80);margin-top:3px}.rp-th{cursor:pointer;user-select:none;white-space:nowrap}.rp-th:hover,.rp-th.on{color:var(--b400)}.rp-row{cursor:pointer}.rp-row:hover td{background:var(--n20)}.rp-row.on td{background:#FFF4DC}.rp-tbl td{white-space:nowrap}.rp-tbl td:nth-child(2){white-space:normal;min-width:200px}.rp-vb{display:inline-block;width:46px;height:6px;border-radius:3px;background:var(--line);vertical-align:middle;margin-right:6px}.rp-vb i{display:block;height:6px;border-radius:3px;background:#2C5FD4}.rp-cb{min-width:120px}.rp-cb i{display:block;height:6px;border-radius:3px;margin:2px 0;min-width:2px}.rp .stat.ok .v{color:var(--ok)}.rp .stat.bad .v{color:var(--bad)}#rp-tip{position:fixed;pointer-events:none;z-index:50;max-width:300px;background:var(--n1000,#172B4D);color:#fff;font-size:12px;line-height:1.45;padding:7px 10px;border-radius:4px;box-shadow:0 6px 18px rgba(9,30,66,.25);display:none}#rp-tip b{display:block;font-size:13px}#rp-tip small{display:block;opacity:.7;margin-bottom:2px}@media(max-width:980px){.rp-g{grid-template-columns:minmax(0,1fr)}}@media(max-width:560px){.rp-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-mini{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-bar0{position:static}}</style>';

function body(){
  var L=CUR.snaps.filter(function(s){return s.data&&s.data.report});
  if(!L.length)return '<div class="empty">Chưa có báo cáo nào. Báo cáo được ghi vào Content khi phân tích số liệu TikTok Studio.</div>';
  var s=L.filter(function(x){return x.id===CUR.pick})[0]||L[0],r=s.data.report,ALL=r.videos,V=flt(ALL),k=r.kpi||{},hasRet=ALL.some(function(v){return v.ret});
  if(!ST.sel||!ALL.some(function(v){return v.video_id===ST.sel})){var b=ALL.filter(function(v){return v.ret}).sort(function(a,c){return c.follower_per_1k-a.follower_per_1k})[0]||ALL[0];ST.sel=b&&b.video_id}
  var cur=ALL.filter(function(v){return v.video_id===ST.sel})[0],order=V.slice().sort(function(a,c){return a.ngay<c.ngay?-1:1});
  CUR.order=order.map(function(v){return v.video_id});
  var ref={r3:med(ALL.map(M.r3.f))||0},tv=sum(V.map(function(v){return v.view})),tf=sum(V.map(function(v){return v.follower_moi}));
  var h='<div class="rp-bar0">'+(L.length>1?'<select id="rp-pick" aria-label="Chọn báo cáo">'+L.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===s.id?" selected":"")+'>Báo cáo '+dm(x.taken_on)+'</option>'}).join("")+'</select>':"")+seg("per",[["all","Tất cả"],["pre","01/08 – 17/10"],["post","Từ 18/10"]],ST.per)+seg("grp",[["all","Mọi nhóm"],["loi","Chuyện thật, vận hành"],["tool","Tour công cụ"],["khac","Khác"]],ST.grp)+'<span class="dlab">'+esc(r.nguon||"")+'</span></div>';
  h+='<div class="stats rp-kpi">'+stat(vi(V.length),"Video trong bộ lọc","trên "+ALL.length+" video có số")+stat(short(tv),"Tổng view")+stat(short(med(V.map(M.view.f))||0),"Trung vị view")+stat(fm("xem_tb",med(V.map(M.xem_tb.f))),"Trung vị xem TB")+stat(fm("r5",med(V.map(M.r5.f))),"Trung vị còn lại giây 5")+stat(vi(tf),"Follower mới")+stat(vi(tv?1000*tf/tv:0,1),"Follower / 1K view")+stat(fm("moi",med(V.map(M.moi.f))),"Trung vị người xem mới")+'</div>';
  h+='<p class="note" style="margin:8px 2px 0">Cả kênh: '+vi(k.followers)+' follower · '+short(k.views_365)+' view và '+short(k.viewers_365)+' người xem trong 365 ngày · lượt vào trang cá nhân mỗi tuần '+vi(k.profile_tuan_dau)+' → '+vi(k.profile_tuan_cuoi)+'.</p>';
  h+=sec("Kết luận chính",list(r.ket_luan||[]));
  h+=sec("Khám phá: chỉ số nào đi cùng chỉ số nào",presets()+explore(V),"Mỗi chấm là một video, chấm càng to càng nhiều view. Đổi hai trục để tự kiểm giả thuyết; rê chuột để xem số, bấm vào chấm để mở hồ sơ video.",sel("x",ST.x,"Trục ngang")+sel("y",ST.y,"Trục dọc"));
  if(hasRet)h+='<div class="rp-g" id="rp-detail">'+sec("Đường giữ chân từng giây",retention(ALL,cur),"Tỉ lệ người xem còn lại ở mỗi giây. Hai vạch đứng đánh dấu giây 3 và giây 5.",seg("rmax",[[30,"30 giây đầu"],["full","Cả video"]],ST.rmax))+sec("Hồ sơ video",detail(order,cur,ref))+'</div>';
  else h+='<div id="rp-detail">'+sec("Hồ sơ video",detail(order,cur,ref))+'</div>';
  h+=sec("Dòng thời gian: view và độ phủ",timeline(V),"Bấm vào một cột để mở hồ sơ video.",seg("line",[["fyp","% For You"],["moi","% người mới"],["nonfol","% chưa follow"]],ST.line));
  var cmp=compare(ST.grp==="all"?ALL:ALL.filter(function(v){return grp(v)===ST.grp}));
  if(cmp)h+=sec("Trước và sau 18/10",cmp,"So trung vị của từng video ở hai giai đoạn (theo nhóm đang lọc). Thanh xám là trước, thanh màu là sau.");
  h+=sec("Chủ đề nào ra follower",topics(V));
  if(r.tuan&&r.tuan.length)h+=sec("Sự quan tâm tới kênh theo tuần",weekly(r.tuan),"Lượt vào trang cá nhân là thước đo không bị view quảng cáo làm méo.");
  h+=sec("Bảng xếp hạng video",table(V));
  h+='<div class="cols3 dsec" style="margin-top:10px"><section><h2 class="sec">Từ khoá tìm ra kênh</h2><div style="display:flex;flex-wrap:wrap;gap:6px">'+(r.tu_khoa||[]).map(function(x){return '<span class="pill info">'+esc(x)+'</span>'}).join("")+'</div></section><section><h2 class="sec">Người xem (365 ngày)</h2><p class="note" style="margin:0">'+esc(r.nguoi_xem||"")+'</p></section><section><h2 class="sec">Giới hạn dữ liệu</h2><p class="note" style="margin:0">'+esc(r.gioi_han||"")+'</p></section></div>';
  h+=sec("Việc nên làm 2 tuần tới",list(r.de_xuat||[]));
  return h;
}
function redraw(){var el=document.getElementById("rp-root");if(el)el.innerHTML=body()}

window.HTReport=function(snaps,pick){CUR.snaps=snaps||[];CUR.pick=pick;return CSS+'<div class="rp" id="rp-root">'+body()+'</div>'};

if(typeof document!=="undefined"&&!window.__rpBound){window.__rpBound=1;
  document.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest("[data-rp]");if(!b||!b.closest("#rp-root")||b.disabled)return;
    var a=b.getAttribute("data-rp"),i=a.indexOf(":"),k=a.slice(0,i),v=a.slice(i+1),jump=false;
    if(k==="sel"){jump=ST.sel!==v&&!!b.closest(".rp-tbl");ST.sel=v}
    else if(k==="step"){var o=CUR.order||[],j=o.indexOf(ST.sel)+(+v);if(j>=0&&j<o.length)ST.sel=o[j]}
    else if(k==="xy"){v=v.split(",");ST.x=v[0];ST.y=v[1]}
    else if(k==="sort"){if(ST.sort===v)ST.dir=-ST.dir;else{ST.sort=v;ST.dir=-1}}
    else if(k==="rmax")ST.rmax=v==="full"?"full":30;
    else ST[k]=v;
    redraw();hideTip();
    if(jump){var d=document.getElementById("rp-detail");if(d&&d.scrollIntoView)d.scrollIntoView({behavior:"smooth",block:"start"})}
  });
  document.addEventListener("change",function(e){var k=e.target.getAttribute&&e.target.getAttribute("data-rpsel");if(k&&e.target.closest("#rp-root")){ST[k]=e.target.value;redraw()}});
  var tip=null;function hideTip(){if(tip)tip.style.display="none"}
  document.addEventListener("mousemove",function(e){
    var t=e.target.closest&&e.target.closest("[data-tip]");if(!t||!t.closest("#rp-root"))return hideTip();
    if(!tip){tip=document.createElement("div");tip.id="rp-tip";document.body.appendChild(tip)}
    var html=t.getAttribute("data-tip");if(tip._h!==html){tip.innerHTML=html;tip._h=html}
    tip.style.display="block";var w=tip.offsetWidth,hh=tip.offsetHeight,x=e.clientX+14,y=e.clientY+14;
    if(x+w>window.innerWidth-8)x=e.clientX-w-12;if(y+hh>window.innerHeight-8)y=e.clientY-hh-12;
    tip.style.left=Math.max(4,x)+"px";tip.style.top=Math.max(4,y)+"px";
  });
  document.addEventListener("scroll",hideTip,true);
}
})();
