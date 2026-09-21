import { EventEmitter } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { decode, hex, switchOrder } from './protocol.mjs';

export class Engine extends EventEmitter {
  constructor(profile, { send = () => {}, storage, now = Date.now } = {}) {
    super(); this.profile = profile; this.send = send; this.storage = storage; this.now = now;
    this.fingerprint = createHash('sha256').update(JSON.stringify(profile)).digest('hex');
    this.connected = false; this.connectionAt = 0; this.storageFault = null; this.revision = 0; this.events = [];
    this.turnouts = Object.fromEntries(Object.keys(profile.turnouts).map(n => [n, { position: 'unknown', desired: null, updatedAt: 0 }]));
    this.blocks = Object.fromEntries(Object.keys(profile.blocks).map(n => [n, { occupied: null, updatedAt: 0 }]));
    this.signals = Object.fromEntries(Object.keys(profile.signals).map(n => [n, { aspect: 'unknown', code: null, desired: 'STOP', updatedAt: 0, commandAt: 0 }]));
    const saved = storage?.load('routes.json', { fingerprint: this.fingerprint, routes: [] });
    if (saved?.routes.length && saved.fingerprint !== this.fingerprint) throw Error('Profilen har ändrats medan lås finns kvar. Återställ profilen före start.');
    this.routes = (saved?.routes || []).map(r => ({ ...r, state: 'held', cancelRequested: false, reason: 'Återställd efter omstart. Kontrollera återrapporter och återta vägen.', nextSignal: -1 }));
    this.log('startup', this.routes.length ? `${this.routes.length} tågvägslås återställda; inget körmedgivande återupptas.` : 'TKL startad. Väntar på återrapporter.');
  }
  log(kind, message, details) {
    const event = { id: ++this.revision, at: this.now(), kind, message, ...(details ? { details } : {}) };
    this.events.unshift(event); this.events.length = Math.min(this.events.length, 150);
    try { this.storage?.event(event); } catch (e) { this.storageFault = e.message; }
    this.emit('change');
  }
  persist() {
    try { this.storage?.save('routes.json', { fingerprint: this.fingerprint, routes: this.routes }); }
    catch (e) { this.storageFault = e.message; for (const name of Object.keys(this.signals)) this.permission(name, 'STOP'); throw Error('Kunde inte spara lås. Manövrering spärrad.'); }
  }
  connection(connected) {
    this.connected = connected; this.connectionAt = this.now();
    this.invalidate();
    for (const r of this.routes) { r.state = r.cancelRequested ? 'cancelling' : 'held'; r.reason = connected ? 'Återansluten. Inväntar nya återrapporter.' : 'Anslutningen bruten; låsen ligger kvar.'; }
    this.log(connected ? 'connected' : 'disconnected', connected ? 'LocoNet ansluten. Synkroniserar rapporter.' : 'LocoNet frånkopplad. Alla fälttillstånd är okända.');
    if (connected) for (const name of Object.keys(this.signals)) this.permission(name, 'STOP');
    this.persist();
  }
  invalidate() {
    for (const s of Object.values(this.turnouts)) { s.position = 'unknown'; s.updatedAt = 0; }
    for (const s of Object.values(this.blocks)) { s.occupied = null; s.updatedAt = 0; }
    for (const s of Object.values(this.signals)) { s.aspect = 'unknown'; s.desired = 'STOP'; s.code = null; s.updatedAt = 0; }
  }
  fresh(s) { return this.connected && s.updatedAt >= this.connectionAt && this.now() - s.updatedAt <= this.profile.staleMs && s.updatedAt > 0; }
  guardSignals(route) {
    return [...new Set(this.profile.routes.filter(r => r.blocks.some(b => route.blocks.includes(b))).flatMap(r => r.signals))].filter(n => !route.signals.includes(n));
  }
  receive(bytes) {
    let d; try { d = decode(bytes); } catch (e) { this.log('bad-frame', e.message, { frame: hex(bytes) }); return; }
    // B0 echo and SENT OK are not field feedback.
    if (d.kind === 'order' || d.kind === 'unsupported') return;
    const now = this.now(); let changed = false;
    if (d.kind === 'turnout') for (const [name, binding] of Object.entries(this.profile.turnouts)) {
      if (binding.address !== d.address) continue;
      const pos = d.position === 'unknown' ? 'unknown' : binding.inverted ? (d.position === 'C' ? 'T' : 'C') : d.position;
      const state = this.turnouts[name]; changed ||= state.position !== pos;
      state.position = pos; state.updatedAt = now;
    }
    if (d.kind === 'sensor') for (const [name, binding] of Object.entries(this.profile.blocks)) {
      if (binding.address !== d.address) continue;
      const occupied = binding.activeMeansOccupied ? d.active : !d.active;
      const state = this.blocks[name]; changed ||= state.occupied !== occupied;
      state.occupied = occupied; state.updatedAt = now;
    }
    if (d.kind === 'signal') for (const [name, binding] of Object.entries(this.profile.signals)) {
      if (binding.reportAddress !== d.address) continue;
      const aspect = binding.stopCodes.includes(d.code) ? 'stop' : binding.goCodes.includes(d.code) ? 'go' : 'unknown';
      const state = this.signals[name]; changed ||= state.aspect !== aspect || state.code !== d.code;
      const unexpected = aspect === 'go' && state.desired === 'STOP';
      state.aspect = aspect; state.updatedAt = now; state.code = d.code;
      if (unexpected && now - state.commandAt > 200) {
        this.log('unexpected-go', `Signal ${name} rapporterar kör utan medgivande. Begär stopp.`);
        this.permission(name, 'STOP');
      }
    }
    if (changed) this.log('report', describe(d), { frame: hex(bytes) });
    this.tick(); this.emit('change');
  }
  permission(name, desired) {
    if (desired === 'GO' && (!this.connected || this.storageFault)) throw Error('Körmedgivande spärrat.');
    const s = this.signals[name]; s.desired = desired; s.commandAt = this.now();
    if (this.connected) this.send(switchOrder(this.profile.signals[name].address, desired === 'GO' ? 'C' : 'T'));
    this.log('permission', `Signal ${name}: begär ${desired === 'GO' ? 'körmedgivande' : 'stopp'}.`);
  }
  turnoutOrder(name, position) {
    const b = this.profile.turnouts[name], s = this.turnouts[name];
    s.desired = position; s.commandAt = this.now(); s.position = 'unknown'; s.updatedAt = 0;
    const physical = b.inverted ? (position === 'C' ? 'T' : 'C') : position;
    this.send(switchOrder(b.address, physical));
    this.log('order', `${name}: begär ${position === 'C' ? 'rakt' : 'avvikande'}.`, { address: b.address });
  }
  request(from, to) {
    const existing = this.routes.find(r => r.from === from && r.to === to);
    if (existing) return this.cancel(existing.id);
    if (!this.connected || this.storageFault) throw Error(this.storageFault ? 'Lagringsfel; manövrering spärrad.' : 'Ingen LocoNet-anslutning.');
    const def = this.profile.routes.find(r => r.from === from && r.to === to);
    if (!def) throw Error('Den här tågvägen ingår inte i etapp 1. Välj någon av provtågvägarna.');
    for (const b of def.blocks) if (!this.fresh(this.blocks[b]) || this.blocks[b].occupied !== false) throw Error(`${b} är belagt eller saknar aktuell återrapport.`);
    for (const name of [...def.signals, ...this.guardSignals(def)]) if (!this.fresh(this.signals[name]) || this.signals[name].aspect !== 'stop') throw Error(`Signal ${name} är inte bekräftat i stopp.`);
    for (const route of this.routes) {
      const hit = def.blocks.find(b => route.blocks.includes(b));
      if (hit || def.crossings.some(x => route.crossings.includes(x))) throw Error('Tågvägen korsar en reserverad väg. Ingen godkänd alternativ väg finns i denna profil.');
      if (def.signals.some(s => route.signals.includes(s))) throw Error('Signal används av en annan tågväg.');
      if (Object.entries(def.turnouts).some(([n, p]) => route.turnouts[n] && route.turnouts[n] !== p)) throw Error('En kopplad växel är låst i motsatt läge.');
    }
    const r = { ...structuredClone(def), definitionId: def.id, id: randomUUID(), state: 'setting', createdAt: this.now(), cancelRequested: false, nextSignal: def.signals.length - 1, reason: 'Inväntar växlarnas återrapporter.' };
    this.routes.push(r); this.persist(); // Locks are durable BEFORE any field commands.
    this.log('route-request', `${r.label}: resurser reserverade.`);
    for (const [n, p] of Object.entries(r.turnouts)) {
      const shared = this.routes.some(other => other.id !== r.id && other.turnouts[n] === p);
      if (!(shared && this.fresh(this.turnouts[n]) && this.turnouts[n].position === p)) this.turnoutOrder(n, p);
    }
    return r;
  }
  cancel(id) {
    const r = this.routes.find(r => r.id === id); if (!r) throw Error('Tågvägen finns inte.');
    if (!r.cancelRequested) {
      r.cancelRequested = true; r.cancelAt = this.now(); r.state = 'cancelling'; r.reason = 'Begärt stopp. Inväntar fria avsnitt och stoppåterrapport.';
      this.persist();
      for (const n of r.signals) this.permission(n, 'STOP');
      this.log('cancel', `${r.label}: återtagning begärd. Låsen ligger kvar tills villkoren är uppfyllda.`);
    }
    this.tick(); return r;
  }
  manual(name, position) {
    if (!this.profile.turnouts[name] || !['C', 'T'].includes(position)) throw Error('Okänd växel eller manöver.');
    if (!this.connected || this.storageFault) throw Error('Manövrering spärrad.');
    const names = this.profile.coupled?.[name] || [name];
    if (this.routes.some(r => names.some(n => r.turnouts[n]))) throw Error(`${name} är låst av tågväg — manöver vägras.`);
    // Conservative commissioning rule: manual turnout control requires the whole configured area free and stopped.
    if (Object.values(this.blocks).some(s => !this.fresh(s) || s.occupied !== false) || Object.values(this.signals).some(s => !this.fresh(s) || s.aspect !== 'stop')) throw Error('Provområdet måste vara fritt med bekräftat stopp före manuell omläggning.');
    for (const n of names) this.turnoutOrder(n, position);
  }
  hold(r, reason, state = 'held') {
    r.state = state; r.reason = reason; r.nextSignal = -1;
    for (const name of r.signals) this.permission(name, 'STOP'); this.persist();
    this.log('route-held', `${r.label}: ${reason} Låsen ligger kvar.`);
  }
  tick() {
    const now = this.now();
    for (const s of Object.values(this.turnouts)) if (!this.fresh(s)) s.position = 'unknown';
    for (const s of Object.values(this.blocks)) if (!this.fresh(s)) s.occupied = null;
    for (const s of Object.values(this.signals)) if (!this.fresh(s)) s.aspect = 'unknown';
    for (const r of [...this.routes]) {
      const free = r.blocks.every(b => this.fresh(this.blocks[b]) && this.blocks[b].occupied === false);
      const known = Object.keys(r.turnouts).every(n => this.fresh(this.turnouts[n]) && this.turnouts[n].position !== 'unknown' && this.turnouts[n].updatedAt >= (this.turnouts[n].commandAt || 0));
      const correct = known && Object.entries(r.turnouts).every(([n, p]) => this.turnouts[n].position === p);
      const protectedSignals = this.guardSignals(r).every(n => this.fresh(this.signals[n]) && this.signals[n].aspect === 'stop');
      if (r.cancelRequested) {
        const stopped = r.signals.every(n => this.fresh(this.signals[n]) && this.signals[n].aspect === 'stop' && this.signals[n].updatedAt >= r.cancelAt);
        if (free && known && stopped && protectedSignals && !this.storageFault) {
          const previous = this.routes; this.routes = this.routes.filter(x => x.id !== r.id);
          try { this.persist(); } catch (e) { this.routes = previous; throw e; }
          this.log('released', `${r.label}: stopp bekräftat, vägen fri, lås frigivna.`);
        }
        continue;
      }
      if (['held', 'occupied'].includes(r.state)) continue;
      if (!protectedSignals && this.connected) { this.hold(r, 'En annan signal till samma provområde saknar bekräftat stopp.'); continue; }
      if (this.storageFault || !this.connected || !free) {
        this.hold(r, this.storageFault ? 'Lagringsfel.' : !this.connected ? 'Ingen anslutning.' : 'Beläggning eller okänd detektor.', free ? 'held' : 'occupied'); continue;
      }
      if (r.state === 'setting') {
        if (correct) { r.state = 'establishing'; r.establishedAt = now; r.reason = 'Växellägen bekräftade. Tågvägen etableras.'; this.persist(); this.log('established', `${r.label}: växlarna återrapporterar rätt läge.`); }
        else if (now - r.createdAt > this.profile.commandTimeoutMs) this.hold(r, 'Växelåterrapport uteblev eller visar fel läge.');
        continue;
      }
      if (!correct) { this.hold(r, 'Växelläge ändrat eller återrapport för gammal.'); continue; }
      if (r.state === 'establishing') {
        if (now - r.establishedAt < 1200) continue; // presentation dwell; field checks above remain authoritative
        r.state = 'clearing'; r.reason = 'Signalerna klarsätts bakifrån.'; r.signalSentAt = 0;
      }
      if (r.state === 'clearing') {
        if (r.signals.slice(r.nextSignal + 1).some(n => !this.fresh(this.signals[n]) || this.signals[n].aspect !== 'go')) {
          this.hold(r, 'En redan klarsatt signal har återgått till stopp eller tappat återrapport.'); continue;
        }
        if (r.nextSignal < 0) { r.state = 'active'; r.reason = 'Tågväg klar. Körbesked återrapporterat.'; this.persist(); this.log('route-active', `${r.label}: körbesked återrapporterat.`); continue; }
        const name = r.signals[r.nextSignal], s = this.signals[name];
        if (!r.signalSentAt) { this.permission(name, 'GO'); r.signalSentAt = now; this.persist(); }
        else if (this.fresh(s) && s.aspect === 'go' && s.updatedAt >= r.signalSentAt && now - r.signalSentAt >= this.profile.signalStepMs) {
          r.nextSignal--; r.signalSentAt = 0;
        } else if (now - r.signalSentAt > this.profile.commandTimeoutMs) this.hold(r, `Signal ${name} har inte rapporterat kör.`);
      }
      if (r.state === 'active' && r.signals.some(n => !this.fresh(this.signals[n]) || this.signals[n].aspect !== 'go')) this.hold(r, 'Körbesked saknas eller har återkallats av fältutrustningen.');
    }
    this.emit('change');
  }
  snapshot() {
    return { serverTime: this.now(), revision: this.revision, connection: this.connected ? 'connected' : 'disconnected', storageFault: this.storageFault,
      profile: { id: this.profile.id, title: this.profile.title, commissioned: this.profile.commissioned, description: this.profile.description },
      turnouts: this.turnouts, blocks: this.blocks, signals: this.signals, routes: this.routes, events: this.events,
      catalog: this.profile.routes.map(r => ({ id: r.id, from: r.from, to: r.to, label: r.label })) };
  }
}
function describe(d) {
  if (d.kind === 'sensor') return `Sensor ${d.address}: ${d.active ? 'aktiv' : 'inaktiv'}.`;
  if (d.kind === 'turnout') return `Växelrapport ${d.address}: ${d.position}.`;
  return `Signalrapport ${d.address}: kod ${d.code}.`;
}
