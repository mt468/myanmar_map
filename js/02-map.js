/* ---------------- map ---------------- */
let map,R,ctxLayer,childLayer,focusLayer,ptLayer,baseTiles=null;
const LAYERMAP={};
function initMap(){
  map=L.map('map',{zoomControl:true,preferCanvas:true,zoomSnap:.25,zoomDelta:.5,minZoom:4,maxZoom:18,attributionControl:true});
  R=L.canvas({padding:.3,tolerance:4});
  map.attributionControl.setPrefix('').addAttribution('Boundaries & P-codes: MIMU v9.4');
  map.createPane('poi');map.getPane('poi').style.zIndex=640;
  capLayer=L.layerGroup().addTo(map);
  unitLayer=L.layerGroup().addTo(map);
  poiLayer=L.layerGroup().addTo(map);
  ctxLayer=L.layerGroup().addTo(map);childLayer=L.layerGroup().addTo(map);focusLayer=L.layerGroup().addTo(map);ptLayer=L.layerGroup().addTo(map);
  map.fitBounds([[9.6,92.2],[28.5,101.2]]);
  map.on('mousemove',e=>$('#coord').textContent=e.latlng.lat.toFixed(5)+', '+e.latlng.lng.toFixed(5));
  map.on('contextmenu',e=>showCoord(e.latlng.lat,e.latlng.lng));
  map.on('click',e=>{if(PICKING){PICKING=false;$('#map').style.cursor='';showCoord(e.latlng.lat,e.latlng.lng);}});
  $('#coord').title='Right-click anywhere on the map to identify that point';
  map.on('zoomend moveend',updateLabels);
  const zc=()=>{map.getContainer().classList.toggle('z8',map.getZoom()>=8);map.getContainer().classList.toggle('z10',map.getZoom()>=10);};map.on('zoomend',zc);zc();
  $('#base').onchange=()=>{setBase($('#base').value);try{localStorage.setItem('mae_base',$('#base').value);}catch(e){}};
  $('#baseCfg').onclick=e=>{e.stopPropagation();openKeys();};
  try{let b=localStorage.getItem('mae_base');if(b==='dark')b='esridark';if(b==='light')b='street';if(b&&$('#base').querySelector('option[value="'+b+'"]')){$('#base').value=b;setTimeout(()=>setBase(b,true),0);}}catch(e){}
  $('#lang').onchange=()=>show(CUR,{keepView:true});
  $('#fillBtn').onclick=()=>setFill(!FILL);
  if(!FILL){$('#fillTxt').textContent='Off';$('#fillSw').style.background='transparent';}
  initRef();
}
function lbl(o){const v=$('#lang').value;if(v==='none')return'';if(v==='mm')return o.m||o.n;if(v==='both')return o.m?`${o.n}<br><span class="mm" style="font-weight:500">${esc(o.m)}</span>`:esc(o.n);return esc(o.n);}
const hasTiles=()=>!!baseTiles;
let FILL=true;try{FILL=localStorage.getItem('mae_fill')!=='off';}catch(e){}
function fillFix(s){if(FILL)return s;const dark=hasTiles()?'#ffffff':'#3fb6cc';return Object.assign({},s,{fillOpacity:0,color:(s.color==='#fff'||s.color==='#ffffff')?dark:s.color,weight:Math.max(s.weight||1,hasTiles()?1.4:1)});}
function setFill(on){FILL=on;try{localStorage.setItem('mae_fill',on?'on':'off');}catch(e){}
  $('#fillTxt').textContent=on?'On':'Off';$('#fillSw').style.background=on?'linear-gradient(135deg,#4e79a7 50%,#f28e2b 50%)':'transparent';
  if(COORD)showCoord(COORD.lat,COORD.lon,{keepView:true});else show(CUR,{keepView:true,keepTab:true});}
function polyStyle(i,active){const c=PAL[i%PAL.length];return{renderer:R,color:hasTiles()?'#fff':'#ffffff',opacity:hasTiles()?.9:.45,weight:1,fillColor:c,fillOpacity:hasTiles()?.28:.55};}
let labelLayers=[];
function updateLabels(){
  const z=map.getZoom();
  const placed=[];
  const pr=l=>{if(l.getBounds){const b=l.getBounds();return -(b.getNorth()-b.getSouth())*(b.getEast()-b.getWest());}return l.options.radius>=6?-1e9:1;};
  if(!labelLayers._s){labelLayers.sort((x,y)=>pr(x[0])-pr(y[0]));labelLayers._s=1;}
  labelLayers.forEach(([lyr,minZ])=>{const t=lyr.getTooltip&&lyr.getTooltip();if(!t)return;
    const el=t.getElement&&t.getElement();if(!el)return;
    if(z<minZ){el.style.display='none';return;}
    el.style.display='';const r=el.getBoundingClientRect();
    if(!r.width){return;}
    const hit=placed.some(q=>!(r.right+2<q.left||r.left-2>q.right||r.bottom+1<q.top||r.top-1>q.bottom));
    if(hit)el.style.display='none';else placed.push(r);});
}
function featBounds(f){return L.geoJSON(f).getBounds();}
function nodeBounds(p){
  const o=N[p];
  if(o.k==='country')return L.latLngBounds([[9.6,92.2],[28.5,101.2]]);
  const g=geoOf(p);if(g)return featBounds(g);
  if(o.x!=null)return L.latLng(o.y,o.x).toBounds(o.k==='village'?1500:4000);
  // vt without polygon -> villages bbox
  const pts=(KIDS[p]||[]).map(q=>N[q]).filter(v=>v.x!=null).map(v=>[v.y,v.x]);
  if(pts.length)return L.latLngBounds(pts).pad(.3);
  return nodeBounds(o.u);
}
function geoOf(p){const o=N[p];return (GEO[o.k]&&GEO[o.k][p])||(o.k==='town'&&GEO.vt[p])||null;}

function drawPolys(list,opts){
  list=list.filter(q=>q===CUR||q===FOCUS||mvOn(N[q]));
  // list: array of pcodes
  const grp=L.layerGroup();
  list.forEach((p,i)=>{
    const f=geoOf(p);if(!f)return;const o=N[p];
    const st0=fillFix(Object.assign(polyStyle(i),opts&&opts.style||{}));
    const lyr=L.geoJSON(f,{style:()=>st0,renderer:R});
    lyr.eachLayer(l=>{
      l.on('click',e=>{L.DomEvent.stop(e);show(p);});
      l.on('mouseover',()=>{hov(p,true)});l.on('mouseout',()=>{hov(p,false)});
      const t=lbl(o);
      if(t&&!(opts&&opts.noLabel)){l.bindTooltip(t,{permanent:true,direction:'center',className:'lbl',interactive:false});labelLayers.push([l,opts&&opts.minZ||0]);}
      else l.bindTooltip(`<b>${esc(o.n)}</b>${o.m?'<br><span class="mm">'+esc(o.m)+'</span>':''}<br><small>${TYPES[o.k]} · ${p}</small>`,{sticky:true,className:'tip'});
      LAYERMAP[p]=l;l._baseStyle=st0;
    });
    grp.addLayer(lyr);
  });
  return grp;
}
function hov(p,on){
  const l=LAYERMAP[p];
  if(l&&l.setStyle){l.setStyle(on?{weight:2.5,opacity:1,color:'#22d3ee',fillOpacity:FILL?Math.min(.85,(l._baseStyle.fillOpacity||.5)+.15):.18,fillColor:FILL?l._baseStyle.fillColor:'#22d3ee'}:l._baseStyle);if(on&&l.bringToFront)l.bringToFront();}
  if(l&&l.setRadius&&l._baseStyle){l.setStyle(on?{color:'#22d3ee',weight:3}:l._baseStyle);}
  document.querySelectorAll('.row[data-p="'+p+'"]').forEach(r=>r.classList.toggle('hov',on));
  if(on){const r=document.querySelector('.row[data-p="'+p+'"]');r&&r.scrollIntoView({block:'nearest'});}
}
function outline(p,style){
  const f=geoOf(p);if(!f)return;
  focusLayer.addLayer(L.geoJSON(f,{renderer:R,interactive:false,style:Object.assign({color:'#22d3ee',weight:2.4,fill:false},style||{})}));
}
function villageMarkers(list,{labels=false,highlight=null}={}){
  list=list.filter(q=>q===highlight||q===CUR||MV.village);
  list.forEach(p=>{const v=N[p];if(v.x==null)return;
    const on=p===highlight;
    const st={renderer:R,radius:(on?8:(labels?5:3.6))*ICON,color:on?'#22d3ee':'#05090d',weight:on?3:1,fillColor:'#ff6b6b',fillOpacity:.95};
    const m=L.circleMarker([v.y,v.x],st);m._baseStyle=st;LAYERMAP[p]=m;
    m.on('click',e=>{L.DomEvent.stop(e);show(p);});
    m.on('mouseover',()=>hov(p,true));m.on('mouseout',()=>hov(p,false));
    const t=lbl(v);
    if(labels&&t){m.bindTooltip(t,{permanent:true,direction:'right',offset:[4,0],className:'lbl'});labelLayers.push([m,0]);}
    else m.bindTooltip(`<b>${esc(v.n)}</b>${v.m?'<br><span class="mm">'+esc(v.m)+'</span>':''}<br><small>Village · ${p}</small>`,{className:'tip'});
    ptLayer.addLayer(m);});
}
function townMarkers(list){
  list=list.filter(q=>q===CUR||MV.town);
  list.forEach(p=>{const t=N[p];if(t.x==null)return;
    const st={renderer:R,radius:6*ICON,color:'#05090d',weight:1.5,fillColor:'#e2e8f0',fillOpacity:1};
    const m=L.circleMarker([t.y,t.x],st);m._baseStyle=st;LAYERMAP[p]=m;
    m.on('click',e=>{L.DomEvent.stop(e);show(p);});
    m.on('mouseover',()=>hov(p,true));m.on('mouseout',()=>hov(p,false));
    const tt=lbl(t);if(tt){m.bindTooltip(tt,{permanent:true,direction:'top',offset:[0,-4],className:'lbl'});labelLayers.push([m,0]);}
    ptLayer.addLayer(m);});
}

/* full screen: whole app; when embedded in an iframe without allow="fullscreen" (or on iPhone), open in a new tab instead */
const EMBEDDED=(()=>{try{return window.self!==window.top;}catch(e){return true;}})();
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
const fsOK=()=>!!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
function toggleFullscreen(){
  if(fsOK()){const d=document.documentElement;
    if(fsEl())(document.exitFullscreen||document.webkitExitFullscreen).call(document);
    else (d.requestFullscreen||d.webkitRequestFullscreen).call(d);return;}
  if(EMBEDDED){window.open(location.href,'_blank','noopener');toast('Opened the map in a new tab');}
}
function fsSync(){const on=!!fsEl();
  $('#fsIco').setAttribute('d',on?'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5':'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5');
  $('#fsBtn').title=on?'Exit full screen (Esc)':fsOK()?'Full screen':'Open the map in a new tab';
  if(map)setTimeout(()=>map.invalidateSize(),100);}
$('#fsBtn').onclick=toggleFullscreen;
document.addEventListener('fullscreenchange',fsSync);document.addEventListener('webkitfullscreenchange',fsSync);
if(!fsOK()&&!EMBEDDED)$('#fsBtn').style.display='none'; // e.g. iPhone Safari, not embedded: nothing useful to do
fsSync();
