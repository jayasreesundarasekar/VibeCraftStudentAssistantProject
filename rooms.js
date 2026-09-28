(function(){

const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const ST=[540,590,650,700,750,800,850,910,960],EN=[590,640,700,750,800,850,900,960,1010];
const FL={1:"Ground floor",2:"1st floor",3:"2nd floor",4:"3rd floor",5:"4th floor",6:"5th floor"};
const AC=new Set(["IST 107","IST 108","IST 309","TB 106","625","IST 416","IST 518"]);
const occ={};
function P(s){const o=[];s.split(",").forEach(x=>{const[a,b]=x.split("-").map(Number);for(let i=a;i<=(b||a);i++)o.push(i)});return o}
function add(r,days,per){occ[r]=occ[r]||DAYS.map(()=>new Set());P(days).forEach(d=>P(per).forEach(p=>occ[r][d].add(p)))}
// home rooms
add("IST 519","0-4","1-4");add("IST 225","1,3","1-4");add("IST 225","0,2","1,3-4");add("IST 225","4","1-4");
add("IST 411","0-4","6-9");add("IST 416","0-4","1-4");add("IST 211","0-4","6-9");add("IST 518","0-4","1-4,6-9");
add("IST 227","0-2","1-4");add("IST 227","3","1,2,4");add("IST 227","4","1-3");
add("IST 602","0,1,3","1-4");add("IST 602","2","1-3,7");add("IST 602","4","1-4,8-9");add("IST 602","0","6-7");add("IST 602","1","6");
// shared halls / labs
add("625","2","8-9");add("625","4","6");add("625","1","1-2,7,3");add("625","2","1");add("625","0","1-2,6-7");
add("401","2","1");add("401","3","1-2");
add("TB 106","3","3-4");add("TB 106","4","1");add("TB 106","1","6-9");add("TB 106","2","6-7");
add("IST 107","0","3-4,6-9");add("IST 107","1","1-2,6-7");add("IST 107","3","6-9");add("IST 107","4","8-9");
add("IST 108","1","1-2,6-7");add("IST 108","4","8-9,6-7,1");add("IST 108","2","2,8-9");add("IST 108","3","1-4");add("IST 108","0","1-2");
add("IST 309","0","1-4,6-9");add("IST 309","1","1-2");add("IST 309","3","1-2,6-9");add("IST 309","2","8-9");add("IST 309","4","6-7");
const rooms=Object.keys(occ).sort();
const fl=r=>+(r.match(/\d/)||[1])[0];
const hm=m=>String(m/60|0).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const tm=s=>{const[h,m]=s.split(":").map(Number);return h*60+m};
// status at (day, minute): returns {free, until(min) , busyUntil}
function status(r,d,t){
  const busy=p=>occ[r][d].has(p);
  let cur=ST.findIndex((s,i)=>t>=s&&t<EN[i]);
  if(t<ST[0])cur=-1;
  if(t>=EN[8])return{free:false,over:true};
  if(cur>=0&&busy(cur+1)){let i=cur;while(i<9&&busy(i+1))i++;return{free:false,until:ST[i]<EN[i-1]?EN[i-1]:EN[i-1]}}
  let i=cur<0?(t<ST[0]?0:cur):cur+1; // next period index to test (0-based)
  if(cur<0)i=0;
  while(i<9&&!busy(i+1))i++;
  return{free:true,until:i>=9?EN[8]:ST[i]};
}
function nowState(){const n=new Date();let d=(n.getDay()+6)%7,t=n.getHours()*60+n.getMinutes();if(d>4||t>=EN[8]){d=d>4||d==4?0:d+1;t=ST[0]}if(t<ST[0])t=ST[0];return{d,t}}
const $=id=>document.getElementById(id);
DAYS.forEach((x,i)=>$("fr_day").add(new Option(x,i)));
function setNow(){const s=nowState();$("fr_day").value=s.d;$("fr_time").value=hm(s.t);const n=new Date();OFF=s.t==n.getHours()*60+n.getMinutes()?n.getSeconds():0;HL=new Set;render()}
function render(){
  T0=Date.now();
  const d=+$("fr_day").value,t=tm($("fr_time").value),ac=$("fr_acOnly").checked,by={};
  rooms.forEach(r=>{if(ac&&!AC.has(r))return;(by[fl(r)]=by[fl(r)]||[]).push(r)});
  let h="";
  Object.keys(by).sort().forEach(f=>{
    h+=`<h2>${FL[f]||"Floor "+f}</h2><div class="grid">`;
    by[f].forEach(r=>{const s=status(r,d,t);
      h+=`<div class="room ${s.free?"f":"bz"}" data-r="${r}"><b>${r}${AC.has(r)?'<i class="tag">AC</i>':""}</b><span>${s.free?"Free until "+hm(s.until)+" ("+(s.until-t)+" min)":s.over?"Day over":"In use until "+hm(s.until)}</span></div>`});
    h+="</div>"});
  $("fr_grid").innerHTML=h||'<p class="note">No rooms match.</p>';drawMap(d,t,ac);det(d,t)}
["fr_day","fr_time","fr_acOnly"].forEach(i=>$(i).addEventListener("input",()=>{OFF=0;HL=new Set;render()}));$("fr_now").onclick=setNow;

// ---- AI room finder ----
function localParse(s){
  s=s.toLowerCase();const f={};
  if(/\bnon[- ]?ac\b/.test(s))f.ac=false;else if(/\b(ac|a\/c|air.?condition)/.test(s))f.ac=true;
  if(/ground/.test(s))f.floor=1;else{const m=s.match(/(\d)(st|nd|rd|th)\s*floor/);if(m)f.floor=+m[1]+1;else{const m2=s.match(/floor\s*(\d)/);if(m2)f.floor=+m2[1]}}
  let m=s.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);if(m)f.minutes=Math.round(+m[1]*60);
  m=s.match(/(\d+)\s*(minutes?|mins?)/);if(m)f.minutes=+m[1];
  if(/half an hour/.test(s))f.minutes=30;
  DAYS.forEach((x,i)=>{if(s.includes(x.toLowerCase().slice(0,3)))f.day=i});
  m=s.match(/(?:at|from)\s*(\d{1,2})(?::(\d\d))?\s*(am|pm)?/);
  if(m){let h=+m[1];if(m[3]=="pm"&&h<12)h+=12;if(!m[3]&&h<8)h+=12;f.time=hm(h*60+(+m[2]||0))}
  return f}
async function parse(s){
  try{const sm=await claude.use("sample");if(sm){
    const r=await sm.json(`Extract room-search filters from this student request. Reply ONLY with JSON: {"ac":true|false|null,"floor":number|null (ground floor=1, 1st floor=2, 2nd=3, ...),"minutes":number|null (duration needed),"day":0-4|null (Mon=0),"time":"HH:MM"|null (24h start time, null = now)}.\nRequest: ${s}`,{modelTier:"quick"});
    const f={};["ac","floor","minutes","day","time"].forEach(k=>{if(r&&r[k]!=null)f[k]=r[k]});return{f,ai:true}}}catch(e){}
  return{f:localParse(s),ai:false}}
async function find(){
  const s=$("fr_q").value.trim();if(!s)return;$("fr_ai").innerHTML='<span class="note">Thinking…</span>';
  const{f,ai}=await parse(s),n=nowState();
  const d=f.day!=null?f.day:$("fr_day").value*1===n.d?n.d:n.d,t=f.time?tm(f.time):(f.day!=null?ST[0]:n.t),need=f.minutes||0;
  OFF=0;$("fr_day").value=d;$("fr_time").value=hm(t);render();
  const res=rooms.filter(r=>{if(f.ac===true&&!AC.has(r))return false;if(f.ac===false&&AC.has(r))return false;if(f.floor&&fl(r)!=f.floor)return false;
    const x=status(r,d,t);return x.free&&x.until-t>=need}).map(r=>({r,u:status(r,d,t).until}));
  const desc=[f.ac===true?"AC":f.ac===false?"non-AC":"",f.floor?(FL[f.floor]||"floor "+f.floor):"",need?need+" min":"",DAYS[d]+" "+hm(t)].filter(Boolean).join(" · ");
  HL=new Set(res.map(x=>x.r));render();
  let h=`<div class="note">${ai?"AI understood":"Understood"}: ${desc}</div>`;
  h+=res.length?res.map(x=>`<div class="hit" data-r="${x.r}"><b>${x.r}${AC.has(x.r)?" · AC":""} <span class="note">${FL[fl(x.r)]}</span></b><span>free until ${hm(x.u)}</span></div>`).join(""):'<div class="hit" style="background:#f8f9ff">No room matches. Try a shorter duration or another floor.</div>';
  $("fr_ai").innerHTML=h}
$("fr_go").onclick=find;$("fr_q").addEventListener("keydown",e=>{if(e.key=="Enter")find()});
document.querySelectorAll("#rooms .chip").forEach(c=>c.onclick=()=>{$("fr_q").value=c.dataset.q;find()});
// ---- 3D map, countdown, squad ----
let OFF=0,T0=Date.now(),sel=null,HL=new Set,DS=null;const claimed=new Set();
const FS={1:"G",2:"1",3:"2",4:"3",5:"4",6:"5"};
const pr=(x,y,z)=>[(x-y)*.866,(x+y)*.5-z],pt=a=>a.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
function box(x,y,z,w,d,h,c){const A=pr(x,y,z+h),B=pr(x+w,y,z+h),C=pr(x+w,y+d,z+h),D=pr(x,y+d,z+h),E=pr(x,y+d,z),F=pr(x+w,y+d,z),G=pr(x+w,y,z);
  return`<polygon class="${c}" points="${pt([A,B,C,D])}"/><polygon class="${c} l" points="${pt([D,C,F,E])}"/><polygon class="${c} r" points="${pt([B,C,F,G])}"/>`}
function drawMap(d,t,ac){
  const fs=[...new Set(rooms.map(fl))].sort().reverse();let s="";
  fs.forEach(f=>{const z=(f-1)*78;
    s+=`<rect class="band" x="-45" y="${-(z+28)}" width="250" height="72" rx="8"/><text class="fl" x="-50" y="${20-z}">${FS[f]}</text>`;
    rooms.filter(r=>fl(r)==f).forEach((r,i)=>{const x=i*44,y=-i*44,st=status(r,d,t),c=pr(x+20,y+20,z+26);
      s+=`<g data-r="${r}" class="rmg${r==sel?" sel":""}${claimed.has(r)?" cl":""}${HL.has(r)?" hl":""}" style="opacity:${ac&&!AC.has(r)?.25:1}">${box(x,y,z,40,40,26,st.free?"fr":"bz")}<text x="${c[0].toFixed(1)}" y="${(c[1]+3).toFixed(1)}">${r.replace("IST ","")}</text></g>`})});
  const m=$("fr_map");m.setAttribute("viewBox","-85 -425 290 480");m.innerHTML=s}
const vs=()=>tm($("fr_time").value)*60+OFF+(Date.now()-T0)/1000;
const t12=m=>{const h=m/60|0;return(h%12||12)+":"+String(m%60).padStart(2,"0")+" "+(h<12?"AM":"PM")};
function det(d,t){
  const el=$("fr_det");if(!sel){el.innerHTML='<p class="note">Tap a room to see its countdown.</p>';DS=null;return}
  const s=status(sel,d,t);DS=s;
  let h=`<b>${sel}</b> · ${FL[fl(sel)]}${AC.has(sel)?" · AC":""}<div class="note" id="fr_lab"></div><div class="big" id="fr_cd"></div>`;
  if(s.free){const c=claimed.has(sel);h+=`<div class="row"><button id="fr_claim" class="${c?"g":"b"}">${c?"Release room":"Claim this room"}</button>`;
    if(c)h+=`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("📍 Heading to "+sel+". It's free until "+t12(s.until)+". Come fast!")}">📲 Call the Squad</a>`;h+="</div>"}
  el.innerHTML=h;paintCd()}
function paintCd(){
  if(!DS||!$("fr_cd"))return;if(DS.over){$("fr_lab").textContent="Timetable day is over";$("fr_cd").textContent="--:--:--";return}
  const r=Math.max(0,Math.round(DS.until*60-vs())),p=n=>String(n).padStart(2,"0");
  $("fr_lab").textContent=DS.free?(DS.until>=EN[8]?"Free for the rest of the day — ends in":"Free · next class starts in"):"In use · class ends in";
  $("fr_cd").textContent=p(r/3600|0)+":"+p(r/60%60|0)+":"+p(r%60)}
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-r]");
  if(g){sel=g.dataset.r;render();if(!g.closest("svg"))$("fr_mapc").scrollIntoView({behavior:"smooth"});return}
  if(e.target.id=="fr_claim"){claimed.has(sel)?claimed.delete(sel):claimed.add(sel);render()}});
setInterval(()=>{const v=vs(),m=Math.floor(v/60);
  if($("fr_time").value&&m!=tm($("fr_time").value)&&v<EN[8]*60){OFF=v-m*60;$("fr_time").value=hm(m);render()}else paintCd()},1000);
setNow();

window.FRFind=q=>{$("fr_q").value=q;find()};
})();