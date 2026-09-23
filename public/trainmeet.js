const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTrainMeet({api}) {
  const root=document.getElementById('trainmeet');let state,online=false,lastContent='';
  root.innerHTML='<summary>TrainMeet <span id="tm-status">Ej ansluten</span></summary><p id="tm-message" class="muted"></p><div id="tm-context"></div><div class="actions"><button id="tm-refresh">Hämta senaste</button><button id="tm-disconnect">Koppla från</button></div><details><summary>Anslut till TrainMeet</summary><p id="tm-origin" class="muted"></p><form id="tm-pair"><div class="catalog"><label>Stations-id<input id="tm-station" maxlength="128" required autocomplete="off"></label><label>Anslutningskod<input id="tm-code" type="password" maxlength="128" required autocomplete="off"></label><button id="tm-connect">Parkoppla</button></div></form></details>';
  const $=id=>document.getElementById('tm-'+id);
  const action=(name,extra={})=>api('trainmeet/'+name,{sessionId:state.sessionId,revision:state.revision,...extra});
  $('pair').onsubmit=async e=>{e.preventDefault();const code=$('code').value;$('code').value='';await action('pair',{stationId:$('station').value.trim(),code});};
  $('refresh').onclick=()=>action('refresh');$('disconnect').onclick=()=>action('disconnect');
  return {update(next,connected){state=next;online=connected;if(!state)return;
    const stale=!online||state.stale;
    $('status').textContent=!state.paired?'Ej ansluten':stale?'Kontakt saknas · gamla uppgifter':'Ansluten · läsande';
    $('message').textContent=state.error||'Tåginformation från TrainMeet. Beläggning och ställverksmanövrer hanteras separat.';
    $('origin').textContent=state.origin?'Server: '+state.origin:'TrainMeet-servern behöver anges för den här installationen innan parkoppling kan göras.';
    $('connect').disabled=!online||!state.origin||state.busy;$('refresh').disabled=!online||!state.paired||state.busy;$('disconnect').disabled=!online||!state.paired||state.busy;
    root.classList.toggle('trainmeet-stale',!!state.paired&&stale);
    const c=state.context;let html='';
    if(c){const rows=c.trains.map(t=>{const m=c.movements.find(m=>m.id===t.id);return `<tr><td>${esc(t.train_number||t.id)}</td><td>${esc(t.arrival_time||'—')}</td><td>${esc(t.departure_time||'—')}</td><td>${esc(m?.track||t.track||'—')}</td><td>${esc([m?.arrival,m?.departure].filter(Boolean).join(' · ')||'—')}</td></tr>`;}).join('');html=`<div class="trainmeet-heading"><strong>${esc(c.station.name)} · ${esc(c.meet)} · ${esc(c.day)}</strong><span>TrainMeet-klocka ${esc(c.clock.time)} · ${c.clock.running?'går':'pausad'} · ${c.clock.rate}×${stale?' · gammalt besked':''}</span></div><div class="table-wrap"><table><thead><tr><th>Tåg</th><th>Ankomst</th><th>Avgång</th><th>Spår</th><th>Driftläge</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Inga tågrörelser på stationen.</td></tr>'}</tbody></table></div><details><summary>Förbindelselägen</summary>${c.connections.map(n=>`<p>${esc(n.id)} · ${esc(n.state)} ${esc(n.trainNumber)}</p>`).join('')||'<p>Inga förbindelser.</p>'}</details>`;}
    if(html!==lastContent){lastContent=html;$('context').innerHTML=html;}
  }};
}
