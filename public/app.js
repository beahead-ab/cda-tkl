const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const time = n => new Date(n).toLocaleTimeString('sv-SE');
let state, config, panel, registry, chosen = null, inspected = null, online = false, lastEvent = 0, registryKind = 'signals', noteKey, pending = false;
const rails = [], switches = [], signals = [], buttons = [], routeNodes = new Map();
const iconTypes = {
  hsi_2: ['Hsi0', 'Hsi1', 'Hsi-dark', 12, 32], hsi_4: ['Hsi0', 'Hsi1', 'Hsi-dark', 12, 32], hsi_5: ['Hsi0', 'Hsi1', 'Hsi-dark', 12, 32],
  'hsi_3+dvsi': ['Hsi0+Sh0', 'Hsi1+Sh1', 'Hsi-dark+Sh-dark', 18, 32], hdvsi_8: ['Hdvsi0+Sh0', 'Hdvsi1+Sh1', 'Hdvsi-dark', 18, 31],
  dvsi_4: ['Dvsi0', 'Dvsi1', 'Dvsi-dark', 18, 25], sly_2: ['Ssi0', 'Ssi1', 'Dark', 18, 25]
};
const icon = file => '/assets/mod59/icons/' + encodeURIComponent(file) + '.gif';
const imageCache = [];
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
function message(text) { $('message').textContent = text; $('message').hidden = !text; }
async function api(path, data) {
  if (pending) return; pending = true;
  try {
    const response = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const answer = await response.json(); if (!response.ok) throw Error(answer.error);
    if (answer.state) state = answer.state; message(''); return answer;
  } catch (e) { message(e.message); } finally { pending = false; paint(); }
}
function clearChoice() { chosen = null; $('selection-hint').textContent = 'Välj startplupp och därefter slutplupp'; $('clear-selection').hidden = true; paint(); }
function choose(id) {
  if (!online) return message('Panelen saknar kontakt med den lokala kärnan.');
  if (!chosen) {
    chosen = id; $('selection-hint').textContent = label(id) + ' → välj slutpunkt'; $('clear-selection').hidden = false; paint();
  } else if (chosen === id) clearChoice();
  else { const from = chosen; clearChoice(); api('route', { from, to: id }); }
}
function label(id) {
  const found = config.routes.find(r => r.from === id || r.to === id);
  if (found) return found.label.split(' → ')[found.from === id ? 0 : 1];
  return id.replace('htv', '');
}
function buildPlan() {
  const root = $('track-plan'), track = svg('g', {}, root), turnouts = svg('g', {}, root);
  const flow = svg('g', { id: 'flow-layer', 'pointer-events': 'none' }, root), labels = svg('g', {}, root), icons = svg('g', {}, root), controls = svg('g', {}, root);
  for (const s of panel.segs.filter(s => s.b !== 'frame' && !s.hide && Math.min(s.y1, s.y2) < 850)) {
    const node = svg('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, class: 'rail unconfigured' }, track);
    rails.push({ node, block: s.b });
  }
  for (const t of Object.values(panel.turnouts)) {
    if (t.cy > 850) continue;
    const legs = {};
    for (const [leg, x, y] of [['A', t.ax, t.ay], ['B', t.bx, t.by], ['C', t.ccx, t.ccy]]) {
      legs[leg] = svg('line', { x1: t.cx, y1: t.cy, x2: x, y2: y, class: 'rail unknown' }, turnouts);
    }
    switches.push({ ...t, legs });
    svg('text', { x: t.cx + 3, y: t.cy - 11, class: 'turnout-number' }, labels, t.name.replace('Vx', ''));
    const g = svg('g', { class: 'touch-target turnout-target' }, controls);
    svg('circle', { cx: t.cx, cy: t.cy, r: 16, class: 'hit' }, g);
    accessible(g, `Växel ${t.name}`, () => { inspected = { kind: 'turnout', name: t.name }; paintInspector(); });
  }
  for (const l of panel.labels.filter(l => !l.hidden && l.y < 850)) svg('text', { x: l.x, y: l.y + (l.size || 12), class: 'track-label' }, labels, l.text);
  const tt = panel.turntable; svg('circle', { cx: tt.cx, cy: tt.cy, r: tt.r, class: 'rail unconfigured' }, track);
  svg('line', { x1: tt.cx - tt.r, y1: tt.cy, x2: tt.cx + tt.r, y2: tt.cy, class: 'rail unconfigured' }, track);
  for (const m of panel.micons.filter(m => m.y < 850)) {
    const type = iconTypes[m.type] || iconTypes.hsi_2;
    const sample = imageCache.find(i => i.src.endsWith(encodeURIComponent(type[0]) + '.gif'));
    const w = sample?.naturalWidth || type[3], h = sample?.naturalHeight || type[4];
    const rad = m.deg * Math.PI / 180, rw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)), rh = Math.abs(h * Math.cos(rad)) + Math.abs(w * Math.sin(rad));
    const g = svg('g', { transform: `translate(${m.x + rw / 2},${m.y + rh / 2})`, class: 'touch-target signal-target' }, icons);
    svg('rect', { x: -rw / 2 - 5, y: -rh / 2 - 6, width: rw + 10, height: rh + 12, class: 'hit' }, g);
    const img = svg('image', { x: -w / 2, y: -h / 2, width: w, height: h, transform: `rotate(${m.deg})`, href: icon(type[2]) }, g);
    const unknown = svg('text', { x: rw / 2 + 1, y: 3, class: 'signal-unknown' }, g, '?');
    accessible(g, `Signal ${m.mast}`, () => { inspected = { kind: 'signal', name: m.mast }; paintInspector(); });
    signals.push({ ...m, g, img, unknown, type });
  }
  const used = new Set(config.routes.flatMap(r => [r.from, r.to]));
  for (const b of panel.sicons.filter(b => b.sensor.startsWith('htv') && !b.hidden && b.y < 850)) {
    const g = svg('g', { transform: `translate(${b.x + 8},${b.y + 8})`, class: 'touch-target route-button', 'data-button': b.sensor }, controls);
    svg('circle', { r: 21, class: 'hit' }, g); svg('circle', { r: 7, class: 'dot' }, g);
    accessible(g, `${label(b.sensor)} · tågvägsknapp${used.has(b.sensor) ? '' : ' · ej inkopplad'}`, () => choose(b.sensor));
    buttons.push({ id: b.sensor, g, available: used.has(b.sensor) });
  }
}
function usable() { return online && state?.connection === 'connected' && !state.storageFault; }
function paintPlan() {
  const fresh = online && state?.connection === 'connected';
  for (const r of rails) {
    const value = fresh ? state.blocks[r.block]?.occupied : null;
    r.node.setAttribute('class', 'rail ' + (!(r.block in config.blocks) ? 'unconfigured' : value === true ? 'occupied' : value === false ? '' : 'unknown'));
  }
  for (const t of switches) {
    const value = fresh ? state.turnouts[t.name]?.position : 'unknown';
    const continuing = t.continuing === 2 ? 'B' : 'C', active = value === 'C' ? continuing : value === 'T' ? (continuing === 'B' ? 'C' : 'B') : null;
    const occupied = fresh && state.blocks[t.block]?.occupied;
    for (const [leg, node] of Object.entries(t.legs)) node.setAttribute('class', 'rail ' + (occupied ? 'occupied ' : '') + (!active ? 'unknown' : leg === 'A' || leg === active ? '' : 'branch-off'));
  }
  for (const s of signals) {
    const value = fresh ? state.signals[s.mast]?.aspect : 'unknown';
    const target = icon(s.type[value === 'stop' ? 0 : value === 'go' ? 1 : 2]);
    if (s.img.getAttribute('href') !== target) s.img.setAttribute('href', target);
    s.unknown.style.display = value === 'go' || value === 'stop' ? 'none' : '';
    s.g.classList.toggle('unconfigured', !config.signals[s.mast]);
  }
  for (const b of buttons) {
    b.g.classList.toggle('chosen', b.id === chosen); b.g.classList.toggle('unavailable', !b.available);
    b.g.classList.toggle('in-route', !!state?.routes.some(r => r.from === b.id || r.to === b.id));
  }
  for (const [id, data] of routeNodes) if (!state?.routes.some(r => r.id === id)) { data.g.remove(); routeNodes.delete(id); }
  for (const r of state?.routes || []) {
    if (!routeNodes.has(r.id)) {
      const g = svg('g', {}, $('flow-layer'));
      const parts = r.flow.map(part => {
        const node = svg('line', { x1: part.x1, y1: part.y1, x2: part.x2, y2: part.y2, class: 'route-flow' }, g);
        const lamps = [];
        for (let dist = 13; dist < part.length; dist += 23) lamps.push({ at: part.distance + dist, node: svg('circle', { cx: part.x1 + (part.x2 - part.x1) * dist / part.length, cy: part.y1 + (part.y2 - part.y1) * dist / part.length, r: 2.3, class: 'lamp' }, g) });
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
    const fraction = online && r.state === 'establishing' && !reduced ? Math.min(1, Math.max(0, (Date.now() - r.establishedAt) / 1200)) : 1;
    const status = !online ? 'held' : r.state;
    for (const part of entry.parts) {
      const lit = Math.max(0, Math.min(part.length, fraction * total - part.distance));
      const occupied = online && state.blocks[part.block]?.occupied === true;
      part.node.setAttribute('class', 'route-flow ' + status);
      part.node.style.visibility = occupied ? 'hidden' : '';
      if (r.state === 'establishing' && online) part.node.setAttribute('stroke-dasharray', `${lit} ${part.length + 1}`);
      else part.node.removeAttribute('stroke-dasharray');
      for (const lamp of part.lamps) lamp.node.style.visibility = !occupied && ['establishing', 'clearing', 'active'].includes(status) && lamp.at <= fraction * total ? 'visible' : 'hidden';
    }
  }
}
const statuses = { setting: 'Lägger växlar', establishing: 'Etablerar', clearing: 'Klarsätter', active: 'Klar', held: 'Stopp · lås kvar', occupied: 'Lås kvar', cancelling: 'Återtar' };
function paint() {
  if (!state) return;
  const c = $('connection'); c.textContent = !online ? 'Kontakt med kärnan saknas' : state.storageFault ? 'Lagringsfel · spärrad' : state.connection === 'connected' ? 'LocoNet ansluten' : 'LocoNet frånkopplad';
  c.className = 'connection ' + (usable() ? 'online' : 'offline');
  paintPlan(); paintInspector();
  for (const b of $('route-catalog').querySelectorAll('button')) b.disabled = !usable() || pending;
  html('active-routes', state.routes.map(r => `<div class="route-item"><strong>${esc(r.label)}<span class="route-state ${esc(r.state)}">${esc(statuses[r.state])}</span></strong><small>${esc(r.reason)}</small><button data-cancel="${esc(r.id)}" ${!online || r.cancelRequested ? 'disabled' : ''}>${r.cancelRequested ? 'Inväntar frigivning' : 'Återta'}</button></div>`).join(''));
  $('event-status').textContent = state.routes.length + ' tågvägslås · ' + Object.keys(config.turnouts).length + ' anslutna växlar';
  $('events').innerHTML = state.events.filter(e => !['report', 'transport'].includes(e.kind)).slice(0, 7).map(e => `<div class="event-row"><time>${time(e.at)}</time><span>${esc(e.message)}</span></div>`).join('');
  $('wire').textContent = (state.trace || []).slice(0, 40).map(e => `${time(e.at)}  ${e.direction === 'out' ? 'SKICKAT ' : 'MOTTAGET'}  ${e.hex}`).join('\n');
}
function paintInspector() {
  if (!inspected || !state) return;
  const { kind, name } = inspected, b = kind === 'signal' ? config.signals[name] : config.turnouts[name];
  if (!b) { html('inspector', `<h2>${kind === 'signal' ? 'Signal' : 'Växel'} ${esc(name)}</h2><p class="muted">Importerad från JMRI. Återrapport och manövrering är ännu inte inkopplade för detta objekt.</p>`); return; }
  const s = kind === 'signal' ? state.signals[name] : state.turnouts[name];
  const locked = state.routes.filter(r => kind === 'signal' ? r.signals.includes(name) : r.turnouts[name]);
  const value = !online ? 'Okänt' : kind === 'signal' ? ({ go: 'Kör återrapporterat', stop: 'Stopp återrapporterat', unknown: 'Okänt besked' }[s.aspect]) : ({ C: 'Rakt', T: 'Avvikande', unknown: 'Okänt / omläggning' }[s.position]);
  const detail = `<dl><dt>${kind === 'signal' ? 'Signal' : 'Växel'}</dt><dd><strong>${esc(name)}</strong></dd><dt>Rapporterat</dt><dd>${esc(value)}</dd><dt>Tågvägslås</dt><dd>${esc(locked.map(r => r.label).join(', ') || 'Inga')}</dd><dt>${kind === 'signal' ? 'Provadress / råkod' : 'Källadress'}</dt><dd>${kind === 'signal' ? b.address + ' / ' + (s.code ?? '—') : esc(b.source) + (b.inverted ? ' · inverterad' : '')}</dd></dl>`;
  html('inspector', detail + (kind === 'turnout' ? `<div class="actions"><button data-manual="C" ${locked.length || !usable() ? 'disabled' : ''}>Lägg rakt</button><button data-manual="T" ${locked.length || !usable() ? 'disabled' : ''}>Lägg avvikande</button></div>` : `<p class="muted">Beskedskoderna är en preliminär provmappning. Fullständiga svenska signalbilder kräver verifiering mot din MGP-utrustning.</p>`));
}
const registries = { signals: 'Signaler', layoutTurnouts: 'Växlar i spårplan', turnouts: 'Alla växelobjekt', sensors: 'Sensorer', blocks: 'Block' };
function renderRegistry() {
  const search = $('search').value.toLowerCase();
  const items = registry[registryKind].map((obj, i) => ({ obj, i })).filter(({ obj }) => JSON.stringify(obj).toLowerCase().includes(search));
  $('registry-count').textContent = `${items.length} objekt · ${config.routes.length} provtågvägar i den lokala kärnan`;
  $('registry-rows').innerHTML = items.slice(0, 200).map(({ obj, i }) => {
    const name = obj.id || obj.name || obj.user || obj.mast || obj.sys || 'Objekt ' + i;
    const source = obj.sys || obj.systemName || obj.sensor || obj.type || 'JMRI-layout';
    const binding = registryKind === 'signals' ? config.signals[name] : ['layoutTurnouts', 'turnouts'].includes(registryKind) ? config.turnouts[name] : config.blocks[name];
    const key = registryKind + ':' + i;
    return `<tr><td><strong>${esc(name)}</strong>${obj.comment ? '<br><span class="muted">' + esc(obj.comment) + '</span>' : ''}</td><td>${esc(source)}</td><td>${binding ? esc((binding.source ? binding.source : 'Provadress ' + binding.address)) : '<span class="muted">Ej inkopplat</span>'}</td><td><button data-note="${esc(key)}">${esc(config.notes[key] || 'Lägg till anteckning')}</button></td></tr>`;
  }).join('');
  if (items.length > 200) $('registry-count').textContent += ' · visar de första 200, sök för att begränsa';
  for (const b of $('registry-tabs').children) b.classList.toggle('selected', b.dataset.kind === registryKind);
}
async function start() {
  [config, panel, registry] = await Promise.all(['/api/config', '/data/panel.json', '/data/admin.json'].map(async url => { const r = await fetch(url); if (!r.ok) throw Error('Kunde inte läsa underlaget'); return r.json(); }));
  const files = [...new Set(Object.values(iconTypes).flatMap(a => a.slice(0, 3)))];
  await Promise.all(files.map(async file => { const i = new Image(); imageCache.push(i); i.src = icon(file); await i.decode(); }));
  buildPlan();
  $('field-link').href = config.fieldUrl; $('field-link').hidden = false;
  $('route-catalog').innerHTML = config.routes.map(r => `<button data-route="${r.id}" disabled>${esc(r.label)} <span aria-hidden="true">↗</span></button>`).join('');
  $('route-catalog').onclick = e => { const r = config.routes.find(r => r.id === e.target.closest('button')?.dataset.route); if (r) api('route', { from: r.from, to: r.to }); };
  $('active-routes').onclick = e => { const id = e.target.closest('button')?.dataset.cancel; if (id) api('cancel', { id }); };
  $('inspector').onclick = e => { const position = e.target.closest('button')?.dataset.manual; if (position) api('turnout', { name: inspected.name, position }); };
  $('clear-selection').onclick = clearChoice;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') clearChoice(); });
  for (const b of document.querySelectorAll('.skin-picker button')) b.onclick = () => setSkin(b.dataset.skin);
  function setSkin(value) { document.body.dataset.skin = value; localStorage.setItem('charlottendal-skin', value); for (const b of document.querySelectorAll('.skin-picker button')) b.classList.toggle('selected', b.dataset.skin === value); }
  setSkin(localStorage.getItem('charlottendal-skin') || 'relay');
  $('zoom').onchange = () => { $('track-plan').style.width = $('zoom').value + '%'; };
  for (const page of ['panel', 'admin']) $(page + '-tab').onclick = () => { for (const p of ['panel', 'admin']) { $(p + '-view').hidden = p !== page; $(p + '-tab').classList.toggle('selected', p === page); } if (page === 'admin') renderRegistry(); };
  $('registry-tabs').innerHTML = Object.entries(registries).map(([key, name]) => `<button data-kind="${key}">${name} <span class="muted">${registry[key].length}</span></button>`).join('');
  $('registry-tabs').onclick = e => { const k = e.target.closest('button')?.dataset.kind; if (k) { registryKind = k; renderRegistry(); } };
  $('search').oninput = renderRegistry;
  $('registry-rows').onclick = e => { noteKey = e.target.closest('button')?.dataset.note; if (noteKey) { const obj = registry[registryKind][Number(noteKey.split(':')[1])]; $('note-heading').textContent = 'Anteckning · ' + (obj.id || obj.name || obj.user || obj.sys); $('note-text').value = config.notes[noteKey] || ''; $('note-dialog').showModal(); } };
  $('save-note').onclick = async () => { const note = $('note-text').value; if (await api('note', { key: noteKey, note })) { config.notes[noteKey] = note; $('note-dialog').close(); renderRegistry(); } };
  const source = new EventSource('/api/events');
  source.onmessage = e => { state = JSON.parse(e.data); online = true; lastEvent = Date.now(); paint(); };
  source.onerror = () => { online = false; paint(); };
  setInterval(() => { if (Date.now() - lastEvent > 3000 && online) { online = false; paint(); } }, 750);
  function animation() { if (state?.routes.some(r => r.state === 'establishing')) animateFlow(); requestAnimationFrame(animation); } animation();
}
start().catch(e => { message('Startfel: ' + e.message); $('connection').textContent = 'Kunde inte starta panelen'; });
