/* ---------------- reference layers: roads, railways, rivers, SAZ, airports, sea ports ---------------- */
// data/ref_<key>.json (TopoJSON, built by D:\MIMU\build_ref_layers.sh), loaded the first time a layer is turned on
const PLANE='<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="#fff"/>';
const ANCHOR='<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="5" r="2.2"/><path d="M12 7.2V21M8 11h8M4.5 13.5a7.5 7.5 0 0 0 15 0"/></g>';
const RIVC='#3b82f6';
const REF={
  river:{name:'Rivers & water bodies',gt:'Type',z:405,sub:'h',vals:['Perennial','Non-perennial'],val:p=>/^Non/i.test(p.h||'')?'Non-perennial':'Perennial',
    style:(p,v)=>({color:'#60a5fa',weight:.5,opacity:.8,fillColor:RIVC,fillOpacity:v==='Perennial'?.6:.3}),sw:v=>`<span style="width:14px;height:10px;border-radius:2px;background:${RIVC};opacity:${v==='Perennial'?1:.5}"></span>`},
  saz:{name:'Self-Administered Zones',gt:'Zone / Division',z:410,sub:'n',val:p=>p.n,
    style:()=>({color:'#f472b6',weight:2,dashArray:'6 4',opacity:.95,fillColor:'#f472b6',fillOpacity:.1}),sw:()=>`<span style="width:14px;height:10px;border:2px dashed #f472b6;background:rgba(244,114,182,.15)"></span>`},
  road:{name:'Roads',gt:'Road type',z:420,sub:'t',vals:['Main','Secondary','Tertiary'],val:p=>p.t||'Tertiary',
    col:{Main:'#f97316',Secondary:'#facc15',Tertiary:'#cbd5e1'},wt:{Main:2.4,Secondary:1.6,Tertiary:1},
    style(p,v){return {color:this.col[v]||'#cbd5e1',weight:(this.wt[v]||1)+(/^AH/.test(p.r||'')?.6:0),opacity:v==='Tertiary'?.7:.95,lineCap:'round'};},
    sw(v){return `<svg width="18" height="10"><line x1="1" y1="5" x2="17" y2="5" stroke="${this.col[v]}" stroke-width="${this.wt[v]+.6}" stroke-linecap="round"/></svg>`;}},
  rail:{name:'Railways',gt:'Track',z:425,sub:'t',vals:['Single Track','Double Track'],val:p=>p.t||'Single Track',
    style:(p,v)=>({color:'#0b0f14',weight:v==='Double Track'?4.6:3.4,opacity:.95}),top:(p,v)=>({color:'#f5f5f5',weight:v==='Double Track'?2.2:1.5,dashArray:'6 6',opacity:1}),
    sw:v=>`<svg width="18" height="10"><line x1="1" y1="5" x2="17" y2="5" stroke="#0b0f14" stroke-width="${v==='Double Track'?5:4}"/><line x1="1" y1="5" x2="17" y2="5" stroke="#f5f5f5" stroke-width="${v==='Double Track'?2.2:1.5}" stroke-dasharray="4 3"/></svg>`},
  airport:{name:'Airports',gt:'Status',pt:true,sub:'s',vals:['Operational','Non-operational'],val:p=>p.s||'Non-operational',
    col:{Operational:'#0ea5e9','Non-operational':'#64748b'},glyph:PLANE,
    tip:(p,v)=>`<b>${esc(p.n)}</b><br>${esc(v)}<br><small>${esc(p.ts)}, ${esc(p.st)}</small>`},
  seaport:{name:'Sea ports',gt:'Type',pt:true,sub:'t',vals:['Sea Port','Deep Sea Port'],val:p=>p.t||'Sea Port',
    col:{'Sea Port':'#14b8a6','Deep Sea Port':'#0f766e'},glyph:ANCHOR,
    tip:(p,v)=>`<b>${esc(p.n)}</b><br>${esc(v)}${p.src?`<br><small>${esc(p.src)}</small>`:''}`},
};
const REFON={};try{Object.assign(REFON,JSON.parse(localStorage.getItem('mae_ref')||'{}'));}catch(e){}
const REFHIDE={};for(const k in REF)REFHIDE[k]=new Set();
const refPtHtml=(R0,v,s)=>`<div class="refpt" style="width:${s}px;height:${s}px;background:${R0.col[v]||'#64748b'}"><svg width="${s*.62}" height="${s*.62}" viewBox="0 0 24 24">${R0.glyph}</svg></div>`;
function refSw(k,v){const R0=REF[k];return R0.pt?refPtHtml(R0,v,14):R0.sw(v);}
function initRef(){
  for(const k in REF){const R0=REF[k];R0.grp=L.layerGroup().addTo(map);
    if(!R0.pt){const pn='ref_'+k;map.createPane(pn);const el=map.getPane(pn);el.style.zIndex=R0.z;el.classList.add('refpane');R0.rd=L.canvas({pane:pn,padding:.3});}}
  renderRefPanel();
  for(const k in REF)if(REFON[k])drawRef(k);
}
function renderRefPanel(){
  $('#refBox').innerHTML=Object.keys(REF).map(k=>{const R0=REF[k],id='refo_'+k,op=isOpen(id,false);
    const vals=R0.cnt?Object.keys(R0.cnt).sort((a,b)=>(R0.vals||[]).indexOf(a)-(R0.vals||[]).indexOf(b)||a.localeCompare(b)):R0.vals||[];
    const vis=R0.cnt?vals.filter(v=>!REFHIDE[k].has(v)).reduce((s,v)=>s+R0.cnt[v],0):0;
    return `<div class="lyr"><div class="lyHead"><label class="tk head"><input type="checkbox" data-ref="${k}"${REFON[k]?' checked':''}><span class="sw">${refSw(k,vals[0])}</span><span class="tkl">${esc(R0.name)}</span><span class="n">${R0.cnt?(vis<R0.fc.features.length?vis+' / ':'')+R0.fc.features.length:''}</span></label><button class="lyx${op?' open':''}" data-x="${id}" title="Filters">▾</button></div>`+
      `<div id="${id}" class="lyOpts body${op?' open':''}" style="opacity:${REFON[k]?1:.4}">${vals.length?tickGroup(R0.gt,k,vals.map(v=>[v,v,refSw(k,v),R0.cnt?R0.cnt[v]:null]),REFHIDE[k]):'<div class="src">Turn the layer on to load its filters.</div>'}</div></div>`;}).join('');
}
async function refLoad(k){const R0=REF[k];if(R0.fc)return true;toast('Loading '+R0.name.toLowerCase()+'…');
  try{const d=await loadData('ref_'+k);R0.fc=topojson.feature(d,d.objects[k]);}catch(e){toast('Could not load '+R0.name+': '+e.message);return false;}
  R0.cnt={};R0.fc.features.forEach(f=>{const v=R0.val(f.properties);R0.cnt[v]=(R0.cnt[v]||0)+1;});renderRefPanel();return true;}
function refParts(k){ // one layer group per filter value, built once
  const R0=REF[k];if(R0.parts)return R0.parts;const by={};R0.fc.features.forEach(f=>{const v=R0.val(f.properties);(by[v]||(by[v]=[])).push(f);});R0.parts={};
  for(const v in by){const fs=by[v],g=L.layerGroup();
    if(R0.pt)fs.forEach(f=>{const [x,y]=f.geometry.coordinates,p=f.properties,s=16;
      const m=L.marker([y,x],{icon:L.divIcon({className:'',html:`<div class="poim unitm">${refPtHtml(R0,v,s)}<span class="poilbl" style="left:${s+3}px">${esc(p.n)}</span></div>`,iconSize:[s,s],iconAnchor:[s/2,s/2]}),zIndexOffset:300});
      m.bindTooltip(R0.tip(p,v),{className:'tip',direction:'top',offset:[0,-8]});m.on('click',e=>{L.DomEvent.stop(e);showCoord(y,x);});g.addLayer(m);});
    else{const fc={type:'FeatureCollection',features:fs};
      g.addLayer(L.geoJSON(fc,{renderer:R0.rd,interactive:false,style:f=>R0.style(f.properties,v)}));
      if(R0.top)g.addLayer(L.geoJSON(fc,{renderer:R0.rd,interactive:false,style:f=>R0.top(f.properties,v)}));
      if(k==='saz')fs.forEach(f=>g.addLayer(L.marker(L.geoJSON(f).getBounds().getCenter(),{interactive:false,keyboard:false,icon:L.divIcon({className:'',iconSize:[0,0],html:`<div class="reflbl">${esc(f.properties.n)}</div>`})})));}
    R0.parts[v]=g;}
  return R0.parts;}
async function drawRef(k){
  const R0=REF[k];R0.grp.clearLayers();if(!REFON[k]||!await refLoad(k)||!REFON[k])return;
  R0.grp.clearLayers();const P=refParts(k);for(const v in P)if(!REFHIDE[k].has(v))R0.grp.addLayer(P[v]);
}
$('#refBox').addEventListener('change',e=>{const k=e.target.dataset.ref;if(!k)return;REFON[k]=e.target.checked;try{localStorage.setItem('mae_ref',JSON.stringify(REFON));}catch(_){}
  lyDim('refo_'+k,REFON[k]);drawRef(k);});
bindTicks($('#refBox'),g=>REFHIDE[g],g=>{renderRefPanel();drawRef(g);});
