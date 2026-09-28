/* ---------------- data layers: border trade ---------------- */
let LAST=0,LAYER=null,POIS=[],SELPOI=null,poiLayer=null,LWEEK=0,LCOLOR='status',LST='';const LHIDE={status:new Set(),ctl:new Set(),cat:new Set()};
const STC={Open:'#22c55e',Restricted:'#f5a524',Closed:'#ff4d4f','No update':'#64748b'};
const STL={Open:'Open',Restricted:'Open with restrictions',Closed:'Closed','No update':'No update'};
const CTLPAL=['#34495e','#8e44ad','#16a085','#d35400','#2980b9','#c0392b','#27ae60','#7f8c8d','#b8860b','#e84393','#00897b','#5d4037','#3949ab','#6d4c41','#9e9d24','#546e7a'];
const ICON=0.5; // marker size factor (1 = original size)
function shapeSvg(sh,c,s=18,stroke='#05090d'){
  const V=18,h=9;let g;
  if(sh==='diamond')g=`<path d="M${h} 1 L${V-1} ${h} L${h} ${V-1} L1 ${h}Z"/>`;
  else if(sh==='square')g=`<rect x="2.5" y="2.5" width="13" height="13" rx="2"/>`;
  else if(sh==='squaredot')g=`<rect x="2.5" y="2.5" width="13" height="13" rx="2"/><circle cx="9" cy="9" r="2.6" fill="#fff" stroke="none"/>`;
  else if(sh==='triangle')g=`<path d="M9 1.5 L16.5 16 L1.5 16Z"/>`;
  else g=`<circle cx="9" cy="9" r="7"/>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${V} ${V}" fill="${c}" stroke="${stroke}" stroke-width="${s<12?2.6:2}">${g}</svg>`;
}
function initLayer(Ld){
  LAYER=Ld;LAYER.on=true;
  try{const v=localStorage.getItem('mae_layer_border');if(v==='off')LAYER.on=false;}catch(e){}
  // latest week with any data
  LWEEK=0;LAYER.pts.forEach(pt=>pt.w.forEach((w,i)=>{if(w&&i>LWEEK)LWEEK=i;}));
  const ctls={};LAYER.pts.forEach(pt=>ctls[pt.ctl]=(ctls[pt.ctl]||0)+1);
  LAYER.ctlColor={};Object.keys(ctls).sort((a,b)=>ctls[b]-ctls[a]).forEach((c,i)=>LAYER.ctlColor[c]=c==='SAC'?'#e2e8f0':CTLPAL[i%CTLPAL.length]);
  LAYER.catColor={'International Border':'#c084fc','Local Border':'#38bdf8','Sea Port':'#2dd4bf','Deep Sea Port':'#10b981','Inland Port':'#fb923c'};
  LAYER.pts.forEach(pt=>{if(!N[pt.u])return;
    N[pt.id]={k:'poi',p:pt.id,n:pt.n,m:'',u:pt.u,x:pt.x,y:pt.y,d:pt,st:stateOf(pt.u)};POIS.push(pt.id);});
  $('#lyBorderName').textContent=`${LAYER.name} ${LAYER.year}`;
  $('#lyBorder').checked=LAYER.on;lyDim('lyBorderOpts',LAYER.on);
  stateOpts($('#lySt'),POIS);
  LAST=LWEEK;LWEEK=-1;
  $('#lyWeek').innerHTML='<option value="-1" selected>Latest known (each point)</option>'+LAYER.weeks.map((w,i)=>`<option value="${i}">${esc(w)}${i===LAST?' (latest week)':''}</option>`).join('');
  $('#lySrc').textContent='Source: '+LAYER.src;
  renderLayerPanel();
}
function poiStatus(o,wk=LWEEK){let i=wk;if(i<0){i=-1;o.d.w.forEach((w,j)=>{if(w)i=j;});if(i<0)return null;}const w=o.d.w[i];if(!w)return null;return [w[0],LAYER.src_list[w[1]],w[2],i];}
function poiSt(o){const s=poiStatus(o);return s?s[0]:'No update';}
function poiKey(o){return LCOLOR==='status'?poiSt(o):LCOLOR==='ctl'?o.d.ctl:o.d.cat;}
function poiColor(o){const k=poiKey(o);return LCOLOR==='status'?STC[k]||'#9aa0a6':LCOLOR==='ctl'?LAYER.ctlColor[k]:LAYER.catColor[k]||'#555';}
function poiVisible(o){return (!LST||o.st===LST)&&!LHIDE.status.has(poiSt(o))&&!LHIDE.cat.has(o.d.cat)&&!LHIDE.ctl.has(o.d.ctl);}
function renderLayerPanel(){
  if(!LAYER)return;
  const base=POIS.filter(p=>!LST||N[p].st===LST);
  // swatches show the marker: coloured for the 'Colour by' attribute, grey otherwise
  const col=(g,k)=>g!==LCOLOR?'#607d8b':(g==='status'?STC[k]:g==='ctl'?LAYER.ctlColor[k]:LAYER.catColor[k])||'#555';
  const grp=(g,title,fn,order,lab)=>{const [ks,c]=countBy(base,fn,order);return tickGroup(title,g,ks.map(k=>[k,lab&&lab[k]||k,shapeSvg('circle',col(g,k),12),c[k]]),LHIDE[g]);};
  $('#lyTicks').innerHTML=grp('status','Status · '+(LWEEK<0?'latest known':LAYER.weeks[LWEEK]),poiSt,['Open','Restricted','Closed','No update'],STL)
    +grp('cat','Category',o=>o.d.cat)+grp('ctl','Controlled by',o=>o.d.ctl);
  lyCount('lyBorderN',POIS.filter(p=>poiVisible(N[p])).length,POIS.length);
}
function drawPois(){
  if(!poiLayer||!LAYER)return;poiLayer.clearLayers();
  if(!LAYER.on)return;
  POIS.forEach(p=>{const o=N[p];if(o.x==null||!poiVisible(o))return;
    const sel=p===SELPOI;const s=Math.round((sel?24:18)*ICON*(sel?1.3:1));
    const ic=L.divIcon({className:'',html:`<div class="poim ${sel?'sel':''}">${shapeSvg('circle',poiColor(o),s)}<span class="poilbl" style="left:${s+2}px">${esc(o.n)}</span></div>`,iconSize:[s,s],iconAnchor:[s/2,s/2]});
    const m=L.marker([o.y,o.x],{icon:ic,zIndexOffset:sel?2000:900,riseOnHover:true});
    const st=poiStatus(o);
    m.bindTooltip(`<b>${esc(o.n)}</b><br>${esc(o.d.cat)} · ${esc(o.d.ctl)}${o.d.bw&&o.d.bw!=='—'?' · '+esc(o.d.bw):''}<br>${st?`<span style="color:${STC[st[0]]};font-weight:600">${esc(STL[st[0]])}</span> — ${esc(LAYER.weeks[st[3]])}`:'No update'}`,{className:'tip',direction:'top',offset:[0,-8]});
    m.on('click',e=>{L.DomEvent.stop(e);show(p);});
    poiLayer.addLayer(m);});
}
function monthGroups(){const g=[];LAYER.weeks.forEach((w,i)=>{const m=w.replace(/^\S+\s+/,'');let last=g[g.length-1];if(!last||last.m!==m)g.push(last={m,ix:[]});last.ix.push(i);});return g;}
function renderPoiSide(o){
  const d=o.d;const anc=ancestors(o.u);
  $('#crumbs').innerHTML=anc.map(a=>`<a data-p="${a.p}">${esc(a.n)}</a>`).join(' › ')+' › <b>'+esc(o.n)+'</b>';
  const st=poiStatus(o);
  let h=`<div class="type">${esc(d.cat)} · ${esc(LAYER.name)}</div><h2>${esc(o.n)}</h2>
  <div style="margin-top:8px">${st?`<span class="stbadge" style="background:${STC[st[0]]}">${esc(STL[st[0]])}</span> <span style="font-size:12.5px;color:var(--muted)">${LWEEK<0?'latest: ':''}${esc(LAYER.weeks[st[3]])} ${LAYER.year}${st[2]?' · updated '+esc(st[2]):''}</span>${st[1]?` · <a href="${esc(st[1])}" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--accent)">source ↗</a>`:''}`:`<span class="stbadge" style="background:#9aa0a6">No update</span> <span style="font-size:12.5px;color:var(--muted)">${LWEEK<0?'no status recorded':esc(LAYER.weeks[LWEEK])}</span>`}</div>
  <div class="kv"><div>Controlled by</div><div><b>${esc(d.ctl)}</b></div>
  ${d.bw&&d.bw!=='—'?`<div>Border with</div><div>${esc(d.bw)}</div>`:''}
  <div>Location</div><div>${esc(d.loc)}</div>
  <div>Sheet township</div><div>${esc(d.tsx)}, ${esc(d.stx)}</div>`;
  anc.slice(1).forEach(a=>h+=`<div>${TYPES[a.k]}</div><div><a data-p="${a.p}" style="color:var(--accent);cursor:pointer">${esc(a.n)}</a>${a.m?` <span class="mm" style="color:var(--muted)">${esc(a.m)}</span>`:''} <span class="pc" data-copy="${a.p}" style="font-size:11px">${a.p}</span></div>`);
  if(d.vt&&N[d.vt])h+=`<div>Village Tract</div><div><a data-p="${d.vt}" style="color:var(--accent);cursor:pointer">${esc(N[d.vt].n)}</a> <span class="pc" data-copy="${d.vt}" style="font-size:11px">${d.vt}</span></div>`;
  if(d.nv&&N[d.nv[0]])h+=`<div>Nearest village</div><div><a data-p="${d.nv[0]}" style="color:var(--accent);cursor:pointer">${esc(N[d.nv[0]].n)}</a> — ${d.nv[1]} km</div>`;
  if(o.x!=null)h+=`<div>Coordinates</div><div><span class="pc" data-copy="${o.y.toFixed(6)}, ${o.x.toFixed(6)}">${o.y.toFixed(5)}, ${o.x.toFixed(5)}</span></div>`;
  h+='</div>';
  const tsn=N[o.u]?N[o.u].n:'';
  if(o.x==null)h+=`<div class="note">No coordinates in the dataset — placed under ${esc(tsn)} township by name. Add Latitude/Longitude in the sheet to show it on the map.</div>`;
  else if(norm(tsn)!==norm(d.tsx))h+=`<div class="note">Sheet says township <b>${esc(d.tsx)}</b>; by MIMU boundary this point is in <b>${esc(tsn)}</b>${d.how&&d.how.startsWith('nearest')?' (nearest township, point is just outside the boundary)':''}. Often a spelling variant or sub-township — worth checking.</div>`;
  // timeline
  h+=`<div style="margin-top:12px;font-size:12px;font-weight:600">Weekly status ${LAYER.year}</div><div class="tl">`+monthGroups().map(g=>`<div><div class="mo">${esc(g.m.slice(0,3))}</div><div class="wk">`+g.ix.map(i=>{const w=d.w[i];const k=w?w[0]:'No update';return `<i data-wk="${i}" class="${i===(LWEEK<0&&st?st[3]:LWEEK)?'cur':''}" style="background:${STC[k]||'#ccc'}" title="${esc(LAYER.weeks[i])}: ${esc(STL[k]||k)}${w&&w[2]?' ('+esc(w[2])+')':''}"></i>`;}).join('')+'</div></div>').join('')+'</div>';
  // changes
  const ch=[];let prev=null;d.w.forEach((w,i)=>{const k=w?w[0]:null;if(k&&k!==prev){ch.push([i,w]);prev=k;}});
  h+=`<div class="hist"><div style="font-weight:600;border:0">Status changes</div>`+ch.map(([i,w])=>`<div><span style="width:74px;color:var(--muted)">${esc(LAYER.weeks[i])}</span><span class="stbadge" style="background:${STC[w[0]]};font-size:11px;padding:1px 8px">${esc(STL[w[0]])}</span>${w[2]?`<span style="color:var(--muted)">${esc(w[2])}</span>`:''}${LAYER.src_list[w[1]]?`<a href="${esc(LAYER.src_list[w[1]])}" target="_blank" rel="noopener">source ↗</a>`:''}</div>`).join('')+'</div>';
  h+=`<div class="actions"><button class="btn" data-up="1">↑ Township</button>${o.x!=null?`<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${o.y},${o.x}">Google Maps ↗</a>`:''}</div>`;
  $('#card').innerHTML=h;
  const groups=childGroups(CUR);TAB=groups.length?groups[0][0]:null;
  $('#tabs').innerHTML='';renderList();
}
$('#card').addEventListener('click',e=>{const w=e.target.closest('[data-wk]');if(w){setWeek(+w.dataset.wk);}});
function setWeek(i){LWEEK=i;$('#lyWeek').value=i;if(LCOLOR!=='status'){LCOLOR='status';$('#lyColor').value='status';}poiChanged();}
// any border-point filter change: panel, map and sidebar list
function poiChanged(){renderLayerPanel();drawPois();renderSide({keepTab:true});}
function exportPois(list){
  const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const cols=['Name','Category','Controlled_by','Border_with','Location','Township_sheet','State_sheet','Latitude','Longitude','State_Region','ST_PCode','District','DT_PCode','Township','TS_PCode','Village_Tract','VT_PCode','Nearest_Village','Village_PCode','Village_km','Week','Status','Update_date','Source'];
  const rows=list.map(p=>{const o=N[p],d=o.d,an={};ancestors(o.u).forEach(a=>an[a.k]=a);const s=poiStatus(o);const vt=d.vt&&N[d.vt];const nv=d.nv&&N[d.nv[0]];
    return [o.n,d.cat,d.ctl,d.bw,d.loc,d.tsx,d.stx,o.y,o.x,an.state&&an.state.n,an.state&&an.state.p,an.district&&an.district.n,an.district&&an.district.p,an.township&&an.township.n,an.township&&an.township.p,vt?vt.n:'',vt?d.vt:'',nv?nv.n:'',nv?d.nv[0]:'',nv?d.nv[1]:'',(s?LAYER.weeks[s[3]]:'')+' '+LAYER.year,s?STL[s[0]]:'No update',s?s[2]:'',s?s[1]:''].map(q).join(',');});
  const blob=new Blob(['﻿'+cols.join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='border_trade_points_'+(LWEEK<0?'latest':LAYER.weeks[LWEEK].replace(/\s+/g,'_'))+'.csv';a.click();toast(`Exported ${list.length} points`);
}
$('#layBtn').onclick=e=>{e.stopPropagation();const p=$('#layPop');p.style.display=p.style.display==='block'?'none':'block';};
document.addEventListener('mousedown',e=>{if(!e.target.closest('#layPop')&&!e.target.closest('#layBtn'))$('#layPop').style.display='none';});
$('#lyBorder').onchange=e=>{LAYER.on=e.target.checked;try{localStorage.setItem('mae_layer_border',LAYER.on?'on':'off');}catch(_){}
  lyDim('lyBorderOpts',LAYER.on);drawPois();if(N[CUR].k!=='poi')renderSide({keepTab:true});};
$('#lyColor').onchange=e=>{LCOLOR=e.target.value;poiChanged();};
$('#lyWeek').onchange=e=>{setWeek(+e.target.value);};
$('#lySt').onchange=e=>{LST=e.target.value;poiChanged();fitState(LST);};
bindTicks($('#lyTicks'),g=>LHIDE[g],poiChanged);
$('#lyList').onclick=()=>{$('#layPop').style.display='none';show('ROOT');TAB='poi';renderSide({keepTab:true});};
$('#lyCsv').onclick=()=>exportPois(POIS.filter(p=>poiVisible(N[p])));
