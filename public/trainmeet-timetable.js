import {createAdminDialog} from './admin-ui.js';
import {createContextDialog} from './context-dialog.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=value=>({none:'',approaching:'Närmar sig',arrived:'Ankommet',positioned:'Uppställt',ready:'Redo',waiting:'Väntar',departed:'Avgått'})[value]??value;

export function createTrainMeetTimetable({selectSource}) {
  const root=document.getElementById('trainmeet-timetable'),$=id=>document.getElementById('tt-'+id);
  root.innerHTML='<header class="tt-heading"><h2>Tidtabell</h2><span id="tt-station"></span><span id="tt-clock"></span><nav class="tt-pagination" aria-label="Bläddra i tidtabellen"><button id="tt-prev" type="button" aria-label="Föregående tågrörelser">‹</button><span id="tt-range" role="status"></span><button id="tt-next" type="button" aria-label="Nästa tågrörelser">›</button></nav></header><p id="tt-status" role="status" hidden></p><div id="tt-content"></div>';
  document.getElementById('timetable-settings').innerHTML='<div class="admin-current-source"><div><h2>Visas i ställverket</h2><p id="tt-source-summary" class="muted"></p></div><button id="tt-change-source">Byt tidtabellskälla</button></div>';
  const sourceForm=document.createElement('form');sourceForm.id='tt-source-form';sourceForm.innerHTML='<label>Visa i ställverket<select id="tt-source"><option value="trainmeet">TrainMeet</option><option value="import">Egen tidtabell</option></select></label><p class="muted">Båda källorna behålls när du byter.</p><button id="tt-save-source" type="submit">Spara</button>';
  let sourceBase='',sourceRevision,sourceBusy=false;
  const sourceDialog=createAdminDialog({title:'Byt tidtabellskälla',body:sourceForm,saveButton:sourceForm.querySelector('button'),dirty:()=>$('source').value!==sourceBase,busy:()=>sourceBusy});

  const dialog=document.createElement('dialog');dialog.className='inspector-host timetable-details';dialog.setAttribute('aria-labelledby','tt-detail-title');
  dialog.innerHTML='<div class="card"><div class="card-heading"><h3 id="tt-detail-title"></h3><button type="button" id="tt-close-detail" aria-label="Stäng tidtabellsuppgifter" autofocus>Stäng</button></div><div id="tt-detail-content"></div></div>';document.body.append(dialog);
  let importState,rows=[],page=0,columns=1,perColumn=3,last='',identity='',selected=null,detailHTML='',frame=0,emptyText='Ingen tidtabell hämtad.';
  const details=createContextDialog({dialog,onClose:()=>{selected=null;}});
  $('close-detail').onclick=()=>details.close();
  $('change-source').onclick=()=>{sourceRevision={sessionId:importState.sessionId,revision:importState.revision};sourceBase=importState.source;$('source').value=sourceBase;sourceDialog.open();};
  sourceForm.onsubmit=async e=>{e.preventDefault();if(sourceBusy)return;sourceBusy=true;sourceDialog.setBusy(true);$('save-source').disabled=true;try{if(await selectSource({...sourceRevision,source:$('source').value}))sourceDialog.close(true);else sourceDialog.message(document.getElementById('message-text').textContent||'Kunde inte spara.');}finally{sourceBusy=false;sourceDialog.setBusy(false);$('save-source').disabled=false;}};
  function drawDetails(){
    if(!selected)return;const row=rows.find(r=>r.id===selected);if(!row){details.close();return;}
    $('detail-title').textContent='Tåg '+row.number;
    const values={'Station / driftplats':row.station,'Trafikdag':row.day,'Ankomst':row.arrival,'Avgång':row.departure,'Från':row.from,'Till':row.to,'Spår':row.track,...(row.changed?{'Planerat spår':row.planned}:{}),'Driftläge':row.state,'Uppehåll':row.noStop?'Passerar utan uppehåll':'Genomfart är inte angiven','Anmärkning':row.note};
    const html=($('status').hidden?'':'<p class="import-warning">'+esc($('status').textContent)+'</p>')+'<dl>'+Object.entries(values).map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v||'—')+'</dd>').join('')+'</dl>';
    if(html!==detailHTML){detailHTML=html;$('detail-content').innerHTML=html;}
  }
  function showDetails(e){
    const button=e.target.closest('[data-timetable-row]');if(!button)return;
    e.preventDefault();selected=rows[Number(button.dataset.timetableRow)]?.id;if(!selected)return;drawDetails();
    details.open({currentTarget:button,clientX:e.clientX,clientY:e.clientY},button);
  }
  $('content').addEventListener('click',showDetails);
  $('content').addEventListener('contextmenu',showDetails);
  $('content').addEventListener('keydown',e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')showDetails(e);});
  function rowHTML(row,index){
    const meta=[row.context,row.noStop?'Passerar':'',row.state,row.note].filter(Boolean).join(' · ');
    return '<li><button type="button" class="tt-entry" data-timetable-row="'+index+'" aria-haspopup="dialog" aria-label="Visa tidtabellsuppgifter för tåg '+esc(row.number)+'"><span class="tt-values"><strong>'+esc(row.number)+(row.note?'<span class="tt-note-flag" aria-label="Anmärkning finns"> ·</span>':'')+'</strong><span>'+esc(row.arrival||'—')+'</span><span>'+esc(row.departure||'—')+'</span><span class="tt-track'+(row.changed?' tt-track-changed':'')+'">'+esc(row.track)+(row.changed?' *':'')+'</span></span><span class="tt-route">'+esc(row.from||'—')+' → '+esc(row.to||'—')+'</span><span class="tt-meta">'+esc(meta||'—')+'</span></button></li>';
  }
  function render(){
    const capacity=columns*perColumn;page=Math.min(page,Math.max(0,Math.ceil(rows.length/capacity)-1));
    const start=page*capacity,end=Math.min(start+capacity,rows.length);
    $('prev').disabled=page===0;$('next').disabled=end>=rows.length;
    $('range').textContent=rows.length?(start+1)+'–'+end+' / '+rows.length:'0 tåg';
    let html='<p class="tt-empty">'+esc(emptyText)+' <a href="#import">Välj tidtabell</a></p>';
    if(rows.length){
      html='<div class="tt-columns" style="--tt-columns:'+columns+';--tt-rows:'+perColumn+'">';
      for(let col=0;col<columns;col++){
        const a=start+col*perColumn,b=Math.min(a+perColumn,end);if(a>=end)break;
        html+='<section class="tt-column" aria-label="Tågrörelser '+(a+1)+'–'+b+'"><div class="tt-labels" aria-hidden="true"><span>Tåg</span><span>Ank.</span><span>Avg.</span><span>Spår</span></div><ol start="'+(a+1)+'">'+rows.slice(a,b).map((r,i)=>rowHTML(r,a+i)).join('')+'</ol></section>';
      }
      html+='</div>';
    }
    if(html!==last){
      const focused=$('content').contains(document.activeElement)?document.activeElement.dataset.timetableRow:null;
      const template=document.createElement('template');template.innerHTML=html;
      const oldColumns=$('content').querySelector('.tt-columns'),newColumns=template.content.querySelector('.tt-columns');
      const oldRows=[...$('content').querySelectorAll('li')],newRows=[...template.content.querySelectorAll('li')];
      const sameLayout=oldColumns&&newColumns&&oldColumns.getAttribute('style')===newColumns.getAttribute('style')&&oldRows.length===newRows.length&&oldRows.every((li,i)=>li.querySelector('button').dataset.timetableRow===newRows[i].querySelector('button').dataset.timetableRow);
      if(sameLayout){for(let i=0;i<oldRows.length;i++)if(oldRows[i].innerHTML!==newRows[i].innerHTML)oldRows[i].replaceChildren(...newRows[i].childNodes);}
      else $('content').replaceChildren(...template.content.childNodes);
      last=html;
      if(focused!=null)$('content').querySelector('[data-timetable-row="'+Number(focused)+'"]')?.focus({preventScroll:true});
    }
    drawDetails();
  }
  function layout(){
    frame=0;const width=$('content').clientWidth;if(!width)return;
    const nextColumns=Math.max(1,Math.floor((width+12)/300));
    const nextRows=Math.max(1,Math.min(4,Math.floor(($('content').clientHeight-18)/56)));
    if(nextColumns!==columns||nextRows!==perColumn){const first=page*columns*perColumn;columns=nextColumns;perColumn=nextRows;page=Math.floor(first/(columns*perColumn));render();}
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
  new ResizeObserver(schedule).observe(root);window.addEventListener('resize',schedule);
  $('prev').onclick=()=>{page=Math.max(0,page-1);render();};$('next').onclick=()=>{page++;render();};
  return {update(state,online,imported){
    importState=imported;
    const local=imported?.source==='import',active=local?imported.active:null;
    const source=$('source');if(!sourceDialog.isOpen)source.value=local?'import':'trainmeet';source.disabled=!online||!imported;source.options[1].disabled=!imported?.active;$('change-source').disabled=!online||!imported;$('source-summary').textContent=local?(imported.active?.title||'Egen tidtabell'):'TrainMeet';
    const c=local?(active?{station:{name:'Egen tidtabell'},meet:active.title,day:'',tracks:[],operatingPoints:[],movements:[],trains:active.rows.map(r=>({id:r.id,train_number:r.trainNumber,station_name:r.station,day_label:r.day,arrival_time:r.arrival,departure_time:r.departure,arrival_from:r.from,departure_to:r.to,track:r.track,no_stop:r.noStop,note:r.note}))}:null):state?.context;
    const stale=!!c&&(!online||!local&&state?.stale);
    root.classList.toggle('timetable-stale',stale);
    $('station').textContent=c?[local?(active.kind==='manual'?'Manuell':'Importerad'):c.station.name,c.meet,c.day].filter(Boolean).join(' · '):'Ingen vald tidtabell';
    $('clock').textContent=c&&!local?'Träffklocka '+c.clock.time+' · '+(c.clock.running?'går':'pausad')+' · '+c.clock.rate+'×':'';
    $('status').textContent=stale?'Kontakt saknas – senaste mottagna uppgifter.':'';$('status').hidden=!stale;
    const nextIdentity=JSON.stringify([local,active?.id,c?.station.id,c?.day,c?.trains.map(t=>t.id)]);if(nextIdentity!==identity){identity=nextIdentity;page=0;details.close();}
    rows=[];emptyText=c?'Inga tågrörelser i den valda tidtabellen.':'Ingen tidtabell hämtad.';
    if(c){
      const tracks=new Map(c.tracks.map(t=>[t.id,t])),points=new Map(c.operatingPoints.map(p=>[p.id,p.code])),movements=new Map(c.movements.map(m=>[m.id,m]));
      const trackName=id=>{const t=tracks.get(id);return t?[points.get(t.operatingPointId),t.label].filter(Boolean).join(' · '):'Okänt spår ('+id+')';};
      rows=c.trains.map(t=>{
        const m=movements.get(t.id),changed=!!m?.track&&m.track!==t.track_id,planned=t.track_id?trackName(t.track_id):(t.track||'—');
        return {id:t.id,number:t.train_number,station:local?t.station_name:[c.station.name,points.get(t.operating_point_id)].filter(Boolean).join(' · '),day:local?t.day_label:(t.days||c.day),arrival:t.arrival_time,departure:t.departure_time,from:t.arrival_from,to:t.departure_to,track:changed?trackName(m.track):planned,planned,changed,noStop:t.no_stop,note:t.note,state:local?'Planerad':[m?.arrival,m?.departure].filter(Boolean).map(status).filter(Boolean).join(' · '),context:local?[t.station_name,t.day_label].filter(Boolean).join(' · '):points.get(t.operating_point_id)};
      });
    }
    render();schedule();
  }};
}
