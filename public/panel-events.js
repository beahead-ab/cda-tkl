// The event column beside the timetable. It reads the core journal exactly as the
// tools page does and only draws it. Acknowledging an alarm is local display state
// (the button disappears, the row stays) until the core has an acknowledgement
// order; nothing is sent anywhere.
import {FILTERS,alarmCount,eventKey,filterEvents,latestAlarm,tone} from './panel-events-model.js';
import {objectFromMessage} from './plan-objects.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=at=>new Date(at).toLocaleTimeString('sv-SE');

export function createPanelEvents(){
  const root=document.getElementById('panel-events');if(!root)return null;
  root.innerHTML='<header class="ev-heading"><h2>Händelser</h2><nav class="ev-filters" aria-label="Filtrera händelser">'+FILTERS.map(([key,label])=>'<button type="button" data-filter="'+key+'" aria-pressed="'+(key==='all')+'">'+label+(key==='alarm'?'<span class="ev-alarm-count"></span>':'')+'</button>').join('')+'</nav></header><div id="ev-content" tabindex="0"></div>';
  // Phone tabs: timetable or events fills the bottom row; the next train stays visible.
  const bottom=document.getElementById('panel-bottom');
  const tabs=document.createElement('div');tabs.id='panel-bottom-tabs';
  tabs.innerHTML='<div class="bottom-tabs" role="tablist" aria-label="Nederrad"><button type="button" role="tab" data-tab="timetable" aria-selected="true">Tidtabell</button><button type="button" role="tab" data-tab="events" aria-selected="false">Händelser<span id="bottom-tabs-alarms"></span></button></div><span id="bottom-tabs-next"></span>';
  bottom?.prepend(tabs);
  tabs.addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(!b||!bottom)return;bottom.dataset.bottomTab=b.dataset.tab;for(const o of tabs.querySelectorAll('[role=tab]'))o.setAttribute('aria-selected',String(o===b));});
  const filters=root.querySelector('.ev-filters'),content=root.querySelector('#ev-content'),acked=new Set();
  let filter='all',events=[],last='';
  filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;for(const o of filters.querySelectorAll('[data-filter]'))o.setAttribute('aria-pressed',String(o===b));render();});
  // A row that names a turnout, signal, block or route marks it on the plan with the yellow ring.
  content.addEventListener('click',e=>{const b=e.target.closest('[data-ack]');if(b){acked.add(b.dataset.ack);render();return;}const row=e.target.closest('.ev-row');const target=row&&objectFromMessage(row.querySelector('.ev-text')?.textContent);if(target)window.dispatchEvent(new CustomEvent('panel-highlight',{detail:target}));});
  function render(){
    const rows=filterEvents(events,filter);
    const html=rows.map(e=>{const t=tone(e.kind),key=eventKey(e);return '<div class="ev-row ev-'+t+'" data-key="'+esc(key)+'"><time datetime="'+esc(new Date(e.at).toISOString())+'">'+esc(time(e.at))+'</time><i class="ev-dot" aria-hidden="true"></i><span class="ev-text" title="'+esc(e.message)+'">'+esc(e.message)+'</span>'+(t==='alarm'&&!acked.has(key)?'<button type="button" class="ev-ack" data-ack="'+esc(key)+'">Kvittera</button>':'')+'</div>';}).join('')||'<p class="ev-empty">Inga händelser.</p>';
    const alarms=alarmCount(events,acked),count=alarms?' '+alarms:'';
    root.querySelector('.ev-alarm-count').textContent=count;
    const tabCount=document.getElementById('bottom-tabs-alarms');if(tabCount)tabCount.textContent=count;
    const summary=document.getElementById('panel-alarm-summary');
    if(summary){const alarm=latestAlarm(events,acked);summary.textContent=alarm?'Larm '+alarms+' · '+alarm.message:'';summary.hidden=!alarm;}
    if(html===last)return;
    // New rows arrive on top. The list stays at the top only if it already was there;
    // a reader further down keeps the row they were looking at.
    const firstKey=content.querySelector('.ev-row')?.dataset.key,top=content.scrollTop;
    content.innerHTML=html;last=html;
    if(top>0&&firstKey){const anchor=content.querySelector('.ev-row[data-key="'+CSS.escape(firstKey)+'"]');if(anchor)content.scrollTop=top+anchor.offsetTop;}
  }
  render();
  return {update(state){events=Array.isArray(state?.events)?state.events:[];render();}};
}
