/* ---------------- sidebar ---------------- */
function ancestors(p){const a=[];let o=N[p];while(o){a.unshift(o);o=N[o.u];}return a;}
function fmt(n){return (n||0).toLocaleString('en-US')}
function renderSide(opt){
  const o=N[CUR];
  if(o.k==='poi'){renderPoiSide(o);return;}
  if(o.k==='unit'){renderUnitSide(o);return;}
  if(o.k==='cap'){renderCapSide(o);return;}
  $('#crumbs').innerHTML=ancestors(CUR).map((a,i,arr)=>i<arr.length-1?`<a data-p="${a.p}">${esc(a.n)}</a> ›`:`<b>${esc(a.n)}</b>`).join(' ');
  const c=o.c||{};
  let h=`<div class="type">${o.k==='country'?'Country':(o.t||TYPES[o.k])}</div><h2>${esc(o.n)}</h2>`;
  if(o.m)h+=`<div class="mmname mm">${esc(o.m)}</div>`;
  if(o.an||o.am)h+=`<div class="alt">Also known as: ${esc(o.an||'')}${o.am?' <span class="mm">'+esc(o.am)+'</span>':''}</div>`;
  h+='<div class="kv">';
  if(o.k!=='country')h+=`<div>P-code</div><div><span class="pc" data-copy="${o.p}" title="Click to copy">${o.p}</span></div>`;
  const anc=ancestors(CUR).slice(1,-1);
  anc.forEach(a=>h+=`<div>${TYPES[a.k]}</div><div><a class="lnk" data-p="${a.p}" style="color:var(--accent);cursor:pointer">${esc(a.n)}</a>${a.m?` <span class="mm" style="color:var(--muted)">${esc(a.m)}</span>`:''} <span style="color:var(--muted);font-size:11.5px">${a.p}</span></div>`);
  if(o.sr&&o.sr!==N[o.u].n)h+=`<div>Sub-region</div><div>${esc(o.sr)}</div>`;
  if(o.sa)h+=`<div>Self-admin area</div><div>${esc(o.sa)}</div>`;
  if(o.lv)h+=`<div>Town level</div><div>${esc(o.lv)}</div>`;
  if(o.x!=null)h+=`<div>Coordinates</div><div><span class="pc" data-copy="${o.y}, ${o.x}">${o.y}, ${o.x}</span></div>`;
  h+='</div>';
  const S=[];
  if(o.k==='country')S.push([15,'States/Regions']);
  if(c.district)S.push([c.district,'Districts']);if(c.township)S.push([c.township,'Townships']);
  if(c.vt)S.push([c.vt,'Village tracts']);if(c.village)S.push([c.village,'Villages']);
  if(c.town)S.push([c.town,'Towns']);if(c.ward)S.push([c.ward,'Wards']);
  if(S.length)h+='<div class="stats">'+S.map(([n,l])=>`<div class="stat"><b>${fmt(n)}</b><span>${l}</span></div>`).join('')+'</div>';
  if(o.sub)h+=`<div class="note">MIMU codes this village under sub-township <b>${esc(o.sub)}</b>; shown here under the township whose boundary contains it.</div>`;
  if(o.k==='vt'&&o.r)h+=`<div class="note">${esc(o.r)}</div>`;
  if(o.k==='vt'&&!o.g&&!o.r)h+=`<div class="note">No boundary polygon for this village tract in MIMU VT layer — villages shown only.</div>`;
  h+='<div class="actions">';
  if(o.k!=='country'){h+=`<button class="btn" data-up="1">↑ Up one level</button>`;}
  h+=`<button class="btn" data-exp="1">Export list (CSV)</button>`;
  if(o.x!=null)h+=`<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${o.y},${o.x}">Google Maps ↗</a>`;
  h+='</div>';
  $('#card').innerHTML=h;
  // tabs
  const groups=childGroups(CUR);
  if(!opt.keepTab||!groups.find(g=>g[0]===TAB))TAB=groups.length?groups[0][0]:null;
  $('#tabs').innerHTML=groups.length>1?groups.map(g=>`<span class="chip ${g[0]===TAB?'on':''}" data-tab="${g[0]}">${g[1]} (${fmt(g[2].length)})</span>`).join(''):'';
  renderList();
}
function childGroups(p){
  const o=N[p];const g=[];
  const lab={state:'States / Regions',district:'Districts',township:'Townships',vt:'Village tracts',town:'Towns',ward:'Wards',village:'Villages'};
  const byK={};(KIDS[p]||[]).forEach(q=>(byK[N[q].k]||(byK[N[q].k]=[])).push(q));
  ['state','district','township','vt','town','ward','village'].forEach(k=>{if(byK[k])g.push([k,lab[k],byK[k].sort((a,b)=>N[a].n.localeCompare(N[b].n))]);});
  if(o.k==='village'){const sib=kidsOf(o.u,'village');g.push(['sib','Other villages in this VT',sib]);}
  if(o.k==='ward'){g.push(['sib','Other wards in this town',kidsOf(o.u,'ward')]);}
  if(LAYER&&LAYER.on&&!['village','ward','poi'].includes(o.k)){const ps=POIS.filter(q=>poiVisible(N[q])&&(p==='ROOT'||isUnder(q,p)));if(ps.length)g.push(['poi','Border points',ps.sort((a,b)=>N[a].n.localeCompare(N[b].n))]);}
  if(UL&&UL.on&&!['village','ward','poi','unit'].includes(o.k)){const us=UNITS.filter(q=>unitVisible(N[q])&&(p==='ROOT'||isUnder(q,p)));if(us.length)g.push(['unit',UHQ?'Units: '+UHQ:'Military units',us.sort(unitSort)]);}
  if(TCL&&TCL.on&&!['village','ward','poi','unit','cap'].includes(o.k)){const cs=CAPS.filter(q=>capVisible(N[q])&&(p==='ROOT'||isUnder(q,p)));if(cs.length)g.push(['cap','Town control',cs.sort(capSort)]);}
  if(o.k==='cap'){const s=o.st;g.push(['sib','Other towns in '+(N[s]?N[s].n:'this state'),CAPS.filter(q=>q!==p&&N[q].st===s).sort(capSort)]);}
  if(o.k==='unit'){const co=UNITS.filter(q=>q!==p&&N[q].x===o.x&&N[q].y===o.y);if(co.length)g.push(['sib','Same location ('+co.length+')',co.sort(unitSort)]);
    g.push(['sib2','Same command: '+o.d.hq,UNITS.filter(q=>q!==p&&N[q].d.hq===o.d.hq).sort(unitSort)]);}
  if(o.k==='poi'){const s=stateOf(p);g.push(['sib','Other points in '+(N[s]?N[s].n:'this state'),POIS.filter(q=>q!==p&&stateOf(q)===s).sort((a,b)=>N[a].n.localeCompare(N[b].n))]);}
  return g;
}
function countLabel(o){
  const c=o.c||{};
  if(o.k==='state')return `${fmt(c.township)} ts · ${fmt(c.village)} vil`;
  if(o.k==='district')return `${fmt(c.township)} ts · ${fmt(c.village)} vil`;
  if(o.k==='township')return `${fmt(c.vt)} VT · ${fmt(c.village)} vil`;
  if(o.k==='vt')return `${fmt(c.village)} villages`;
  if(o.k==='town')return `${fmt(c.ward)} wards`;
  if(o.k==='village')return o.an?'alt: '+esc(o.an):'';
  if(o.k==='cap')return esc(o.d.a)+' · <b style="color:'+(TSC[o.d.s]||'#9aa0a6')+'">'+esc(o.d.s)+'</b> · '+esc(fdate(o.d.dt));
  if(o.k==='unit')return esc(o.d.hq)+' · '+esc(o.d.loc)+(o.d.sz?' · <b style="color:'+SZC[o.d.sz]+'">'+esc(o.d.sz)+'</b>':'');
  if(o.k==='poi'){const s=poiStatus(o);return esc(o.d.cat)+' · '+esc(o.d.ctl)+(s?' · <b style="color:'+STC[s[0]]+'">'+esc(s[0])+'</b>':'');}
  return '';
}
function curList(){const g=childGroups(CUR).find(x=>x[0]===TAB);return g?g[2]:[];}
function renderList(){
  const g=childGroups(CUR).find(x=>x[0]===TAB);
  const f=norm($('#lf').value);
  let L0=g?g[2]:[];
  if(f)L0=L0.filter(p=>{const o=N[p];return norm(o.n).includes(f)||norm(o.m).includes(f)||p.toLowerCase().includes(f)||norm(o.an).includes(f)});
  $('#listTitle').textContent=g?`${g[1]} (${fmt(L0.length)})`:'No sub-units';
  const idx={};(g?g[2]:[]).forEach((q,i)=>idx[q]=i);
  const MAX=1500;
  $('#list').innerHTML=L0.length?L0.slice(0,MAX).map(p=>{const o=N[p];const i=idx[p];
    const sw=o.k==='unit'?unitColor(o):o.k==='poi'?poiColor(o):o.k==='cap'?capColor(o):o.k==='village'?'#c0392b':o.k==='town'?'#222':i!=null?PAL[i%PAL.length]:'#ccc';const pt=isPt(o.k);
    return `<div class="row" data-p="${p}"><span class="sw" style="background:${sw};${o.k==='village'||o.k==='town'||o.k==='poi'||o.k==='unit'?'border-radius:50%':''}"></span><div class="t"><div>${esc(o.n)}</div>${o.m?`<div class="m mm">${esc(o.m)}</div>`:''}${pt?`<div class="m" style="font-size:11.5px;color:var(--muted)">${countLabel(o)}</div>`:''}</div><div class="c">${pt?esc(N[o.u]?N[o.u].n:''):countLabel(o)}<br><span style="font-family:ui-monospace,Consolas,monospace">${pt?'':p}</span></div></div>`;}).join('')+(L0.length>MAX?`<div class="empty">Showing first ${MAX} — use the filter.</div>`:''):'<div class="empty">This is the lowest level.</div>';
}
$('#list').addEventListener('click',e=>{const r=e.target.closest('.row');if(r)show(r.dataset.p)});
$('#list').addEventListener('mouseover',e=>{const r=e.target.closest('.row');if(r&&r.dataset.p!==hov._l){if(hov._l)hov(hov._l,false);hov._l=r.dataset.p;hov(r.dataset.p,true);}});
$('#list').addEventListener('mouseleave',()=>{if(hov._l){hov(hov._l,false);hov._l=null;}});
$('#lf').addEventListener('input',renderList);
$('#tabs').addEventListener('click',e=>{const c=e.target.closest('.chip');if(c){TAB=c.dataset.tab;renderSide({keepTab:true});}});
$('#crumbs').addEventListener('click',e=>{const a=e.target.closest('a');if(a)show(a.dataset.p)});
$('#card').addEventListener('click',e=>{
  const a=e.target.closest('[data-p]');if(a){show(a.dataset.p);return;}
  const cp=e.target.closest('[data-copy]');if(cp){navigator.clipboard&&navigator.clipboard.writeText(cp.dataset.copy).then(()=>toast('Copied '+cp.dataset.copy),()=>toast(cp.dataset.copy));return;}
  if(e.target.closest('[data-up]')){show(N[CUR].u);return;}
  if(e.target.closest('[data-exp]'))exportCSV();
});
function exportCSV(){
  const list=curList();if(!list.length){toast('Nothing to export');return;}
  if(list.every(p=>N[p].k==='poi'))return exportPois(list);
  if(list.every(p=>N[p].k==='unit'))return exportUnits(list);
  if(list.every(p=>N[p].k==='cap'))return exportCaps(list);
  const cols=['Type','Name_Eng','Name_MMR','PCode','Alt_Eng','Alt_MMR','Village_Tract','VT_PCode','Township','TS_PCode','District','DT_PCode','State_Region','ST_PCode','Longitude','Latitude','Villages'];
  const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const rows=list.map(p=>{const o=N[p];const an={};ancestors(p).forEach(a=>an[a.k]=a);
    return [TYPES[o.k],o.n,o.m,o.p,o.an,o.am,an.vt&&an.vt.n,an.vt&&an.vt.p,an.township&&an.township.n,an.township&&an.township.p,an.district&&an.district.n,an.district&&an.district.p,an.state&&an.state.n,an.state&&an.state.p,o.x,o.y,o.c&&o.c.village].map(q).join(',');});
  const blob=new Blob(['﻿'+cols.join(',')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(N[CUR].n+'_'+TAB+'.csv').replace(/[^\w.\-]+/g,'_');a.click();
  toast(`Exported ${list.length} rows`);
}
window.addEventListener('hashchange',()=>{const h=decodeURIComponent(location.hash.slice(1))||'ROOT';
  if(h.startsWith('@')){const c=parseCoord(h.slice(1));if(c&&(!COORD||Math.abs(c.lat-COORD.lat)>1e-7||Math.abs(c.lon-COORD.lon)>1e-7))showCoord(c.lat,c.lon);return;}
  if(h!==CUR&&N[h])show(h)});
