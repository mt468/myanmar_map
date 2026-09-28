/* ---------------- basemaps ---------------- */
let baseLabels=null,tileErrShown=false;
const BASEMAP_DEFAULT_KEYS={mt:'',mb:'',st:''}; // website owners can pre-fill domain-restricted keys here
function getKeys(){let k={};try{k=JSON.parse(localStorage.getItem('mae_keys')||'{}');}catch(e){}return Object.assign({},BASEMAP_DEFAULT_KEYS,Object.fromEntries(Object.entries(k).filter(([_,v])=>v!==''&&v!=null)));}
function setBase(v,quiet){
  if(baseTiles){map.removeLayer(baseTiles);baseTiles=null;}if(baseLabels){map.removeLayer(baseLabels);baseLabels=null;}
  const pane=map.getPane('tilePane');pane.classList.remove('night','dim');
  const K=getKeys();
  const esri=s=>'https://server.arcgisonline.com/ArcGIS/rest/services/'+s+'/MapServer/tile/{z}/{y}/{x}';
  const EA='Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors',CA='© OpenStreetMap contributors © CARTO',MA='© MapTiler © OpenStreetMap contributors',MBA='© Mapbox © OpenStreetMap contributors';
  const TL={
    esridark:[esri('Canvas/World_Dark_Gray_Base'),'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',{maxNativeZoom:16},'dgref'],
    nightstreet:[esri('World_Street_Map'),EA,{},null,'night'],
    nightsat:[esri('World_Imagery'),'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',{},'ref','dim'],
    street:[esri('World_Street_Map'),EA],
    topo:[esri('World_Topo_Map'),EA],
    sat:[esri('World_Imagery'),'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',{},'ref'],
    mt_dark:K.mt?['https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key='+encodeURIComponent(K.mt),MA]:'mt',
    mt_sat:K.mt?['https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key='+encodeURIComponent(K.mt),MA+' © Maxar',{},'ref']:'mt',
    mb_dark:K.mb?['https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token='+encodeURIComponent(K.mb),MBA,{tileSize:512,zoomOffset:-1}]:'mb',
    mb_sat:K.mb?['https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token='+encodeURIComponent(K.mb),MBA+' © Maxar',{tileSize:512,zoomOffset:-1}]:'mb',
    st_dark:K.st?['https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key='+encodeURIComponent(K.st),'© Stadia Maps © OpenMapTiles © OpenStreetMap contributors']:'st',
    custom:K.cu?[K.cu,K.ca||'Custom tiles']:'cu'};
  const d=TL[v];
  if(typeof d==='string'){ // missing key
    const nm={mt:'MapTiler key',mb:'Mapbox token',st:'Stadia key',cu:'custom tile URL'}[d];
    $('#kErr').textContent='Enter a '+nm+' to use this basemap.';if(!quiet)openKeys();
    refreshView();return;}
  if(d){
    tileErrShown=false;
    baseTiles=L.tileLayer(d[0],Object.assign({maxZoom:19,subdomains:'abcd',attribution:d[1]},d[2]||{}));
    baseTiles.on('tileerror',()=>{if(tileErrShown)return;tileErrShown=true;toast(v.startsWith('m')||v.startsWith('st')||v==='custom'?'Basemap tiles failed — check the API key / domain restriction':'Basemap tiles failed — check the internet connection');});
    baseTiles.addTo(map);baseTiles.bringToBack();
    if(d[4])pane.classList.add(d[4]);
    if(d[3]&&K.lbl){baseLabels=L.tileLayer(esri(d[3]==='dgref'?'Canvas/World_Dark_Gray_Reference':'Reference/World_Boundaries_and_Places'),{maxZoom:19,maxNativeZoom:16,pane:'overlayPane',opacity:.9});baseLabels.addTo(map);}
  }
  refreshView();
}
function refreshView(){if(COORD)showCoord(COORD.lat,COORD.lon,{keepView:true});else show(CUR,{keepView:true,keepTab:true});}
function openKeys(){const K=getKeys();$('#kMt').value=K.mt||'';$('#kMb').value=K.mb||'';$('#kSt').value=K.st||'';$('#kCu').value=K.cu||'';$('#kCa').value=K.ca||'';$('#kLbl').checked=!!K.lbl;$('#keyPop').style.display='block';}
$('#kSave').onclick=()=>{const k={mt:$('#kMt').value.trim(),mb:$('#kMb').value.trim(),st:$('#kSt').value.trim(),cu:$('#kCu').value.trim(),ca:$('#kCa').value.trim(),lbl:$('#kLbl').checked};
  if(k.cu&&!/\{z\}.*\{x\}.*\{y\}|\{z\}.*\{y\}.*\{x\}/.test(k.cu)){$('#kErr').textContent='Custom URL must contain {z}, {x} and {y}.';return;}
  try{localStorage.setItem('mae_keys',JSON.stringify(k));}catch(e){$('#kErr').textContent='This browser blocked saving; keys apply for this session only.';}
  $('#kErr').textContent='';$('#keyPop').style.display='none';
  let v=$('#base').value;
  if(v==='none'){v=k.mt?'mt_dark':k.mb?'mb_dark':k.st?'st_dark':k.cu?'custom':'esridark';$('#base').value=v;try{localStorage.setItem('mae_base',v);}catch(e){}}
  setBase(v);toast('Basemap settings saved');};
$('#kClear').onclick=()=>{try{localStorage.removeItem('mae_keys');}catch(e){}['#kMt','#kMb','#kSt','#kCu','#kCa'].forEach(s=>$(s).value='');toast('Keys cleared');};
document.addEventListener('mousedown',e=>{if(!e.target.closest('#keyPop')&&!e.target.closest('#baseCfg'))$('#keyPop').style.display='none';});
