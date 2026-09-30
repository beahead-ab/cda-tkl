import {createTrainMeetTimetable} from './trainmeet-timetable.js';
import {createAdminDialog,confirmAdmin,escapeHTML as esc} from './admin-ui.js';
export function createTrainMeet({api,onTimetable}) {
  const root=document.getElementById('trainmeet'),$=id=>document.getElementById('tm-'+id);
  const timetable=createTrainMeetTimetable({selectSource:data=>api('timetable-import/select',data)});
  let state,online=false,lastContent='',busy=false,editBaseline='',pairBaseline='',openedRevision;
  root.innerHTML=`<div class="card-heading"><h2>Anslutning</h2><span id="tm-status" role="status">Ej ansluten</span></div><p id="tm-message" class="muted"></p><dl class="admin-summary"><dt>TKL-id</dt><dd id="tm-identity"></dd><dt>Serveradress</dt><dd id="tm-origin"></dd><dt>Station</dt><dd id="tm-station-summary"></dd></dl><div class="admin-actions"><button id="tm-edit">Redigera anslutning</button><button id="tm-pair-open">Parkoppla</button><button id="tm-refresh">Hämta senaste</button><button id="tm-disconnect">Koppla från</button><button id="tm-show-timetable">Visa tidtabell</button></div><div id="tm-context"></div>`;
  const editForm=document.createElement('form');editForm.id='tm-server-form';
  editForm.innerHTML=`<label>TKL-id<input id="tm-client-id" minlength="3" maxlength="64" pattern="[A-Za-z0-9._:\\-]{3,64}" required autocomplete="off" spellcheck="false" aria-describedby="tm-client-help"></label><p id="tm-client-help" class="muted">Det här id:t visas hos TrainMeet. Varje TKL-installation ska ha ett eget id.</p><label>Serveradress<input id="tm-server" type="url" maxlength="512" placeholder="https://server.trainmeet.app" autocomplete="url" spellcheck="false"></label><p id="tm-server-help" class="muted"></p><button id="tm-save-server" type="submit">Spara anslutning</button>`;
  const editValue=()=>JSON.stringify([$ ('client-id').value,$('server').value]);
  const editDialog=createAdminDialog({title:'Redigera anslutning',body:editForm,saveButton:editForm.querySelector('button'),dirty:()=>editValue()!==editBaseline,busy:()=>busy});
  const pairForm=document.createElement('form');pairForm.id='tm-pair';pairForm.innerHTML='<p id="tm-pair-destination" class="muted"></p><label>Stations-id<input id="tm-station" maxlength="128" required autocomplete="off"></label><label>Anslutningskod<input id="tm-code" type="password" maxlength="128" required autocomplete="off"></label><p class="muted">Använd stationens id och serverns anslutningskod från TrainMeet.</p><button id="tm-connect" type="submit">Parkoppla</button>';
  const pairValue=()=>JSON.stringify([$ ('station').value,$('code').value]);
  const pairDialog=createAdminDialog({title:'Parkoppla med TrainMeet',body:pairForm,saveButton:pairForm.querySelector('button'),dirty:()=>pairValue()!==pairBaseline,busy:()=>busy,onCancel:()=>{$('code').value='';}});
  const action=(name,extra={},version=state)=>api('trainmeet/'+name,{sessionId:version.sessionId,revision:version.revision,...extra});
  function controls(){
    if(!state)return;const disabled=!online||busy||state.busy;
    $('edit').disabled=disabled||state.paired;$('pair-open').hidden=state.paired;$('pair-open').disabled=disabled||!state.origin;
    $('save-server').disabled=disabled||state.paired;$('connect').disabled=disabled||state.paired||!state.origin;
    $('refresh').hidden=!state.paired;$('disconnect').hidden=!state.paired;
    $('refresh').disabled=disabled;$('disconnect').disabled=disabled;
    editDialog.setBusy(busy);pairDialog.setBusy(busy);
  }
  async function submit(dialog,name,payload){
    if(busy)return;busy=true;controls();dialog.message('');
    try{const answer=await action(name,payload,openedRevision);if(answer){dialog.close(true);$('code').value='';}else dialog.message(document.getElementById('message-text').textContent||'Kunde inte spara. Försök igen.');}
    finally{busy=false;controls();}
  }
  $('edit').onclick=()=>{openedRevision={...state};$('client-id').value=state.clientId;$('server').value=state.origin;$('server').readOnly=state.originLocked;editBaseline=editValue();$('server-help').textContent=state.originLocked?'Serveradressen är fast för den här installationen.':'Adressen ska kunna nås från TKL-servern.';editDialog.open();};
  $('pair-open').onclick=()=>{openedRevision={...state};$('station').value=state.stationId||'';$('code').value='';pairBaseline=pairValue();$('pair-destination').textContent=state.clientId+' → '+state.origin;pairDialog.open();};
  editForm.onsubmit=e=>{e.preventDefault();submit(editDialog,'configure',{clientId:$('client-id').value.trim(),origin:$('server').value.trim()});};
  pairForm.onsubmit=e=>{e.preventDefault();submit(pairDialog,'pair',{stationId:$('station').value.trim(),code:$('code').value});};
  $('refresh').onclick=()=>action('refresh');
  $('disconnect').onclick=()=>confirmAdmin({title:'Koppla från TrainMeet?',message:'TKL slutar hämta träffens tidtabell och trafikläge. Du kan parkoppla igen senare.',button:'Koppla från',action:async()=>!!await action('disconnect')});
  $('show-timetable').onclick=onTimetable;
  return {update(next,connected,imported){
    state=next;online=connected;if(!state)return;timetable.update(state,online,imported);
    const stale=!online||state.stale;
    $('status').textContent=!state.paired?'Ej ansluten':stale?'Kontakt saknas · gamla uppgifter':'Ansluten';
    document.getElementById('menu-trainmeet-status').textContent=!state.paired?'Ej ansluten':stale?'Kontakt saknas':'Ansluten';
    $('message').textContent=state.error||(state.paired?'Koppla från innan du ändrar anslutningen.':'Spara serveradress och TKL-id, parkoppla sedan med träffen.');
    $('identity').textContent=state.clientId;$('origin').textContent=state.origin||'Ingen server vald';$('station-summary').textContent=state.context?.station.name||state.stationId||'Ingen station vald';
    controls();root.classList.toggle('trainmeet-stale',!!state.paired&&stale);
    const c=state.context;let html='';if(c)html=`<div class="trainmeet-heading"><strong>${esc(c.station.name)} · ${esc(c.meet)} · ${esc(c.day)}</strong><span>${c.trains.length} tågrörelser · TrainMeet-klocka ${esc(c.clock.time)}${stale?' · gamla uppgifter':''}</span></div><details><summary>Förbindelselägen</summary>${(c.lines||c.connections).map(n=>`<p>${esc(n.neighborName||n.id)} · ${esc(n.state)} ${esc(n.trainNumber)}</p>`).join('')||'<p>Inga förbindelser.</p>'}</details>`;
    if(html!==lastContent){lastContent=html;$('context').innerHTML=html;}
  }};
}
