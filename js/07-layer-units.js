/* ---------------- data layers: military units ---------------- */
let UL=null,UNITS=[],SELUNIT=null,unitLayer=null,UHQ='',UST='';const UHIDE={ct:new Set(),sz:new Set(),acc:new Set(),src:new Set(),ty:new Set()};
const SZC={'Seized':'#ff4d4f','Still SAC':'#e2e8f0','Not recorded':'#64748b'};
const UCOL={ct:{'Regional Command':'#fb923c','LID':'#38bdf8','MOC':'#c084fc'},sz:SZC,acc:{'Exact':'#22c55e','Township-level':'#facc15'},src:{'mimu':'#2dd4bf','RD':'#fb923c'}};
const ULAB={ct:{'Regional Command':'Regional Military Command','LID':'Light Infantry Division (LID)','MOC':'Military Operations Command (MOC)'},acc:{'Exact':'Exact location','Township-level':'Township-level (approximate)'},src:{'mimu':'mimu','RD':'RD'}};
const unitType=o=>/^LIB/i.test(o.n)?'LIB':/^IB/i.test(o.n)?'IB':'Other';
const USHAPE={IB:'triangle',LIB:'triangle',Other:'triangle'};
const UNITRED='#e11d1d';
const unitSort=(a,b)=>{const na=N[a].n,nb=N[b].n,ta=unitType(N[a]),tb=unitType(N[b]);if(ta!==tb)return ta<tb?-1:1;return (parseInt(na.replace(/\D+/g,''))||0)-(parseInt(nb.replace(/\D+/g,''))||0);};
function initUnits(Ld){
  UL=Ld;UL.on=true;try{if(localStorage.getItem('mae_layer_units')==='off')UL.on=false;}catch(e){}
  UL.pts.forEach(pt=>{if(!N[pt.u])return;N[pt.id]={k:'unit',p:pt.id,n:pt.n,m:'',u:pt.u,x:pt.x,y:pt.y,d:pt,st:stateOf(pt.u)};UNITS.push(pt.id);});
  stateOpts($('#luSt'),UNITS);
  $('#lyUnitsBox').style.display='';$('#lyUnits').checked=UL.on;lyDim('lyUnitsOpts',UL.on);
  $('#lyUnitsName').textContent=`${UL.name} ${UL.year}`;
  const hq={};UNITS.forEach(p=>{const h=N[p].d.hq;hq[h]=(hq[h]||0)+1;});
  const ord=h=>/^LID/i.test(h)?1:/^MOC/i.test(h)?2:0;
  $('#luHq').innerHTML='<option value="">All commands</option>'+Object.keys(hq).sort((a,b)=>ord(a)-ord(b)||(parseInt(a.replace(/\D+/g,''))||0)-(parseInt(b.replace(/\D+/g,''))||0)||a.localeCompare(b)).map(h=>`<option value="${esc(h)}">${esc(h)} (${hq[h]})</option>`).join('');
  $('#luSrc').textContent='Source: '+UL.src;
  renderUnitPanel();
}
function unitKey(o,k){const d=o.d;if(k==='ct')return d.ct;if(k==='sz')return d.sz||'Not recorded';if(k==='acc')return d.acc===1?'Exact':'Township-level';return d.src;}
function unitColor(){return UNITRED;} // all units are drawn red
const UGRP=['ct','sz','acc','src'];
function unitVisible(o){return (!UHQ||o.d.hq===UHQ)&&(!UST||o.st===UST)&&!UHIDE.ty.has(unitType(o))&&UGRP.every(g=>!UHIDE[g].has(unitKey(o,g)));}
function renderUnitPanel(){
  if(!UL)return;
  const base=UNITS.filter(p=>(!UHQ||N[p].d.hq===UHQ)&&(!UST||N[p].st===UST));
  const tri=shapeSvg('triangle',UNITRED,12,'none');
  const TL={IB:'Infantry Battalion (IB)',LIB:'Light Infantry Battalion (LIB)',Other:'Other'};
  const grp=(g,title,fn,order,lab)=>{const [ks,c]=countBy(base,fn,order);return tickGroup(title,g,ks.map(k=>[k,lab&&lab[k]||k,tri,c[k]]),UHIDE[g]);};
  $('#luTicks').innerHTML=grp('ty','Unit type',unitType,['IB','LIB','Other'],TL)
    +grp('ct','Command type',o=>unitKey(o,'ct'),Object.keys(UCOL.ct),ULAB.ct)
    +grp('sz','Seized / Still SAC',o=>unitKey(o,'sz'),Object.keys(SZC))
    +grp('acc','Location accuracy',o=>unitKey(o,'acc'),['Exact','Township-level'],ULAB.acc)
    +grp('src','Location source',o=>unitKey(o,'src'));
  lyCount('lyUnitsN',UNITS.filter(p=>unitVisible(N[p])).length,UNITS.length);
}
// any unit filter change: panel, map and sidebar list
function unitsChanged(){renderUnitPanel();drawUnits();if(!isPt(N[CUR].k))renderSide({keepTab:true});}
function drawUnits(){
  if(!unitLayer||!UL)return;unitLayer.clearLayers();if(!UL.on)return;
  const vis=UNITS.filter(p=>unitVisible(N[p])||p===SELUNIT);
  const grp={};vis.forEach(p=>{const o=N[p];const k=o.y+','+o.x;(grp[k]||(grp[k]=[])).push(p);});
  Object.values(grp).forEach(ps=>{ps.sort(unitSort);const n=ps.length;
    ps.forEach((p,i)=>{const o=N[p];const sel=p===SELUNIT;const s=Math.round((sel?20:14)*ICON*(sel?1.3:1));
      let dx=0,dy=0;if(n>1){const r=(7+n*2.2)*ICON,a=2*Math.PI*i/n-Math.PI/2;dx=Math.round(r*Math.cos(a));dy=Math.round(r*Math.sin(a));}
      const ic=L.divIcon({className:'',html:`<div class="poim unitm ${sel?'sel':''}">${shapeSvg(USHAPE[unitType(o)],UNITRED,s,'none')}<span class="poilbl" style="left:${s+2}px;font-size:10.5px">${esc(o.n)}</span></div>`,iconSize:[s,s],iconAnchor:[s/2-dx,s/2-dy]});
      const m=L.marker([o.y,o.x],{icon:ic,zIndexOffset:sel?2500:500,riseOnHover:true});
      m.bindTooltip(`<b>${esc(o.n)}</b> · ${esc(o.d.hq)}<br>${esc(o.d.loc)}, ${esc(N[o.u]?N[o.u].n:'')}${o.d.acc===1?'':' <i>(township-level)</i>'}${o.d.sz?`<br><b style="color:${SZC[o.d.sz]}">${esc(o.d.sz)}</b>`:''}${n>1?`<br><small>${n} units at this location</small>`:''}`,{className:'tip',direction:'top',offset:[dx,-8+dy]});
      m.on('click',e=>{L.DomEvent.stop(e);show(p);});unitLayer.addLayer(m);});});
}
function renderUnitSide(o){
  const d=o.d;const anc=ancestors(o.u);
  $('#crumbs').innerHTML=anc.map(a=>`<a data-p="${a.p}">${esc(a.n)}</a>`).join(' › ')+' › <b>'+esc(o.n)+'</b>';
  const TL={IB:'Infantry Battalion',LIB:'Light Infantry Battalion',Other:'Unit'};
  let h=`<div class="type">${TL[unitType(o)]} · ${esc(UL.name)}</div><h2>${esc(o.n)}</h2>
  <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="stbadge" style="background:${UCOL.ct[d.ct]}">${esc(d.hq)}</span>${d.sz?`<span class="stbadge" style="background:${SZC[d.sz]}">${esc(d.sz)}</span>`:''}<span class="stbadge" style="background:${d.acc===1?'#2e7d32':'#f9a825'}">${d.acc===1?'Exact location':'Township-level location'}</span></div>
  <div class="kv"><div>Command HQ</div><div><a data-hq="${esc(d.hq)}" style="color:var(--accent);cursor:pointer" title="Show only this command on the map">${esc(d.hq)}</a> <span style="color:var(--muted)">(${esc((ULAB.ct[d.ct]||d.ct))})</span></div>
  <div>Location</div><div>${esc(d.loc)}</div>
  <div>Sheet township</div><div>${esc(d.tsx)}, ${esc(d.stx)} <span style="color:var(--muted);font-size:11.5px">${esc(d.tsp)}</span></div>`;
  anc.slice(1).forEach(a=>h+=`<div>${TYPES[a.k]}</div><div><a data-p="${a.p}" style="color:var(--accent);cursor:pointer">${esc(a.n)}</a>${a.m?` <span class="mm" style="color:var(--muted)">${esc(a.m)}</span>`:''} <span class="pc" data-copy="${a.p}" style="font-size:11px">${a.p}</span></div>`);
  if(d.vt&&N[d.vt])h+=`<div>Village Tract</div><div><a data-p="${d.vt}" style="color:var(--accent);cursor:pointer">${esc(N[d.vt].n)}</a> <span class="pc" data-copy="${d.vt}" style="font-size:11px">${d.vt}</span></div>`;
  if(d.nv&&N[d.nv[0]])h+=`<div>Nearest village</div><div><a data-p="${d.nv[0]}" style="color:var(--accent);cursor:pointer">${esc(N[d.nv[0]].n)}</a> — ${d.nv[1]} km</div>`;
  h+=`<div>Coordinates</div><div><span class="pc" data-copy="${o.y.toFixed(6)}, ${o.x.toFixed(6)}">${o.y.toFixed(5)}, ${o.x.toFixed(5)}</span></div>
  <div>Location source</div><div>${esc(d.src)}</div></div>`;
  if(d.acc!==1)h+=`<div class="note">Township-level location (accuracy 0 in the sheet) — the point marks the township/town, not the actual base.</div>`;
  if(d.tsp!==o.u){
    if(d.pcw)h+=`<div class="note">Sheet P-code <b>${esc(d.tsp)}</b> doesn't match the township name; the coordinates agree with the name (<b>${esc(N[o.u].n)}</b> ${o.u}).</div>`;
    else if(d.qd==null)h+=`<div class="note">Sheet P-code <b>${esc(d.tsp)}</b> is not a township P-code.</div>`;
    else if(d.qd>=2)h+=`<div class="note">Sheet says township <b>${esc(d.tsx)}</b>, but the coordinates fall in <b>${esc(N[o.u].n)}</b>, ${d.qd} km from ${esc(d.tsx)}. Check the coordinates or township.</div>`;
    else h+=`<div class="note" style="color:var(--muted);background:var(--soft)">Point is on the edge of ${esc(d.tsx)} (${d.qd} km) — shown under ${esc(N[o.u].n)} by boundary.</div>`;
  }
  h+=`<div class="actions"><button class="btn" data-up="1">↑ Township</button><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${o.y},${o.x}">Google Maps ↗</a></div>`;
  $('#card').innerHTML=h;
  const groups=childGroups(CUR);TAB=groups.length?groups[0][0]:null;
  $('#tabs').innerHTML=groups.length>1?groups.map(g=>`<span class="chip ${g[0]===TAB?'on':''}" data-tab="${g[0]}">${esc(g[1])} (${g[2].length})</span>`).join(''):'';
  renderList();
}
$('#card').addEventListener('click',e=>{const h=e.target.closest('[data-hq]');if(h){setHq(h.dataset.hq);toast('Showing '+h.dataset.hq+' only');}});
function setHq(h){UHQ=h;$('#luHq').value=h;if(!UL.on){UL.on=true;$('#lyUnits').checked=true;lyDim('lyUnitsOpts',true);}renderUnitPanel();drawUnits();
  if(h){show('ROOT',{keepView:true});TAB='unit';renderSide({keepTab:true});const pts=UNITS.filter(p=>N[p].d.hq===h).map(p=>[N[p].y,N[p].x]);if(pts.length)map.fitBounds(L.latLngBounds(pts).pad(.25),{maxZoom:11});}else if(N[CUR].k!=='unit')renderSide({keepTab:true});}
function exportUnits(list){
  const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const cols=['Unit','Type','Command_HQ','Command_type','Location','Sheet_Township','Sheet_TS_PCode','Sheet_State','Latitude','Longitude','Accuracy','Location_source','Seized_status','State_Region','ST_PCode','District','DT_PCode','Township','TS_PCode','Village_Tract','VT_PCode','Nearest_Village','Village_PCode','Village_km','Township_check'];
  const rows=list.map(p=>{const o=N[p],d=o.d,an={};ancestors(o.u).forEach(a=>an[a.k]=a);const vt=d.vt&&N[d.vt];const nv=d.nv&&N[d.nv[0]];
    const chk=d.tsp===o.u?'OK':d.pcw?'Sheet P-code wrong':d.qd==null?'Invalid sheet P-code':d.qd<2?'Edge':'Coordinates in '+(N[o.u]?N[o.u].n:'')+' ('+d.qd+' km)';
    return [o.n,unitType(o),d.hq,d.ct,d.loc,d.tsx,d.tsp,d.stx,o.y,o.x,d.acc===1?'Exact':'Township-level',d.src,d.sz,an.state&&an.state.n,an.state&&an.state.p,an.district&&an.district.n,an.district&&an.district.p,an.township&&an.township.n,an.township&&an.township.p,vt?vt.n:'',vt?d.vt:'',nv?nv.n:'',nv?d.nv[0]:'',nv?d.nv[1]:'',chk].map(q).join(',');});
  const blob=new Blob(['﻿'+cols.join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='military_units'+(UHQ?'_'+UHQ.replace(/\W+/g,'_'):'')+'.csv';a.click();toast(`Exported ${list.length} units`);
}
$('#lyUnits').onchange=e=>{UL.on=e.target.checked;try{localStorage.setItem('mae_layer_units',UL.on?'on':'off');}catch(_){}
  lyDim('lyUnitsOpts',UL.on);drawUnits();if(!isPt(N[CUR].k))renderSide({keepTab:true});};
$('#luHq').onchange=e=>setHq(e.target.value);
$('#luSt').onchange=e=>{UST=e.target.value;unitsChanged();fitState(UST);};
bindTicks($('#luTicks'),g=>UHIDE[g],unitsChanged);
$('#luList').onclick=()=>{$('#layPop').style.display='none';if(!UL.on){UL.on=true;$('#lyUnits').checked=true;lyDim('lyUnitsOpts',true);drawUnits();}show('ROOT');TAB='unit';renderSide({keepTab:true});};
$('#luCsv').onclick=()=>exportUnits(UNITS.filter(p=>unitVisible(N[p])));
