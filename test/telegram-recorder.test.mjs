import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TelegramRecorder,describeProtocol} from '../src/telegram-recorder.mjs';
import {LocoNetClient} from '../src/transport.mjs';
import {switchOrder,frame,hex} from '../src/protocol.mjs';
const profile=JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal-network.json',import.meta.url)));
function rig(t,options={}) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cda-recording-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  let wall=100000,tick=0;const recorder=new TelegramRecorder(directory,profile,{now:()=>wall,clock:()=>tick,...options});
  return {directory,recorder,start:label=>recorder.start({label,sessionId:recorder.sessionId},'connected'),advance:n=>{tick+=n;wall+=n;recorder.tick();},wall:n=>{wall=n;},stop:()=>recorder.stop({sessionId:recorder.sessionId,id:recorder.active?.id})};
}
test('raw lines retain invalid and unsupported frames and separate command, received order, report and transport acknowledgement',()=>{
  assert.equal(describeProtocol('out','SEND B0 7A 30 05').kind,'order');
  const echo=describeProtocol('in','RECEIVE B0 7A 30 05');assert.equal(echo.kind,'received-order');assert.match(echo.interpretation,/kan vara eko/);
  assert.equal(describeProtocol('in','SENT OK').kind,'transport-ack');
  assert.equal(describeProtocol('in','RECEIVE B1 7A 20 14').kind,'report');
  assert.equal(describeProtocol('in','RECEIVE B1 7A 20 15').valid,false);
  assert.equal(describeProtocol('in','RECEIVE nonsense').kind,'invalid-frame');
  assert.equal(describeProtocol('in','RECEIVE '+hex(frame([0xb1,0,0x40]))).kind,'unsupported');
  const signal=describeProtocol('in','RECEIVE E4 09 06 2E 00 01 12 00 29');assert.equal(signal.decoded.code,18);assert.match(signal.interpretation,/ej verifierat/);
});
test('recording preserves sequence, monotonic time, explicit provenance and completed files across restart',async t=>{
  const r=rig(t);r.start('Växel 123');const id=r.recorder.active.id;
  r.advance(50);r.recorder.protocol({direction:'out',line:'SEND B0 7A 30 05'});
  r.wall(99000);r.advance(50);r.recorder.protocol({direction:'in',line:'RECEIVE B1 7A 20 14'});
  const preview=await r.recorder.export(id);preview.events.length=0;assert.equal(r.recorder.active.events.length,3,'export cannot mutate active capture');
  await r.stop();const doc=await r.recorder.export(id);
  assert.deepEqual(doc.events.map(e=>e.seq),[1,2,3]);assert.deepEqual(doc.events.map(e=>e.elapsedMs),[0,50,100]);
  assert.equal(doc.events[2].at,99050);assert.equal(doc.reason,'operator');assert.match(doc.verification,/ej verifierad/);
  assert.equal(doc.profile.sourceHash,profile.sourceHash);assert.ok(!('transport' in doc.profile));assert.ok(!('notes' in doc));
  const file=path.join(r.recorder.directory,id+'.json');assert.equal(fs.statSync(file).mode&0o777,0o600);
  const resumed=new TelegramRecorder(r.directory,profile);assert.equal(resumed.view().history[0].id,id);assert.deepEqual(await resumed.export(id),doc);
  await assert.rejects(resumed.export('../../routes'),/Okänd/);
});
test('concurrent panels and server sessions cannot overwrite or stop a different recording',async t=>{
  const r=rig(t);assert.throws(()=>r.recorder.start({sessionId:'old'},'connected'),/startats om/);
  assert.throws(()=>r.recorder.start({sessionId:r.recorder.sessionId},'disconnected'),/Anslut/);
  r.start('Första');const first=r.recorder.active.id;assert.throws(()=>r.start('Andra'),/pågår/);
  await assert.rejects(r.recorder.stop({id:'old',sessionId:r.recorder.sessionId}),/ändrats/);
  await Promise.all([r.stop(),r.stop()]);const original=fs.readFileSync(path.join(r.recorder.directory,first+'.json'),'utf8');
  r.start('Andra');await assert.rejects(r.recorder.stop({id:first,sessionId:r.recorder.sessionId}),/ändrats/);await r.stop();
  assert.equal(r.recorder.history.size,2);assert.equal(fs.readFileSync(path.join(r.recorder.directory,first+'.json'),'utf8'),original);
});
test('event, byte and time limits stop without eviction and archive quota preserves older files',async t=>{
  for(const [options,reason,trigger] of [
    [{maxEvents:2},'event-limit',r=>r.recorder.protocol({direction:'in',line:'SENT OK'})],
    [{maxBytes:150},'size-limit',r=>r.recorder.protocol({direction:'in',line:'RECEIVE '+ 'X'.repeat(4096)})],
    [{maxDurationMs:100},'time-limit',r=>r.advance(100)]]) {
    const r=rig(t,options);r.start('Gräns');const id=r.recorder.active.id;trigger(r);await r.recorder.pending;
    const doc=await r.recorder.export(id);assert.equal(doc.reason,reason);assert.ok(doc.bytes<=r.recorder.limits.maxBytes);assert.ok(doc.events.length<=r.recorder.limits.maxEvents);
    const count=doc.events.length;r.recorder.protocol({direction:'in',line:'SENT OK'});assert.equal((await r.recorder.export(id)).events.length,count);
  }
  const r=rig(t,{maxFiles:1});r.start('Bevara');await r.stop();assert.throws(()=>r.start('Ingen radering'),/fullt/);assert.equal(r.recorder.history.size,1);
});
test('disconnect and graceful shutdown save explicit termination reasons',async t=>{
  const r=rig(t);r.start('Avbrott');let id=r.recorder.active.id;r.recorder.connection(false);await r.recorder.pending;
  let doc=await r.recorder.export(id);assert.equal(doc.reason,'disconnected');assert.equal(doc.events.at(-1).connected,false);
  r.start('Serverstopp');id=r.recorder.active.id;await r.recorder.finish('server-shutdown');doc=await r.recorder.export(id);assert.equal(doc.reason,'server-shutdown');
});
test('failed saves keep exportable data and support retry without touching prior recordings; corrupt archives are preserved',async t=>{
  const r=rig(t);r.start('Gammal');await r.stop();const prior=r.recorder.view().history[0].id;
  r.start('Ny');const id=r.recorder.active.id,temp=path.join(r.recorder.directory,id+'.json.tmp');fs.mkdirSync(temp);
  await r.stop();assert.match(r.recorder.view().error,/kunde inte sparas/);assert.equal((await r.recorder.export(id)).label,'Ny');assert.equal(r.recorder.history.size,1);
  fs.rmdirSync(temp);await r.stop();assert.equal(r.recorder.active,null);assert.equal(r.recorder.history.size,2);assert.equal((await r.recorder.export(prior)).label,'Gammal');
  const file=path.join(r.recorder.directory,prior+'.json');fs.writeFileSync(file,'broken');const restarted=new TelegramRecorder(r.directory,profile);
  assert.match(restarted.error,/kunde inte läsas/);assert.throws(()=>restarted.start({sessionId:restarted.sessionId},'connected'),/kunde inte läsas/);assert.equal(fs.readFileSync(file,'utf8'),'broken');
});
test('transport tap observes SENT, invalid frames and received orders without adding sends or accepting invalid feedback',async t=>{
  const r=rig(t);r.start('Transport');const id=r.recorder.active.id,client=new LocoNetClient({host:'127.0.0.1',port:1}),sent=[],frames=[],faults=[];
  client.online=true;client.socket={write:line=>sent.push(line),destroy:()=>{}};client.on('protocol',line=>r.recorder.protocol(line));client.on('frame',f=>frames.push(hex(f)));client.on('fault',s=>faults.push(s));
  client.send(switchOrder(123,'C'));client.line('RECEIVE B0 7A 30 05');client.line('SENT OK');client.line('RECEIVE B1 7A 20 15');client.line('RECEIVE B1 7A 20 14');
  await r.stop();const doc=await r.recorder.export(id);
  assert.equal(sent.length,1);assert.deepEqual(frames,['B0 7A 30 05','B1 7A 20 14']);assert.equal(faults.length,1);
  assert.deepEqual(doc.events.map(e=>e.kind),['connection','order','received-order','transport-ack','invalid-frame','report']);
});
