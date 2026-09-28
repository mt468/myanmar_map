"use strict";
const TYPES={cap:'Town control',unit:'Military unit',poi:'Border / Port',state:'State / Region',district:'District',township:'Township',vt:'Village Tract',town:'Town',ward:'Ward',village:'Village'};
const PAL=['#1f6f8b','#7a4f1d','#2f6b3f','#5b3f7a','#1d6b66','#6b5a1d','#7a2f3f','#4f5f1f','#2c4f7a','#6b3f5f','#1f5f4f','#7a4a2c','#3f4a7a','#5f2f2f','#2f5f73'];
const N={};           // pcode -> node
const KIDS={};        // pcode -> [child pcodes]
const GEO={state:{},district:{},township:{},vt:{},ward:{}};
const MODE='web';
const GEOLOAD={},GEODONE={};
const $=s=>document.querySelector(s);
const isPt=k=>k==='poi'||k==='unit'||k==='cap'; // data-layer point nodes
const fdate=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?`${+m[3]} ${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[m[2]-1]} ${m[1]}`:(s||'');};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFC').replace(/[\s\-'’‘`().,_\/​‌‍]+/g,'');

async function loadData(name){
  if(MODE==='web'){const r=await fetch('data/'+name+'.json');if(!r.ok)throw new Error('Could not load data/'+name+'.json ('+r.status+')');return r.json();}
  return unpack('d-'+name);
}
async function unpack(id){
  const b64=document.getElementById(id).textContent.trim();
  const bin=atob(b64);const u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const txt=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(txt);
}
function add(k,p,n,m,u,extra){
  const o=Object.assign({k,p,n,m,u},extra||{});N[p]=o;
  (KIDS[u]||(KIDS[u]=[])).push(p);return o;
}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1600)}

async function init(){
  const C=await loadData('core');const ADM=C.adm;
  const und=a=>{let s=0;return a.map(d=>s+=d);};
  N.ROOT={k:'country',p:'ROOT',n:'Myanmar',m:'မြန်မာ',u:null};
  C.st.forEach(([p,n,m,t])=>add('state',p,n,m,'ROOT',{t}));
  C.dt.forEach(([p,n,u,sr])=>add('district',p,n,'',C.st[u][0],{sr}));
  C.ts.forEach(([p,n,m,u])=>add('township',p,n,m,C.dt[u][0]));
  C.tn.forEach(([p,n,m,u,x,y,lv])=>add('town',p,n,m,C.ts[u][0],{x,y,lv}));
  const V=C.vt,vu=und(V.u),ng=new Set(V.ng);
  V.p.forEach((p,i)=>{const n=V.n[i],m=V.m[i],u=C.ts[vu[i]][0],sa=V.sa[i]||'',r=V.r[i]||'',g=ng.has(i)?0:1;
    if(N[p]&&N[p].k==='town'){Object.assign(N[p],{g,r,m:N[p].m||m});return;} add('vt',p,n,m,u,{sa,r,g});});
  const W=C.wd;W.p.forEach((p,i)=>{const u=W.u[i];if(N[u])add('ward',p,W.n[i],W.m[i],u);});
  const Q=C.vl,qp=und(Q.p),qu=und(Q.u),qx=und(Q.x),qy=und(Q.y);
  qp.forEach((pc,i)=>{const u=V.p[qu[i]];if(!N[u])return;add('village',String(pc),Q.n[i],Q.m[i],u,{x:qx[i]/1e5,y:qy[i]/1e5,an:Q.an[i]||'',am:Q.am[i]||'',sub:Q.sub[i]||''});});
  // counts
  const cnt=(p)=>{const o=N[p];if(o.c)return o.c;const c={district:0,township:0,vt:0,village:0,town:0,ward:0};
    (KIDS[p]||[]).forEach(q=>{const ch=N[q];c[ch.k]=(c[ch.k]||0)+1;const cc=cnt(q);for(const k in cc)c[k]+=cc[k];});return o.c=c;};
  cnt('ROOT');
  for(const [obj,k] of [['st','state'],['dt','district'],['ts','township']]){
    topojson.feature(ADM,ADM.objects[obj]).features.forEach(f=>GEO[k][f.properties.p]=f);
  }
  initStatesLayer();
  try{initLayer(await loadData('layer_border'));}catch(e){console.warn('layer',e);}
  try{initUnits(await loadData('layer_units'));}catch(e){console.warn('units layer not included',e);}
  try{initCaps(await loadData('layer_towns'));}catch(e){console.warn('town control layer not included',e);}
  buildSearch();
  initMap();
  drawPois();drawUnits();drawCaps();
  $('#loading').style.display='none';
  const h=decodeURIComponent(location.hash.slice(1));
  const hc=h.startsWith('@')&&parseCoord(h.slice(1));
  if(hc)showCoord(hc.lat,hc.lon);else show(N[h]?h:'ROOT');
}
function stateOf(p){let o=N[p];while(o&&o.k!=='state')o=N[o.u];return o&&o.p;}
function ensureState(s){
  if(!s)return Promise.resolve();
  return GEOLOAD[s]||(GEOLOAD[s]=loadData('st_'+s).then(d=>{
    if(d.vt)topojson.feature(d.vt,d.vt.objects.vt).features.forEach(f=>GEO.vt[f.properties.p]=f);
    if(d.wd)topojson.feature(d.wd,d.wd.objects.wd).features.forEach(f=>GEO.ward[f.properties.p]=f);
    GEODONE[s]=true;}).catch(e=>{delete GEOLOAD[s];toast('Could not load boundaries: '+e.message);throw e;}));
}
function statesAt(lat,lon,m=.05){return Object.keys(GEO.state).filter(s=>{const b=fbb(GEO.state[s]);return lon>=b[0]-m&&lon<=b[2]+m&&lat>=b[1]-m&&lat<=b[3]+m;});}
