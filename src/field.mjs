import { EventEmitter } from 'node:events';
import { decode, switchReport, sensorReport, signalReport } from './protocol.mjs';

// Independent field state: no Engine import, route state or TKL HTTP access.
export class Field extends EventEmitter {
  constructor(profile, { now = Date.now, movementMs = 650 } = {}) {
    super(); this.profile = profile; this.now = now; this.movementMs = movementMs;
    this.turnouts = Object.fromEntries(Object.keys(profile.turnouts).map(n => [n, { position: 'C', target: 'C', due: 0 }]));
    this.blocks = Object.fromEntries(Object.keys(profile.blocks).map(n => [n, false]));
    this.signals = Object.fromEntries(Object.keys(profile.signals).map(n => [n, { permission: 'STOP', code: 0, due: 0 }]));
    this.faults = { turnout: '', signal: '', sensor: '' }; this.train = null;
  }
  reportTurnout(name) {
    if (this.faults.turnout === name) return;
    const b = this.profile.turnouts[name], value = this.turnouts[name].position;
    const physical = value === 'unknown' ? value : b.inverted ? (value === 'C' ? 'T' : 'C') : value;
    this.emit('frame', switchReport(b.address, physical));
  }
  reportBlock(name) {
    if (this.faults.sensor === name) return;
    const b = this.profile.blocks[name]; this.emit('frame', sensorReport(b.address, b.activeMeansOccupied ? this.blocks[name] : !this.blocks[name]));
  }
  reportSignal(name) { this.emit('frame', signalReport(this.profile.signals[name].reportAddress, this.signals[name].code)); }
  allReports() {
    for (const n of Object.keys(this.turnouts)) this.reportTurnout(n);
    for (const n of Object.keys(this.blocks)) this.reportBlock(n);
    for (const n of Object.keys(this.signals)) this.reportSignal(n);
  }
  accept(bytes) {
    const d = decode(bytes); if (d.kind !== 'order' || !d.on) return;
    for (const [name, b] of Object.entries(this.profile.turnouts)) {
      if (b.address !== d.address) continue;
      const logical = b.inverted ? (d.position === 'C' ? 'T' : 'C') : d.position;
      const s = this.turnouts[name];
      if (s.position === logical) { this.reportTurnout(name); continue; }
      s.target = logical; s.position = 'unknown'; s.due = this.now() + this.movementMs;
      this.reportTurnout(name);
    }
    for (const [name, b] of Object.entries(this.profile.signals)) {
      if (b.address !== d.address) continue;
      const s = this.signals[name]; s.permission = d.position === 'C' ? 'GO' : 'STOP'; s.due = this.now() + 160;
      if (s.permission === 'STOP') { s.code = 0; this.reportSignal(name); }
    }
    this.tick();
  }
  tick() {
    const now = this.now();
    for (const [n, s] of Object.entries(this.turnouts)) if (s.due && s.due <= now && this.faults.turnout !== n) {
      s.position = s.target; s.due = 0; this.reportTurnout(n);
    }
    for (const [n, s] of Object.entries(this.signals)) {
      const p = this.profile.protection[n];
      const permitted = s.permission === 'GO' && now >= s.due && this.faults.signal !== n && p.blocks.every(b => !this.blocks[b]) && Object.entries(p.turnouts).every(([t, pos]) => this.turnouts[t].position === pos);
      // Provisional CZ example codes; intentionally no invented Swedish aspect table.
      const code = permitted ? (Object.values(p.turnouts).includes('T') ? 18 : 8) : 0;
      if (code !== s.code) { s.code = code; this.reportSignal(n); }
    }
    if (this.train && now >= this.train.nextAt) this.stepTrain();
  }
  setBlock(name, occupied) {
    if (!(name in this.blocks) || typeof occupied !== 'boolean') throw Error('Okänd detektor.');
    this.blocks[name] = occupied; this.reportBlock(name); this.tick();
  }
  setFault(kind, name) {
    const allowed = { turnout: this.turnouts, signal: this.signals, sensor: this.blocks };
    if (!allowed[kind] || (name && !(name in allowed[kind]))) throw Error('Okänd felpunkt.');
    this.faults[kind] = name; this.tick(); this.allReports();
  }
  startTrain(id) {
    if (this.train) throw Error('Ett tåg rör sig redan.');
    const path = this.profile.scenarios.find(s => s.id === id);
    if (!path) throw Error('Okänd färd.');
    if (!this.signals[path.signal].code) throw Error(`Signal ${path.signal} visar inte kör i anläggningen.`);
    if (path.blocks.some(n => this.blocks[n])) throw Error('Färdvägen är redan belagd.');
    this.train = { label: path.label, blocks: [...path.blocks], index: -1, nextAt: this.now() + 50 };
  }
  stepTrain() {
    const t = this.train; t.index++; t.nextAt = this.now() + 850;
    if (t.index < t.blocks.length) { this.blocks[t.blocks[t.index]] = true; this.reportBlock(t.blocks[t.index]); }
    if (t.index >= 2) { this.blocks[t.blocks[t.index - 2]] = false; this.reportBlock(t.blocks[t.index - 2]); }
    if (t.index >= t.blocks.length + 1) this.train = null;
    // tick on the next 50 ms cycle recalculates local signal protection.
  }
  snapshot() { return { turnouts: this.turnouts, blocks: this.blocks, signals: this.signals, faults: this.faults, train: this.train, scenarios: this.profile.scenarios }; }
}
