/* Huy Tim Content: kho video, format, lệnh, số liệu TikTok và highlight. Chỉ chủ hệ thống dùng, dữ liệu nằm trên Supabase. */
(function(){
"use strict";
var BUCKET="content-media";
var STATUS=[["y_tuong","Ý tưởng"],["dang_dung","Đang dựng"],["cho_doi_tac","Chờ đối tác"],["cho_dang","Chờ đăng"],["da_dang","Đã đăng"]];
var KIND=[["phat_hien","Phát hiện"],["quy_luat","Quy luật"],["can_thu","Cần thử"]];
var IST=[["moi","Mới"],["dang_thu","Đang thử"],["da_ap_dung","Đã áp dụng"],["bo","Bỏ"]];
var VIEWS=[["overview","Tổng quan","chart"],["videos","Video","board"],["formats","Format","grid"],["commands","Lệnh","file"],["insights","Highlight","trend"],["update","Cập nhật số liệu","cal"]];
var S={view:"overview",videos:[],formats:[],commands:[],days:[],snaps:[],ins:[],media:[],urls:{},email:"",
  f:{st:"all",q:"",fmt:"",from:"",to:"",metric:"views",chart:"bar",fid:"",cmd:"",edit:false,kind:"all"},done:false};
var sb=null;

var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
function opt(v,l,c){return '<option value="'+esc(v)+'"'+(String(c==null?"":c)===String(v)?" selected":"")+'>'+esc(l)+'</option>'}
function vi(n,d){return Number(n||0).toLocaleString("vi-VN",{maximumFractionDigits:d==null?0:d})}
function short(n){n=Number(n||0);return n>=1e6?vi(n/1e6,1)+"tr":n>=1e3?vi(n/1e3,1)+"K":vi(n)}
function dm(s){if(!s)return "";var a=String(s).slice(0,10).split("-");return a[2]+"/"+a[1]}
function name(l,k){var x=l.filter(function(i){return i[0]===k})[0];return x?x[1]:k}
function byId(l,id){return l.filter(function(x){return x.id===id})[0]||null}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date())}
function shift(d,n){var x=new Date(d+"T00:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
var tt=null;function toast(m){var t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("show")},2800)}
function fail(e){toast(e&&e.code==="42501"?"Tài khoản này không có quyền sửa.":"Chưa lưu được: "+((e&&e.message)||"thử lại sau ít phút"))}
function er(v){return v.views?((v.likes||0)+(v.comments||0)+(v.shares||0))/v.views*100:null}
function stat(v,l,c,x,d){return '<div class="stat '+(c||"")+'"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':"")+(x||"")+'</div>'}
function url(p){return S.urls[p]||""}
function img(p,cls,alt){return p&&url(p)?'<img class="'+cls+'" src="'+esc(url(p))+'" alt="'+esc(alt||"")+'" loading="lazy">':'<div class="'+cls+'"></div>'}

/* ---------- dữ liệu ---------- */
async function load(){
  var t=["formats","commands","videos","channel_daily","snapshots","insights","media"],r=await Promise.all(t.map(function(n){return sb.from("content_"+n).select("*")}));
  if(r.some(function(x){return x.error})){toast("Chưa tải được dữ liệu Content.");return}
  S.formats=r[0].data.sort(function(a,b){return a.sort-b.sort});S.commands=r[1].data.sort(function(a,b){return a.id<b.id?-1:1});S.videos=r[2].data;
  S.days=r[3].data.sort(function(a,b){return a.day<b.day?-1:1});S.snaps=r[4].data.sort(function(a,b){return a.taken_on<b.taken_on?1:-1});
  S.ins=r[5].data.sort(function(a,b){return a.taken_on<b.taken_on?1:a.taken_on>b.taken_on?-1:(a.id<b.id?-1:1)});S.media=r[6].data;
  await signUrls();S.done=true;render();
}
async function signUrls(){
  var p=S.media.map(function(m){return m.path}).filter(function(x){return !S.urls[x]});
  if(!p.length)return;
  var r=await sb.storage.from(BUCKET).createSignedUrls(p,3600);
  (r.data||[]).forEach(function(x){if(x.signedUrl)S.urls[x.path]=x.signedUrl});
}
var KEY={channel_daily:"day"};
async function upsert(t,o){var r=await sb.from("content_"+t).upsert(o,{onConflict:KEY[t]||"id"}).select(KEY[t]||"id");if(r.error){fail(r.error);return false}return true}
async function remove(t,id){var r=await sb.from("content_"+t).delete().eq("id",id).select("id");if(r.error){fail(r.error);return false}return true}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

/* ---------- khung ---------- */
function render(){
  var c={videos:S.videos.length,formats:S.formats.length,commands:S.commands.length,insights:S.ins.filter(function(i){return i.status==="moi"||i.status==="dang_thu"}).length};
  HT.render({base:"../",active:"content",groups:[{key:"content",label:"Content",items:VIEWS.map(function(v){return {label:v[1],href:"#"+v[0],icon:v[2],current:S.view===v[0],badge:c[v[0]]||""}})}],user:{email:S.email,actions:[{icon:"out",label:"Đăng xuất",attrs:"data-ht-signout"}]}});
  $("#ptitle").textContent=name(VIEWS,S.view);$("#pcount").textContent=c[S.view]||"";
  if(!S.done)return;
  $("#app").innerHTML=(!S.videos.length&&S.view!=="update")?'<div class="empty">Chưa có dữ liệu. Vào Cập nhật số liệu, chọn file content_seed.json để nhập toàn bộ dữ liệu EDIT VIDEO.</div>':({overview:vOverview,videos:vVideos,formats:vFormats,commands:vCommands,insights:vInsights,update:vUpdate})[S.view]();
  if(S.view==="overview"&&innerWidth>700)requestAnimationFrame(function(){dShow($(".dhit[data-peak]"))});
}

/* ---------- tổng quan ---------- */
function range(){var D=S.days,e=D.length?D[D.length-1].day:today(),to=S.f.to||e,from=S.f.from||shift(e,-29);return {from:from,to:to,max:e,min:D.length?D[0].day:e}}
function sum(l,k){return l.reduce(function(a,x){return a+Number(x[k]||0)},0)}
function vOverview(){
  var r=range(),rows=S.days.filter(function(x){return x.day>=r.from&&x.day<=r.to}),i0=S.days.indexOf(rows[0]),prev=i0>=rows.length?S.days.slice(i0-rows.length,i0):[];
  var last=rows[rows.length-1]||{},sp=function(k){return HT.spark(rows.map(function(x){return Number(x[k]||0)}))};
  var dl=function(c,p){if(!prev.length||!p)return "";var v=(c-p)/p*100;return '<b class="'+(v<0?"dn":"")+'">'+(v>0?"+":"")+vi(v,1)+'%</b> so với kỳ trước'};
  var V=sum(rows,"views"),P=sum(prev,"views"),N=sum(rows,"net_followers"),PN=sum(prev,"net_followers"),C=sum(rows,"comments"),PC=sum(prev,"comments");
  var r1=V?N/V*1000:0,r2=V?C/V*1000:0,p1=P?PN/P*1000:0,p2=P?PC/P*1000:0,pv=V?sum(rows,"profile_views")/V*100:0;
  var h='<div class="dtop"><div class="filters"><button type="button" class="rbtn" id="rg" data-a="range">'+HT.ic("cal")+dm(r.from)+' đến '+dm(r.to)+'</button><span class="dlab">'+(prev.length?"so với kỳ liền trước":"")+'</span></div><span class="dlab">Số liệu đến '+dm(r.max)+'</span></div>';
  h+='<div class="stats">'+stat(vi(last.followers),"Follower","",sp("followers"))+stat(short(V),"Lượt xem","",sp("views"),dl(V,P))+stat((N>=0?"+":"")+vi(N),"Follower tăng","",sp("net_followers"),dl(N,PN))+stat(vi(r1,1),"Follower/1K view",r1<1&&V>1000?"bad":"","",dl(r1,p1))+stat(vi(r2,1),"Comment/1K view","","",dl(r2,p2))+stat(vi(pv,1)+"%","Xem trang cá nhân")+'</div>';
  var M=[["views","Lượt xem"],["net_followers","Follower tăng"],["comments","Comment"],["likes","Like"]],k=S.f.metric;
  h+='<section class="dsec"><div class="chead"><h2 class="sec">'+name(M,k)+' theo ngày</h2><div class="filters"><div class="seg">'+M.map(function(m){return '<button type="button" class="'+(k===m[0]?"on":"")+'" data-a="metric" data-v="'+m[0]+'">'+m[1]+'</button>'}).join("")+'</div><div class="seg" aria-label="Kiểu biểu đồ"><button type="button" class="'+(S.f.chart==="bar"?"on":"")+'" data-a="chart" data-v="bar" aria-label="Biểu đồ cột">'+HT.ic("bars")+'</button><button type="button" class="'+(S.f.chart==="line"?"on":"")+'" data-a="chart" data-v="line" aria-label="Biểu đồ đường">'+HT.ic("line")+'</button></div></div></div>'+chart(rows,k,name(M,k),S.f.chart)+'<details class="dn"><summary>Xem bảng số theo ngày</summary><div class="tbl"><table><thead><tr><th>Ngày</th><th class="num">View</th><th class="num">Follower tăng</th><th class="num">Like</th><th class="num">Comment</th><th class="num">Share</th></tr></thead><tbody>'+rows.slice().reverse().map(function(x){return '<tr><td>'+dm(x.day)+'</td><td class="num">'+vi(x.views)+'</td><td class="num">'+vi(x.net_followers)+'</td><td class="num">'+vi(x.likes)+'</td><td class="num">'+vi(x.comments)+'</td><td class="num">'+vi(x.shares)+'</td></tr>'}).join("")+'</tbody></table></div></details></section>';
  var top=S.videos.filter(function(v){return v.views}).sort(function(a,b){return b.views-a.views}).slice(0,8);
  h+='<section class="dsec"><div class="chead"><h2 class="sec">Video nhiều view nhất</h2><button class="btn sm" data-a="go" data-v="videos">Xem tất cả</button></div>'+videoTable(top,true)+'</section>';
  var live=S.ins.filter(function(i){return i.status==="moi"||i.status==="dang_thu"}).slice(0,5);
  if(live.length)h+='<section class="dsec"><div class="chead"><h2 class="sec">Highlight cần nhớ</h2><button class="btn sm" data-a="go" data-v="insights">Xem tất cả</button></div>'+live.map(insRow).join("")+'</section>';
  var a=S.snaps[0];
  if(a){var d=a.data,p=function(x){return vi(x[1],1)+"%"};
    h+='<div class="cols3 dsec" style="margin-top:10px"><section><h2 class="sec">Độ tuổi</h2>'+bars(d.age,p)+'</section><section><h2 class="sec">Nguồn lượt xem</h2>'+bars(d.traffic,p)+'</section><section><h2 class="sec">Quốc gia</h2>'+bars(d.territory,p)+'</section></div><p class="note">Khán giả chụp ngày '+dm(a.taken_on)+': '+(d.gender||[]).map(function(g){return g[0]+" "+g[1]+"%"}).join(", ")+'. Giờ follower hoạt động nhiều: '+(d.hours||[]).map(function(g){return g[0]}).join(", ")+'.</p>';}
  return h;
}
function bars(l,f){var m=Math.max.apply(null,l.map(function(r){return r[1]}))||1;return '<div class="dbars">'+l.map(function(r){return '<div class="dbar"><span class="n">'+esc(r[0])+'</span><div class="t"><i style="width:'+Math.max(1,r[1]/m*100)+'%"></i></div><span class="v">'+f(r)+'</span></div>'}).join("")+'</div>'}
function chart(rows,k,label,type){
  if(!rows.length)return '<div class="empty">Không có số liệu trong khoảng này.</div>';
  var W=900,H=250,L=innerWidth<560?96:46,R=type==="bar"?8:24,T=10,B=24,n=rows.length,val=function(r){return Number(r[k]||0)};
  var max=Math.max.apply(null,rows.map(val)),min=Math.min(0,Math.min.apply(null,rows.map(val)));max=max||1;
  var span=max-min,step=Math.pow(10,Math.floor(Math.log10(span)))/2;while(span/step>4)step*=2;var top=Math.ceil(max/step)*step,bot=Math.floor(min/step)*step;
  var sw=(W-L-R)/n,x=type==="bar"?function(i){return L+sw*(i+.5)}:function(i){return L+(W-L-R)*(n<2?.5:i/(n-1))},y=function(v){return T+(H-T-B)*(1-(v-bot)/(top-bot))};
  var g="";for(var v=bot;v<=top+step/2;v+=step)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(L-10)+'" y="'+(y(v)+4)+'" text-anchor="end">'+short(v)+'</text>';
  var every=Math.ceil(n/7),tk=rows.map(function(r,i){return i%every===0?'<text x="'+x(i)+'" y="'+(H-6)+'" text-anchor="middle">'+dm(r.day)+'</text>':""}).join(""),marks;
  if(type==="bar"){var bw=Math.min(26,sw*.66);marks=rows.map(function(r,i){var a=y(Math.max(0,val(r))),b=y(Math.min(0,val(r)));return b-a>0?'<rect class="dbarh" data-i="'+i+'" x="'+(x(i)-bw/2)+'" y="'+a+'" width="'+bw+'" height="'+(b-a)+'" rx="2" fill="#B8C9EE"/>':""}).join("")}
  else{var l=rows.map(function(r,i){return (i?"L":"M")+x(i).toFixed(1)+" "+y(val(r)).toFixed(1)}).join(" ");marks='<path d="'+l+' L'+x(n-1)+' '+y(Math.max(0,bot))+' L'+x(0)+' '+y(Math.max(0,bot))+' Z" fill="#2C5FD4" fill-opacity=".05"/><path d="'+l+'" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round"/>'}
  var peak=rows.reduce(function(b,r,i){return val(r)>val(rows[b])?i:b},0);
  var hit=rows.map(function(r,i){var w=type==="bar"?sw:(W-L-R)/Math.max(1,n-1);return '<rect class="dhit" x="'+(x(i)-w/2)+'" y="'+T+'" width="'+w+'" height="'+(H-T-B)+'" fill="transparent" data-i="'+i+'"'+(i===peak?" data-peak":"")+' data-d="'+dm(r.day)+'" data-v="'+vi(val(r))+' '+esc(label.toLowerCase())+'" data-x="'+x(i)+'" data-y="'+y(val(r))+'"/>'}).join("");
  return '<div class="dchart" id="dchart"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(label)+' theo ngày">'+g+tk+marks+'<line id="dline" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--accent)" stroke-dasharray="3 3" visibility="hidden"/><circle id="dmark" r="4" fill="var(--accent)" stroke="#fff" stroke-width="2" visibility="hidden"/>'+hit+'</svg></div>';
}
function dShow(h){
  var box=$("#dchart");if(!box||!h)return;var tip=$("#dtip"),mk=$("#dmark"),ln=$("#dline");
  if(!tip){tip=document.createElement("div");tip.id="dtip";tip.className="dtip";box.appendChild(tip)}
  var rc=box.querySelector("svg").getBoundingClientRect(),br=box.getBoundingClientRect(),k=rc.width/900,px=rc.left-br.left+h.dataset.x*k;
  tip.innerHTML='<small>'+esc(h.dataset.d)+'</small><b>'+esc(h.dataset.v)+'</b>';tip.style.left=px+"px";tip.style.top=(rc.top-br.top+h.dataset.y*k)+"px";tip.style.transform=px>br.width-190?"translate(calc(-100% - 14px),-50%)":"";
  mk.setAttribute("cx",h.dataset.x);mk.setAttribute("cy",h.dataset.y);mk.setAttribute("visibility","visible");ln.setAttribute("x1",h.dataset.x);ln.setAttribute("x2",h.dataset.x);ln.setAttribute("visibility","visible");
  [].forEach.call(box.querySelectorAll(".dbarh"),function(b){b.setAttribute("fill",b.dataset.i===h.dataset.i?"#2C5FD4":"#B8C9EE")});
}

/* ---------- video ---------- */
function videoTable(l,mini){
  return '<div class="tbl"><table><thead><tr><th style="width:52px"></th><th>Video</th><th>Format</th><th>Trạng thái</th><th>Đăng</th><th class="num">View</th><th class="num">ER</th><th class="num">Comment/1K</th></tr></thead><tbody>'
   +l.map(function(v){var f=byId(S.formats,v.format_id),e=er(v);return '<tr class="click" tabindex="0" data-a="video" data-v="'+esc(v.id)+'"><td style="min-width:0">'+img(v.cover_path,"ct-v",v.title)+'</td><td><div class="t1">'+esc(v.title||v.name)+'</div><div class="t2">'+esc(v.brand)+'</div></td><td class="t2">'+esc(f?f.name:"")+'</td><td><span class="pill '+(v.status==="da_dang"?"ok":v.status==="cho_dang"?"warn":"")+'">'+name(STATUS,v.status)+'</span></td><td class="t2">'+dm(v.posted_on)+'</td><td class="num">'+(v.views?short(v.views):"")+'</td><td class="num">'+(e==null?"":vi(e,e<1?2:1)+"%")+'</td><td class="num">'+(v.views?vi((v.comments||0)/v.views*1000,1):"")+'</td></tr>'}).join("")+'</tbody></table></div>';
}
function vVideos(){
  var f=S.f,q=f.q.toLowerCase(),l=S.videos.filter(function(v){return (f.st==="all"||v.status===f.st)&&(!f.fmt||v.format_id===f.fmt)&&(!q||(v.title+" "+v.name+" "+v.brand+" "+v.notes).toLowerCase().indexOf(q)>=0)});
  l.sort(function(a,b){return (b.posted_on||"")<(a.posted_on||"")?-1:(b.posted_on||"")>(a.posted_on||"")?1:(b.stt||0)-(a.stt||0)});
  var cnt=function(k){return S.videos.filter(function(v){return v.status===k}).length};
  var h='<div class="utabs"><button type="button" class="'+(f.st==="all"?"on":"")+'" data-a="st" data-v="all">Tất cả</button>'+STATUS.map(function(s){return '<button type="button" class="'+(f.st===s[0]?"on":"")+'" data-a="st" data-v="'+s[0]+'">'+s[1]+' '+cnt(s[0])+'</button>'}).join("")+'</div>';
  h+='<div class="toolbar"><div class="filters"><input type="search" id="vq" placeholder="Tìm video" aria-label="Tìm video" value="'+esc(f.q)+'"><select id="vf" aria-label="Format">'+opt("","Mọi format",f.fmt)+S.formats.map(function(x){return opt(x.id,x.name,f.fmt)}).join("")+'</select></div><button class="btn primary" data-a="video-new">Thêm video</button></div>';
  return h+(l.length?videoTable(l):'<div class="empty">Không có video nào khớp bộ lọc.</div>');
}
function videoForm(v){
  var isNew=!v;v=v||{id:uid("v"),status:"y_tuong"};
  var fld=function(k,l,w,t){return '<label class="f'+(w?" w":"")+'">'+l+'<input id="d-'+k+'" type="'+(t||"text")+'" value="'+esc(v[k]==null?"":v[k])+'"></label>'};
  var ta=function(k,l){return '<label class="f w">'+l+'<textarea id="d-'+k+'">'+esc(v[k]||"")+'</textarea></label>'};
  drawer(isNew?"Thêm video":"Thông tin video",(v.cover_path&&url(v.cover_path)?'<div class="f w"><img src="'+esc(url(v.cover_path))+'" alt="Ảnh bìa" style="max-height:220px;border-radius:4px;align-self:flex-start"></div>':"")
   +fld("title","Tiêu đề hiển thị",true)+fld("name","Tên nội bộ")+fld("brand","Đối tác")
   +'<label class="f">Format<select id="d-format_id">'+opt("","Chưa chọn",v.format_id)+S.formats.map(function(x){return opt(x.id,x.name,v.format_id)}).join("")+'</select></label>'
   +'<label class="f">Trạng thái<select id="d-status">'+STATUS.map(function(s){return opt(s[0],s[1],v.status)}).join("")+'</select></label>'
   +fld("tiktok_url","Link TikTok",true)+fld("posted_on","Ngày đăng",false,"date")+fld("views","View",false,"number")+fld("likes","Like",false,"number")+fld("comments","Comment",false,"number")+fld("shares","Share",false,"number")+fld("followers_7d","Follower 7 ngày",false,"number")
   +'<label class="f w">Ảnh bìa mới<input id="d-cover" type="file" accept="image/*"></label>'
   +fld("script","File kịch bản",true)+fld("build","Script dựng",true)+fld("output","File output",true)+fld("audio","File audio",true)+ta("edit_notes","Ghi chú dựng")+ta("notes","Ghi chú"),
   async function(){
     var g=function(k){return $("#d-"+k).value.trim()},n=function(k){var x=g(k);return x===""?null:Number(x)};
     if(!g("title")&&!g("name")){toast("Điền tiêu đề video");return}
     var o=Object.assign({},v,{title:g("title"),name:g("name"),brand:g("brand"),format_id:g("format_id")||null,status:g("status"),tiktok_url:g("tiktok_url"),posted_on:g("posted_on")||null,views:n("views"),likes:n("likes"),comments:n("comments"),shares:n("shares"),followers_7d:n("followers_7d"),script:g("script"),build:g("build"),output:g("output"),audio:g("audio"),edit_notes:g("edit_notes"),notes:g("notes")});
     delete o.created_at;delete o.updated_at;
     var file=$("#d-cover").files[0];
     if(file){var p="cover/"+o.id+"-"+Date.now()+"."+(file.name.split(".").pop()||"jpg"),up=await sb.storage.from(BUCKET).upload(p,file,{upsert:true,contentType:file.type});if(up.error){fail(up.error);return}o.cover_path=p;}
     if(!await upsert("videos",o))return;
     if(file&&!await upsert("media",{id:o.cover_path,path:o.cover_path,title:o.title,kind:"cover",video_id:o.id}))return;
     closeDrawer();toast("Đã lưu");load();
   },isNew?null:async function(){if(await remove("videos",v.id)){closeDrawer();toast("Đã xóa video");load()}},v.tiktok_url);
}

/* ---------- format ---------- */
function formatMedia(id){return S.media.filter(function(m){return m.format_id===id&&m.kind==="format"}).sort(function(a,b){return a.sort-b.sort})}
function vFormats(){
  if(S.f.fid&&byId(S.formats,S.f.fid))return vFormat(byId(S.formats,S.f.fid));
  return '<div class="ct-g">'+S.formats.map(function(f){var m=formatMedia(f.id)[1]||formatMedia(f.id)[0],l=S.videos.filter(function(v){return v.format_id===f.id}),seen=l.filter(function(v){return v.views}),avg=seen.length?sum(seen,"views")/seen.length:0;
    return '<button type="button" class="ct-c" data-a="fmt" data-v="'+esc(f.id)+'">'+img(m&&m.path,"ct-th",f.name)+'<div class="b"><b>'+esc(f.name)+'</b><small>/'+esc(f.command)+'</small><small>'+esc(f.use_when)+'</small><small>'+l.length+' video'+(avg?" · trung bình "+short(avg)+" view":"")+'</small></div></button>'}).join("")+'</div>';
}
function vFormat(f){
  var m=formatMedia(f.id),l=S.videos.filter(function(v){return v.format_id===f.id}).sort(function(a,b){return (b.views||0)-(a.views||0)}),c=byId(S.commands,f.command);
  return '<div class="toolbar"><button class="btn sm" data-a="fmt" data-v="">Tất cả format</button><div class="filters"><label class="btn sm" for="fm-up">Thêm ảnh</label><input id="fm-up" type="file" accept="image/*" multiple hidden data-fid="'+esc(f.id)+'"><button class="btn sm" data-a="fmt-edit" data-v="'+esc(f.id)+'">Sửa</button>'+(c?'<button class="btn sm primary" data-a="cmd" data-v="'+esc(c.id)+'">Mở lệnh /'+esc(c.id)+'</button>':"")+'</div></div>'
   +'<section class="dsec" style="margin-top:0"><h2 class="sec">'+esc(f.name)+' <span>'+esc(f.folder)+'</span></h2><p style="margin:0 0 4px">'+esc(f.style)+'</p><p class="note" style="margin:0 0 12px">Dùng khi: '+esc(f.use_when)+(f.notes?". "+esc(f.notes):"")+'</p>'+(m.length?'<div class="ct-gal">'+m.map(function(x){return img(x.path,"",x.title)}).join("")+'</div>':'<div class="empty">Chưa có ảnh mẫu.</div>')+'</section>'
   +'<section class="dsec"><h2 class="sec">Video dùng format này <span>'+l.length+' video</span></h2>'+(l.length?videoTable(l):'<div class="empty">Chưa có video.</div>')+'</section>';
}
function formatForm(f){
  drawer("Sửa format",'<label class="f w">Tên<input id="d-name" value="'+esc(f.name)+'"></label><label class="f w">Lệnh<input id="d-command" value="'+esc(f.command)+'"></label><label class="f w">Phong cách<textarea id="d-style">'+esc(f.style)+'</textarea></label><label class="f w">Dùng khi<textarea id="d-use_when">'+esc(f.use_when)+'</textarea></label><label class="f w">Ghi chú<textarea id="d-notes">'+esc(f.notes)+'</textarea></label>',async function(){
    var o=Object.assign({},f,{name:$("#d-name").value.trim(),command:$("#d-command").value.trim(),style:$("#d-style").value.trim(),use_when:$("#d-use_when").value.trim(),notes:$("#d-notes").value.trim()});delete o.updated_at;
    if(await upsert("formats",o)){closeDrawer();toast("Đã lưu");load()}});
}

/* ---------- lệnh ---------- */
function vCommands(){
  var c=byId(S.commands,S.f.cmd)||S.commands[0];if(!c)return '<div class="empty">Chưa có lệnh.</div>';
  return '<div class="ct-2"><div class="ct-l">'+S.commands.map(function(x){return '<button type="button" class="'+(x.id===c.id?"on":"")+'" data-a="cmd" data-v="'+esc(x.id)+'">/'+esc(x.id)+'<small>'+esc(x.title)+'</small></button>'}).join("")+'</div>'
   +'<section><div class="toolbar"><h2 class="sec" style="margin:0">/'+esc(c.id)+'</h2><div class="filters">'+(S.f.edit?'<button class="btn sm" data-a="cmd-cancel">Hủy</button><button class="btn sm primary" data-a="cmd-save">Lưu</button>':'<button class="btn sm" data-a="cmd-edit">Sửa</button><button class="btn sm primary" data-a="cmd-copy">Sao chép</button>')+'</div></div>'
   +(S.f.edit?'<textarea class="ct-ta" id="cmd-body" aria-label="Nội dung lệnh">'+esc(c.body)+'</textarea>':'<pre class="cmd">'+esc(c.body)+'</pre>')+'</section></div>';
}

/* ---------- highlight ---------- */
function insRow(i){var v=byId(S.videos,i.video_id);return '<div class="ins"><div class="h"><span class="pill">'+name(KIND,i.kind)+'</span><b>'+esc(i.title)+'</b><span class="t2">'+dm(i.taken_on)+'</span><select data-ist="'+esc(i.id)+'" aria-label="Trạng thái">'+IST.map(function(s){return opt(s[0],s[1],i.status)}).join("")+'</select></div><p>'+esc(i.body)+(v?' Video: '+esc(v.title||v.name)+'.':"")+'</p></div>'}
function vInsights(){
  var k=S.f.kind,l=S.ins.filter(function(i){return k==="all"||i.kind===k});
  return '<div class="utabs"><button type="button" class="'+(k==="all"?"on":"")+'" data-a="kind" data-v="all">Tất cả</button>'+KIND.map(function(x){return '<button type="button" class="'+(k===x[0]?"on":"")+'" data-a="kind" data-v="'+x[0]+'">'+x[1]+'</button>'}).join("")+'</div>'
   +'<details class="inp"><summary>Thêm highlight</summary><div class="inner"><form class="qa" id="ins-add" style="display:grid;grid-template-columns:minmax(0,1fr) 140px minmax(0,220px);gap:6px"><input id="in-title" placeholder="Điều vừa rút ra" aria-label="Tiêu đề" required autocomplete="off"><select id="in-kind" aria-label="Loại">'+KIND.map(function(x){return opt(x[0],x[1],"phat_hien")}).join("")+'</select><select id="in-video" aria-label="Video">'+opt("","Không gắn video","")+S.videos.map(function(v){return opt(v.id,(v.title||v.name).slice(0,50),"")}).join("")+'</select><textarea id="in-body" placeholder="Số liệu, lý do, việc cần làm" aria-label="Chi tiết" style="grid-column:1/-1;min-height:70px"></textarea><button class="btn primary" type="submit" style="grid-column:1/-1;justify-self:start">Lưu highlight</button></form></div></details>'
   +(l.length?'<section class="dsec">'+l.map(insRow).join("")+'</section>':'<div class="empty">Chưa có highlight.</div>');
}

/* ---------- cập nhật số liệu ---------- */
function vUpdate(){
  var d=S.days[S.days.length-1],seen=S.videos.filter(function(v){return v.views}).length;
  return '<section class="dsec" style="margin-top:0"><h2 class="sec">Số liệu TikTok</h2><p class="note" style="margin:0 0 10px">'+(d?'Đang có đến ngày '+dm(d.day)+', '+seen+' video có số liệu.':"Chưa có số liệu.")+' Tải file từ TikTok Studio rồi chọn ở đây, có thể chọn nhiều file: Overview, Content, Followers (.zip hoặc .xlsx).</p><div class="imp"><label class="btn primary" for="tk-file">Chọn file TikTok</label><input id="tk-file" type="file" accept=".zip,.xlsx" multiple hidden></div></section>'
   +'<section class="dsec"><h2 class="sec">Nhập toàn bộ dữ liệu EDIT VIDEO</h2><p class="note" style="margin:0 0 10px">Chọn file content_seed.json trong thư mục Huy Tim/docs. Nhập lại nhiều lần cũng không bị trùng, nhưng sẽ ghi đè các dòng có sẵn trong file.</p><div class="imp"><label class="btn" for="seed-file">Chọn file gói dữ liệu</label><input id="seed-file" type="file" accept=".json" hidden></div></section><div id="imp-msg" class="note" role="status" style="white-space:pre-line"></div>';
}
function say(m){var e=$("#imp-msg");if(e)e.textContent=m}
/* video trong gói có thể thiếu cột chữ: điền chuỗi rỗng vì các cột này không nhận giá trị trống */
var VTEXT=["audio","brand","build","cover_path","edit_notes","kind","name","notes","output","promo","script","tiktok_url","title","updated_on"];
function fillVideo(r){var o=Object.assign({},r);VTEXT.forEach(function(k){if(o[k]==null)o[k]=""});if(o.status==null)o.status="y_tuong";return o}
async function chunks(t,l,n){if(t==="videos")l=l.map(fillVideo);for(var i=0;i<l.length;i+=n){var r=await sb.from("content_"+t).upsert(l.slice(i,i+n),{onConflict:KEY[t]||"id"});if(r.error)throw r.error}}
async function importSeed(file){
  try{
    say("Đang đọc file...");var d=JSON.parse(await file.text());
    if(!d.formats||!d.videos){say("File này không phải gói dữ liệu Content.");return}
    var steps=[["formats",d.formats],["commands",d.commands],["videos",d.videos],["channel_daily",d.channel_daily],["snapshots",d.snapshots],["insights",d.insights]];
    for(var i=0;i<steps.length;i++){say("Đang nhập "+steps[i][0]+"...");await chunks(steps[i][0],steps[i][1],200)}
    var ms=d.media||[];
    for(var j=0;j<ms.length;j++){
      say("Đang tải ảnh "+(j+1)+"/"+ms.length+"...");
      var bin=atob(ms[j].b64),u=new Uint8Array(bin.length);for(var b=0;b<bin.length;b++)u[b]=bin.charCodeAt(b);
      var r=await sb.storage.from(BUCKET).upload(ms[j].path,new Blob([u],{type:"image/jpeg"}),{upsert:true,contentType:"image/jpeg"});if(r.error)throw r.error;
    }
    await chunks("media",ms.map(function(m){var o=Object.assign({},m);delete o.b64;return o}),200);
    say("Xong: "+d.videos.length+" video, "+d.formats.length+" format, "+d.commands.length+" lệnh, "+d.channel_daily.length+" ngày, "+ms.length+" ảnh.");await load();say("Đã nhập xong.");
  }catch(e){say("Chưa nhập được: "+((e&&e.message)||"lỗi không rõ"))}
}
function loadLib(u,g){return window[g]?Promise.resolve():new Promise(function(ok,no){var s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function num(v){return Number(String(v==null?"":v).replace(/[^\d.-]/g,""))||0}
var MON={January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
function postDate(s,now){var a=String(s||"").trim().split(/\s+/);if(!MON[a[0]])return null;var y=+now.slice(0,4),d=y+"-"+("0"+MON[a[0]]).slice(-2)+"-"+("0"+a[1]).slice(-2);return d>now?(y-1)+d.slice(4):d}
/* tệp TikTok chỉ ghi ngày và tháng: lấy dòng cuối làm mốc rồi lùi dần từng ngày để có đúng năm */
function dayOf(rows,i,now){return shift(postDate(rows[rows.length-1].Date,now)||now,i-(rows.length-1))}
async function importTikTok(files){
  try{
    say("Đang đọc file...");
    await loadLib("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js","XLSX");await loadLib("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js","JSZip");
    var books=[];
    for(var i=0;i<files.length;i++){
      var f=files[i],buf=await f.arrayBuffer();
      if(/\.zip$/i.test(f.name)){var z=await JSZip.loadAsync(buf),names=Object.keys(z.files);for(var j=0;j<names.length;j++)if(/\.xlsx$/i.test(names[j]))books.push([f.name,names[j],await z.files[names[j]].async("arraybuffer")])}
      else books.push([f.name,f.name,buf]);
    }
    var now=today(),nd=0,nv=0,nf=0;
    for(var b=0;b<books.length;b++){
      var wb=XLSX.read(books[b][2],{type:"array"}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""}),h=rows[0]?Object.keys(rows[0]):[];
      if(h.indexOf("Video link")>=0){
        for(var r=0;r<rows.length;r++){
          var x=rows[r],link=x["Video link"],v=S.videos.filter(function(q){return q.tiktok_url===link})[0],o={views:num(x["Total views"]),likes:num(x["Total likes"]),comments:num(x["Total comments"]),shares:num(x["Total shares"])};
          if(v){var u=await sb.from("content_videos").update(o).eq("id",v.id);if(u.error)throw u.error}
          else{var nw=Object.assign({id:"t"+String(link).slice(-10),title:String(x["Video title"]).trim().slice(0,120),brand:"Ngoài tracker",status:"da_dang",tiktok_url:link,posted_on:postDate(x["Post time"],now)},o);var ins=await sb.from("content_videos").upsert(nw,{onConflict:"id"});if(ins.error)throw ins.error;S.videos.push(nw)}
          nv++;
        }
      }else if(h.indexOf("Video Views")>=0){
        var l=rows.map(function(x,i){return {day:dayOf(rows,i,now),views:num(x["Video Views"]),profile_views:num(x["Profile Views"]),likes:num(x.Likes),comments:num(x.Comments),shares:num(x.Shares)}}).filter(function(x){return x.day<=now});
        await chunks("channel_daily",l.map(function(x){var e=S.days.filter(function(q){return q.day===x.day})[0];return e?Object.assign({},e,x):x}),300);nd+=l.length;
      }else if(h.indexOf("Followers")>=0&&h.indexOf("Date")>=0){
        var fl=rows.map(function(x,i){return {day:dayOf(rows,i,now),followers:num(x.Followers)}});
        await load();
        for(var k=0;k<fl.length;k++){var e=S.days.filter(function(q){return q.day===fl[k].day})[0],p=k?fl[k].followers-fl[k-1].followers:null;if(e){var y=await sb.from("content_channel_daily").update({followers:fl[k].followers,net_followers:p}).eq("day",e.day);if(y.error)throw y.error;nf++}}
      }
    }
    await load();say("Đã cập nhật: "+nd+" ngày lượt xem, "+nf+" ngày follower, "+nv+" dòng video."+(nd+nf+nv?"":" Không nhận ra file nào, hãy chọn file Overview, Content hoặc Followers."));
  }catch(e){say("Chưa đọc được file: "+((e&&e.message)||"lỗi không rõ"))}
}

/* ---------- ngăn sửa ---------- */
function drawer(title,body,save,del,link){
  $("#drawerRoot").innerHTML='<div class="scrim" data-close="1"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="d-h"><div class="hd"><h3 id="d-h">'+esc(title)+'</h3><button class="btn sm" type="button" data-close="1">Đóng</button></div><div class="body">'+body+'</div><div class="ft"><div class="r" style="display:flex;gap:6px">'+(del?'<button class="btn danger" type="button" id="d-del">Xóa</button>':"")+(link?'<a class="btn" href="'+esc(link)+'" target="_blank" rel="noopener">Mở TikTok</a>':"")+'</div><div class="r" style="display:flex;gap:6px"><button class="btn" type="button" data-close="1">Hủy</button><button class="btn primary" type="button" id="d-save">Lưu</button></div></div></aside>';
  $("#d-save").onclick=save;
  if(del){var arm=false,b=$("#d-del");b.onclick=function(){if(!arm){arm=true;b.textContent="Bấm lần nữa để xóa";return}del()}}
}
function closeDrawer(){$("#drawerRoot").innerHTML=""}

/* ---------- sự kiện ---------- */
function go(v){S.view=v;try{history.replaceState(null,"","#"+v)}catch(_){}render();window.scrollTo(0,0)}
function bind(){
  document.addEventListener("click",async function(e){
    if(e.target.closest("[data-close]")){closeDrawer();return}
    var t=e.target.closest("[data-a]");if(!t)return;
    var a=t.dataset.a,v=t.dataset.v,f=S.f;
    if(a==="go")go(v);
    else if(a==="metric"){f.metric=v;render()}
    else if(a==="chart"){f.chart=v;render()}
    else if(a==="st"){f.st=v;render()}
    else if(a==="kind"){f.kind=v;render()}
    else if(a==="video")videoForm(byId(S.videos,v));
    else if(a==="video-new")videoForm(null);
    else if(a==="fmt"){f.fid=v;if(S.view!=="formats")S.view="formats";render();window.scrollTo(0,0)}
    else if(a==="fmt-edit")formatForm(byId(S.formats,v));
    else if(a==="cmd"){f.cmd=v;f.edit=false;S.view="commands";render()}
    else if(a==="cmd-edit"){f.edit=true;render()}
    else if(a==="cmd-cancel"){f.edit=false;render()}
    else if(a==="cmd-copy"){var c=byId(S.commands,f.cmd)||S.commands[0];try{await navigator.clipboard.writeText(c.body);toast("Đã sao chép lệnh")}catch(_){toast("Trình duyệt chưa cho sao chép")}}
    else if(a==="cmd-save"){var cu=byId(S.commands,f.cmd)||S.commands[0],o={id:cu.id,title:cu.title,body:$("#cmd-body").value};if(await upsert("commands",o)){f.edit=false;toast("Đã lưu trên trang. Bản trong máy không tự đổi.");load()}}
    else if(a==="range"){var r=range(),e0=r.max,p=function(n){return shift(e0,-(n-1))};
      HT.range({anchor:$("#rg"),from:r.from,to:r.to,min:r.min,max:r.max,presets:[["7 ngày",p(7),e0],["28 ngày",p(28),e0],["30 ngày",p(30),e0],["60 ngày",p(60),e0],["90 ngày",p(90),e0],["Cả năm",r.min,e0]],onApply:function(a1,b1){f.from=a1;f.to=b1;render()}})}
  });
  document.addEventListener("input",function(e){if(e.target.id==="vq"){S.f.q=e.target.value;render();var i=$("#vq");i.focus();i.setSelectionRange(i.value.length,i.value.length)}});
  document.addEventListener("change",async function(e){
    var t=e.target;
    if(t.id==="vf"){S.f.fmt=t.value;render()}
    if(t.dataset.ist){var i=byId(S.ins,t.dataset.ist);if(i){var o=Object.assign({},i,{status:t.value});delete o.created_at;delete o.updated_at;if(await upsert("insights",o)){i.status=t.value;toast("Đã cập nhật")}}}
    if(t.id==="seed-file"&&t.files[0])importSeed(t.files[0]);
    if(t.id==="tk-file"&&t.files.length)importTikTok(t.files);
    if(t.id==="fm-up"){
      var fid=t.dataset.fid,fs=[].slice.call(t.files);
      for(var k=0;k<fs.length;k++){var p="format/"+fid+"-"+Date.now()+"-"+k+"."+(fs[k].name.split(".").pop()||"jpg"),u=await sb.storage.from(BUCKET).upload(p,fs[k],{upsert:true,contentType:fs[k].type});if(u.error){fail(u.error);return}if(!await upsert("media",{id:p,path:p,title:fs[k].name,kind:"format",format_id:fid,sort:100+k}))return}
      toast("Đã thêm ảnh");load();
    }
  });
  document.addEventListener("submit",async function(e){
    if(e.target.id!=="ins-add")return;e.preventDefault();
    var o={id:uid("i"),taken_on:today(),kind:$("#in-kind").value,title:$("#in-title").value.trim(),body:$("#in-body").value.trim(),status:"moi",video_id:$("#in-video").value||null};
    if(o.title&&await upsert("insights",o)){toast("Đã lưu highlight");load()}
  });
  document.addEventListener("mousemove",function(e){if(!$("#dchart"))return;var h=e.target.closest&&e.target.closest(".dhit");if(h||innerWidth>700)dShow(h||$(".dhit[data-peak]"))});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeDrawer();if((e.key==="Enter"||e.key===" ")&&e.target.tagName==="TR"&&e.target.dataset.a==="video"){e.preventDefault();videoForm(byId(S.videos,e.target.dataset.v))}});
  window.addEventListener("hashchange",function(){var h=(location.hash||"").slice(1);if(byId2(h)&&h!==S.view)go(h)});
}
function byId2(v){return VIEWS.some(function(x){return x[0]===v})}

/* ---------- đăng nhập ---------- */
function loginScreen(){
  return new Promise(function(resolve){
    var box=document.createElement("div");box.id="login";
    box.innerHTML='<form id="loginform" class="login-card"><div class="ws"><i>H</i>Huy Tim</div><h1>Đăng nhập</h1><p>Trang Content chỉ dành cho chủ hệ thống.</p><label class="f">Email<input id="loginemail" type="email" required autocomplete="username"></label><label class="f">Mật khẩu<input id="loginpw" type="password" required autocomplete="current-password"></label><button class="btn primary" type="submit">Đăng nhập</button><p id="loginmsg" role="status"></p></form>';
    document.body.appendChild(box);
    $("#loginform").addEventListener("submit",async function(e){e.preventDefault();$("#loginmsg").textContent="Đang đăng nhập...";var r=await sb.auth.signInWithPassword({email:$("#loginemail").value.trim(),password:$("#loginpw").value});if(r.error)$("#loginmsg").textContent="Sai email hoặc mật khẩu."});
    sb.auth.onAuthStateChange(function(ev,session){if(session)setTimeout(function(){box.remove();resolve(session)},0)});
  });
}
(async function(){
  var h=(location.hash||"").slice(1);if(byId2(h))S.view=h;
  render();
  var cfg=window.TIMUS_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl){$("#msg").textContent="Chưa tải được thư viện kết nối. Tải lại trang.";return}
  sb=window.supabase.createClient(cfg.supabaseUrl,cfg.anonKey,{auth:{persistSession:true,detectSessionInUrl:true}});
  HT.onSignout=async function(){await sb.auth.signOut();location.reload()};
  var cur=await sb.auth.getSession(),session=cur.data&&cur.data.session;
  if(!session)session=await loginScreen();
  S.email=String(session.user.email||"").toLowerCase();
  var r=await sb.from("core_roles").select("area,role").eq("email",S.email);
  if(r.error||!(r.data||[]).some(function(x){return (x.area==="all"||x.area==="content")&&(x.role==="owner"||x.role==="admin")})){render();$("#msg").innerHTML='<p class="empty">Tài khoản này không có quyền xem trang Content.</p>';return}
  bind();await load();
})();
})();
