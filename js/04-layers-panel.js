/* ---------------- Layers panel: shared filter UI ----------------
   Every layer: tick = on/off, ▾ = filters, <select> for single choices, tick lists (tickGroup) to hide / show values.
   Each tick list reads/writes a Set of hidden values; bindTicks wires ticks + All/None to it. */
function tickGroup(title,g,items,hide){ // items: [[value,label,swatchHtml,count]]
  if(!items.length)return '';
  return `<div class="tgh"><span>${esc(title)}</span>${items.length>2?`<span class="tga"><a data-g="${g}" data-all="1">All</a> · <a data-g="${g}" data-all="0">None</a></span>`:''}</div>`+
    items.map(([v,l,sw,n])=>`<label class="tk"><input type="checkbox" data-g="${g}" data-v="${esc(v)}"${hide.has(v)?'':' checked'}><span class="sw">${sw||''}</span><span class="tkl">${esc(l)}</span>${n!=null?`<span class="n">${n}</span>`:''}</label>`).join('');
}
function countBy(list,fn,order){ // -> [keys in display order, counts]
  const c={};list.forEach(p=>{const k=fn(N[p]);c[k]=(c[k]||0)+1;});const rest=Object.keys(c).filter(k=>!order||!order.includes(k)).sort((a,b)=>c[b]-c[a]||a.localeCompare(b));
  return [(order||[]).filter(k=>c[k]).concat(rest),c];}
function bindTicks(el,setOf,redraw){
  el.addEventListener('change',e=>{const i=e.target;if(i.dataset.v==null)return;const S=setOf(i.dataset.g);i.checked?S.delete(i.dataset.v):S.add(i.dataset.v);redraw(i.dataset.g);});
  el.addEventListener('click',e=>{const a=e.target.closest('[data-all]');if(!a)return;e.preventDefault();const g=a.dataset.g,S=setOf(g);
    el.querySelectorAll('input[data-v]').forEach(i=>{if(i.dataset.g===g)a.dataset.all==='1'?S.delete(i.dataset.v):S.add(i.dataset.v);});redraw(g);});
}
function lyDim(id,on){const b=$('#'+id);if(b)b.style.opacity=on?1:.4;}
function lyCount(id,vis,total){$('#'+id).textContent=vis<total?vis+' / '+total:total;}
// open / closed state of every ▾ section is remembered
const LYOPEN={};try{Object.assign(LYOPEN,JSON.parse(localStorage.getItem('mae_open')||'{}'));}catch(e){}
const isOpen=(id,def)=>id in LYOPEN?LYOPEN[id]:def;
function applyOpen(){document.querySelectorAll('#layPop .lyx').forEach(b=>{const t=$('#'+b.dataset.x);if(!t)return;const on=isOpen(b.dataset.x,t.classList.contains('open'));t.classList.toggle('open',on);b.classList.toggle('open',on);});}
$('#layPop').addEventListener('click',e=>{const b=e.target.closest('.lyx');if(!b)return;const on=$('#'+b.dataset.x).classList.toggle('open');b.classList.toggle('open',on);
  LYOPEN[b.dataset.x]=on;try{localStorage.setItem('mae_open',JSON.stringify(LYOPEN));}catch(_){}});
applyOpen();
const kidsOf=(p,k)=>(KIDS[p]||[]).filter(q=>!k||N[q].k===k).sort((a,b)=>N[a].n.localeCompare(N[b].n));
function show(p,opt={}){
  if(!N[p])p='ROOT';CUR=p;const o=N[p];
  if(!opt.coord)COORD=null;
  if(!opt.coord&&location.hash.slice(1)!==p)history.replaceState(null,'','#'+(p==='ROOT'?'':p));
  [ctxLayer,childLayer,focusLayer,ptLayer].forEach(l=>l.clearLayers());
  labelLayers=[];for(const k in LAYERMAP)delete LAYERMAP[k];
  const allStates=Object.keys(GEO.state);
  const greyCtx=list=>L.geoJSON(MV.ctx?{type:'FeatureCollection',features:list.map(geoOf).filter(Boolean)}:{type:'FeatureCollection',features:[]},{renderer:R,interactive:false,style:{color:'#23394a',weight:.8,fillColor:'#0c1822',fillOpacity:(hasTiles()||!FILL)?0:.85}});
  FOCUS=o.k==='village'?o.u:isPt(o.k)&&o.d.vt?o.d.vt:null;
  const needVT=['township','vt','village','town','ward','poi','unit','cap'].includes(o.k);
  SELPOI=o.k==='poi'?p:null;drawPois();SELUNIT=o.k==='unit'?p:null;drawUnits();SELCAP=o.k==='cap'?p:null;drawCaps();
  const stP=needVT?stateOf(p):null;const vtPending=needVT&&!GEODONE[stP];
  if(vtPending)ensureState(stP).then(()=>{if(CUR===p&&!COORD)show(p,{keepView:true,keepTab:true});});
  let legend='';
  if(o.k==='country'){
    childLayer.addLayer(drawPolys(SON?kidsOf('ROOT').filter(s=>!SST||s===SST):[]));
  }else if(o.k==='state'){
    if(SON)ctxLayer.addLayer(greyCtx(allStates.filter(s=>s!==p)));
    childLayer.addLayer(drawPolys(kidsOf(p,'district')));outline(p);
  }else if(o.k==='district'){
    ctxLayer.addLayer(greyCtx(kidsOf(o.u,'district').filter(d=>d!==p)));
    childLayer.addLayer(drawPolys(kidsOf(p,'township')));outline(p);
  }else{
    // township-context views
    const ts=o.k==='township'?p:(o.k==='vt'||o.k==='town'||isPt(o.k))?o.u:N[o.u].u;
    const tsn=N[ts];
    ctxLayer.addLayer(greyCtx(kidsOf(tsn.u,'township').filter(t=>t!==ts)));
    const vts=kidsOf(ts,'vt');const towns=kidsOf(ts,'town');
    const wards=[].concat(...towns.map(t=>kidsOf(t,'ward')));
    if(isPt(o.k)){
      const vv=o.d.vt&&N[o.d.vt]?o.d.vt:null;
      childLayer.addLayer(drawPolys(vts.filter(v=>v!==vv),{style:{fillOpacity:hasTiles()?.06:.22}}));
      if(vv)childLayer.addLayer(drawPolys([vv],{style:{fillColor:'#f5a524',fillOpacity:hasTiles()?.2:.6},noLabel:true}));
      childLayer.addLayer(drawPolys(wards,{style:{fillColor:'#3b5566',fillOpacity:.5,color:'#6f98ab',weight:.6},noLabel:true}));
      villageMarkers([].concat(...vts.map(v=>kidsOf(v,'village'))));
      townMarkers(towns);outline(ts);
    }else if(o.k==='township'){
      childLayer.addLayer(drawPolys(vts,{}));
      childLayer.addLayer(drawPolys(towns,{style:{fillColor:'#2a3d4b',fillOpacity:.5,color:'#6f98ab',weight:.8},noLabel:true}));
      childLayer.addLayer(drawPolys(wards,{style:{fillColor:'#3b5566',fillOpacity:.55,color:'#6f98ab',weight:.6},noLabel:true}));
      villageMarkers([].concat(...vts.map(v=>kidsOf(v,'village'))));
      townMarkers(towns);outline(ts);
    }else if(o.k==='vt'||o.k==='village'){
      const vt=o.k==='vt'?p:o.u;
      childLayer.addLayer(drawPolys(vts.filter(v=>v!==vt),{style:{fillOpacity:hasTiles()?.08:.25}}));
      childLayer.addLayer(drawPolys([vt],{style:{fillColor:'#f5a524',fillOpacity:hasTiles()?.25:.7},noLabel:true}));
      villageMarkers(kidsOf(vt,'village'),{labels:true,highlight:o.k==='village'?p:null});
      outline(ts,{weight:1.5,dashArray:'4 4'});outline(vt,{color:'#f5a524',weight:3});
    }else{ // town / ward
      const town=o.k==='town'?p:o.u;
      childLayer.addLayer(drawPolys(vts,{style:{fillOpacity:hasTiles()?.06:.2},noLabel:true}));
      if(geoOf(town))outline(town,{color:'#8fb0c0',weight:1.5});
      childLayer.addLayer(drawPolys(kidsOf(town,'ward'),{}));
      villageMarkers(kidsOf(town,'village'),{labels:true});
      townMarkers([town]);outline(ts,{weight:1.5,dashArray:'4 4'});
      if(o.k==='ward')outline(p,{color:'#e8a33d',weight:3.5});
    }
    legend=(MV.village?'<div><i style="background:#ff6b6b"></i>Village</div>':'')+(MV.town?'<div><i style="background:#e2e8f0"></i>Town</div>':'')+(MV.ward?'<div><i style="background:#3b5566;border-radius:2px"></i>Urban ward</div>':'');
    if(vtPending)legend+='<div style="color:#9a5b00">Loading village-tract boundaries…</div>';
  }
  $('#legend').innerHTML=legend;$('#legend').style.display=legend?'':'none';
  if(!opt.keepView){
    if(o.k==='village')map.setView([o.y,o.x],Math.max(map.getZoom(),13));
    else if(isPt(o.k)&&o.x!=null)map.setView([o.y,o.x],Math.max(Math.min(map.getZoom(),13),11));
    else{const b=nodeBounds(p);map.fitBounds(b,{padding:[30,30],maxZoom:15});}
  }
  setTimeout(updateLabels,0);
  renderSide(opt);
}
