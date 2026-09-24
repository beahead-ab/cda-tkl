import {createTrainMeetTimetable} from './trainmeet-timetable.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTrainMeet({api,onTimetable}) {
  const root=document.getElementById('trainmeet');
  const timetable=createTrainMeetTimetable();
  let state,online=false,lastContent='',shownOrigin;
  root.innerHTML=`<div class="card-heading"><h2>Anslutning</h2><span id="tm-status" role="status">Ej ansluten</span></div>
    <p id="tm-message" class="muted"></p>
    <form id="tm-server-form"><div class="catalog"><label class="tm-server-label">Serveradress<input id="tm-server" type="url" maxlength="512" placeholder="http://localhost:8787" autocomplete="url" spellcheck="false"></label><button id="tm-save-server">Spara adress</button></div><p id="tm-server-help" class="muted"></p></form>
    <p id="tm-origin" class="muted"></p>
    <form id="tm-pair"><div class="catalog"><label>Stations-id<input id="tm-station" maxlength="128" required autocomplete="off"></label><label>Anslutningskod<input id="tm-code" type="password" maxlength="128" required autocomplete="off"></label><button id="tm-connect">Parkoppla</button></div><p class="muted">Använd stationens id och den vanliga anslutningskoden från TrainMeet.</p></form>
    <div class="actions"><button id="tm-refresh">Hämta senaste</button><button id="tm-disconnect">Koppla från</button><button id="tm-show-timetable">Visa tidtabell</button></div><div id="tm-context"></div>`;
  const $=id=>document.getElementById('tm-'+id);
  const action=(name,extra={})=>api('trainmeet/'+name,{sessionId:state.sessionId,revision:state.revision,...extra});
  function controls() {
    if(!state)return;
    const draft=$('server').value.trim(),dirty=draft!==state.origin;
    $('server').readOnly=state.originLocked||state.paired;
    $('save-server').hidden=state.originLocked||state.paired;
    $('save-server').disabled=!online||state.busy||!dirty;
    $('connect').disabled=!online||!state.origin||state.busy||dirty;
    $('refresh').disabled=!online||!state.paired||state.busy;
    $('disconnect').disabled=!online||!state.paired||state.busy;
    $('server-help').textContent=state.originLocked?'Den här installationen använder en fast serveradress.':state.paired?'Koppla från för att byta server.':dirty?'Spara serveradressen innan du parkopplar.':'Adressen ska vara nåbar från TKL-servern. För en lokal TrainMeet-server används HTTPS eller en lokal tunneladress.';
  }
  $('server').addEventListener('input',controls);
  $('server-form').onsubmit=async e=>{e.preventDefault();await action('configure',{origin:$('server').value.trim()});};
  $('pair').onsubmit=async e=>{e.preventDefault();if($('connect').disabled)return;const code=$('code').value;$('code').value='';await action('pair',{stationId:$('station').value.trim(),code});};
  $('refresh').onclick=()=>action('refresh');$('disconnect').onclick=()=>action('disconnect');
  $('show-timetable').onclick=onTimetable;
  return {update(next,connected){
    state=next;online=connected;if(!state)return;
    timetable.update(state,online);
    if(shownOrigin!==state.origin){
      // Never submit a code typed for an earlier server to a newly selected one.
      shownOrigin=state.origin;$('server').value=state.origin;$('code').value='';$('station').value=state.stationId||'';
    }
    const stale=!online||state.stale;
    $('status').textContent=!state.paired?'Ej ansluten':stale?'Kontakt saknas · gamla uppgifter':'Ansluten · läsande';
    document.getElementById('menu-trainmeet-status').textContent=!state.paired?'Ej ansluten':stale?'Kontakt saknas':'Ansluten';
    $('message').textContent=state.error||'Tåginformation från TrainMeet. Beläggning och ställverksmanövrer hanteras separat.';
    $('origin').textContent=state.origin?'Vald server: '+state.origin:'Ange serveradressen för att börja.';
    controls();root.classList.toggle('trainmeet-stale',!!state.paired&&stale);
    const c=state.context;let html='';
    if(c)html=`<div class="trainmeet-heading"><strong>${esc(c.station.name)} · ${esc(c.meet)} · ${esc(c.day)}</strong><span>${c.trains.length} ${c.trains.length===1?'tågrörelse':'tågrörelser'} · TrainMeet-klocka ${esc(c.clock.time)}${stale?' · gamla uppgifter':''}</span></div><details><summary>Förbindelselägen</summary>${c.connections.map(n=>`<p>${esc(n.id)} · ${esc(n.state)} ${esc(n.trainNumber)}</p>`).join('')||'<p>Inga förbindelser.</p>'}</details>`;
    if(html!==lastContent){lastContent=html;$('context').innerHTML=html;}
  }};
}
