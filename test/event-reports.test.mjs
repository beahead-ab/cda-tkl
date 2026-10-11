import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { decode, interrogation, hex } from '../src/protocol.mjs';

// 0.77.0: MGP-korten upprepar inga rapporter (Bennys trace 10 oktober 2026). Ingångarna rapporterar vid ändring och när de
// blir avfrågade, växlar och signaler när de får en order. Här går kärnan mot simulatorn utan proven allReports: bara det
// som korten själva skulle sända.
const read = f => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));
const profile = read('profiles/charlottendal-network.json'), fieldProfile = read('profiles/simulator-network.json');
function rig() {
  let now = 100000; const queue = [], commands = [];
  const field = new Field(fieldProfile, { now: () => now, movementMs: 100 });
  const engine = new Engine(profile, { now: () => now, send: b => { queue.push(['order', b]); commands.push({ at: now, ...decode(b) }); } });
  field.on('frame', b => queue.push(['report', b]));
  const drain = () => { let guard = 20000; while (queue.length && guard--) { const [kind, b] = queue.shift(); if (kind === 'order') field.accept(b); else engine.receive(b); } assert.ok(guard > 0); };
  const advance = ms => { for (let i = 0; i < ms; i += 50) { now += 50; field.tick(); drain(); engine.tick(); drain(); } };
  engine.connection(true); drain();
  return { engine, field, commands, drain, advance, now: () => now };
}
const physicalSignals = Object.entries(profile.signals).filter(([, b]) => !b.virtual).map(([n]) => n);

test('profilen frågar av var 15:e sekund och låter en ingång gälla i 40 sekunder', () => {
  assert.equal(profile.interrogateMs, 15000); assert.equal(profile.interrogateStepMs, 1000); assert.equal(profile.staleMs, 40000);
  assert.ok(profile.staleMs > 2 * profile.interrogateMs, 'ett missat varv gör ingen ingång okänd');
});

test('vid anslutning: avfrågning, stopp i signalerna och normalläge i reläet; växlarna är okända tills de får en order', () => {
  const r = rig();
  // Första ramen genast, sedan en per interrogateStepMs: JMRI:s åtta ramar i JMRI:s ordning.
  r.advance(8 * profile.interrogateStepMs);
  const asked = r.commands.filter(c => c.kind === 'interrogate');
  assert.deepEqual(asked.map(c => c.group), [4, 5, 6, 7, 0, 1, 2, 3]);
  assert.deepEqual(asked.map(c => c.at - asked[0].at), [0, 1, 2, 3, 4, 5, 6, 7].map(i => i * profile.interrogateStepMs));
  assert.deepEqual(interrogation().map(hex), ['B0 78 27 10', 'B0 79 27 11', 'B0 7A 27 12', 'B0 7B 27 13', 'B0 78 07 30', 'B0 79 07 31', 'B0 7A 07 32', 'B0 7B 07 33']);
  const unknownBlocks = Object.entries(r.engine.blocks).filter(([, s]) => !r.engine.fresh(s) || s.occupied !== false).map(([n]) => n);
  assert.deepEqual(unknownBlocks, [], 'varje spårledning har svarat på avfrågningen');
  assert.ok(physicalSignals.every(n => r.engine.fresh(r.engine.signals[n]) && r.engine.signals[n].aspect === 'stop'), 'signalerna svarade på stoppordern');
  assert.equal(r.engine.operating.normalKnown(), true, 'reläet svarade på normallägesordern');
  assert.ok(Object.values(r.engine.turnouts).every(s => s.position === 'unknown'), 'ingen växel har fått en order');
  assert.ok(!r.commands.some(c => c.kind === 'order' && Object.values(profile.turnouts).some(t => t.address === c.address)), 'kärnan lägger ingen växel av sig själv');
  assert.equal(r.engine.modeStatus().allowed, true, 'okända växlar som inte rör sig hindrar inte lägesbyte');
});

test('tystnad: allt gäller efter tre minuter utan ändringar, eftersom avfrågningen förnyar ingångarna', () => {
  const r = rig(); r.advance(10000);
  const route = r.engine.request('htvAu', 'htvSpIA'); r.advance(6000); assert.equal(route.state, 'active');
  r.advance(180000);
  const rounds = r.commands.filter(c => c.kind === 'interrogate' && c.group === 4).length;
  assert.ok(rounds >= 12 && rounds <= 14, 'ett varv var 15:e sekund: ' + rounds);
  assert.equal(route.state, 'active', 'tågvägen står kvar utan nya växel- och signalrapporter');
  assert.ok(Object.keys(route.turnouts).every(n => r.engine.fresh(r.engine.turnouts[n]) && r.engine.turnouts[n].position === route.turnouts[n]));
  assert.ok(Object.values(r.engine.blocks).every(s => r.engine.fresh(s)));
});

test('ett ingångskort som slutar svara gör sina spårledningar okända: tystnad betyder aldrig fritt', () => {
  const r = rig(); r.advance(10000); assert.equal(r.engine.blocks.S100.occupied, false);
  r.field.setFault('sensor', 'S100'); r.advance(profile.staleMs - profile.interrogateMs);
  assert.equal(r.engine.blocks.S100.occupied, false, 'ett missat varv räcker inte');
  r.advance(profile.interrogateMs + 1000);
  assert.equal(r.engine.blocks.S100.occupied, null); assert.equal(r.engine.fresh(r.engine.blocks.S100), false);
  assert.equal(r.engine.blocks.S101.occupied, false, 'de andra ingångarna svarar fortfarande');
  assert.throws(() => r.engine.request('htvCu', 'htvSpIA'), /S100|belagt|återrapport|okänd/i);
  r.field.setFault('sensor', ''); r.advance(profile.interrogateMs + 1000);
  assert.equal(r.engine.blocks.S100.occupied, false, 'svarar kortet igen blir spårledningen känd vid nästa avfrågning');
});

test('en växel utan rapport sedan anslutningen kan läggas om för hand, en som rör sig kan inte', () => {
  const r = rig(); r.advance(10000);
  assert.equal(r.engine.turnouts.Vx100.position, 'unknown');
  r.engine.manual('Vx100', 'T'); r.drain();
  assert.throws(() => r.engine.manual('Vx100', 'C'), /läggas om/, 'medan den rör sig');
  assert.equal(r.engine.modeStatus().allowed, false);
  r.advance(500); assert.equal(r.engine.turnouts.Vx100.position, 'T'); assert.equal(r.engine.modeStatus().allowed, true);
  r.engine.manual('Vx100', 'C'); r.drain(); r.advance(500); assert.equal(r.engine.turnouts.Vx100.position, 'C');
});

test('återanslutning: allt blir okänt och kärnan frågar av på nytt', () => {
  const r = rig(); r.advance(10000); r.engine.manual('Vx100', 'T'); r.drain(); r.advance(500);
  r.engine.connection(false); assert.equal(r.engine.blocks.S100.occupied, null); assert.equal(r.engine.turnouts.Vx100.position, 'unknown');
  const before = r.commands.length; r.advance(30000);
  assert.equal(r.commands.length, before, 'ingen avfrågning utan förbindelse');
  r.engine.connection(true); r.drain(); r.advance(8 * profile.interrogateStepMs);
  assert.equal(r.engine.blocks.S100.occupied, false);
  assert.equal(r.engine.turnouts.Vx100.position, 'unknown', 'växeln är okänd tills den får en ny order');
  assert.equal(r.engine.moving(r.engine.turnouts.Vx100), false, 'en order från förra förbindelsen rör sig inte');
});

test('en tågväg som hålls efter återanslutning kan återtas utan att någon växel läggs om', () => {
  const r = rig(); r.advance(10000);
  const route = r.engine.request('htvAu', 'htvSpIA'); r.advance(6000); assert.equal(route.state, 'active');
  r.engine.connection(false); r.engine.connection(true); r.drain(); r.advance(8 * profile.interrogateStepMs);
  assert.equal(route.state, 'held'); assert.ok(Object.keys(route.turnouts).every(n => r.engine.turnouts[n].position === 'unknown'));
  const before = r.commands.length; r.engine.cancel(route.id); r.advance(2000);
  assert.equal(r.engine.routes.length, 0, 'låsen släpps efter stoppbesked, fast växlarna är okända');
  const turnoutAddresses = new Set(Object.values(profile.turnouts).map(t => t.address));
  assert.ok(!r.commands.slice(before).some(c => c.kind === 'order' && turnoutAddresses.has(c.address)), 'ingen växelorder');
});
