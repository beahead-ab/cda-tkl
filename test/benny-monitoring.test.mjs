import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { decode, fromHex, hex, switchOrder, sensorReport, switchReport } from '../src/protocol.mjs';
import { decodeSv, readSv, svMessage, SV_CMD, MGP_SV } from '../src/sv2.mjs';
import { LocoNetClient } from '../src/transport.mjs';
import { Field } from '../src/field.mjs';
import { Engine } from '../src/engine.mjs';
import fs from 'node:fs';

// Bennys LocoNet-monitorering 9 oktober 2026 (docs/genomgang-mgp-2026-10-06.md): riktiga telegram från MGP-korten på hans
// bana, med JMRI:s tolkning. Ramarna är ordagranna; det här provet låser avkodningen till det korten faktiskt sänder.
const MONITORED = [
  ['B0 06 10 59', { kind: 'order', address: 7, position: 'T', on: true }, 'Requesting Switch at LT7 to Thrown (Output On)'],
  ['B1 06 60 28', { kind: 'turnout', address: 7, position: 'T', input: true }, 'Turnout LT7 Switch input is Thrown (input on)'],
  ['B0 06 00 49', { kind: 'order', address: 7, position: 'T', on: false }, 'Requesting Switch at LT7 to Thrown (Output Off)'],
  ['B0 06 30 79', { kind: 'order', address: 7, position: 'C', on: true }, 'Requesting Switch at LT7 to Closed (Output On)'],
  ['B1 06 70 38', { kind: 'turnout', address: 7, position: 'C', input: true }, 'Turnout LT7 Switch input is Closed (input off)'],
  ['B2 6C 60 41', { kind: 'sensor', address: 218, active: false }, 'Sensor LS218 is Low'],
  ['B2 6D 40 60', { kind: 'sensor', address: 219, active: false }, 'Sensor LS219 is Low'],
  ['B2 6D 70 50', { kind: 'sensor', address: 220, active: true }, 'Sensor LS220 is High'],
  ['B2 6E 50 73', { kind: 'sensor', address: 221, active: true }, 'Sensor LS221 is High'],
  // Signalerna hanteras som växlar: 4/7 på LT115, stopp = Closed och kör = Thrown på Bennys bana (Charlottendals XML har det omvända).
  ['B0 72 30 0D', { kind: 'order', address: 115, position: 'C', on: true }, 'Requesting Switch at LT115 (4/7) to Closed (Output On)'],
  ['B1 72 70 4C', { kind: 'turnout', address: 115, position: 'C', input: true }, 'Turnout LT115 (4/7) Switch input is Closed (input off)'],
  ['B1 72 60 5C', { kind: 'turnout', address: 115, position: 'T', input: true }, 'Turnout LT115 (4/7) Switch input is Thrown (input on)'],
  ['B0 01 11 5F', { kind: 'order', address: 130, position: 'T', on: true }, 'Requesting Switch at LT130 (S4s) to Thrown (Output On)'],
];

test('Bennys ramar avkodas som JMRI läser dem: B1 i ingångsformatet är ett växelläge, inte unsupported', () => {
  for (const [frame, expected, jmri] of MONITORED) assert.deepEqual(decode(fromHex(frame)), expected, jmri);
  // Hjälpingången (aux, bit 5 noll) är inget läge.
  assert.equal(decode(fromHex('B1 06 40 08')).kind, 'unsupported');
  assert.equal(decode(fromHex('B1 06 50 18')).kind, 'unsupported');
});

test('våra order och rapporter är byte för byte som på Bennys bana', () => {
  assert.equal(hex(switchOrder(7, 'T')), 'B0 06 10 59'); assert.equal(hex(switchOrder(7, 'T', false)), 'B0 06 00 49');
  assert.equal(hex(switchOrder(115, 'C')), 'B0 72 30 0D'); assert.equal(hex(switchOrder(115, 'C', false)), 'B0 72 20 1D');
  assert.equal(hex(sensorReport(218, false)), 'B2 6C 60 41'); assert.equal(hex(sensorReport(220, true)), 'B2 6D 70 50');
  // Simulatorn rapporterar som korten: ingångsformatet.
  assert.equal(hex(switchReport(7, 'T')), 'B1 06 60 28'); assert.equal(hex(switchReport(7, 'C')), 'B1 06 70 38');
  assert.equal(hex(switchReport(115, 'C')), 'B1 72 70 4C');
  // SV2: läsning av SV21 (adressen) och skrivning av SV178 (ingångarnas polaritet) på kort 6.
  assert.equal(hex(readSv(6, 21)), 'E5 10 01 02 02 10 06 00 15 00 10 00 00 00 00 18');
  assert.equal(hex(svMessage({ src: 1, cmd: SV_CMD.write, dst: 6, sv: 178, data: [0] })), 'E5 10 01 01 02 14 06 00 32 00 10 00 00 00 00 38');
  assert.equal(hex(svMessage({ src: 1, cmd: SV_CMD.write, dst: 6, sv: 178, data: [1] })), 'E5 10 01 01 02 14 06 00 32 00 10 01 00 00 00 39');
  const reply = decodeSv(fromHex('E5 10 01 42 02 10 06 00 15 00 10 06 00 00 12 4C'));
  assert.deepEqual([reply.reply, reply.dst, reply.sv, reply.data[0]], [true, 6, 21, 6], 'SV21 current value is 6');
  assert.match(MGP_SV[178], /belagd vid låg/);
});

test('kärnan läser MGP-kortens B1 i ingångsformatet som växel- och signalåterrapport', () => {
  const profile = JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal-network.json', import.meta.url)));
  assert.equal(profile.signalReport.kind, 'switch', 'B1 är standard sedan 0.76.0');
  let now = 1000; const engine = new Engine(profile, { now: () => now, send: () => {} });
  engine.connection(true);
  const vx = profile.turnouts.Vx100, sig = profile.signals['1/1'];
  engine.receive(fromHex(hex(switchReport(vx.address, 'T')))); assert.equal(engine.turnouts.Vx100.position, 'T');
  engine.receive(fromHex(hex(switchReport(vx.address, 'C')))); assert.equal(engine.turnouts.Vx100.position, 'C');
  engine.receive(switchReport(sig.reportAddress, 'T')); assert.equal(engine.signals['1/1'].aspect, 'stop');
  engine.receive(switchReport(sig.reportAddress, 'C')); assert.equal(engine.signals['1/1'].aspect, 'go');
});

test('simulatorn tar en order i båda formaten och svarar i ingångsformatet', () => {
  const fieldProfile = JSON.parse(fs.readFileSync(new URL('../profiles/simulator-network.json', import.meta.url)));
  let now = 0; const field = new Field(fieldProfile, { now: () => now, movementMs: 100 }); const frames = [];
  field.on('frame', b => frames.push(hex(b)));
  field.accept(switchOrder(fieldProfile.turnouts.Vx100.address, 'T')); now += 150; field.tick();
  assert.ok(frames.at(-1).startsWith('B1 63 60'), frames.at(-1));
  field.accept(switchOrder(fieldProfile.turnouts.Vx100.address, 'T', false)); assert.equal(field.turnouts.Vx100.position, 'T', 'OFF ändrar inget');
});

test('transporten pulsar: ON följt av OFF, som JMRI och Bennys monitorering', async () => {
  const lines = []; const server = net.createServer(socket => { socket.write('VERSION test\r\n'); socket.on('data', d => { for (const l of String(d).split('\r\n').filter(Boolean)) { lines.push(l); socket.write('SENT OK\r\n'); } }); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const client = new LocoNetClient({ host: '127.0.0.1', port: server.address().port, pulseMs: 30 });
  client.start(); await new Promise(r => client.once('connection', r));
  client.send(switchOrder(7, 'T'));
  await new Promise(r => setTimeout(r, 120));
  assert.deepEqual(lines, ['SEND B0 06 10 59', 'SEND B0 06 00 49']);
  client.stop(); await new Promise(r => server.close(r));
});
