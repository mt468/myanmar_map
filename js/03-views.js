/* ---------------- views ---------------- */
let CUR='ROOT',TAB=null,FOCUS=null;
const MV={vt:true,village:true,town:true,ward:true,ctx:true};
try{Object.assign(MV,JSON.parse(localStorage.getItem('mae_mv')||'{}'));}catch(e){}
function mvOn(o){if(!o)return true;return o.k==='vt'?MV.vt:o.k==='ward'?MV.ward:o.k==='town'?MV.town:true;}
document.querySelectorAll('[data-mv]').forEach(cb=>{cb.checked=MV[cb.dataset.mv];cb.onchange=()=>{MV[cb.dataset.mv]=cb.checked;try{localStorage.setItem('mae_mv',JSON.stringify(MV));}catch(e){}refreshView();};});
/* State / Region layer: on/off + filter */
let SON=true,SST='';try{SON=localStorage.getItem('mae_layer_states')!=='off';}catch(e){}
function stateOpts(sel,list){const c={};if(list)list.forEach(p=>{const s=N[p].st;c[s]=(c[s]||0)+1;});
  sel.innerHTML='<option value="">All States / Regions</option>'+kidsOf('ROOT','state').filter(s=>!list||c[s]).map(s=>`<option value="${s}">${esc(N[s].n)}${list?' ('+c[s]+')':''}</option>`).join('');}
function fitState(s){if(s&&map)map.fitBounds(nodeBounds(s),{padding:[30,30]});}
function initStatesLayer(){stateOpts($('#lsSt'));$('#lyStates').checked=SON;lyDim('lyStatesOpts',SON);$('#lyStatesN').textContent=kidsOf('ROOT','state').length;}
$('#lyStates').onchange=e=>{SON=e.target.checked;try{localStorage.setItem('mae_layer_states',SON?'on':'off');}catch(_){}lyDim('lyStatesOpts',SON);refreshView();};
$('#lsSt').onchange=e=>{SST=e.target.value;if(SST){show('ROOT',{keepView:true});fitState(SST);}else show('ROOT');};
