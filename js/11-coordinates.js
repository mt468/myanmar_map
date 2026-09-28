/* ---------------- coordinates ---------------- */
let COORD=null,PICKING=false,BATCH=null;
const MMBOX={s:9.3,n:28.8,w:92.0,e:101.4};
const inMM=(la,lo)=>la>=MMBOX.s&&la<=MMBOX.n&&lo>=MMBOX.w&&lo<=MMBOX.e;
function parseCoord(str){
  if(!str)return null;
  let s=String(str).trim().replace(/[，]/g,',').replace(/[″”]/g,'"').replace(/[′’]/g,"'").replace(/º/g,'°');
  if(!/\d/.test(s)||/[a-df-mo-rt-vx-z]/i.test(s.replace(/lat|lon|long|latitude|longitude|deg/gi,'')))return null;
  let a=null,b=null,ha='',hb='';
  const dec=s.match(/^\s*([-+]?\d{1,3}(?:\.\d+)?)\s*([NSEW])?\s*[,;\s\/]\s*([-+]?\d{1,3}(?:\.\d+)?)\s*([NSEW])?\s*$/i);
  if(dec){a=+dec[1];ha=(dec[2]||'').toUpperCase();b=+dec[3];hb=(dec[4]||'').toUpperCase();}
  else{
    // DMS: collect number groups, split by hemisphere letters or comma
    const toks=s.match(/[-+]?\d+(?:\.\d+)?|[NSEW]|,|;/gi);if(!toks)return null;
    const groups=[];let cur=[];
    for(const tk of toks){
      if(/^[NSEW]$/i.test(tk)){ if(cur.length){groups.push({n:cur,h:tk.toUpperCase()});cur=[];} else if(groups.length&&!groups[groups.length-1].h)groups[groups.length-1].h=tk.toUpperCase(); }
      else if(tk===','||tk===';'){ if(cur.length){groups.push({n:cur,h:''});cur=[];} }
      else cur.push(+tk);
    }
    if(cur.length)groups.push({n:cur,h:''});
    if(groups.length===1&&groups[0].n.length===6)groups.splice(0,1,{n:groups[0].n.slice(0,3),h:''},{n:groups[0].n.slice(3),h:''});
    if(groups.length===1&&groups[0].n.length===4)groups.splice(0,1,{n:groups[0].n.slice(0,2),h:''},{n:groups[0].n.slice(2),h:''});
    if(groups.length!==2)return null;
    const dms=g=>{const [d,m=0,se=0]=g.n;if(g.n.length>3||m>=60||se>=60)return NaN;const sg=d<0?-1:1;return sg*(Math.abs(d)+m/60+se/3600);};
    a=dms(groups[0]);b=dms(groups[1]);ha=groups[0].h;hb=groups[1].h;
  }
  if(!isFinite(a)||!isFinite(b))return null;
  if(ha==='S'||ha==='W')a=-Math.abs(a);if(hb==='S'||hb==='W')b=-Math.abs(b);
  let lat=a,lon=b,swapped=false;
  if(ha==='E'||ha==='W'||hb==='N'||hb==='S'){lat=b;lon=a;swapped=true;}
  else if(!ha&&!hb&&!inMM(a,b)&&inMM(b,a)){lat=b;lon=a;swapped=true;}
  if(Math.abs(lat)>90||Math.abs(lon)>180)return null;
  return {lat,lon,swapped};
}
function toDMS(v,pos,neg){const h=v<0?neg:pos;v=Math.abs(v);let d=Math.floor(v),m=Math.floor((v-d)*60),s=((v-d)*60-m)*60;if(s>=59.95){s=0;m++;}if(m===60){m=0;d++;}return `${d}°${String(m).padStart(2,'0')}'${s.toFixed(1).padStart(4,'0')}"${h}`;}
function ringIn(r,x,y){let ins=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))ins=!ins;}return ins;}
function fbb(f){if(f._bb)return f._bb;let a=[1e9,1e9,-1e9,-1e9];const g=f.geometry;const P=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  P.forEach(p=>p[0].forEach(([x,y])=>{if(x<a[0])a[0]=x;if(y<a[1])a[1]=y;if(x>a[2])a[2]=x;if(y>a[3])a[3]=y;}));return f._bb=a;}
function inFeat(f,x,y){if(!f||!f.geometry)return false;const b=fbb(f);if(x<b[0]||x>b[2]||y<b[1]||y>b[3])return false;
  const g=f.geometry;const P=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  return P.some(p=>ringIn(p[0],x,y)&&!p.slice(1).some(h=>ringIn(h,x,y)));}
function hav(la1,lo1,la2,lo2){const r=Math.PI/180,dl=(la2-la1)*r,dn=(lo2-lo1)*r;const a=Math.sin(dl/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dn/2)**2;return 12742*Math.asin(Math.sqrt(a));}
function bearing(la1,lo1,la2,lo2){const r=Math.PI/180;const y=Math.sin((lo2-lo1)*r)*Math.cos(la2*r),x=Math.cos(la1*r)*Math.sin(la2*r)-Math.sin(la1*r)*Math.cos(la2*r)*Math.cos((lo2-lo1)*r);const d=(Math.atan2(y,x)/r+360)%360;return ['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8];}
let VGRID=null;
function vgrid(){if(VGRID)return VGRID;VGRID=new Map();for(const p in N){const o=N[p];if(o.k!=='village'||o.x==null)continue;const k=Math.floor(o.y*10)+'_'+Math.floor(o.x*10);(VGRID.get(k)||VGRID.set(k,[]).get(k)).push(o);}return VGRID;}
function nearestVillages(lat,lon,k=5){
  const G=vgrid(),cy=Math.floor(lat*10),cx=Math.floor(lon*10);let found=[];
  for(let r=0;r<=40;r++){
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const c=G.get((cy+dy)+'_'+(cx+dx));if(c)c.forEach(o=>found.push([hav(lat,lon,o.y,o.x),o]));}
    if(found.length>=k){found.sort((a,b)=>a[0]-b[0]);if(found[k-1][0]<=r*11.1)break;}
  }
  found.sort((a,b)=>a[0]-b[0]);return found.slice(0,k);
}
function locate(lat,lon){
  const x=lon,y=lat,res={lat,lon,inside:inMM(lat,lon)};
  let ts=null;for(const p in GEO.township){if(inFeat(GEO.township[p],x,y)){ts=p;break;}}
  res.near=nearestVillages(lat,lon,8);
  if(!ts&&res.near.length&&res.near[0][0]<25){const vt0=N[res.near[0][1].u];ts=vt0&&N[vt0.u]&&N[vt0.u].k==='township'?vt0.u:null;res.approx=true;}
  res.ts=ts;
  if(ts){
    for(const q of kidsOf(ts,'town')){const f=geoOf(q);if(f&&inFeat(f,x,y)){res.town=q;break;}}
    if(res.town)for(const w of kidsOf(res.town,'ward')){if(inFeat(GEO.ward[w],x,y)){res.ward=w;break;}}
    if(!res.ward)for(const q of kidsOf(ts).filter(q=>N[q].k==='town'))for(const w of kidsOf(q,'ward')){if(inFeat(GEO.ward[w],x,y)){res.ward=w;res.town=q;break;}}
    if(!res.town)for(const v of kidsOf(ts,'vt')){if(inFeat(GEO.vt[v],x,y)){res.vt=v;break;}}
  }
  const leaf=res.ward||res.town||res.vt||res.ts;
  res.chain=leaf?ancestors(leaf).slice(1):[];
  return res;
}
async function showCoord(lat,lon,opt={}){
  $('#locPop').style.display='none';
  const need=statesAt(lat,lon).filter(s=>!GEODONE[s]);
  if(need.length){toast('Loading boundaries…');await Promise.all(need.map(ensureState));}
  const r=locate(lat,lon);COORD=r;
  const target=r.ward||r.town||r.vt||r.ts;
  show(target||'ROOT',{keepView:true,coord:true});
  COORD=r;
  history.replaceState(null,'','#@'+lat.toFixed(6)+','+lon.toFixed(6));
  const pin=L.marker([lat,lon],{icon:L.divIcon({className:'',html:'<svg width="15" height="20" viewBox="0 0 30 40"><path d="M15 39s12-12.5 12-23A12 12 0 0 0 3 16c0 10.5 12 23 12 23z" fill="#0a121a" stroke="#22d3ee" stroke-width="2"/><circle cx="15" cy="16" r="5" fill="#e8a33d"/></svg>',iconSize:[15,20],iconAnchor:[7.5,19.5]}),zIndexOffset:1000});
  pin.bindTooltip(`${lat.toFixed(5)}, ${lon.toFixed(5)}`,{direction:'top',offset:[0,-18],className:'tip'});
  ptLayer.addLayer(pin);
  if(r.near[0]){const v=r.near[0][1];ptLayer.addLayer(L.polyline([[lat,lon],[v.y,v.x]],{renderer:R,color:'#22d3ee',weight:1.5,dashArray:'4 4',interactive:false}));}
  if(!opt.keepView)map.setView([lat,lon],Math.max(12,Math.min(map.getZoom(),14)));
  renderCoordSide(r);
}
function renderCoordSide(r){
  const {lat,lon}=r;
  $('#crumbs').innerHTML=`<a data-p="ROOT">Myanmar</a> › `+r.chain.map(a=>`<a data-p="${a.p}">${esc(a.n)}</a>`).join(' › ')+(r.chain.length?' › ':'')+'<b>Coordinate</b>';
  let h=`<div class="type">Coordinate lookup</div><h2 style="font-family:ui-monospace,Consolas,monospace;font-size:19px">${lat.toFixed(6)}, ${lon.toFixed(6)}</h2>
  <div class="alt">${toDMS(lat,'N','S')} &nbsp; ${toDMS(lon,'E','W')}</div><div class="kv">`;
  if(!r.chain.length)h+=`<div>Location</div><div>${r.inside?'Not inside any township boundary':'Outside Myanmar'}</div>`;
  r.chain.forEach(a=>h+=`<div>${TYPES[a.k]}</div><div><a data-p="${a.p}" style="color:var(--accent);cursor:pointer">${esc(a.n)}</a>${a.m?` <span class="mm" style="color:var(--muted)">${esc(a.m)}</span>`:''} <span class="pc" data-copy="${a.p}" style="font-size:11px">${a.p}</span></div>`);
  if(r.ts&&!r.vt&&!r.town&&!r.ward)h+=`<div>Village Tract</div><div style="color:var(--muted)">No village-tract polygon at this point</div>`;
  let vtDiff=false;
  if(r.near[0]){const [d,v]=r.near[0];const vv=N[v.u];vtDiff=r.vt&&vv&&vv.p!==r.vt;
    h+=`<div>Nearest village</div><div><a data-p="${v.p}" style="color:var(--accent);cursor:pointer">${esc(v.n)}</a>${v.m?' <span class="mm">'+esc(v.m)+'</span>':''} — ${d<1?Math.round(d*1000)+' m':d.toFixed(2)+' km'} ${bearing(lat,lon,v.y,v.x)}<br><span style="font-size:12px;color:var(--muted)">coded to VT <a data-p="${vv.p}" style="color:var(--accent);cursor:pointer">${esc(vv.n)}</a> ${vv.p}</span></div>`;}
  h+='</div>';
  if(vtDiff)h+=`<div class="note">The nearest village is coded by MIMU to a different village tract than the boundary this point falls in. This is common in MIMU v9.4 — about 1 in 4 village points lie outside their own VT polygon — so check both.</div>`;
  if(r.approx)h+=`<div class="note">This point falls just outside the (simplified) township boundaries — township assigned from the nearest village. Check against the original MIMU shapefile if precision matters.</div>`;
  else if(r.chain.length)h+=`<div class="note" style="color:var(--muted);background:var(--soft)">Boundaries are simplified for speed; points within ~100 m of a border may fall on the neighbouring unit.</div>`;
  h+=`<div class="actions"><button class="btn" data-copy="${lat.toFixed(6)}, ${lon.toFixed(6)}">Copy lat, long</button><button class="btn" data-copyrow="1">Copy result row</button><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}">Google Maps ↗</a></div>`;
  $('#card').innerHTML=h;
  $('#tabs').innerHTML='';$('#lf').value='';
  $('#listTitle').textContent='Nearest villages';
  $('#list').innerHTML=r.near.length?r.near.map(([d,v])=>`<div class="row" data-p="${v.p}"><span class="sw" style="background:#c0392b;border-radius:50%"></span><div class="t"><div>${esc(v.n)}</div>${v.m?`<div class="m mm">${esc(v.m)}</div>`:''}<div class="m" style="font-size:11.5px;color:var(--muted)">${esc(N[v.u].n)} VT · ${esc(N[N[v.u].u].n)}</div></div><div class="c"><b>${d<1?Math.round(d*1000)+' m':d.toFixed(2)+' km'}</b> ${bearing(r.lat,r.lon,v.y,v.x)}<br><span style="font-family:ui-monospace,Consolas,monospace">${v.p}</span></div></div>`).join(''):'<div class="empty">No villages nearby.</div>';
}
function resultRow(r){
  const g=k=>r.chain.find(a=>a.k===k);const v=r.near[0];
  return {State_Region:g('state')?.n||'',ST_PCode:g('state')?.p||'',District:g('district')?.n||'',DT_PCode:g('district')?.p||'',Township:g('township')?.n||'',TS_PCode:g('township')?.p||'',
    Village_Tract:g('vt')?.n||'',VT_PCode:g('vt')?.p||'',Town:g('town')?.n||'',Town_PCode:g('town')?.p||'',Ward:g('ward')?.n||'',Ward_PCode:g('ward')?.p||'',
    Nearest_Village:v?v[1].n:'',Nearest_Village_MMR:v?v[1].m:'',Village_PCode:v?v[1].p:'',Village_Dist_km:v?v[0].toFixed(3):'',
    Village_Coded_VT:v?N[v[1].u].n:'',Village_Coded_VT_PCode:v?v[1].u:'',
    Match:!r.inside?'Outside Myanmar':r.approx?'Approx (nearest village)':r.chain.length?'Inside':'Not matched'};
}
// card clicks for coord view (copy row)
$('#card').addEventListener('click',e=>{if(e.target.closest('[data-copyrow]')&&COORD){const o=resultRow(COORD);const line=[COORD.lat.toFixed(6),COORD.lon.toFixed(6),...Object.values(o)].join('\t');
  navigator.clipboard&&navigator.clipboard.writeText(line).then(()=>toast('Row copied — paste into Excel'));}});
// popover
$('#locBtn').onclick=e=>{e.stopPropagation();const p=$('#locPop');p.style.display=p.style.display==='block'?'none':'block';if(p.style.display==='block'){if(COORD){$('#inLat').value=COORD.lat.toFixed(6);$('#inLon').value=COORD.lon.toFixed(6);}$('#inLat').focus();}};
document.addEventListener('mousedown',e=>{if(!e.target.closest('#locPop')&&!e.target.closest('#locBtn'))$('#locPop').style.display='none';});
function goInputs(){
  const a=$('#inLat').value.trim(),b=$('#inLon').value.trim();
  let c=parseCoord(b?a+', '+b:a)||(b?null:parseCoord(a));
  if(!c&&!b)c=parseCoord(a);
  if(!c){$('#locErr').textContent='Could not read these coordinates.';return;}
  $('#locErr').textContent=c.swapped?'Read as long, lat — swapped.':'';
  showCoord(c.lat,c.lon);
}
$('#locGo').onclick=goInputs;
['#inLat','#inLon'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key==='Enter')goInputs();}));
$('#inLat').addEventListener('paste',e=>{const t=(e.clipboardData||window.clipboardData).getData('text');const c=parseCoord(t);if(c){e.preventDefault();$('#inLat').value=c.lat.toFixed(6);$('#inLon').value=c.lon.toFixed(6);$('#locErr').textContent=c.swapped?'Read as long, lat — swapped.':'';}});
$('#locPick').onclick=()=>{PICKING=true;$('#locPop').style.display='none';$('#map').style.cursor='crosshair';toast('Click a point on the map');};
// batch
$('#locBatch').onclick=()=>{$('#locPop').style.display='none';$('#modal').style.display='flex';$('#bIn').focus();};
$('#mClose').onclick=()=>$('#modal').style.display='none';
$('#modal').addEventListener('mousedown',e=>{if(e.target.id==='modal')$('#modal').style.display='none';});
function splitLine(l){return l.includes('\t')?l.split('\t'):l.split(/\s*[,;]\s*/);}
$('#bRun').onclick=async()=>{
  const lines=$('#bIn').value.split(/\r?\n/).filter(l=>l.trim());if(!lines.length)return;
  let hdr=null,li=-1,lo=-1;const first=splitLine(lines[0]).map(s=>s.trim());
  const fi=re=>first.findIndex(h=>re.test(h));
  li=fi(/^(lat|latitude|y|lat_dd|ycoord)$/i);lo=fi(/^(lon|long|lng|longitude|x|lon_dd|xcoord)$/i);
  let rows=lines;
  if(li>=0&&lo>=0){hdr=first;rows=lines.slice(1);}
  else if(!parseCoord(lines[0])&&first.length<2)rows=lines.slice(1);
  const out=[];let bad=0;
  const parsed=[];const needS=new Set();
  for(const l of rows){
    const cells=splitLine(l).map(s=>s.trim());let c=null,keep=cells;
    if(hdr)c=parseCoord(cells[li]+', '+cells[lo]);
    else{c=parseCoord(l.trim());if(!c&&cells.length>=3){c=parseCoord(cells.slice(-2).join(', '));keep=cells.slice(0,-2);} else keep=[];}
    parsed.push({cells,keep,c});if(c)statesAt(c.lat,c.lon).forEach(s=>needS.add(s));
  }
  const miss=[...needS].filter(s=>!GEODONE[s]);
  if(miss.length){$('#bMsg').textContent='Loading boundaries for '+miss.length+' state(s)…';await Promise.all(miss.map(ensureState));}
  const t0=performance.now();
  for(const {cells,keep,c} of parsed){
    if(!c){bad++;out.push({keep:cells,err:true});continue;}
    const r=locate(c.lat,c.lon);out.push({keep,lat:c.lat,lon:c.lon,r,row:resultRow(r)});
  }
  BATCH={hdr,out,extra:hdr?hdr:(out.find(o=>o.keep&&o.keep.length)?out.find(o=>o.keep.length).keep.map((_,i)=>i===0?'ID':'Col'+(i+1)):[])};
  const cols=['Lat','Long','State_Region','Township','Village_Tract','Town','Ward','Nearest_Village','Village_Dist_km','Village_Coded_VT','Match'];
  const idi=hdr?[0,1,2].find(i=>i!==li&&i!==lo&&i<hdr.length):0;const showId=hdr?idi!=null:BATCH.extra.length>0;
  $('#bOut').innerHTML='<table><tr>'+(showId?`<th>${esc(hdr?hdr[idi]:'ID')}</th>`:'')+cols.map(c=>`<th>${c.replace(/_/g,' ')}</th>`).join('')+'</tr>'+
    out.slice(0,300).map(o=>o.err?`<tr><td colspan="${cols.length+1}" style="color:#b3261e">Could not read: ${esc(o.keep.join(' '))}</td></tr>`:
    '<tr>'+(showId?`<td>${esc(o.keep[idi]||'')}</td>`:'')+`<td>${o.lat.toFixed(5)}</td><td>${o.lon.toFixed(5)}</td>`+cols.slice(2).map(c=>`<td>${esc(o.row[c])}</td>`).join('')+'</tr>').join('')+'</table>'+(out.length>300?`<div class="empty">Preview shows 300 of ${out.length} — download CSV for all.</div>`:'');
  $('#bMsg').textContent=`${out.length-bad} located${bad?', '+bad+' unreadable':''} · ${Math.round(performance.now()-t0)} ms`;
  $('#bCsv').disabled=false;$('#bMap').disabled=false;
};
$('#bCsv').onclick=()=>{if(!BATCH)return;
  const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const rc=Object.keys(resultRow({chain:[],near:[],inside:true}));
  const head=[...(BATCH.hdr||BATCH.extra),...(BATCH.hdr?[]:['Latitude','Longitude']),...rc];
  const lines=BATCH.out.map(o=>o.err?[...o.keep].map(q).join(','):[...(o.keep||[]),...(BATCH.hdr?[]:[o.lat.toFixed(6),o.lon.toFixed(6)]),...rc.map(k=>o.row[k])].map(q).join(','));
  const blob=new Blob(['﻿'+head.map(q).join(',')+'\n'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='coordinate_lookup.csv';a.click();};
$('#bMap').onclick=()=>{if(!BATCH)return;$('#modal').style.display='none';
  show('ROOT');const pts=[];
  BATCH.out.filter(o=>!o.err).forEach((o,i)=>{const m=L.circleMarker([o.lat,o.lon],{renderer:R,radius:Math.max(3,5*ICON),color:'#05090d',weight:1.5,fillColor:o.row.Match==='Inside'?'#22d3ee':'#f5a524',fillOpacity:1});
    m.bindTooltip(`<b>${esc(o.keep&&o.keep[0]||('#'+(i+1)))}</b><br>${o.lat.toFixed(5)}, ${o.lon.toFixed(5)}<br>${esc(o.row.Township)}${o.row.Village_Tract?' › '+esc(o.row.Village_Tract):''}${o.row.Ward?' › '+esc(o.row.Ward):''}`,{className:'tip'});
    m.on('click',e=>{L.DomEvent.stop(e);showCoord(o.lat,o.lon);});ptLayer.addLayer(m);pts.push([o.lat,o.lon]);});
  if(pts.length)map.fitBounds(L.latLngBounds(pts).pad(.2),{maxZoom:13});
  $('#legend').innerHTML='<div><i style="background:#22d3ee"></i>Batch point</div><div><i style="background:#f5a524"></i>Approx / outside</div>';$('#legend').style.display='';
};

(function clk(){const d=new Date(Date.now()+6.5*3600e3);const p=n=>String(n).padStart(2,'0');const e=document.getElementById('clock');if(e)e.textContent=`${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} MMT`;setTimeout(clk,1000);})();
init().catch(err=>{$('#loading').innerHTML='<div style="color:#a00">Could not load data: '+esc(err.message)+'<br>Please open this file in a recent Chrome, Edge or Firefox.</div>';console.error(err);});
