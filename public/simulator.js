const $ = id => document.getElementById(id), esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let state, ready = false, busy = false;
async function act(path, data) {
  if (busy) return; busy = true;
  try { const r = await fetch('api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const a = await r.json(); if (!r.ok) throw Error(a.error); $('message').hidden = true; }
  catch (e) { $('message').textContent = e.message; $('message').hidden = false; }
  finally { busy = false; await poll(); }
}
async function poll() {
  try {
    const response = await fetch('api/state'); state = await response.json();
    if (!ready) {
      $('blocks').innerHTML = Object.keys(state.blocks).map(n => `<button data-block="${n}">${n}</button>`).join('');
      $('trains').innerHTML = state.scenarios.map(s => `<button data-train="${s.id}">${esc(s.label)}</button>`).join('');
      for (const [kind, source] of [['turnout', 'turnouts'], ['signal', 'signals'], ['sensor', 'blocks']]) {
        $('fault-' + kind).innerHTML += Object.keys(state[source]).map(n => `<option value="${n}">${n}</option>`).join('');
        $('fault-' + kind).onchange = e => act('fault', { kind, name: e.target.value });
      }
      ready = true;
    }
    $('sim-connection').textContent = state.link ? state.clients + ' LocoNet-klient ansluten' : 'LocoNet bruten'; $('sim-connection').className = 'connection ' + (state.clients ? 'online' : 'offline');
    $('link').textContent = state.link ? 'Bryt LocoNet' : 'Återanslut LocoNet';
    for (const b of $('blocks').children) { b.classList.toggle('occupied', state.blocks[b.dataset.block]); b.setAttribute('aria-pressed', state.blocks[b.dataset.block]); }
    for (const b of $('trains').children) { const s = state.scenarios.find(s => s.id === b.dataset.train); b.disabled = !!state.train || !state.signals[s.signal].code; }
    $('train-status').textContent = state.train ? 'Tåg i rörelse · ' + state.train.label : 'Inget tåg i rörelse';
    $('signals').innerHTML = Object.entries(state.signals).map(([n, s]) => `<span class="field-chip ${s.code ? 'go' : ''}">${n} · ${s.code ? 'KÖR' : 'STOPP'} · ${s.code}</span>`).join('');
    $('turnouts').innerHTML = Object.entries(state.turnouts).map(([n, s]) => `<span class="field-chip">${n} · ${{ C: 'Rakt', T: 'Avvikande', unknown: 'Rör sig / okänt' }[s.position]}</span>`).join('');
    for (const kind of ['turnout', 'signal', 'sensor']) if (document.activeElement !== $('fault-' + kind)) $('fault-' + kind).value = state.faults[kind];
    $('trace').textContent = state.trace.slice(0, 35).map(e => `${new Date(e.at).toLocaleTimeString('sv-SE')}  ${e.direction === 'in' ? 'ORDER ' : 'RAPPORT'}  ${e.hex}`).join('\n');
  } catch (e) { $('sim-connection').textContent = 'Kontakt med anläggningen saknas'; $('sim-connection').className = 'connection offline'; }
}
$('blocks').onclick = e => { const name = e.target.closest('button')?.dataset.block; if (name) act('block', { name, occupied: !state.blocks[name] }); };
$('trains').onclick = e => { const id = e.target.closest('button')?.dataset.train; if (id) act('train', { id }); };
$('link').onclick = () => act('link', { connected: !state.link });
try { const response = await fetch('api/config'); if (!response.ok) throw Error(); const config = await response.json(); $('tkl-link').href = config.tklUrl; $('tkl-link').hidden = false; } catch {}
await poll(); setInterval(poll, 400);
