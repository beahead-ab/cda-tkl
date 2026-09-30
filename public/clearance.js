// Train clearance toward the neighbouring stations through TrainMeet, the way a
// TMBox works: declare the train (uppställt, förare på plats), request, accept
// or refuse, report departure and arrival, withdraw before departure. A
// clearance is never a route, a lock or a signal aspect; those are still set in
// the interlocking. The panel shows what TrainMeet says happened and never
// applies an action locally.
import {createAdminDialog,escapeHTML as esc} from './admin-ui.js';
import {ACTION_TEXT,TRACK_TEXT,lineStatus,needsAttention,movementStatus,movementActions,movementDone} from './clearance-text.js';
export function createClearance({api,message}) {
  const root=document.getElementById('clearance-tools');if(!root)return null;
  root.innerHTML=`<p class="muted">Klarering begärs och besvaras mot grannstationerna genom TrainMeet, som en TMBox. Ett godkännande är varken tågväg eller körsignal; de läggs som vanligt i ställverket.</p>
<p id="cl-status" class="muted" role="status"></p>
<section class="card cl-shift" hidden><div class="card-heading"><h3>Trafikpass</h3><span id="cl-shift-state"></span></div><p id="cl-shift-text" class="muted"></p><p id="cl-auto-text" class="muted" hidden></p><div class="admin-actions"><button id="cl-shift-start" type="button">Starta trafikpass</button><button id="cl-shift-finish" type="button" hidden>Avsluta eller lämna över</button><button id="cl-auto-off" type="button" hidden>Stäng av TMBox-läget</button></div></section>
<div id="cl-lines" class="cl-lines" hidden></div>
<section class="card cl-trains" hidden><div class="card-heading"><h3>Tågrörelser i dag</h3><span id="cl-trains-count" class="muted"></span></div><p class="muted">Anmäl uppställt och förare på plats före avgång, närmar sig och ankommit vid ankomst. Avgått och mottaget bekräftas på sträckan ovan.</p><table id="cl-trains"><thead><tr><th>Tåg</th><th>Ank</th><th>Avg</th><th>Spår</th><th>Från / till</th><th>Läge</th><th></th></tr></thead><tbody></tbody></table></section>
<datalist id="cl-train-numbers"></datalist><datalist id="cl-tracks"></datalist>`;
  const $=id=>document.getElementById('cl-'+id);
  const startForm=document.createElement('form');startForm.id='cl-start-form';
  startForm.innerHTML='<label>Operatör<input id="cl-operator" maxlength="80" required autocomplete="off"></label><label class="cl-check"><input id="cl-take-over" type="checkbox"> Ta över det pågående trafikpasset</label><label class="cl-check"><input id="cl-auto" type="checkbox"> TMBox-läge: håll trafikpasset aktivt automatiskt så länge TKL är parkopplad</label><p class="muted">Namnet visas hos TrainMeet och i grannstationernas terminaler.</p><button type="submit" class="primary">Starta</button>';
  const finishForm=document.createElement('form');finishForm.id='cl-finish-form';
  finishForm.innerHTML='<label>Åtgärd<select id="cl-finish-status"><option value="closed">Avsluta · stationen blir obemannad</option><option value="handover">Lämna över till nästa operatör</option></select></label><label>Anteckning till nästa operatör<textarea id="cl-note" maxlength="1000" rows="3"></textarea></label><p class="muted">Pågående klareringar eller tåg på linjen hindrar avslut.</p><button type="submit" class="primary">Bekräfta</button>';
  let tm=null,online=false,busy=false,seen=new Set(),lastLines='',lastRows='',startBaseline='',finishBaseline='';
  const startValue=()=>JSON.stringify([$('operator').value,$('take-over').checked,$('auto').checked]);
  const finishValue=()=>JSON.stringify([$('finish-status').value,$('note').value]);
  const startDialog=createAdminDialog({title:'Starta trafikpass',body:startForm,saveButton:startForm.querySelector('button'),dirty:()=>startValue()!==startBaseline,busy:()=>busy});
  const finishDialog=createAdminDialog({title:'Avsluta trafikpass',body:finishForm,saveButton:finishForm.querySelector('button'),dirty:()=>finishValue()!==finishBaseline,busy:()=>busy});
  const call=(name,extra)=>api('trainmeet/'+name,{sessionId:tm.sessionId,revision:tm.revision,...extra});
  async function run(work){if(busy||!tm)return;busy=true;controls();try{return await work();}finally{busy=false;controls();}}
  const dialogError=dialog=>dialog.message(document.getElementById('message-text').textContent||'Åtgärden kunde inte genomföras.');
  startForm.onsubmit=e=>{e.preventDefault();run(async()=>{const name=$('operator').value.trim();if(await call('shift-start',{operatorName:name,takeOver:$('take-over').checked})){try{localStorage.setItem('charlottendal-operator',name);}catch{}if($('auto').checked)await call('auto-shift',{enabled:true,operatorName:name});startDialog.close(true);}else dialogError(startDialog);});};
  finishForm.onsubmit=e=>{e.preventDefault();run(async()=>{if(await call('shift-finish',{status:$('finish-status').value,note:$('note').value.trim()}))finishDialog.close(true);else dialogError(finishDialog);});};
  $('shift-start').onclick=()=>{let saved='';try{saved=localStorage.getItem('charlottendal-operator')||'';}catch{}$('operator').value=saved;const active=!!tm?.context?.shift;$('take-over').checked=active;$('take-over').closest('label').hidden=!active;$('auto').checked=!!tm?.autoShift?.enabled;startBaseline=startValue();startDialog.open();};
  $('auto-off').onclick=()=>run(()=>call('auto-shift',{enabled:false}));
  $('shift-finish').onclick=()=>{$('finish-status').value='closed';$('note').value='';finishBaseline=finishValue();finishDialog.open();};
  $('lines').addEventListener('submit',e=>{const form=e.target.closest('form[data-line]');if(!form)return;e.preventDefault();const input=form.querySelector('input');run(async()=>{if(await call('clearance',{connectionId:form.dataset.line,action:'request',trainNumber:input.value.trim()}))input.value='';});});
  $('lines').addEventListener('click',e=>{const button=e.target.closest('button[data-action]');if(!button)return;run(()=>call('clearance',{connectionId:button.dataset.line,action:button.dataset.action,trainNumber:''}));});
  $('trains').addEventListener('click',e=>{const button=e.target.closest('button[data-move]');if(!button)return;const [field,value]=button.dataset.move.split(':');const track=$('trains').querySelector(`input[data-track-for="${CSS.escape(button.dataset.movement)}"]`);run(async()=>{if(await call('movement',{movementId:button.dataset.movement,[field]:value,actualTrack:track?track.value.trim():''})&&track)track.value='';});});
  function controls(){
    // A poll in flight does not lock the buttons: the adapter queues a command behind it.
    const locked=!tm||!online||busy||!tm.paired||tm.stale;
    $('shift-start').disabled=locked;$('shift-finish').disabled=locked;$('auto-off').disabled=locked;
    const noShift=!tm?.context?.shift;
    for(const el of root.querySelectorAll('#cl-lines button,#cl-lines input,#cl-trains button,#cl-trains input'))el.disabled=locked||noShift;
    startDialog.setBusy(busy);finishDialog.setBusy(busy);
  }
  function notify(c){
    const incoming=new Map(c.lines.filter(needsAttention).map(l=>[l.id+':'+l.trainNumber,l]));
    for(const [key,l] of incoming)if(!seen.has(key))message(`Klareringsförfrågan från ${l.neighborName}: tåg ${l.trainNumber||'?'}`,{error:false,duration:10000});
    seen=new Set(incoming.keys());
    const badge=document.querySelector('[data-panel-tool="clearance-tools"] strong');if(badge)badge.textContent=incoming.size?`Tågklarering (${incoming.size})`:'Tågklarering';
  }
  // Replace markup only when it changed, and keep whatever the operator has typed.
  function swap(container,html,previous,inputAttr){
    if(html===previous)return html;
    const typed=new Map([...container.querySelectorAll(`input[${inputAttr}]`)].map(i=>[i.getAttribute(inputAttr),i.value]));
    container.innerHTML=html;
    for(const [key,value] of typed){const input=container.querySelector(`input[${inputAttr}="${CSS.escape(key)}"]`);if(input)input.value=value;}
    return html;
  }
  function render(){
    const c=tm.context,stale=!online||tm.stale;
    $('status').innerHTML=!tm.paired?'Parkoppla med TrainMeet under <a href="#trainmeet">Tidtabeller → TrainMeet</a> innan stationen kan klarera tåg.':!c?'Väntar på TrainMeets stationskontext…':`${esc(c.station.name)} · ${esc(c.meet)} · ${esc(c.day)} · TrainMeet-klocka ${esc(c.clock.time.slice(0,5))}${stale?' · <strong>kontakt saknas, gamla uppgifter</strong>':''}`;
    root.querySelector('.cl-shift').hidden=!c;$('lines').hidden=!c;root.querySelector('.cl-trains').hidden=!c;
    if(!c){lastLines=lastRows='';$('lines').innerHTML='';$('trains').querySelector('tbody').innerHTML='';controls();return;}
    const shift=c.shift,previous=c.previousShift;
    $('shift-state').textContent=shift?'Aktivt':'Inget trafikpass';
    $('shift-text').textContent=shift?`${shift.operatorName} · ${shift.terminalName||tm.clientId}${shift.startedAt&&!Number.isNaN(Date.parse(shift.startedAt))?' · sedan '+new Date(shift.startedAt).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'}):''}`
      :(previous?`Senast ${previous.operatorName}${previous.status==='handover'?' lämnade över':' avslutade'}${previous.note?' · '+previous.note:''}. `:'')+'Starta trafikpasset innan klareringar hanteras.';
    $('shift-start').textContent=shift?'Ta över trafikpasset':'Starta trafikpass';$('shift-finish').hidden=!shift;
    const auto=tm.autoShift||{};$('auto-text').hidden=!auto.enabled;$('auto-off').hidden=!auto.enabled;
    $('auto-text').textContent=auto.enabled?`TMBox-läge: trafikpasset återupptas automatiskt som ${auto.operatorName}${auto.error?' · senaste försök: '+auto.error:''}.`:'';
    const lines=c.lines.map(line=>{
      const actions=line.actions.map(a=>a==='request'
        ?`<form data-line="${esc(line.id)}"><input data-request-for="${esc(line.id)}" list="cl-train-numbers" inputmode="numeric" pattern="[0-9]{1,10}" maxlength="10" placeholder="Tågnummer" aria-label="Tågnummer mot ${esc(line.neighborName)}" required autocomplete="off"><button type="submit" class="primary">${ACTION_TEXT.request}</button></form>`
        :`<button type="button" data-line="${esc(line.id)}" data-action="${a}" class="${['accept','depart','arrive'].includes(a)?'primary':''}">${ACTION_TEXT[a]}</button>`).join('');
      return `<section class="card cl-line${needsAttention(line)?' attention':''}" data-state="${esc(line.state)}"><h3>${esc(line.neighborName)} <small>${esc(TRACK_TEXT[line.trackType]||line.trackType||'')}</small></h3><p class="cl-state">${esc(lineStatus(line))}</p><div class="admin-actions">${actions||'<span class="muted">Inget att göra här nu.</span>'}</div></section>`;
    }).join('')||'<p class="muted">TrainMeet har inga sträckor registrerade för stationen.</p>';
    lastLines=swap($('lines'),lines,lastLines,'data-request-for');
    const states=new Map(c.movements.map(m=>[m.id,m])),trackLabel=new Map(c.tracks.map(t=>[t.id,t.label]));
    const sorted=[...c.trains].sort((a,b)=>(a.arrival_time||a.departure_time||'').localeCompare(b.arrival_time||b.departure_time||'',undefined,{numeric:true}));
    let open=0;
    const rows=sorted.map(t=>{
      const m=states.get(t.id),done=movementDone(m,t);if(!done)open++;
      const actions=movementActions(m,t).map(a=>`<button type="button" data-move="${a.field}:${a.value}" data-movement="${esc(t.id)}" class="${a.primary?'primary':''}">${a.label}</button>`).join('');
      const trackInput=m?.arrival==='approaching'?`<input data-track-for="${esc(t.id)}" list="cl-tracks" maxlength="10" placeholder="Spår" aria-label="Verkligt spår för tåg ${esc(t.train_number)}" autocomplete="off">`:'';
      const track=m?.track?trackLabel.get(m.track)||m.track:t.track;
      return `<tr class="${done?'done':''}${m?.departure==='ready'?' ready':''}"><td>${esc(t.train_number)}</td><td>${esc(t.arrival_time||'')}</td><td>${esc(t.departure_time||'')}</td><td>${esc(track||'')}</td><td>${esc([t.arrival_from,t.departure_to].filter(Boolean).join(' → '))}</td><td>${esc(movementStatus(m,t))}</td><td class="cl-row-actions">${trackInput}${actions}</td></tr>`;
    }).join('');
    lastRows=swap($('trains').querySelector('tbody'),rows,lastRows,'data-track-for');
    $('trains-count').textContent=`${open} av ${sorted.length} kvar`;
    const numbers=[...new Set(c.trains.map(t=>t.train_number).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'sv',{numeric:true}));
    const list=numbers.map(n=>`<option value="${esc(n)}"></option>`).join('');if($('train-numbers').innerHTML!==list)$('train-numbers').innerHTML=list;
    const tracks=c.tracks.map(t=>`<option value="${esc(t.label)}"></option>`).join('');if($('tracks').innerHTML!==tracks)$('tracks').innerHTML=tracks;
    controls();notify(c);
  }
  return {update(next,connected){tm=next;online=connected;if(!tm)return;render();}};
}
