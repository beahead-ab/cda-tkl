// Signalrapport per profil: SE-telegrammet (E4) med beskedskoder, eller växelrapporten (B1) där CLOSED är kör och THROWN stopp.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { BindingConfiguration } from '../src/binding-configuration.mjs';
import { commandExpectations, protocolObjects } from '../src/communication-diagnostics.mjs';
import { Measurements } from '../src/studio/measure.mjs';
import { decode, switchReport, signalReport, hex } from '../src/protocol.mjs';
import { signalReportKind, aspectFromSwitch } from '../src/signal-report.mjs';
const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url)));
const base = read('profiles/charlottendal-network.json'), plant = read('profiles/simulator-network.json');
const withKind = (profile, kind, overrides = {}) => { const p = structuredClone(profile); p.signalReport = { kind }; for (const [n, k] of Object.entries(overrides)) p.signals[n].reportKind = k; return p; };
const storage = () => ({ load: (n, fallback) => fallback, save() {} });

test('the profile default and the per-signal override decide the report kind; virtual signals have none', () => {
  assert.equal(base.signalReport.kind, 'se');
  assert.equal(signalReportKind(base, base.signals['1/1']), 'se'); assert.equal(signalReportKind(base, base.signals['6/6']), null);
  const p = withKind(base, 'switch', { '1/5': 'se' });
  assert.equal(signalReportKind(p, p.signals['1/1']), 'switch'); assert.equal(signalReportKind(p, p.signals['1/5']), 'se');
  assert.equal(signalReportKind({}, { address: 1, reportAddress: 1 }), 'se', 'en profil utan fältet läser SE som förr');
  assert.deepEqual(['C', 'T', 'unknown'].map(aspectFromSwitch), ['go', 'stop', 'unknown']);
});

test('with switch reports the engine reads B1 on the report address as stop or go and ignores E4; with se it is the reverse', () => {
  for (const kind of ['switch', 'se']) {
    let now = 100000; const e = new Engine(withKind(base, kind), { now: () => now, send: () => {} }); e.connection(true);
    const s = e.signals['1/1'], a = base.signals['1/1'].reportAddress;
    e.receive(switchReport(a, 'T')); assert.equal(s.aspect, kind === 'switch' ? 'stop' : 'unknown', kind);
    e.receive(signalReport(a, 0)); assert.equal(s.aspect, 'stop', kind);
    e.permission('1/1', 'GO'); now += 100;
    e.receive(kind === 'switch' ? switchReport(a, 'C') : signalReport(a, 8)); assert.equal(s.aspect, 'go'); assert.equal(s.code, kind === 'switch' ? 'C' : 8); assert.ok(s.reportSequence > s.commandSequence);
    e.receive(kind === 'switch' ? signalReport(a, 0) : switchReport(a, 'T')); assert.equal(s.aspect, 'go', 'fel telegramslag ändrar inget');
    e.receive(switchReport(a, 'unknown')); assert.equal(s.aspect, kind === 'switch' ? 'unknown' : 'go');
  }
  // Ett oväntat kör via B1 återtas som via E4.
  const sent = [], e = new Engine(withKind(base, 'switch'), { now: () => 100000, send: b => sent.push(decode(b)) }); e.connection(true);
  const before = sent.length; e.receive(switchReport(base.signals['1/1'].reportAddress, 'C'));
  assert.equal(sent.length, before); e.now = () => 100500; e.receive(switchReport(base.signals['1/1'].reportAddress, 'C'));
  assert.deepEqual(sent.at(-1), { kind: 'order', address: base.signals['1/1'].address, position: 'T', on: true });
  assert.equal(e.turnouts.Vx100.position, 'unknown', 'växlarna rörs inte av signalens rapport');
});

test('the simulator answers with the report kind of its profile, so a switch-profile plant drives a switch-profile TKL to green', () => {
  const field = new Field(withKind(plant, 'switch')), frames = []; field.on('frame', b => frames.push(decode(b)));
  field.allReports();
  const a = plant.signals['1/1'].reportAddress;
  assert.ok(frames.some(d => d.kind === 'turnout' && d.address === a && d.position === 'T')); assert.ok(!frames.some(d => d.kind === 'signal'));
  let now = 100000; const queue = [];
  const plantS = new Field(withKind(plant, 'switch'), { now: () => now, movementMs: 100 }), engine = new Engine(withKind(base, 'switch'), { now: () => now, send: b => queue.push(['order', b]) });
  plantS.on('frame', b => queue.push(['report', b]));
  const drain = () => { let guard = 20000; while (queue.length && guard--) { const [k, b] = queue.shift(); if (k === 'order') plantS.accept(b); else engine.receive(b); } assert.ok(guard > 0); };
  const advance = ms => { for (let i = 0; i < ms; i += 50) { now += 50; plantS.tick(); if (now % 1000 === 0) plantS.allReports(); drain(); engine.tick(); drain(); } };
  engine.connection(true); plantS.allReports(); drain();
  const def = base.routes.find(r => r.id === 'htvCu--htvSpIA'), route = engine.request(def.from, def.to); advance(6500);
  assert.equal(route.state, 'active', route.reason); assert.equal(engine.signals[def.signals[0]].code, 'C');
  plantS.startTrain(def.id); advance((route.passage.length + 3) * 850); assert.equal(engine.routes.length, 0, route.reason);
});

test('diagnostics, measurement and operator bindings follow the report kind', () => {
  const p = withKind(base, 'switch'), a = p.signals['1/1'].reportAddress;
  const state = { connection: 'connected', serverTime: 1000, turnouts: {}, signals: { '1/1': { desired: 'STOP', commandAt: 500, updatedAt: 0 } } };
  for (const n of Object.keys(p.turnouts)) state.turnouts[n] = {};
  assert.deepEqual(commandExpectations(p, state).find(r => r.name === '1/1').expected, [hex(switchReport(a, 'T'))]);
  assert.deepEqual(protocolObjects(p, { kind: 'turnout', address: a, position: 'T' }).map(o => o.name), ['1/1']);
  assert.deepEqual(protocolObjects(p, { kind: 'signal', address: a, code: 0 }), [], 'E4 hör inte till en B1-signal');
  assert.deepEqual(protocolObjects(base, { kind: 'turnout', address: a, position: 'T' }), [], 'B1 hör inte till en SE-signal');
  let now = 5000; const m = new Measurements({ storage: storage(), send: () => true, now: () => now, mode: () => 'simulator' });
  let v = m.probe({ kind: 'signal', name: '1/1', position: 'GO' }, p); assert.deepEqual(v.pending.expect, { kind: 'turnout', address: a, position: 'T' }); assert.deepEqual(v.pending.expectHex, [hex(switchReport(a, 'T'))]);
  now += 10; m.observe(signalReport(a, 0)); assert.equal(m.view(p).pending.report, null); m.observe(switchReport(a, 'T')); assert.ok(m.view(p).pending.report);
  const c = new BindingConfiguration(base, { storage: storage() }); assert.deepEqual(c.validate({}), []);
  const row = c.catalog.find(r => r.kind === 'signalReport'); assert.deepEqual(row.values, { kind: 'se' });
  assert.equal(c.catalog.find(r => r.key === 'signals:1/1').values.reportKind, 'inherit');
  assert.deepEqual(c.validate({ 'signalReport:alla': { kind: 'switch' } }), []);
  assert.equal(c.profile({ 'signalReport:alla': { kind: 'switch' } }).signalReport.kind, 'switch');
  const own = c.profile({ 'signals:1/1': { ...c.catalog.find(r => r.key === 'signals:1/1').values, reportKind: 'switch' } });
  assert.equal(signalReportKind(own, own.signals['1/1']), 'switch'); assert.equal(signalReportKind(own, own.signals['1/5']), 'se');
  assert.equal(c.profile({ 'signals:1/1': { ...c.catalog.find(r => r.key === 'signals:1/1').values, reportKind: 'inherit' } }).signals['1/1'].reportKind, undefined);
  assert.ok(c.validate({ 'signalReport:alla': { kind: 'nonsens' } }).length, 'okänd rapportform avvisas');
  assert.ok(c.validate({ 'signals:1/1': { ...c.catalog.find(r => r.key === 'signals:1/1').values, reportAddress: base.turnouts.Vx100.address, reportKind: 'switch' } }).some(e => /tillhör redan en växel/.test(e)));
  assert.deepEqual(c.validate({ 'signals:1/1': { ...c.catalog.find(r => r.key === 'signals:1/1').values, reportAddress: base.turnouts.Vx100.address, reportKind: 'se' } }), [], 'SE-rapporten delar inte växelns telegram');
});
