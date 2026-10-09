import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { svMessage, decodeSv, discover, identify, readSv4, classifyFrame, SV_CMD } from '../src/sv2.mjs';
import { hex, decode, switchReport, sensorReport } from '../src/protocol.mjs';
import { describeProtocol } from '../src/telegram-recorder.mjs';
import { Field } from '../src/field.mjs';
import { CardInventory, mgpSummary } from '../src/studio/cards.mjs';
import { Measurements } from '../src/studio/measure.mjs';
import { loadSources, buildRegistry, detectionInventory, deviations } from '../src/studio/index.mjs';
import { Storage } from '../src/storage.mjs';
const sources = loadSources(), { profile } = sources;
const fieldProfile = JSON.parse(fs.readFileSync(new URL('../profiles/simulator-network.json', import.meta.url), 'utf8'));
const tempStorage = () => new Storage(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-measure-')));
// Fältet kopplat direkt till tjänsten: det som sänds tas emot av fältet, det fältet rapporterar observeras.
const wired = (make, now = () => 5000) => { const field = new Field(fieldProfile, { now }); const frames = []; let service; field.on('frame', b => { frames.push(hex(b)); service.observe(b); }); service = make({ send: b => { field.accept(b); return true; }, field }); return { field, frames, service }; };

test('SV2-meddelanden enligt v13: byteordning, bit 7 i SVX och identiteten i svaret', () => {
  assert.equal(hex(discover()), 'E5 10 01 07 02 10 00 00 00 00 10 00 00 00 00 0E');
  assert.equal(hex(identify(80)), 'E5 10 01 08 02 10 50 00 00 00 10 00 00 00 00 51');
  const m = svMessage({ src: 1, cmd: SV_CMD.read4, dst: 65535, sv: 65535, data: [255, 128, 127, 0] });
  assert.equal(hex(m), 'E5 10 01 06 02 1F 7F 7F 7F 7F 13 7F 00 7F 00 03'); assert.deepEqual(decodeSv(m), { kind: 'sv', cmd: 6, name: 'SV läs 4', reply: false, src: 1, dst: 65535, sv: 65535, data: [255, 128, 127, 0] });
  assert.equal(decodeSv(Buffer.from([0xe5, 0x10, 1, 7, 1, 0, 0, 0, 0, 0, 0x10, 0, 0, 0, 0, 0])), null, 'format 1 är inte SV2');
  assert.equal(decodeSv(switchReport(100, 'C')), null);
  assert.throws(() => svMessage({ cmd: 7, dst: 70000 }), /Kortadress/);
  assert.equal(classifyFrame(Buffer.from([0x81, 0x7e])).kind, 'busy'); assert.equal(classifyFrame(Buffer.from([0xb4, 0x30, 0x00, 0x7b])).kind, 'long-ack');
  assert.equal(describeProtocol('in', 'RECEIVE 81 7E').frame, 'busy'); assert.equal(describeProtocol('in', 'RECEIVE 81 7E').kind, 'unsupported'); assert.equal(describeProtocol('out', 'SEND ' + hex(discover())).kind, 'sv-request');
  const reply = describeProtocol('in', 'RECEIVE E5 10 2C 47 02 10 2C 01 0D 01 18 02 01 40 1C 15');
  assert.equal(reply.kind, 'sv-reply'); assert.deepEqual(reply.decoded.identity, { manufacturer: 13, developer: 1, product: 258, serial: 40000 }); assert.match(reply.interpretation, /kort 300/);
});

test('simulatorn svarar som tolv kort: Discover, Identify, läsning, skrivning och adressbyte', () => {
  const field = new Field(fieldProfile), got = []; field.on('frame', b => { const sv = decodeSv(b); if (sv) got.push(sv); });
  assert.equal(fieldProfile.modules.length, 12); assert.equal(fieldProfile.modules[0].name, 'M00'); assert.ok(fieldProfile.modules.every(m => m.simulated));
  field.accept(discover()); assert.equal(got.length, 12); assert.deepEqual(got.map(g => g.dst), fieldProfile.modules.map(m => m.address)); assert.equal(got[1].identity.serial, 1001); assert.equal(got[1].cmd, 0x47);
  got.length = 0; field.accept(identify(17)); assert.equal(got.length, 1); assert.equal(got[0].cmd, 0x48); assert.equal(got[0].src, 17);
  got.length = 0; field.accept(readSv4(17, 1)); assert.deepEqual(got[0].data, [2, 1, 233, 3]); assert.equal(got[0].cmd, 0x46);
  got.length = 0; field.accept(svMessage({ cmd: SV_CMD.write, dst: 17, sv: 23, data: [5] })); assert.deepEqual(got[0].data, [5, 0, 0, 0]); assert.equal(field.modules[1].sv[23], 5);
  got.length = 0; field.accept(svMessage({ cmd: SV_CMD.maskedWrite, dst: 17, sv: 23, data: [0xff, 0x02] })); assert.equal(field.modules[1].sv[23], 7);
  got.length = 0; field.accept(svMessage({ cmd: SV_CMD.changeAddress, dst: 40, sv: 13 | (1 << 8), data: [10, 0, 1001 & 0xff, 1001 >> 8] })); assert.equal(field.modules[1].address, 40); assert.equal(got[0].dst, 40);
  got.length = 0; field.accept(identify(17)); assert.equal(got.length, 0, 'den gamla adressen svarar inte längre');
  field.accept(svMessage({ cmd: SV_CMD.read, dst: 999, sv: 1 })); assert.equal(got.length, 0);
  // Svar (bit 6) och vanliga order påverkas inte.
  field.accept(svMessage({ cmd: 0x47, dst: 17 })); assert.equal(got.length, 0);
  field.accept(Buffer.from([0xb0, 0x63, 0x30, 0x1c])); assert.equal(field.turnouts.Vx100.target, 'C');
});

test('kortinventeringen samlar Discover-svaren, läser SV1–4 och kopplar kort till modul', async () => {
  const storage = tempStorage(), { service: cards, field } = wired(({ send }) => new CardInventory({ storage, send, windowMs: 20, replyMs: 20 }));
  assert.equal(cards.view().cards.length, 0);
  const v = await cards.discover(); assert.equal(v.cards.length, 12); assert.equal(v.cards[0].address, 16); assert.equal(v.cards[0].module, null); assert.ok(v.at > 0); assert.deepEqual(v.duplicateAddresses, []);
  const r = await cards.read({ address: 17 }); assert.deepEqual(r.cards[1].sv, { 1: 2, 2: 1, 3: 233, 4: 3 }); assert.equal(r.cards[1].eeprom, 1024);
  const i = await cards.identify({ address: 18 }); assert.equal(i.cards[2].serial, 1002);
  await assert.rejects(cards.identify({ address: 500 }), /svarade/);
  assert.throws(() => cards.assign({ address: 16, module: 'X1' }), /M00–M11/);
  cards.assign({ address: 16, module: 'M00' }); assert.throws(() => cards.assign({ address: 17, module: 'M00' }), /redan kopplad/);
  assert.equal(cards.assign({ address: 17, module: 'M01' }).cards[1].module, 'M01');
  assert.equal(new CardInventory({ storage, send: () => true }).view().cards[1].module, 'M01', 'inventeringen sparas');
  const offline = new CardInventory({ storage: tempStorage(), send: () => false }); await assert.rejects(offline.discover(), e => e.status === 503);
  field.modules[3].address = 16; const dup = await cards.discover(); assert.deepEqual(dup.duplicateAddresses, [16]);
  const summary = mgpSummary(sources, buildRegistry(sources), dup.cards, { sections: detectionInventory(sources).sections });
  const m01 = summary.find(m => m.id === 'M01'); assert.equal(m01.card.serial, 1001); assert.equal(m01.decoder, 'Signal10 (antaget)'); assert.equal(m01.counts.outputs, 21); assert.equal(m01.counts.inputs, 15);
  assert.ok(m01.outputs.some(o => o.object === 'Vx95' && o.kind === 'turnout' && o.address === profile.turnouts.Vx95.address));
  assert.ok(m01.outputs.some(o => o.object === '1/1' && o.kind === 'signal' && o.xmlAddress === 200 && o.address === 200));
  assert.ok(m01.inputs.some(i => i.blocks.length));
});

test('mätningen kräver AIS, en verklig rapport efter ordern och en bekräftelse med namn', () => {
  let now = 5000, guard = 'Aktivera Alla signaler i stopp före profilbyte.'; const storage = tempStorage();
  const { service: m, field, frames } = wired(({ send }) => new Measurements({ storage, send, now: () => now, guard: () => guard, mode: () => 'simulator' }), () => now);
  assert.throws(() => m.probe({ kind: 'turnout', name: 'Vx100', position: 'T' }, profile), e => e.status === 409 && /Alla signaler/.test(e.message));
  guard = null;
  assert.throws(() => m.probe({ kind: 'turnout', name: 'Vx999', position: 'T' }, profile), /finns inte/);
  let v = m.probe({ kind: 'turnout', name: 'Vx100', position: 'T' }, profile);
  assert.equal(v.pending.order, 'B0 63 10 3C'); assert.equal(v.pending.report, null, 'växeln rör sig: rapporten okänd räknas inte');
  assert.throws(() => m.confirm({ kind: 'turnout', name: 'Vx100', by: 'Casper' }, profile), e => e.status === 409);
  now += 700; field.tick(); v = m.view(profile); assert.equal(v.pending.report.hex, 'B1 63 60 4D'); assert.equal(v.pending.report.decoded.position, 'T');
  assert.throws(() => m.confirm({ kind: 'turnout', name: 'Vx100', by: 'C' }, profile), /2–80/);
  v = m.confirm({ kind: 'turnout', name: 'Vx100', by: 'Casper' }, profile);
  assert.equal(v.pending, null); assert.equal(v.counts.turnout.bench, 1); assert.equal(v.counts.turnout.field, 0); assert.equal(v.items['turnout:Vx100'].evidence.report, 'B1 63 60 4D'); assert.equal(v.items['turnout:Vx100'].current, true);
  // Signal: bara stopp. Spårledning: rapporten måste ändra läge.
  v = m.probe({ kind: 'signal', name: '1/5', position: 'GO' }, profile); assert.equal(v.pending.requested, 'STOP'); assert.ok(v.pending.report, 'stopp rapporteras direkt'); m.confirm({ kind: 'signal', name: '1/5', by: 'Casper' }, profile);
  v = m.probe({ kind: 'block', name: 'S121' }, profile); assert.equal(v.pending.order, null);
  field.reportBlock('S121'); assert.equal(m.view(profile).pending.report, null, 'den periodiska rapporten räknas inte');
  field.setBlock('S121', true); assert.equal(m.view(profile).pending.report.decoded.active, true); m.confirm({ kind: 'block', name: 'S121', by: 'Casper' }, profile);
  assert.equal(Object.keys(m.measured(profile)).length, 3); assert.equal(m.missing(profile).length, 49 + 53 + 197, 'bänkmätningar räknas inte i fält');
  // Adressen byts: mätningen gäller inte längre. Fältmätning räknas för drift.
  const moved = structuredClone(profile); moved.turnouts.Vx100.address = 900; assert.equal(m.item(moved, 'turnout', 'Vx100').current, false); assert.equal(Object.keys(m.measured(moved)).length, 2);
  const hw = new Measurements({ storage, send: () => true, now: () => now, mode: () => 'hardware' }); hw.data.items['turnout:Vx100'].mode = 'hardware';
  assert.equal(hw.item(profile, 'turnout', 'Vx100').field, true); assert.equal(hw.missing(profile).length, 49 + 53 + 197 - 1);
  const measured = hw.measured(profile), reg = buildRegistry(sources, measured); assert.equal(reg.turnouts[0].measured.by, 'Casper'); assert.deepEqual(reg.counts.measured, { field: 1, bench: 2 });
  assert.equal(deviations(sources, measured).find(d => d.id === 'turnout-unmeasured').count, 48);
  m.remove({ kind: 'block', name: 'S121' }, profile); assert.equal(Object.keys(m.view(profile).items).length, 2); assert.throws(() => m.remove({ kind: 'block', name: 'S121' }, profile), /Ingen mätning/);
  m.probe({ kind: 'turnout', name: 'Vx101', position: 'T' }, profile); m.abort(); assert.equal(m.view(profile).pending, null, 'frånkoppling avbryter en väntande mätning');
  assert.ok(frames.length > 3);
});
