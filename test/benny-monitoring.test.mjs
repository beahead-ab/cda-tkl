import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { decode, fromHex, hex, switchOrder, sensorReport, switchReport, interrogation } from '../src/protocol.mjs';
import { decodeSv, readSv, svMessage, discover, SV_CMD, MGP_SV, MGP_IDENTITY, MGP_PRODUCTS } from '../src/sv2.mjs';
import { describeProtocol } from '../src/telegram-recorder.mjs';
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
  // Signalerna hanteras som växlar: 4/7 på LT115. På Bennys bänk är stopp = Closed och kör = Thrown, eftersom signalkortet där har
  // MGP:s standardvärden; Charlottendals kort är inställda tvärtom, som Cda60.xml säger (Stop/Unlit = THROWN, kör = CLOSED).
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

// Bennys andra trace 10 oktober 2026: JMRI:s uppstart och MGP-appen. Bara sektion 2 var ansluten (växlar LT6–7, signaler
// LT110–119, ingångar LS216–228); utgångarna som inte svarade i den första tracen satt i andra sektioner.
test('JMRI:s avfrågning vid uppstart är en avfrågning, inte en order, och TKL bygger samma åtta ramar', () => {
  const jmri = ['B0 78 27 10', 'B0 79 27 11', 'B0 7A 27 12', 'B0 7B 27 13', 'B0 78 07 30', 'B0 79 07 31', 'B0 7A 07 32', 'B0 7B 07 33'];
  assert.deepEqual(interrogation().map(hex), jmri);
  assert.deepEqual(jmri.map(f => decode(fromHex(f))), [4, 5, 6, 7, 0, 1, 2, 3].map(group => ({ kind: 'interrogate', group })));
  // En order med ON-biten till samma adresser är fortfarande en order.
  assert.equal(decode(switchOrder(1017, 'C')).kind, 'order'); assert.equal(decode(switchOrder(1020, 'T')).kind, 'order');
  assert.equal(decode(switchOrder(7, 'C', false)).kind, 'order');
  assert.match(describeProtocol('in', 'RECEIVE B0 7A 07 32').interpretation, /grupp 0\/1\/0/);
  assert.equal(describeProtocol('in', 'RECEIVE B0 7A 07 32').kind, 'interrogate');
  // Svaret: ingångskortet rapporterade LS227 … LS216 som vanliga B2, en i taget.
  const answer = [['B2 71 50 6C', 227, true], ['B2 70 60 5D', 226, false], ['B2 70 40 7D', 225, false], ['B2 6F 70 52', 224, true], ['B2 6F 40 62', 223, false],
    ['B2 6E 60 43', 222, false], ['B2 6E 50 73', 221, true], ['B2 6D 70 50', 220, true], ['B2 6D 40 60', 219, false], ['B2 6C 60 41', 218, false], ['B2 6C 50 71', 217, true], ['B2 6B 70 56', 216, true]];
  for (const [frame, address, active] of answer) assert.deepEqual(decode(fromHex(frame)), { kind: 'sensor', address, active }, frame);
  // JMRI:s normallägen: växel- och signalkorten svarar på ON med B1 (LT50 är Bennys lås, LT112 och LT114 dvärgsignaler).
  for (const [frame, address, position] of [['B1 31 60 1F', 50, 'T'], ['B1 6F 60 41', 112, 'T'], ['B1 71 60 5F', 114, 'T'], ['B1 75 70 4B', 118, 'C'], ['B1 76 70 48', 119, 'C']])
    assert.deepEqual(decode(fromHex(frame)), { kind: 'turnout', address, position, input: true }, frame);
});

test('kärnan bryr sig inte om en avfrågning', () => {
  const profile = JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal-network.json', import.meta.url)));
  let now = 1000; const engine = new Engine(profile, { now: () => now, send: () => {} }); engine.connection(true);
  const before = engine.reportSequence; for (const f of interrogation()) engine.receive(f);
  assert.equal(engine.reportSequence, before);
});

test('MGP-appen: Discover-svaren bär kortens identitet, och svaret behåller frågarens agentnummer i SRC', () => {
  assert.equal(hex(discover(0)), 'E5 10 00 07 02 10 00 00 00 00 10 00 00 00 00 0F');
  const cards = [['E5 10 00 47 02 10 12 00 7E 01 14 05 00 12 00 31', 18, 5, 146], ['E5 10 00 47 02 10 06 00 7E 01 14 09 00 38 00 03', 6, 9, 184], ['E5 10 00 47 02 10 6E 00 7E 01 14 06 00 17 02 49', 110, 6, 663]];
  for (const [frame, address, product, serial] of cards) {
    const reply = decodeSv(fromHex(frame));
    assert.equal(reply.src, 0, 'agent 0 (MGP-appen)'); assert.equal(reply.dst, address);
    assert.deepEqual(reply.identity, { ...MGP_IDENTITY, product, serial });
  }
  assert.equal(MGP_PRODUCTS[6], 'Signal10 SE');
  // Läsning av fyra SV i taget på Signal10 SE (kort 110): som JMRI läser dem.
  const read = decodeSv(fromHex('E5 10 00 06 02 10 6E 00 26 01 10 00 00 00 00 47'));
  assert.deepEqual([read.cmd, read.dst, read.sv], [SV_CMD.read4, 110, 294]);
  assert.deepEqual(decodeSv(fromHex('E5 10 00 46 02 10 6E 00 26 01 14 0E 00 30 0E 33')).data, [14, 0, 176, 14]);
  assert.deepEqual(decodeSv(fromHex('E5 10 00 46 02 10 6E 00 42 01 19 30 0E 00 30 64')).data, [176, 14, 0, 176]);
  assert.deepEqual(decodeSv(fromHex('E5 10 00 46 02 14 6E 00 02 01 19 30 0E 00 30 20')).sv, 386);
  // Simulatorns kort svarar likadant: identitet som MGP och frågarens SRC.
  const fieldProfile = JSON.parse(fs.readFileSync(new URL('../profiles/simulator-network.json', import.meta.url)));
  const field = new Field(fieldProfile, { now: () => 0 }); const replies = [];
  field.on('frame', b => { const sv = decodeSv(b); if (sv) replies.push(sv); });
  field.accept(discover(0));
  assert.ok(replies.length > 0 && replies.every(r => r.src === 0 && r.identity.manufacturer === 126 && [6, 9].includes(r.identity.product)));
});
