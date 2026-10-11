// Bindningarna ur Cda60.xml: signalernas huvudutgång, spårledningarnas LS-ingångar och de virtuella masterna,
// genom profilgeneratorn, kärnan, simulatorn, driftbindningarna och diagnostiken.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { BindingConfiguration } from '../src/binding-configuration.mjs';
import { protocolObjects } from '../src/communication-diagnostics.mjs';
import { decode, sensorReport } from '../src/protocol.mjs';
import { parseLayoutXml } from '../src/studio/sources.mjs';
import { detectionInventory } from '../src/studio/detection.mjs';
const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url)));
const profile = read('profiles/charlottendal-network.json'), plant = read('profiles/simulator-network.json');
const xml = parseLayoutXml(fs.readFileSync(new URL('../public/data/source/Cda60.xml', import.meta.url), 'utf8'));
const VIRTUAL = ['3/1', '4/2', '6/10', '6/5', '6/6', '6/7', '7/10', '7/5', '8/10', '8/5', '9/10', '9/5', 'L1'];

test('every TurnoutSignalMast binds to its stop output in Cda60.xml and every VirtualSignalMast carries no address', () => {
  const output = name => xml.turnouts.find(t => t.user === name || t.system === name);
  for (const mast of xml.signalMasts) {
    const s = profile.signals[mast.user]; assert.ok(s, mast.user);
    if (mast.virtual || s.virtual) { assert.equal(s.virtual, true); assert.equal(s.address, undefined); if (!mast.virtual) assert.match(s.provenance, /Ej använd/); continue; }
    const stop = mast.aspects.find(a => a.state === 'thrown'), out = output(stop.turnout);
    assert.equal(s.address, Number(out.system.slice(2)), mast.user); assert.equal(s.reportAddress, s.address); assert.equal(s.sourceOutput, out.system);
    // Körbeskeden lägger samma utgång CLOSED (3/6 skriver den som LT322 i stället för S3/6); 6/8 och 6/9 har bara stoppbeskedet bundet.
    assert.ok(mast.aspects.filter(a => a.state === 'closed' && output(a.turnout)?.system === out.system).length >= 1 || mast.aspects.length === 1, mast.user + ': kör på samma utgång');
  }
  assert.deepEqual(Object.entries(profile.signals).filter(([, s]) => s.virtual).map(([n]) => n), VIRTUAL);
  assert.equal(profile.signals['1/1'].address, 200); assert.equal(profile.signals['3/2'].address, 306); assert.equal(profile.signals.Xv.address, 311);
  assert.match(profile.signals.L1.provenance, /LT308 .*Ej använd/); assert.match(profile.signals['4/2'].provenance, /LT307 .*Ej använd/);
  const orders = Object.values(profile.signals).filter(s => !s.virtual).map(s => s.address), turnouts = Object.values(profile.turnouts).map(t => t.address);
  assert.equal(new Set(orders).size, orders.length); assert.ok(orders.every(a => !turnouts.includes(a) && a !== profile.operatingControls.programming.relayAddress));
  assert.deepEqual(plant.signals, profile.signals, 'simulatorn delar signalbindningarna');
});

test('every detected block carries the LS inputs of its JMRI rule; undetected blocks keep a bench address above 3000', () => {
  const sections = detectionInventory({ profile, xml }).sections;
  for (const s of sections) {
    const b = profile.blocks[s.name];
    if (!s.inputs.length) { assert.ok(b.address > 3000 && !b.inputs, s.name); assert.match(b.provenance, /Bänkadress/); continue; }
    assert.deepEqual((b.inputs || [b]).map(i => i.address), s.inputs.map(ls => Number(ls.slice(2))), s.name);
    assert.deepEqual(b.sourceInputs, s.inputs); assert.ok(s.bound);
    if (s.inputs.length > 1) assert.equal(b.logic, s.shape === 'all' ? 'all' : 'any'); else assert.equal(b.inputs, undefined);
  }
  assert.deepEqual(profile.blocks.SIA.inputs.map(i => i.address), [90, 100]); assert.equal(profile.blocks.SIA.logic, 'any'); assert.equal(profile.blocks.S100.address, 60);
  assert.equal(sections.filter(s => !s.inputs.length).length, 35); assert.equal(profile.blocks.S170.address, 199, 'SN1B-regeln sätter även S170');
  // S100a läser den interna sensorn slS100, som regeln S100 sätter från LS60 (C77 via C24), med Vx100 rakt.
  assert.equal(profile.blocks.S100a.address, 60); assert.deepEqual(sections.find(s => s.name === 'S100a').inputs, ['LS60']);
  assert.deepEqual(plant.blocks, profile.blocks, 'simulatorn delar detektorbindningarna');
});

test('the engine confirms a virtual signal itself, never sends it an order and never lets it go stale', () => {
  let now = 100000; const sent = [];
  const e = new Engine(profile, { now: () => now, send: b => sent.push(decode(b)) }); e.connection(true);
  const s = e.signals['6/6']; assert.equal(s.virtual, true); assert.equal(s.aspect, 'stop'); assert.ok(e.fresh(s)); assert.ok(s.reportSequence > s.commandSequence);
  assert.ok(sent.filter(d => d.kind === 'order').every(d => d.address !== undefined && !Number.isNaN(d.address)), 'ingen order utan adress');
  now += 10 * profile.staleMs; e.tick(); assert.equal(s.aspect, 'stop', 'virtuellt besked blir inte okänt'); assert.ok(e.fresh(s));
  const before = sent.length; e.permission('6/6', 'GO'); assert.equal(s.aspect, 'go'); assert.equal(sent.length, before); assert.ok(s.reportSequence > s.commandSequence);
  e.permission('1/1', 'GO'); assert.equal(sent.at(-1).address, 200); assert.equal(sent.at(-1).position, 'C'); assert.equal(e.signals['1/1'].aspect, 'unknown', 'en verklig signal väntar på rapporten');
  e.connection(false); assert.equal(e.fresh(s), false, 'utan anslutning gäller inget besked');
});

test('a route through the virtual dwarfs to Spår VI becomes active and releases after the train in the simulator', () => {
  let now = 100000; const queue = [];
  const field = new Field(plant, { now: () => now, movementMs: 100 }), engine = new Engine(profile, { now: () => now, send: b => queue.push(['order', b]) });
  field.on('frame', b => queue.push(['report', b]));
  const drain = () => { let guard = 20000; while (queue.length && guard--) { const [k, b] = queue.shift(); if (k === 'order') field.accept(b); else engine.receive(b); } assert.ok(guard > 0); };
  const advance = ms => { for (let i = 0; i < ms; i += 50) { now += 50; field.tick(); if (now % 1000 === 0) field.allReports(); drain(); engine.tick(); drain(); } };
  engine.connection(true); field.allReports(); drain();
  // Infarten till Spår VI klareras av den virtuella dvärgen 6/7 och skyddas av 6/6: utan panelbeskedet skulle den aldrig bli klar mot riktig utrustning.
  const def = profile.routes.find(r => r.id === 'htvCu--htvSpVI'); assert.deepEqual(def.signals, ['1/3', '1/5', '5/5', '6/7']); assert.ok(def.guardSignals.includes('6/6'));
  const route = engine.request(def.from, def.to); advance(6500); assert.equal(route.state, 'active', route.reason);
  assert.equal(engine.signals['6/7'].aspect, 'go'); assert.equal(field.signals['6/7'].code, 8, 'simulatorn låter tåget passera en signal som inte finns');
  field.startTrain(def.id); advance((route.passage.length + 3) * 850);
  assert.equal(field.trains.length, 0); assert.equal(engine.routes.length, 0, route.reason);
});

test('the simulator reports every input of a multi-input block once and the engine weighs them together', () => {
  const field = new Field(plant), frames = []; field.on('frame', b => frames.push(decode(b)));
  field.allReports();
  const sensors = frames.filter(d => d.kind === 'sensor').map(d => d.address);
  assert.ok(sensors.includes(90) && sensors.includes(100), 'båda ingångarna till SIA rapporteras');
  assert.ok(!frames.some(d => d.kind === 'signal' && [undefined, NaN].includes(d.address)), 'ingen rapport från en virtuell signal');
  const e = new Engine(profile); e.connection(true);
  e.receive(sensorReport(100, true)); assert.equal(e.blocks.SIA.occupied, true); e.receive(sensorReport(90, false)); assert.equal(e.blocks.SIA.occupied, true);
  e.receive(sensorReport(100, false)); assert.equal(e.blocks.SIA.occupied, false);
  assert.deepEqual(protocolObjects(profile, { kind: 'sensor', address: 100, active: true }).map(o => o.name), ['SIA']);
  assert.deepEqual(protocolObjects(profile, { kind: 'order', address: 200, position: 'C' }).map(o => o.name), ['1/1']);
});

test('operator bindings keep one row per physical detector, none for multi-input blocks or virtual signals, and the base validates', () => {
  const storage = { load: (n, fallback) => fallback, save() {} }, config = new BindingConfiguration(profile, { storage });
  assert.deepEqual(config.validate({}), []);
  const blocks = config.catalog.filter(r => r.kind === 'blocks');
  const ls70 = blocks.find(r => r.values.address === 70); assert.deepEqual([...ls70.names].sort(), ['S110', 'S110a', 'S110b']); assert.equal(ls70.id, 'LS70@70');
  assert.ok(!blocks.some(r => r.names.includes('SIA')), 'spårledningar med flera ingångar ägs av detekteringsregeln');
  assert.equal(new Set(blocks.map(r => r.values.address)).size, blocks.length, 'en rad per adress');
  const signals = config.catalog.filter(r => r.kind === 'signals'); assert.equal(signals.length, 66 - VIRTUAL.length); assert.ok(!signals.some(r => VIRTUAL.includes(r.id)));
});
