import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { Storage } from '../src/storage.mjs';
import { decode, switchOrder, switchReport, sensorReport, signalReport } from '../src/protocol.mjs';
import { Topology } from '../src/topology.mjs';
const profile = JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal.json', import.meta.url)));
const fieldProfile = JSON.parse(fs.readFileSync(new URL('../profiles/simulator.json', import.meta.url)));
function rig(storage) {
  let now = 100000; const commands = [], wire = [], field = new Field(fieldProfile, { now: () => now });
  const engine = new Engine(profile, { now: () => now, storage, send: bytes => { commands.push(decode(bytes)); wire.push(['order', bytes]); } });
  field.on('frame', bytes => wire.push(['report', bytes]));
  function drain() { let limit = 10000; while (wire.length && limit--) { const [kind, b] = wire.shift(); if (kind === 'order') field.accept(b); else engine.receive(b); } assert.ok(limit > 0, 'no feedback loop'); }
  function advance(ms, reports = true) { for (let i = 0; i < ms; i += 50) { now += 50; field.tick(); if (reports && now % 1000 === 0) field.allReports(); drain(); engine.tick(); drain(); } }
  engine.connection(true); field.allReports(); drain();
  return { engine, field, commands, drain, advance, request(id) { const r = profile.routes.find(r => r.id === id); return engine.request(r.from, r.to); } };
}
test('startup is unknown; command echo cannot establish turnout position', () => {
  const e = new Engine(profile); e.connection(true); e.receive(switchOrder(profile.turnouts.Vx121.address, 'C'));
  assert.equal(e.turnouts.Vx121.position, 'unknown'); assert.throws(() => e.request('htvSpIIB', 'htvSpIIA'), /saknar/);
});
test('complete route waits for reports, clears downstream first, and same endpoints cancel', () => {
  const r = rig(); const route = r.request('cu-2b'); assert.equal(route.state, 'setting'); r.drain(); r.advance(4000);
  assert.equal(route.state, 'active');
  const go = r.commands.filter(d => d.position === 'C' && d.address >= 1501 && d.address < 1600).map(d => d.address);
  assert.deepEqual(go, [profile.signals['2/7'].address, profile.signals['1/5'].address]);
  assert.throws(() => r.engine.manual('Vx121', 'T'), /låst/);
  r.request('cu-2b'); r.drain(); r.advance(200); assert.equal(r.engine.routes.length, 0);
});
test('occupied block holds route and prevents releasing locks until clear and stopped', () => {
  const r = rig(), route = r.request('2b-2c'); r.advance(3500);
  r.field.setBlock('S121', true); r.drain(); assert.equal(route.state, 'occupied'); assert.equal(r.engine.signals['2/8'].desired, 'STOP');
  r.engine.cancel(route.id); r.drain(); assert.equal(r.engine.routes.length, 1);
  r.field.setBlock('S121', false); r.drain(); r.advance(100); assert.equal(r.engine.routes.length, 0);
});
test('turnout reply absent times out; unrelated traffic does not refresh it', () => {
  const r = rig(); r.field.setFault('turnout', 'Vx123'); r.drain(); const route = r.request('12-5b'); r.advance(8000);
  assert.equal(route.state, 'held'); assert.equal(r.engine.signals['4/5'].desired, 'STOP');
  r.engine.cancel(route.id); r.drain(); assert.equal(r.engine.routes.length, 1);
  r.field.setFault('turnout', ''); r.drain(); r.advance(200); assert.equal(r.engine.routes.length, 0);
});
test('signal refusal never becomes an active route', () => {
  const r = rig(); r.field.setFault('signal', '2/8'); const route = r.request('2b-2c'); r.advance(9000);
  assert.equal(route.state, 'held'); assert.equal(r.engine.signals['2/8'].aspect, 'stop');
});
test('lost downstream signal while clearing prevents upstream permission', () => {
  const r = rig(), route = r.request('cu-2b'); r.advance(2200);
  // Controlled phase boundary: downstream already consumed by engine, upstream not ordered.
  route.state = 'clearing'; route.nextSignal = 0; route.signalSentAt = 0;
  const before = r.commands.length;
  r.engine.receive(signalReport(profile.signals['2/7'].reportAddress, 0));
  assert.equal(route.state, 'held');
  assert.ok(!r.commands.slice(before).some(c => c.address === profile.signals['1/5'].address && c.position === 'C'));
});
test('unknown signal codes, stale sensors and unexpected switch changes stop established routes', () => {
  for (const fault of ['code', 'stale', 'switch']) {
    const r = rig(), route = r.request('2b-2c'); r.advance(3500); assert.equal(route.state, 'active');
    if (fault === 'code') r.engine.receive(signalReport(profile.signals['2/8'].reportAddress, 77));
    if (fault === 'switch') r.engine.receive(switchReport(profile.turnouts.Vx121.address, 'T'));
    if (fault === 'stale') { r.field.setFault('sensor', 'S121'); r.advance(8000); }
    assert.ok(['held', 'occupied'].includes(route.state)); assert.equal(r.engine.signals['2/8'].desired, 'STOP');
  }
});
test('an opposing signal that reports GO holds the route and requests STOP', () => {
  const r = rig(), route = r.request('2b-2c'); r.advance(3500);
  r.engine.receive(signalReport(profile.signals['2/7'].reportAddress, 8));
  assert.equal(route.state, 'held'); assert.equal(r.engine.signals['2/8'].desired, 'STOP');
  assert.equal(r.engine.signals['2/7'].desired, 'STOP');
});
test('disconnect invalidates all reports; reconnect never resumes a route', () => {
  const r = rig(), route = r.request('2b-2c'); r.advance(3500); r.engine.connection(false);
  assert.equal(route.state, 'held'); assert.equal(r.engine.blocks.S121.occupied, null);
  r.engine.connection(true); r.field.allReports(); r.drain(); r.advance(3000); assert.equal(route.state, 'held'); assert.equal(r.engine.signals['2/8'].desired, 'STOP');
});
test('conflicting routes refuse; independent routes coexist', () => {
  const r = rig(); r.request('2b-2c'); assert.throws(() => r.request('2c-2b'), /korsar/); r.request('12-5b'); r.advance(4000);
  assert.deepEqual(r.engine.routes.map(r => r.state), ['active', 'active']);
});
test('same-position coupling is shared without moving an already locked turnout', () => {
  const p = structuredClone(profile); const a = p.routes[0], b = p.routes[2]; b.turnouts.Vx121 = 'C';
  const r = rig(); r.engine.profile = p; r.engine.request(a.from, a.to); r.advance(3500);
  const before = r.commands.length; r.engine.request(b.from, b.to); r.advance(4000);
  assert.equal(r.engine.routes[0].state, 'active');
  assert.ok(!r.commands.slice(before).some(c => c.address === p.turnouts.Vx121.address));
});
test('manual command expands coupled switches and respects source inversion', () => {
  const r = rig(); r.engine.manual('Vx121', 'T'); r.drain(); r.advance(1000);
  assert.equal(r.engine.turnouts.Vx120.position, 'T'); assert.equal(r.engine.turnouts.Vx121.position, 'T');
  const route = r.request('12-5b'); r.advance(3500); assert.equal(route.state, 'active');
  const p = profile.turnouts.Vx131; assert.equal(p.inverted, true);
  assert.ok(r.commands.some(c => c.address === p.address && c.position === 'T'));
});
test('durable locks survive process restart; corrupt or changed state fails closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charlottendal-test-'));
  try {
    const storage = new Storage(dir), r = rig(storage); r.request('2b-2c'); r.advance(3500);
    const reboot = new Engine(profile, { storage }); assert.equal(reboot.routes.length, 1); assert.equal(reboot.routes[0].state, 'held'); assert.equal(reboot.signals['2/8'].desired, 'STOP');
    assert.throws(() => new Engine({ ...profile, id: 'changed' }, { storage }), /Profilen/);
    fs.writeFileSync(path.join(dir, 'routes.json'), '{broken'); assert.throws(() => new Engine(profile, { storage }));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('failed durable reservation issues no turnout or GO command', () => {
  const storage = { load: (n, fallback) => fallback, event() {}, save() { throw Error('disk full'); } };
  const r = rig(); r.engine.storage = storage;
  const before = r.commands.length; assert.throws(() => r.request('2b-2c'), /spara/);
  assert.ok(r.commands.slice(before).every(c => c.address >= 1501 && c.position === 'T')); assert.equal(r.engine.routes.length, 1); assert.ok(r.engine.storageFault);
});
test('topology reserves turnout blocks, expands couplings and respects block exclusion', () => {
  const p = JSON.parse(fs.readFileSync(new URL('../public/data/panel.json', import.meta.url))), t = new Topology(p);
  const route = t.search('htvSpIIB', 'htvSpIIA'); assert.ok(route.blocks.includes('S121')); assert.equal(route.settings.Vx120, 'C');
  assert.equal(t.search('htvSpIIB', 'htvSpIIA', { blocked: new Set(['SIIB']) }), null);
  assert.equal(t.expand({ Vx121: 'T', Vx120: 'C' }), null);
  assert.equal(t.buttons.htvSpIIA.label, 'Spår 2c');
});

test('a GO report received before permission cannot clear a route in the same millisecond', () => {
  let now=100000;
  const commands=[], engine=new Engine(profile,{now:()=>now,send:bytes=>commands.push(decode(bytes))});
  const field=new Field(fieldProfile,{now:()=>now});field.on('frame',bytes=>engine.receive(bytes));
  engine.connection(true);field.allReports();
  const def=profile.routes.find(r=>r.id==='2b-2c'), route=engine.request(def.from,def.to);
  for(const [name,position] of Object.entries(def.turnouts)) {
    const b=profile.turnouts[name], physical=b.inverted?(position==='C'?'T':'C'):position;
    engine.receive(switchReport(b.address,physical));
  }
  assert.equal(route.state,'establishing');now+=1200;
  const target=profile.signals[def.signals[0]], start=commands.length;
  engine.receive(signalReport(target.reportAddress,8));
  now+=profile.signalStepMs+1;engine.tick();engine.tick();
  assert.equal(route.state,'held','unsolicited GO must hold the route, not act as a new acknowledgement');
  assert.ok(!commands.slice(start).some(c=>c.address===target.address&&c.position==='C'));
  assert.equal(engine.routes.length,1,'the protective reservation remains');
});

test('GO acknowledgement is newer than the latest command even at identical timestamps', () => {
  let now=100000;
  const engine=new Engine(profile,{now:()=>now}), field=new Field(fieldProfile,{now:()=>now});
  field.on('frame',bytes=>engine.receive(bytes));engine.connection(true);field.allReports();
  const def=profile.routes.find(r=>r.id==='2b-2c'), route=engine.request(def.from,def.to);
  for(const [name,position] of Object.entries(def.turnouts)) {
    const b=profile.turnouts[name];engine.receive(switchReport(b.address,b.inverted?(position==='C'?'T':'C'):position));
  }
  now+=1200;engine.tick();const name=def.signals[0], signal=profile.signals[name];
  engine.receive(signalReport(signal.reportAddress,8));
  // A resend at the same timestamp starts a new acknowledgement interval.
  engine.permission(name,'GO');
  now+=profile.signalStepMs+1;engine.tick();engine.tick();
  assert.equal(route.state,'clearing');assert.equal(route.nextSignal,0);
  engine.receive(signalReport(signal.reportAddress,8));engine.tick();assert.equal(route.state,'active');
});

test('explicit panel reset releases occupied routes after fresh STOP, preserving detectors and turnout positions', () => {
  const r=rig(),route=r.request('2b-2c');r.advance(3500);
  r.field.setBlock('S121',true);r.drain();
  const blocks=structuredClone(r.engine.blocks),positions=Object.fromEntries(Object.entries(r.engine.turnouts).map(([n,s])=>[n,s.position]));
  const first=r.commands.length;r.engine.resetPanel();
  assert.equal(r.engine.routes.length,1,'old STOP reports cannot release reservations');
  assert.equal(r.engine.snapshot().panelReset.phase,'waiting');
  assert.throws(()=>r.engine.allStop(false),/panelåterställningen/);
  const resetId=r.engine.controls.panelReset.id;r.engine.resetPanel();assert.equal(r.engine.controls.panelReset.id,resetId,'duplicate request is idempotent');
  r.drain();r.advance(250);
  assert.equal(r.engine.routes.length,0);assert.equal(r.engine.controls.stopAll,false);
  assert.equal(r.engine.snapshot().panelReset.phase,'complete');
  assert.deepEqual(r.engine.blocks,blocks,'reset writes no detector state');
  assert.deepEqual(Object.fromEntries(Object.entries(r.engine.turnouts).map(([n,s])=>[n,s.position])),positions);
  assert.ok(r.commands.slice(first).every(c=>c.position==='T'&&Object.values(profile.signals).some(s=>s.address===c.address)),'only STOP signal orders');
  assert.ok(Object.values(r.engine.signals).every(s=>s.aspect==='stop'&&s.desired==='STOP'));
  assert.throws(()=>r.engine.request(route.from,route.to),/belagt/);
  assert.throws(()=>r.engine.manual('Vx121','T'),/fritt/);
  r.field.setBlock('S121',false);r.drain();r.request('2b-2c');r.advance(3500);assert.equal(r.engine.routes[0].state,'active');
});

test('reset waits for all signal acknowledgements, handles lost connection and never manufactures free detectors', () => {
  const r=rig();r.request('2b-2c');r.advance(3500);
  const reportSignal=r.field.reportSignal.bind(r.field);r.field.reportSignal=name=>{if(name!=='2/8')reportSignal(name);};r.engine.resetPanel();r.drain();r.advance(8000);
  assert.equal(r.engine.routes.length,1);assert.equal(r.engine.controls.stopAll,true);assert.match(r.engine.snapshot().panelReset.reason,/stoppåterrapport/);
  r.engine.connection(false);assert.equal(r.engine.snapshot().panelReset.ready,false);assert.equal(r.engine.blocks.S121.occupied,null);
  r.engine.connection(true);r.field.reportSignal=reportSignal;r.field.setFault('sensor','S121');r.drain();r.advance(500);
  assert.equal(r.engine.snapshot().panelReset.phase,'complete');assert.equal(r.engine.blocks.S121.occupied,null,'unknown detector remains unknown');
  assert.throws(()=>r.request('2b-2c'),/saknar aktuell/);
});

test('an unfinished reset requires a new operator request after process restart', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-reset-restart-'));
  try{
    const storage=new Storage(dir),r=rig(storage);r.request('2b-2c');r.advance(3500);r.engine.resetPanel();
    const reboot=rig(storage);reboot.advance(500);
    assert.equal(reboot.engine.snapshot().panelReset.phase,'interrupted');assert.equal(reboot.engine.routes.length,1);assert.equal(reboot.engine.controls.stopAll,true);
    reboot.engine.resetPanel();reboot.drain();reboot.advance(250);
    assert.equal(reboot.engine.routes.length,0);assert.equal(reboot.engine.controls.stopAll,false);
    const again=rig(storage);assert.equal(again.engine.snapshot().panelReset.phase,'complete');assert.equal(again.engine.routes.length,0);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('a later stop or emergency request supersedes automatic reset completion', () => {
  for(const command of ['stop','emergency']){
    const r=rig();r.request('2b-2c');r.advance(3500);r.field.setBlock('S121',true);r.drain();r.engine.resetPanel();
    if(command==='stop')r.engine.allStop(true);else r.engine.emergencyCancelAll();
    r.drain();r.advance(500);assert.equal(r.engine.controls.stopAll,true);assert.equal(r.engine.routes.length,1);assert.equal(r.engine.controls.panelReset,null);
  }
});

test('reset storage failures never report completion or allow new orders', () => {
  for(const failOn of ['routes.json','controls.json']){
    const r=rig();r.request('2b-2c');r.advance(3500);r.engine.resetPanel();
    r.engine.storage={event(){},save(name){if(name===failOn)throw Error('disk full');}};
    assert.throws(()=>r.drain(),/spara/);assert.equal(r.engine.controls.stopAll,true);assert.ok(r.engine.storageFault);
    assert.equal(r.engine.snapshot().panelReset.phase,'waiting');assert.equal(r.engine.snapshot().panelReset.ready,false);
    if(failOn==='routes.json')assert.equal(r.engine.routes.length,1);
    assert.throws(()=>r.request('cu-2b'),/spärrad/);
  }
});
