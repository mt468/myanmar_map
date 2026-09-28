/* ---------------- search ---------------- */
let SIDX=[];
function buildSearch(){
  SIDX=[];
  for(const p in N){const o=N[p];if(o.k==='country')continue;
    const names=[o.n,o.an].filter(Boolean).map(norm);
    const mms=[o.m,o.am].filter(Boolean).map(norm);
    SIDX.push({p,k:o.k,e:names,mm:mms,pc:p.toLowerCase()});}
}
const KORD={state:0,district:1,township:2,poi:2.5,unit:2.6,cap:2.7,town:3,vt:4,ward:5,village:6};
let sFilter='all',sScope=false,sSel=0,sList=[],SCOORD=null;
function doSearch(){
  const raw=$('#q').value.trim();const box=$('#results');
  if(!raw){box.style.display='none';return;}
  SCOORD=parseCoord(raw);
  const q=norm(raw);const out=[];
  const scopeP=(sScope&&CUR!=='ROOT')?CUR:null;
  for(const it of SIDX){
    if(sFilter!=='all'&&it.k!==sFilter)continue;
    let sc=99;
    for(const s of it.e){ if(s===q)sc=Math.min(sc,0);else if(s.startsWith(q))sc=Math.min(sc,1);else if(s.includes(q))sc=Math.min(sc,3);}
    for(const s of it.mm){ if(s===q)sc=Math.min(sc,0);else if(s.startsWith(q))sc=Math.min(sc,1);else if(s.includes(q))sc=Math.min(sc,3);}
    if(it.pc===q)sc=0;else if(q.length>=4&&it.pc.startsWith(q))sc=Math.min(sc,2);
    if(sc===99)continue;
    if(scopeP&&!isUnder(it.p,scopeP))continue;
    out.push([sc,KORD[it.k],it.p]);
  }
  out.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||N[a[2]].n.localeCompare(N[b[2]].n));
  sList=out.map(x=>x[2]);sSel=0;renderResults(raw);
}
function isUnder(p,anc){let o=N[p];while(o){if(o.p===anc)return true;o=N[o.u];}return false;}
function pathText(p){const a=[];let o=N[N[p].u];while(o&&o.p!=='ROOT'){a.unshift(o.n);o=N[o.u];}return a.join(' › ');}
function renderResults(raw){
  const box=$('#results');const kinds=['all','state','district','township','vt','town','ward','village'].concat(POIS.length?['poi']:[]).concat(UNITS.length?['unit']:[]).concat(CAPS.length?['cap']:[]);
  const lab={cap:'Town control',unit:'Military unit',poi:'Border / Port',all:'All',state:'State',district:'District',township:'Township',vt:'Village tract',town:'Town',ward:'Ward',village:'Village'};
  let h='<div class="rhead">'+kinds.map(k=>`<span class="chip ${sFilter===k?'on':''}" data-f="${k}">${lab[k]}</span>`).join('')+
    `<span class="chip scope ${sScope?'on':''}" data-scope="1" title="Only search inside the area currently selected">${sScope&&CUR!=='ROOT'?'Within '+esc(N[CUR].n):'Within current area'}</span></div>`;
  if(SCOORD)h+=`<div class="res coordres" data-coord="1"><span class="badge b-poi">Lat/Long</span><div><div class="nm">Go to ${SCOORD.lat.toFixed(5)}, ${SCOORD.lon.toFixed(5)}</div><div class="path">${SCOORD.swapped?'Read as longitude, latitude — swapped. ':''}${inMM(SCOORD.lat,SCOORD.lon)?'Find the State, Township, Village Tract and nearest villages at this point':'⚠ Outside Myanmar'}</div></div></div>`;
  const shown=sList.slice(0,80);
  if(!shown.length&&!SCOORD)h+='<div class="empty">No match for “'+esc(raw)+'”. Try fewer letters, no spaces, or the P-code.</div>';
  shown.forEach((p,i)=>{const o=N[p];
    h+=`<div class="res ${i===sSel?'sel':''}" data-p="${p}"><span class="badge b-${o.k}">${o.k==='vt'?'VT':o.k==='poi'?'Border':o.k==='unit'?'Unit':o.k==='cap'?'Control':o.k}</span><div><div class="nm">${esc(o.n)}${o.m?` <span class="mm" style="font-weight:400">· ${esc(o.m)}</span>`:''}</div>
    <div class="path">${esc(pathText(p))}${o.an?' · alt: '+esc(o.an):''} · <span style="font-family:ui-monospace,Consolas,monospace">${p}</span></div></div></div>`;});
  if(sList.length>80)h+=`<div class="empty">${sList.length-80} more — refine your search or use the type filter.</div>`;
  box.innerHTML=h;box.style.display='block';
}
$('#q').addEventListener('input',()=>{clearTimeout(doSearch._t);doSearch._t=setTimeout(doSearch,110)});
$('#q').addEventListener('focus',()=>{if($('#q').value.trim())doSearch()});
$('#q').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){sSel=Math.min(sSel+1,Math.min(sList.length,80)-1);renderResults($('#q').value);e.preventDefault();scrollSel();}
  else if(e.key==='ArrowUp'){sSel=Math.max(sSel-1,0);renderResults($('#q').value);e.preventDefault();scrollSel();}
  else if(e.key==='Enter'&&SCOORD){$('#results').style.display='none';$('#q').blur();showCoord(SCOORD.lat,SCOORD.lon);}
  else if(e.key==='Enter'&&sList[sSel]){pick(sList[sSel]);}
  else if(e.key==='Escape'){$('#results').style.display='none';}
});
function scrollSel(){const e=$('#results .res.sel');e&&e.scrollIntoView({block:'nearest'})}
$('#results').addEventListener('mousedown',e=>{
  const c=e.target.closest('.chip');if(c){e.preventDefault();if(c.dataset.scope)sScope=!sScope;else sFilter=c.dataset.f;doSearch();return;}
  const r=e.target.closest('.res');if(r){e.preventDefault();if(r.dataset.coord){$('#results').style.display='none';$('#q').blur();showCoord(SCOORD.lat,SCOORD.lon);}else pick(r.dataset.p);}
});
document.addEventListener('mousedown',e=>{if(!e.target.closest('#searchWrap'))$('#results').style.display='none'});
function pick(p){$('#results').style.display='none';$('#q').blur();show(p);}
