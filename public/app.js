import { createSourceRegister } from './source-register.js';
import { panelLayout } from './panel-layout.js';
import { createTrainInformation } from './train-information.js';
import { createTelegramRecorder } from './telegram-recorder.js';
import { createTrainMeet } from './trainmeet.js';
import { createModelClock } from './model-clock.js';
import { createFeedback } from './feedback.js';
import { createOperatingControls } from './operating-controls.js';
const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const time = n => new Date(n).toLocaleTimeString('sv-SE');
let state, config, panel, registry, chosen = null, inspected = null, online = false, lastEvent = 0, pending = 0;
let sourceRegister, trainInformation, telegramRecorder, operatingControls, modelClock, trainMeet, feedback, layout, serverOffset = 0;
function setPage(page) {
  history.replaceState(null,'',page==='admin'?'#register':'#panel');
  if(page==='admin') document.body.classList.remove('panel-compact');
  for (const p of ['panel','admin']) { $(p+'-view').hidden=p!==page; $(p+'-tab').classList.toggle('selected',p===page); }
  if(page==='admin') return sourceRegister.open().catch(e=>message(e.message));
}
async function openSource(kind,name) { await setPage('admin'); await sourceRegister.open(kind,name); }
const rails = [], switches = [], signals = [], buttons = [], indicatorLamps = [], sourceLamps=[],routeNodes = new Map();
const iconTypes = {
  hsi_2: ['Hsi0', 'Hsi1', 'Hsi-dark', 12, 32], hsi_4: ['Hsi0', 'Hsi1', 'Hsi-dark', 12, 32], hsi_5: ['Hsi0', 'Hsi1', 'Hsi-dark', 12, 32],
  'hsi_3+dvsi': ['Hsi0+Sh0', 'Hsi1+Sh1', 'Hsi-dark+Sh-dark', 12, 32], hdvsi_8: ['Hdvsi0+Sh0', 'Hdvsi1+Sh1', 'Hdvsi-dark', 18, 31],
  dvsi_4: ['Dvsi0', 'Dvsi1', 'Dvsi-dark', 18, 25], sly_2: ['Ssi0', 'Ssi1', 'Dark', 18, 25]
};
const icon = file => '/assets/mod59/icons/' + encodeURIComponent(file) + '.gif';
const imageCache = [], decodedIcons = new Set();
const rendered = new Map();
function html(id, value) { if (rendered.get(id) !== value) { $(id).innerHTML = value; rendered.set(id, value); } }
function svg(tag, attrs, parent, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  parent?.append(node); return node;
}
function accessible(g, name, action) {
  g.setAttribute('role', 'button'); g.setAttribute('tabindex', '0'); g.setAttribute('aria-label', name);
  svg('title', {}, g, name); g.addEventListener('click', action);
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });
}
function message(text) { if(text)feedback?.error(); $('message').textContent = text; $('message').hidden = !text; }
async function api(path, data) {
  const urgent=path==='emergency-cancel'||(path==='all-stop'&&data.enabled===true);
  if (pending&&!urgent) return; pending++;
  try {
    const response = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const answer = await response.json(); if (!response.ok) throw Error(answer.error);
    // The ordered event stream owns the display; a late HTTP reply cannot roll it back.
    message(''); return answer;
  } catch (e) { message(e.message); } finally { pending--; paint(); }
}
function clearChoice() { chosen = null; $('selection-hint').textContent = 'Välj startplupp och därefter slutplupp'; $('clear-selection').hidden = true; paint(); }
function choose(id) {
  if (!online) return message('Panelen saknar kontakt med den lokala kärnan.');
  if(state.controls?.mode==='remote') return message('Fjärrläge: lokal tågvägsläggning är spärrad.');
  if (!chosen) {
    chosen = id; $('selection-hint').textContent = label(id) + ' → välj slutpunkt'; $('clear-selection').hidden = false; paint();
  } else if (chosen === id) clearChoice();
  else { const from = chosen; clearChoice(); api('route', { from, to: id }); }
}
function label(id) {
  if(config.buttons?.[id]) return displayName('buttons',id,config.buttons[id].label);
  const found = config.routes.find(r => r.from === id || r.to === id);
  if (found) return found.label.split(' → ')[found.from === id ? 0 : 1];
  return id.replace('htv', '');
}
function displayName(kind,id,fallback=id) { return config.presentation?.overrides[kind+':'+id]?.name||fallback; }
function presentationDescription(kind,id) { return config.presentation?.overrides[kind+':'+id]?.description||''; }
function applyPresentation(value) {
  config.presentation=value;
  sourceRegister?.presentationChanged();
  trainInformation?.presentationChanged();
  // Change text in place: never rebuild the SVG or signal image elements.
  for(const option of $('block-choice').options) option.textContent=displayName('blocks',option.value)+(displayName('blocks',option.value)!==option.value?' · '+option.value:'');
  for(const id of ['catalog-from','catalog-to']) for(const option of $(id)?.options||[]) option.textContent=label(option.value);
  if(chosen) $('selection-hint').textContent=label(chosen)+' → välj slutpunkt';
  for(const b of buttons) { const id=b.sensor||b.id;if(!id)continue;const node=b.g||b.node;if(node&&config.buttons?.[id]) {node.setAttribute('aria-label',label(id));const title=node.querySelector('title');if(title)title.textContent=label(id);} }
  paint();
}
function buildPlan() {
  layout = panelLayout(panel);
  const {x,y,width,height}=layout.crop;
  $('track-plan').setAttribute('viewBox',`${x} ${y} ${width} ${height}`);
  const root = $('track-plan'), track = svg('g', {}, root), turnouts = svg('g', {}, root);
  const flow = svg('g', { id: 'flow-layer', 'pointer-events': 'none' }, root), labels = svg('g', {}, root), icons = svg('g', {}, root), controls = svg('g', {}, root);
  for (const s of panel.segs.filter(s => s.b !== 'frame' && !s.hide && Math.min(s.y1, s.y2) < 850)) {
    const node = svg('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, class: 'rail unconfigured' }, track);
    svg('title', {}, node, 'Spårsegment '+s.id+' · '+s.b);
    rails.push({ node, block: s.b });
    if (s.d) node.setAttribute('stroke-dasharray','7 5');
    const length=Math.hypot(s.x2-s.x1,s.y2-s.y1), count=length<26?0:Math.max(1,Math.round(length/78));
    for(let i=0;i<count;i++){ const fraction=(i+.5)/count;
      indicatorLamps.push({block:s.b,node:svg('circle',{cx:s.x1+(s.x2-s.x1)*fraction,cy:s.y1+(s.y2-s.y1)*fraction,r:2.5,class:'relay-lens'},track)});
    }
  }
  for (const t of Object.values(panel.turnouts)) {
    if (t.cy > 850) continue;
    const legs = {};
    for (const [leg, x, y] of [['A', t.ax, t.ay], ['B', t.bx, t.by], ['C', t.ccx, t.ccy]]) {
      legs[leg] = svg('line', { x1: t.cx, y1: t.cy, x2: x, y2: y, class: 'rail unknown' }, turnouts);
      indicatorLamps.push({block:t.block,node:svg('circle',{cx:(t.cx+x)/2,cy:(t.cy+y)/2,r:2.5,class:'relay-lens'},turnouts)});
    }
    switches.push({ ...t, legs });
    svg('text', { x: t.cx + 3, y: t.cy - 11, class: 'turnout-number' }, labels, t.name.replace('Vx', ''));
    const g = svg('g', { class: 'touch-target turnout-target' }, controls);
    svg('circle', { cx: t.cx, cy: t.cy, r: 16, class: 'hit' }, g);
    accessible(g, `Växel ${t.name}`, () => { inspected = { kind: 'turnout', name: t.name }; paintInspector(); });
  }
  for (const l of panel.labels.filter(l => !l.hidden && l.y < 840)) {
    const destination=/Lekby|Vagnsta|Kungsfors/i.test(l.text), size=destination?11:l.size||12;
    if(l.br!=null || destination) svg('rect',{x:l.x-3,y:l.y-3,width:l.text.length*size*.58+12,height:size*1.5+3,fill:destination?'#1d211a':`rgb(${l.br},${l.bg},${l.bb})`,class:destination?'destination-plate':''},labels);
    svg('text', { x: l.x, y: l.y + size, class: 'track-label'+(destination?' destination-label':''), style:`font-size:${size}px;font-weight:${(l.style&1)||destination?700:400}` }, labels, destination?l.text.toUpperCase():l.text);
  }
  const tt = panel.turntable; svg('circle', { cx: tt.cx, cy: tt.cy, r: tt.r, class: 'rail unconfigured' }, track);
  svg('line', { x1: tt.cx - tt.r, y1: tt.cy, x2: tt.cx + tt.r, y2: tt.cy, class: 'rail unconfigured' }, track);
  for (const m of panel.micons.filter(m => m.y < 850)) {
    const type = iconTypes[m.type] || iconTypes.hsi_2;
    const sample = imageCache.find(i => i.src.endsWith(encodeURIComponent(type[0]) + '.gif'));
    const w = (sample?.naturalWidth || type[3]) * (m.scale || 1), h = (sample?.naturalHeight || type[4]) * (m.scale || 1);
    const rad = m.deg * Math.PI / 180, rw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)), rh = Math.abs(h * Math.cos(rad)) + Math.abs(w * Math.sin(rad));
    const g = svg('g', { transform: `translate(${m.x + rw / 2},${m.y + rh / 2})`, class: 'touch-target signal-target' }, icons);
    svg('rect', { x: -rw / 2 - 5, y: -rh / 2 - 6, width: rw + 10, height: rh + 12, class: 'hit' }, g);
    const images=type.slice(0,3).map((file,i)=>svg('image',{x:-w/2,y:-h/2,width:w,height:h,transform:`rotate(${m.deg})`,href:icon(file),visibility:i===2?'visible':'hidden','pointer-events':'none'},g));
    const unknown = svg('text', { x: rw / 2 + 1, y: 3, class: 'signal-unknown' }, g, '?');
    accessible(g, `Signal ${m.mast}`, () => { inspected = { kind: 'signal', name: m.mast }; paintInspector(); });
    signals.push({ ...m, g, images, unknown, type });
  }
  const used = new Set(config.routes.flatMap(r => [r.from, r.to]));
  for (const b of layout.controls) {
    const isShunt=b.sensor.startsWith('tvv');
    const isButton=(b.act||'').includes('S-on') || isShunt;
    if(!isButton && !/lamp-[gr]|blink-r|free|hw-/.test(b.act||'')) continue;
    const isRoute=b.sensor.startsWith('htv') || isShunt;
    const names=b.sensor.startsWith('vxv')?b.sensor.slice(3).split('/').map(n=>'Vx'+n):[];
    const available=isRoute?used.has(b.sensor):names.length>0&&names.every(n=>config.turnouts[n]&&(config.coupled[names[0]]||[names[0]]).includes(n));
    const g=svg('g',{transform:`translate(${b.centerX},${b.centerY})`,class:'touch-target '+(isButton?'route-button':'source-indicator')+(isRoute?(isShunt?' shunt-control':' main-control'):''),'data-button':b.sensor},controls);
    const hit=svg('circle',{r:isButton?16:9,class:'hit'},g);
    if(isButton) {
      if(isShunt) svg('path',{d:b.act.includes('arrowleft')?'M6,-5 L-3,-5 L-8,0 L-3,5 L6,5 Z':'M-6,-5 L3,-5 L8,0 L3,5 L-6,5 Z',class:'dot shunt-arrow'},g);
      else { svg('circle',{r:(b.act.includes('-s.')?15:21)/2,class:'dot'},g); svg('rect',{x:-3.5,y:-3.5,width:7,height:7,class:'traffic-dot'},g); }
    } else {
      const lens=svg('circle',{r:b.act.includes('free')?4.5:6.5,class:'indicator-off'},g);
      const indication=config.panelIndications?.indicators.find(i=>Object.values(i.lamps).some(l=>l.name===b.sensor));
      if(indication) {
        const unknown=svg('text',{x:10,y:4,class:'derived-unknown','pointer-events':'none'},g,'?');
        sourceLamps.push({g,lens,unknown,name:indication.name,color:indication.lamps.g.name===b.sensor?'g':'r'});
      }
    }
    accessible(g,isRoute?`${label(b.sensor)} · ${isShunt?'växeltågväg':'tågvägsknapp'}`:b.sensor,()=>{
      if(isRoute) return choose(b.sensor);
      const indication=sourceLamps.find(l=>l.g===g);
      if(indication)return inspectIndication(indication.name);
      if(names.length){
        if(!usable()) return message('Panelen saknar aktuell kontakt med anläggningen.');
        if(!available) return message('Växelgruppen finns i källan men är ännu inte ansluten till driftprofilen.');
        const name=names[0]; inspected={kind:'turnout',name}; paintInspector();
        if(state.manual?.[name]&&!state.manual[name].allowed) return message(state.manual[name].reason);
        return api('turnout',{name,position:state.turnouts[name]?.position==='C'?'T':'C'});
      }
      openSource('sensors',b.sensor);
    });
    if(isButton) buttons.push({id:b.sensor,g,hit,hitCap:b.hitCap,available,names});
  }
  new ResizeObserver(()=>{
    const scale=root.getBoundingClientRect().width/layout.crop.width;
    for(const b of buttons) b.hit.setAttribute('r',Math.min(b.hitCap,32*Math.min(1.6,1/Math.max(.1,scale)))/2);
  }).observe(root);
  $('derived-indications').innerHTML='<span>Beräknat:</span>'+(config.panelIndications?.indicators||[]).map(i=>`<button type="button" data-indication="${esc(i.name)}"><i></i>${esc(i.name)} <span>?</span></button>`).join('');
  $('derived-indications').onclick=e=>{const name=e.target.closest('button')?.dataset.indication;if(name)inspectIndication(name);};
}
function inspectIndication(name){if(document.body.classList.contains('panel-compact'))$('compact-toggle').click();inspected={kind:'indication',name};paintInspector();$('inspector').scrollIntoView({behavior:'smooth',block:'nearest'});}
function isBlocked(name) { const address=config.blocks[name]?.address;return address!=null && (state?.controls?.blocked || []).some(n=>config.blocks[n]?.address===address); }
function usable() { return online && state?.connection === 'connected' && !state.storageFault; }
function paintPlan() {
  const fresh = online && state?.connection === 'connected';
  for (const r of rails) {
    const value = fresh ? state.blocks[r.block]?.occupied : null;
    r.node.setAttribute('class', 'rail ' + (isBlocked(r.block)?'blocked ':'') + (!(r.block in config.blocks) ? 'unconfigured' : value === true ? 'occupied' : value === false ? '' : 'unknown'));
  }
  for (const t of switches) {
    const value = fresh ? state.turnouts[t.name]?.position : 'unknown';
    const continuing = t.continuing === 2 ? 'B' : 'C', active = value === 'C' ? continuing : value === 'T' ? (continuing === 'B' ? 'C' : 'B') : null;
    const occupied = fresh && state.blocks[t.block]?.occupied;
    for (const [leg, node] of Object.entries(t.legs)) node.setAttribute('class', 'rail ' + (occupied ? 'occupied ' : '') + (!active ? 'unknown' : leg === 'A' || leg === active ? '' : 'branch-off'));
  }
  for (const s of signals) {
    const value = fresh ? state.signals[s.mast]?.aspect : 'unknown';
    const requested=value==='stop'?0:value==='go'?1:2;
    const selected=decodedIcons.has(s.type[requested])?requested:2;
    s.images.forEach((image,i)=>image.setAttribute('visibility',i===selected?'visible':'hidden'));
    s.unknown.style.display = selected !== 2 ? 'none' : '';
    s.g.classList.toggle('unconfigured', !config.signals[s.mast]);
  }
  for(const lamp of indicatorLamps) lamp.node.classList.toggle('occupied',fresh&&state.blocks[lamp.block]?.occupied===true);
  for(const lamp of sourceLamps) {
    const value=fresh?state.panelIndications?.[lamp.name]?.value:null;
    lamp.lens.setAttribute('class','indicator-off '+(value===null||value===undefined?'derived-missing':(value===(lamp.color==='g')?'derived-on-'+lamp.color:'')));
    lamp.unknown.style.display=value==null&&lamp.color==='g'?'':'none';
    const text=lamp.name+' · beräknad panelindikering · '+(value===true?'aktivt underlag':value===false?'inaktivt underlag':'okänt underlag');
    lamp.g.setAttribute('aria-label',text+' · '+lamp.color);lamp.g.querySelector('title').textContent=text;
  }
  for(const button of $('derived-indications').querySelectorAll('button')) {
    const value=fresh?state.panelIndications?.[button.dataset.indication]?.value:null;
    button.dataset.value=value===true?'active':value===false?'inactive':'unknown';
    button.querySelector('span').textContent=value==null?'?':'';
    button.title=button.dataset.indication+' · Beräknad panelindikering, ingen bomkvittens';
    button.setAttribute('aria-label',button.dataset.indication+' · '+(value===true?'aktivt':value===false?'inaktivt':'okänt')+' underlag · detaljer');
  }
  for (const b of buttons) {
    b.g.classList.toggle('chosen', b.id === chosen); b.g.classList.toggle('unavailable', !b.available || (b.names.length && state.manual?.[b.names[0]]?.allowed===false));
    b.g.classList.toggle('in-route', !!state?.routes.some(r => r.from === b.id || r.to === b.id));
    b.g.classList.toggle('locked',!!state?.routes.some(r=>b.names.some(n=>r.turnouts[n]))||(state.operating?.programming?.reserved&&b.names.includes('Vx133')));
    b.g.classList.toggle('line-is-blocked',!!state.operating?.lines.some(l=>l.blocked&&l.button===b.id));
  }
  for (const [id, data] of routeNodes) if (!state?.routes.some(r => r.id === id)) { data.g.remove(); routeNodes.delete(id); }
  for (const r of state?.routes || []) {
    if (!routeNodes.has(r.id)) {
      const g = svg('g', {}, $('flow-layer'));
      const parts = r.flow.map(part => {
        const node = svg('line', { x1: part.x1, y1: part.y1, x2: part.x2, y2: part.y2, class: 'route-flow' }, g);
        const lamps = [];
        const count=part.length<26?1:Math.max(1,Math.round(part.length/78));
        for(let j=0;j<count;j++){const dist=(j+.5)/count*part.length; lamps.push({at:part.distance+dist,node:svg('circle',{cx:part.x1+(part.x2-part.x1)*(j+.5)/count,cy:part.y1+(part.y2-part.y1)*(j+.5)/count,r:3.4,class:'lamp'},g)});}
        return { ...part, node, lamps };
      });
      routeNodes.set(r.id, { g, parts });
    }
  }
  animateFlow();
}
function animateFlow() {
  for (const r of state?.routes || []) {
    const entry = routeNodes.get(r.id); if (!entry) continue;
    const total = r.flow.at(-1)?.distance + r.flow.at(-1)?.length || 1;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fraction = online && r.state === 'establishing' && !reduced ? Math.min(1, Math.max(0, (Date.now() + serverOffset - r.establishedAt) / (r.flowDuration || 1200))) : 1;
    const status = !online ? 'held' : r.state;
    for (const part of entry.parts) {
      const lit = Math.max(0, Math.min(part.length, fraction * total - part.distance));
      const occupied = online && state.blocks[part.block]?.occupied === true;
      part.node.setAttribute('class', 'route-flow ' + status);
      part.node.style.visibility = occupied ? 'hidden' : '';
      if (r.state === 'establishing' && online) part.node.setAttribute('stroke-dasharray', `${lit} ${part.length + 1}`);
      else part.node.removeAttribute('stroke-dasharray');
      for (const lamp of part.lamps) lamp.node.style.visibility = !occupied && ['establishing', 'clearing', 'active', 'traversing'].includes(status) && lamp.at <= fraction * total ? 'visible' : 'hidden';
    }
  }
}
const statuses = { setting: 'Lägger växlar', establishing: 'Etablerar', clearing: 'Klarsätter', active: 'Klar', traversing:'Tåg passerar', held: 'Stopp · lås kvar', occupied: 'Lås kvar', cancelling: 'Återtar' };
function paint() {
  if (!state) return;
  sourceRegister?.updateState(state,online);
  trainInformation?.update(state,online);
  telegramRecorder?.update(state,online);
  operatingControls?.update(state,online);
  if(state.clock)modelClock?.update(state.clock,online);
  trainMeet?.update(state.trainMeet,online);
  const c = $('connection'); c.textContent = !online ? 'Kontakt med kärnan saknas' : state.storageFault ? 'Lagringsfel · spärrad' : state.connection === 'connected' ? 'LocoNet ansluten' : 'LocoNet frånkopplad';
  c.className = 'connection ' + (usable() ? 'online' : 'offline');
  paintPlan(); paintInspector();
  $('ais-status').hidden = !state.controls?.stopAll;
  $('all-stop').disabled = !online;
  $('emergency-cancel').disabled = !online;
  const remote=state.controls?.mode==='remote', emergency=state.controls?.emergency, remaining=state.emergencyRemaining?.length||0;
  $('control-mode').textContent=remote?'Fjärrläge · lokal manövrering spärrad':'Lokal manövrering';
  $('remote-notice').hidden=!remote;
  $('toggle-authority').textContent=remote?'Återgå till lokal manövrering':'Växla till fjärrläge';
  $('toggle-authority').disabled=!online||pending||!state.modeChange?.allowed;
  $('mode-reason').textContent=state.modeChange?.allowed?'':state.modeChange?.reason||'';
  $('emergency-status').hidden=!emergency||(!state.controls.stopAll&&!remaining);
  $('emergency-status').textContent=remaining?`Nödåtertagning pågår · ${remaining} av ${emergency.routeIds.length} tågvägslås kvar. Fria spår, kända växellägen och nya stoppbesked krävs. Efter omstart: begär återtagning igen.`:emergency?'Nödåtertagning färdig · alla berörda lås är frigivna. Återställ AIS när anläggningen har kontrollerats.':'';
  $('ais-text').textContent=remaining?'AIS aktiv · nödåtertagning pågår, låsen skyddar kvarvarande vägar':'AIS aktiv · alla körmedgivanden återkallade';
  $('reset-ais').disabled = !usable() || pending || !state.allStopReset?.allowed;
  $('reset-ais').title=state.allStopReset?.reason||'';
  const blocks=state.controls?.blocked || [];
  $('blocked-count').textContent=blocks.length ? `· ${blocks.length} spärrade` : '';
  html('blocked-list',blocks.map(n=>`<span class="field-chip blocked-chip">${esc(displayName('blocks',n))} · spärrat</span>`).join(''));
  $('toggle-block').textContent = isBlocked($('block-choice').value)?'Ta bort spärr':'Spärra spår';
  $('toggle-block').disabled = !online || pending || !!state.storageFault || (remote&&isBlocked($('block-choice').value));
  for (const b of $('route-catalog').querySelectorAll('button')) b.disabled = !usable() || pending || remote;
  html('active-routes', state.routes.map(r => `<div class="route-item"><strong>${esc(displayName('routes',r.definitionId,r.label))}<span class="route-state ${esc(r.state)}">${esc(statuses[r.state])}</span></strong><small>${esc(r.reason)}${r.passage&&r.enteredAt?' · '+r.passage.filter(p=>p.state==='clear').length+'/'+r.passage.length+' avsnitt passerade':''}</small><button data-cancel="${esc(r.id)}" ${!online || r.cancelRequested ? 'disabled' : ''}>${r.cancelRequested ? 'Inväntar frigivning' : 'Återta'}</button></div>`).join(''));
  $('event-status').textContent = state.routes.length + ' tågvägslås · ' + Object.keys(config.turnouts).length + ' anslutna växlar';
  html('events', state.events.filter(e => !['report', 'transport'].includes(e.kind)).slice(0, 7).map(e => `<div class="event-row"><time>${time(e.at)}</time><span>${esc(e.message)}</span></div>`).join(''));
  $('wire').textContent = (state.trace || []).slice(0, 40).map(e => `${time(e.at)}  ${e.direction === 'out' ? 'SKICKAT ' : 'MOTTAGET'}  ${e.hex}`).join('\n');
}
function paintInspector() {
  if (!inspected || !state) return;
  if(inspected.kind==='indication')return paintIndication(inspected.name);
  const { kind, name } = inspected, b = kind === 'signal' ? config.signals[name] : config.turnouts[name];
  const sourceKind = kind === 'signal' ? 'signals' : 'layoutTurnouts';
  const sourceButton = `<button class="source-inspect" data-source-kind="${sourceKind}" data-source-name="${esc(name)}">${kind === 'signal' ? 'Signalbesked och källuppgifter' : 'Visa alla källuppgifter'} →</button>`;
  const original = kind === 'signal' ? registry.signals.find(r=>r.id===name) : null;
  const presentationKind=kind==='signal'?'signals':'turnouts', display=displayName(presentationKind,name), description=presentationDescription(presentationKind,name);
  const sourceInfo = (display!==name?`<h2>${esc(display)}</h2>`:'')+(description?`<p>${esc(description)}</p>`:'')+(original ? `<p class="muted">${esc(original.type)} · Besked i XML: ${esc(original.aspects.join(', '))}</p>` : '');
  if (!b) { html('inspector', `<h2>${kind === 'signal' ? 'Signal' : 'Växel'} ${esc(name)}</h2><p class="muted">Importerad från JMRI. Återrapport och manövrering är ännu inte inkopplade för detta objekt.</p>` + sourceInfo + sourceButton); return; }
  const s = kind === 'signal' ? state.signals[name] : state.turnouts[name];
  const locked = state.routes.filter(r => kind === 'signal' ? r.signals.includes(name) : r.turnouts[name]);
  const value = !online ? 'Okänt' : kind === 'signal' ? ({ go: 'Kör återrapporterat', stop: 'Stopp återrapporterat', unknown: 'Okänt besked' }[s.aspect]) : ({ C: 'Rakt', T: 'Avvikande', unknown: 'Okänt / omläggning' }[s.position]);
  const manual=state.manual?.[name], manualNotice=kind==='turnout'&&manual?`<p class="muted">${esc(manual.reason)}</p>`:'';
  const programLock=kind==='turnout'&&name==='Vx133'&&state.operating?.programming?.reserved;
  const detail = `<dl><dt>${kind === 'signal' ? 'Signal' : 'Växel'}</dt><dd><strong>${esc(name)}</strong></dd><dt>Rapporterat</dt><dd>${esc(value)}</dd><dt>Tågvägslås</dt><dd>${esc(locked.map(r => r.label).join(', ') || 'Inga')}</dd>${programLock?'<dt>Programmeringsspärr</dt><dd>Lastspår 3 · lås kvar</dd>':''}<dt>${kind === 'signal' ? 'Provadress / råkod' : 'Källadress'}</dt><dd>${kind === 'signal' ? b.address + ' / ' + (s.code ?? '—') : esc(b.source) + (b.inverted ? ' · inverterad' : '')}</dd></dl>`;
  html('inspector', detail + sourceInfo + sourceButton + manualNotice + (kind === 'turnout' ? `<div class="actions"><button data-manual="C" ${locked.length || !usable() || manual?.allowed===false ? 'disabled' : ''}>Lägg rakt</button><button data-manual="T" ${locked.length || !usable() || manual?.allowed===false ? 'disabled' : ''}>Lägg avvikande</button></div>` : `<p class="muted">Beskedskoderna är en preliminär provmappning. Fullständiga svenska signalbilder kräver verifiering mot din MGP-utrustning.</p>`));
}
function paintIndication(name) {
  const def=config.panelIndications.indicators.find(i=>i.name===name),s=state.panelIndications?.[name];
  const fresh=online&&state.connection==='connected'&&!state.storageFault,value=fresh?s?.value:null;
  const important=fresh?(s?.conditions||[]).filter(c=>c.value!==false):[];
  html('inspector',`<h2>${esc(name)} · panelindikering</h2><dl><dt>Beräknat läge</dt><dd>${value===true?'Aktivt underlag · grön lampa':value===false?'Inaktivt underlag · röd lampa':'Okänt underlag · inget fastställt läge'}</dd><dt>Kända villkor</dt><dd>${fresh?s?.known||0:0} av ${s?.total||def.conditions.length}</dd></dl><p class="muted">Indikering från tågvägar och sensorrapporter. Ingen fysisk bomkvittens eller bommanöver.</p><p class="muted">Ett aktivt villkor räcker för grön indikering. Röd kräver att alla villkor är kända och inaktiva. Tågväg som läggs, återtas eller hålls kvar ger okänt NX-villkor.</p>${important.length?`<ul class="indication-causes">${important.map(c=>`<li><strong>${esc(c.label)}</strong> · ${esc(c.reason)}</li>`).join('')}</ul>`:''}<button class="source-inspect" data-source-kind="conditionals" data-source-name="${esc(def.name)}">Visa källregeln och alla villkor →</button>`);
}
async function start() {
  telegramRecorder=createTelegramRecorder();
  operatingControls=createOperatingControls({api,openSource});
  modelClock=createModelClock({api});trainMeet=createTrainMeet({api});feedback=createFeedback();
  [config, panel, registry] = await Promise.all(['/api/config', '/data/panel.json', '/data/source/signals.json'].map(async url => { const r = await fetch(url); if (r.status === 401 || r.status === 428) { location.assign('/login'); throw Error('Inloggning krävs'); } if (!r.ok) throw Error('Kunde inte läsa underlaget'); return r.json(); }));
  const files = [...new Set([...Object.values(iconTypes).flatMap(a => a.slice(0, 3)), 'Hsi0+Sh1', 'Hdvsi0+Sh1'])];
  // Loading a missing or slow icon must not prevent the track plan from starting.
  // Each displayed variant is decoded before it can replace the dark indication.
  Promise.allSettled(files.map(async file => { const i = new Image(); imageCache.push(i); i.src = icon(file); await i.decode(); decodedIcons.add(file); if(state) paintPlan(); }))
    .then(results => { if(results.some(r=>r.status==='rejected')) message('En signalbild kunde inte laddas. Berörd signal visas som okänd.'); });
  sourceRegister = createSourceRegister({config,saveNote:(key,note)=>api('note',{key,note}),onActive:applyPresentation});
  buildPlan();
  trainInformation=createTrainInformation({catalog:config.trainFields,plan:$('track-plan'),displayName,openSource});
  $('compact-toggle').onclick=()=>{ const compact=document.body.classList.toggle('panel-compact'); $('compact-toggle').textContent=compact?'Visa verktyg':'Dölj verktyg'; };

  $('block-choice').innerHTML=Object.keys(config.blocks).sort((a,b)=>a.localeCompare(b,'sv',{numeric:true})).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  $('block-choice').onchange=paint;
  $('toggle-block').onclick=()=>api('track-block',{name:$('block-choice').value,blocked:!isBlocked($('block-choice').value)});
  $('all-stop').onclick=()=>api('all-stop',{enabled:true});
  $('emergency-cancel').onclick=()=>api('emergency-cancel',{});
  $('toggle-authority').onclick=async()=>{if(await api('control-mode',{mode:state.controls.mode==='remote'?'local':'remote'}))clearChoice();};
  $('reset-ais').onclick=()=>api('all-stop',{enabled:false});
  $('account-link').hidden = !config.accountUrl;
  $('field-link').href = config.fieldUrl || 'http://127.0.0.1:8911/'; $('field-link').hidden = false;
  $('profile-summary').textContent=`${config.routes.filter(r=>r.kind!=='shunt').length} huvudtågvägar och ${config.routes.filter(r=>r.kind==='shunt').length} växeltågvägar · ${Object.keys(config.turnouts).length} växlar · ${Object.keys(config.signals).length} signaler i provanläggningen.`;
  $('route-catalog').innerHTML=`<label>Från<select id="catalog-from"></select></label><label>Till<select id="catalog-to"></select></label><button id="catalog-request" class="primary" disabled>Lägg / återta tågväg</button><p id="catalog-hint" class="muted" hidden></p>`;
  function catalogHint(){const ids=[$('catalog-from').value,$('catalog-to').value].filter(id=>config.buttons[id]?.presentation==='catalog');$('catalog-hint').hidden=!ids.length;$('catalog-hint').textContent=ids.map(label).join(', ')+' väljs i listan. Använd Lägg / återta tågväg även för återtagning.';}
  function catalogOrder(ids){return $('route-mode').value==='shunt'?ids.sort((a,b)=>label(a).localeCompare(label(b),'sv',{numeric:true})):ids;}
  function targets(){const from=$('catalog-from').value;$('catalog-to').innerHTML=catalogOrder(config.routes.filter(r=>r.from===from).map(r=>r.to)).map(id=>`<option value="${esc(id)}">${esc(label(id))}</option>`).join('');catalogHint();}
  $('catalog-to').onchange=catalogHint;
  function routeMode(){ const mode=$('route-mode').value; document.body.dataset.routeMode=mode; clearChoice(); const starts=catalogOrder([...new Set(config.routes.filter(r=>(r.kind||'main')===mode).map(r=>r.from))]); $('catalog-from').innerHTML=starts.map(id=>`<option value="${esc(id)}">${esc(label(id))}</option>`).join('');targets(); }
  $('route-mode').onchange=routeMode; $('catalog-from').onchange=targets;routeMode();
  $('catalog-request').onclick=()=>api('route',{from:$('catalog-from').value,to:$('catalog-to').value});
  $('active-routes').onclick = e => { const id = e.target.closest('button')?.dataset.cancel; if (id) api('cancel', { id }); };
  $('inspector').onclick = e => { const source=e.target.closest('[data-source-kind]'); if(source) { openSource(source.dataset.sourceKind,source.dataset.sourceName); return; } const position = e.target.closest('button')?.dataset.manual; if (position) api('turnout', { name: inspected.name, position }); };
  $('clear-selection').onclick = clearChoice;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') clearChoice(); });
  for (const b of document.querySelectorAll('.skin-picker button')) b.onclick = () => setSkin(b.dataset.skin);
  function setSkin(value) { document.body.dataset.skin = value; localStorage.setItem('charlottendal-skin', value); for (const b of document.querySelectorAll('.skin-picker button')) b.classList.toggle('selected', b.dataset.skin === value); }
  setSkin(localStorage.getItem('charlottendal-skin') || 'relay');
  $('zoom').onchange = () => { $('track-plan').style.width = $('zoom').value + '%'; };
  for (const page of ['panel','admin']) $(page+'-tab').onclick=()=>setPage(page);
  setPage(location.hash==='#register'?'admin':'panel');
  applyPresentation(config.presentation);
  const source = new EventSource('/api/events');
  let presentationLoading=false;
  source.onmessage = e => {
    state = JSON.parse(e.data); serverOffset=state.serverTime-Date.now(); online = true; lastEvent = Date.now(); paint();
    if(!presentationLoading && state.configurationVersion!==config.presentation?.activeVersion) {
      presentationLoading=true;
      fetch('/api/presentation').then(r=>{if(!r.ok)throw Error('Kunde inte hämta nya visningsinställningar.');return r.json();}).then(applyPresentation).catch(e=>message(e.message)).finally(()=>{presentationLoading=false;});
    }
  };
  source.onerror = () => { online = false; paint(); };
  setInterval(() => { if (Date.now() - lastEvent > 3000 && online) { online = false; paint(); } }, 750);
  function animation() { if (state?.routes.some(r => r.state === 'establishing')) animateFlow(); requestAnimationFrame(animation); } animation();
}
start().catch(e => { message('Startfel: ' + e.message); $('connection').textContent = 'Kunde inte starta panelen'; });
