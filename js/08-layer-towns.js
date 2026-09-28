/* ---------------- data layers: town control / capture ---------------- */
let TCL=null,CAPS=[],SELCAP=null,capLayer=null,TCOLOR='s',TST='';const THIDE={s:new Set(),a:new Set(),ty:new Set()};
const TSC={Seized:'#f5a524',Retaken:'#a855f7'};
const TSL={Seized:'Seized',Retaken:'Retaken'};
const capSort=(a,b)=>N[a].n.localeCompare(N[b].n);
function initCaps(Ld){
  TCL=Ld;TCL.on=true;try{if(localStorage.getItem('mae_layer_towns')==='off')TCL.on=false;}catch(e){}
  TCL.pts.forEach(pt=>{
    // township from the coordinates (boundary first, nearest village as fallback)
    let u=null;for(const p in GEO.township){if(inFeat(GEO.township[p],pt.x,pt.y)){u=p;break;}}
    const nv=nearestVillages(pt.y,pt.x,1)[0];
    if(!u&&nv&&nv[0]<25){const vt=N[nv[1].u];u=vt&&N[vt.u]&&N[vt.u].k==='township'?vt.u:null;}
    if(!u)return;
    pt.nv=nv?[nv[1].p,+nv[0].toFixed(2)]:null;
    N[pt.id]={k:'cap',p:pt.id,n:pt.n,m:'',u,x:pt.x,y:pt.y,d:pt,st:stateOf(u)};CAPS.push(pt.id);});
  const ac={};CAPS.forEach(p=>{const a=N[p].d.a;ac[a]=(ac[a]||0)+1;});
  TCL.aColor={};let i=0;Object.keys(ac).sort((a,b)=>ac[b]-ac[a]).forEach(a=>{TCL.aColor[a]=a==='TMD'?'#ff4d4f':CTLPAL.filter(c=>c!=='#c0392b')[i++%15];});
  $('#lyTownsBox').style.display='';$('#lyTowns').checked=TCL.on;lyDim('lyTownsOpts',TCL.on);
  $('#lyTownsName').textContent=TCL.name;
  stateOpts($('#ltSt'),CAPS);
  $('#ltSrc').textContent='Source: '+TCL.src;
  renderCapPanel();
}
function capColor(o){return TCOLOR==='s'?TSC[o.d.s]||'#9aa0a6':TCL.aColor[o.d.a]||'#777';}
function capVisible(o){return (!TST||o.st===TST)&&!THIDE.s.has(o.d.s)&&!THIDE.a.has(o.d.a)&&!THIDE.ty.has(o.d.ty);}
function renderCapPanel(){
  if(!TCL)return;
  const base=CAPS.filter(p=>!TST||N[p].st===TST);
  // swatches show the marker: coloured for the 'Colour by' attribute, grey otherwise
  const col=(g,k)=>g!==TCOLOR?'#607d8b':g==='s'?TSC[k]||'#9aa0a6':TCL.aColor[k]||'#777';
  const grp=(g,title,fn,order)=>{const [ks,c]=countBy(base,fn,order);return tickGroup(title,g,ks.map(k=>[k,k,shapeSvg('square',col(g,k),12),c[k]]),THIDE[g]);};
  $('#ltTicks').innerHTML=grp('s','Status',o=>o.d.s,['Seized','Retaken'])+grp('a','Controlled by',o=>o.d.a)+grp('ty','Type',o=>o.d.ty,['Town','Sub-Town']);
  lyCount('lyTownsN',CAPS.filter(p=>capVisible(N[p])).length,CAPS.length);
}
// any town-control filter change: panel, map and sidebar list
function capsChanged(){renderCapPanel();drawCaps();renderSide({keepTab:true});}
function drawCaps(){
  if(!capLayer||!TCL)return;capLayer.clearLayers();if(!TCL.on)return;
  CAPS.forEach(p=>{const o=N[p];if(!capVisible(o)&&p!==SELCAP)return;
    const sel=p===SELCAP;const s=Math.round((sel?20:16)*ICON*(sel?1.3:1));
    const ic=L.divIcon({className:'',html:`<div class="poim ${sel?'sel':''}">${shapeSvg('square',capColor(o),s)}<span class="poilbl" style="left:${s+2}px">${esc(o.n)}</span></div>`,iconSize:[s,s],iconAnchor:[s/2,s/2]});
    const m=L.marker([o.y,o.x],{icon:ic,zIndexOffset:sel?2200:700,riseOnHover:true});
    m.bindTooltip(`<b>${esc(o.n)}</b> · ${esc(o.d.ty)}<br><b style="color:${TSC[o.d.s]||'#9aa0a6'}">${esc(o.d.s)}</b> by ${esc(o.d.a)} — ${esc(fdate(o.d.dt))}${o.d.al?`<br><small>with ${esc(o.d.al)}</small>`:''}<br><small>${esc(N[o.u].n)} Township</small>`,{className:'tip',direction:'top',offset:[0,-8]});
    m.on('click',e=>{L.DomEvent.stop(e);show(p);});capLayer.addLayer(m);});
}
function capEvents(d){return d.h.concat([{dt:d.dt,a:d.a,al:d.al,s:d.s,rm:d.rm,src:d.src}]);}
const srcLink=s=>/^https?:\/\//i.test(s)?`<a href="${esc(s)}" target="_blank" rel="noopener" style="color:var(--accent)">source ↗</a>`:esc(s);
function renderCapSide(o){
  const d=o.d;const anc=ancestors(o.u);
  $('#crumbs').innerHTML=anc.map(a=>`<a data-p="${a.p}">${esc(a.n)}</a>`).join(' › ')+' › <b>'+esc(o.n)+'</b>';
  let h=`<div class="type">${esc(d.ty)} · ${esc(TCL.name)}</div><h2>${esc(o.n)}</h2>
  <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="stbadge" style="background:${TSC[d.s]||'#9aa0a6'}">${esc(d.s)}</span><span class="stbadge" style="background:${TCL.aColor[d.a]||'#777'}">${esc(d.a)}</span></div>
  <div class="kv"><div>Controlled by</div><div><b>${esc(d.a)}</b>${d.al?` <span style="color:var(--muted)">with ${esc(d.al)}</span>`:''}</div>
  <div>${esc(d.s)} on</div><div>${esc(fdate(d.dt))}</div>
  <div>Sheet township</div><div>${esc(d.tsx)}, ${esc(d.stx)}</div>`;
  anc.slice(1).forEach(a=>h+=`<div>${TYPES[a.k]}</div><div><a data-p="${a.p}" style="color:var(--accent);cursor:pointer">${esc(a.n)}</a>${a.m?` <span class="mm" style="color:var(--muted)">${esc(a.m)}</span>`:''} <span class="pc" data-copy="${a.p}" style="font-size:11px">${a.p}</span></div>`);
  if(d.nv&&N[d.nv[0]])h+=`<div>Nearest village</div><div><a data-p="${d.nv[0]}" style="color:var(--accent);cursor:pointer">${esc(N[d.nv[0]].n)}</a> — ${d.nv[1]} km</div>`;
  h+=`<div>Coordinates</div><div><span class="pc" data-copy="${o.y.toFixed(6)}, ${o.x.toFixed(6)}">${o.y.toFixed(5)}, ${o.x.toFixed(5)}</span></div>`;
  if(d.rm)h+=`<div>Remarks</div><div>${esc(d.rm)}</div>`;
  if(d.src)h+=`<div>Source</div><div>${srcLink(d.src)}</div>`;
  h+='</div>';
  if(!d.acc)h+=`<div class="note">Location not marked as precise in the sheet.</div>`;
  if(norm(N[o.u].n)!==norm(d.tsx.replace(/\(.*\)|sub-?township/gi,'')))h+=`<div class="note" style="color:var(--muted);background:var(--soft)">Sheet says township <b>${esc(d.tsx)}</b>; by MIMU boundary this point is in <b>${esc(N[o.u].n)}</b>.</div>`;
  const ev=capEvents(d);
  h+=`<div class="hist"><div style="font-weight:600;border:0">Control history</div>`+ev.map(e=>`<div><span style="width:84px;color:var(--muted)">${esc(fdate(e.dt))}</span><span class="stbadge" style="background:${TSC[e.s]||'#9aa0a6'};font-size:11px;padding:1px 8px">${esc(e.s)}</span><span>${esc(e.a)}${e.al?` <span style="color:var(--muted)">+ ${esc(e.al)}</span>`:''}</span>${e.src?srcLink(e.src):''}</div>`).join('')+'</div>';
  h+=`<div class="actions"><button class="btn" data-up="1">↑ Township</button><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${o.y},${o.x}">Google Maps ↗</a></div>`;
  $('#card').innerHTML=h;
  const groups=childGroups(CUR);TAB=groups.length?groups[0][0]:null;
  $('#tabs').innerHTML='';renderList();
}
function exportCaps(list){
  const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const cols=['Name','Type','Status','Date','Controlled_by','Allies','Previous_events','Sheet_Township','Sheet_State','Latitude','Longitude','Precise','State_Region','ST_PCode','District','DT_PCode','Township','TS_PCode','Nearest_Village','Village_PCode','Village_km','Remarks','Source'];
  const rows=list.map(p=>{const o=N[p],d=o.d,an={};ancestors(o.u).forEach(a=>an[a.k]=a);const nv=d.nv&&N[d.nv[0]];
    return [o.n,d.ty,d.s,d.dt,d.a,d.al,d.h.map(e=>`${e.dt} ${e.s} by ${e.a}${e.al?' + '+e.al:''}`).join('; '),d.tsx,d.stx,o.y,o.x,d.acc?'Yes':'No',an.state&&an.state.n,an.state&&an.state.p,an.district&&an.district.n,an.district&&an.district.p,an.township&&an.township.n,an.township&&an.township.p,nv?nv.n:'',nv?d.nv[0]:'',nv?d.nv[1]:'',d.rm,d.src].map(q).join(',');});
  const blob=new Blob(['﻿'+cols.join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='town_control_capture'+(TST?'_'+N[TST].n.replace(/\W+/g,'_'):'')+'.csv';a.click();toast(`Exported ${list.length} towns`);
}
$('#lyTowns').onchange=e=>{TCL.on=e.target.checked;try{localStorage.setItem('mae_layer_towns',TCL.on?'on':'off');}catch(_){}
  lyDim('lyTownsOpts',TCL.on);drawCaps();if(!isPt(N[CUR].k))renderSide({keepTab:true});};
$('#ltColor').onchange=e=>{TCOLOR=e.target.value;capsChanged();};
$('#ltSt').onchange=e=>{TST=e.target.value;capsChanged();fitState(TST);};
bindTicks($('#ltTicks'),g=>THIDE[g],capsChanged);
$('#ltList').onclick=()=>{$('#layPop').style.display='none';if(!TCL.on){TCL.on=true;$('#lyTowns').checked=true;lyDim('lyTownsOpts',true);drawCaps();}show('ROOT');TAB='cap';renderSide({keepTab:true});};
$('#ltCsv').onclick=()=>exportCaps(CAPS.filter(p=>capVisible(N[p])));
