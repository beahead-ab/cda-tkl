import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Engine} from '../src/engine.mjs';
import {Field} from '../src/field.mjs';
import {decode,switchOrder,switchReport,sensorReport} from '../src/protocol.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'),plant=read('profiles/simulator-network.json');
function memory(){const files=new Map();return {files,load:(n,d)=>structuredClone(files.get(n)||d),save:(n,d)=>files.set(n,structuredClone(d)),event:()=>{}};}
function rig(storage=memory()) {
  let now=100000;const q=[],commands=[];const field=new Field(plant,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{storage,now:()=>now,send:b=>{commands.push(decode(b));q.push(['order',b]);}});
  field.on('frame',b=>q.push(['report',b]));
  const drain=()=>{let guard=20000;while(q.length&&guard--){const [kind,b]=q.shift();if(kind==='order')field.accept(b);else engine.receive(b);}assert.ok(guard>0);};
  const advance=ms=>{for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();}};
  engine.connection(true);field.allReports();drain();return {engine,field,commands,storage,drain,advance};
}
test('seven source line controls preserve independent barriers without falsifying detector reports',()=>{
  for(const id of Object.keys(profile.operatingControls.lines)) {
    const r=rig(),line=profile.operatingControls.lines[id],before=structuredClone(r.engine.blocks);
    r.engine.operating.blockLine(id,true);assert.equal(r.storage.files.get('controls.json').version,3);
    assert.deepEqual(r.engine.blocks,before);r.field.allReports();r.drain();assert.ok(r.engine.controls.lines.includes(id));
    const routes=profile.routes.filter(route=>r.engine.operating.lineAffects(line,route));
    for(const route of routes)assert.throws(()=>r.engine.request(route.from,route.to),/spärrat/);
    const restarted=new Engine(profile,{storage:r.storage});assert.ok(restarted.controls.lines.includes(id));
    r.engine.operating.blockLine(id,false);assert.ok(!r.engine.controls.lines.includes(id));
  }
});
test('line barrier stops affected active route while retaining locks; an independent route can still run',()=>{
  const r=rig(),route=r.engine.request('htvCu','htvSpIA');r.advance(5000);assert.equal(route.state,'active');
  r.engine.operating.blockLine('CU',true);r.drain();assert.equal(route.state,'held');assert.equal(r.engine.routes.length,1);assert.ok(route.signals.every(n=>r.engine.signals[n].desired==='STOP'));
  const other=r.engine.request('htvAn','htvSpIIA');r.advance(5000);assert.equal(other.state,'active');
  r.engine.operating.blockLine('CU',false);assert.equal(route.state,'held');
});
test('programming locks durably before order, allows a locomotive on Lastspår3 and requires independent feedback',()=>{
  const r=rig();r.field.setBlock('SLIII',true);r.drain();assert.equal(r.engine.operating.enableStatus().allowed,true);
  const commands=r.commands.length;r.engine.operating.setProgramming(true);
  assert.equal(r.storage.files.get('controls.json').programming.reserved,true);assert.equal(r.commands.at(-1).address,134);
  r.engine.receive(switchOrder(134,'C'));assert.equal(r.engine.operating.phase,'setting');
  r.drain();assert.equal(r.engine.operating.phase,'setting');r.advance(150);assert.equal(r.engine.operating.phase,'active');
  assert.ok(r.commands.slice(commands).every(c=>c.address===134));assert.equal(r.engine.manualStatus('Vx133').allowed,false);
  assert.throws(()=>r.engine.request('htvCu','htvSpVI'),/Programmerings/);assert.throws(()=>r.engine.setMode('remote'),/normaldrift/);
  r.engine.operating.setProgramming(false);assert.equal(r.engine.controls.programming.reserved,true);r.drain();r.advance(150);
  assert.equal(r.engine.controls.programming.reserved,false);assert.equal(r.engine.operating.phase,'normal');assert.equal(r.engine.blocks.SLIII.occupied,true);
});
test('programming refuses wrong point, occupied approach, reserved route, AIS, stale feedback and remote mode',()=>{
  for(const change of [r=>{r.field.turnouts.Vx133.position='T';r.field.reportTurnout('Vx133');r.drain();},r=>{r.field.setBlock('S133',true);r.drain();},r=>r.engine.request('htvCu','htvSpVI'),r=>r.engine.allStop(true),r=>{r.field.setProgrammingFault(true);r.advance(8000);},r=>r.engine.setMode('remote')]) {
    const r=rig();change(r);const count=r.commands.length;assert.throws(()=>r.engine.operating.setProgramming(true));assert.equal(r.commands.length,count);assert.equal(r.engine.controls.programming.reserved,false);
  }
});
test('missing, contradictory and old reports never confirm programming or release its lock',()=>{
  const r=rig();r.field.setProgrammingFault(true);r.engine.operating.setProgramming(true);r.drain();r.advance(6500);assert.equal(r.engine.operating.phase,'held');
  assert.equal(r.engine.controls.programming.reserved,true);r.engine.operating.setProgramming(false);r.engine.receive(switchOrder(134,'T'));r.advance(6500);assert.equal(r.engine.controls.programming.reserved,true);
  r.field.setProgrammingFault(false);r.drain();assert.equal(r.engine.controls.programming.reserved,true,'late normal reports do not silently release held reservation');
  r.engine.operating.setProgramming(false);r.drain();r.advance(200);assert.equal(r.engine.controls.programming.reserved,false);
});
test('disconnect and restart preserve program lock, invalidate command sessions and refuse changed profiles',()=>{
  const r=rig();r.engine.operating.setProgramming(true);r.drain();r.advance(200);const old=r.engine.operating.snapshot();
  r.engine.connection(false);assert.equal(r.engine.operating.phase,'held');r.engine.connection(true);r.field.allReports();r.drain();assert.equal(r.engine.operating.phase,'held');assert.throws(()=>r.engine.operating.checkCommand(old),/ändrats/);
  const restarted=new Engine(profile,{storage:r.storage});assert.equal(restarted.controls.programming.reserved,true);assert.equal(restarted.operating.phase,'held');assert.throws(()=>restarted.operating.checkCommand(old),/ändrats/);
  const changed=structuredClone(profile);changed.operatingControls.programming.relayAddress=135;assert.throws(()=>new Engine(changed,{storage:r.storage}),/Profilen har ändrats/);
});
test('unexpected programming report holds a conflicting route and records a durable reservation',()=>{
  const r=rig(),route=r.engine.request('htvCu','htvSpVI');r.advance(6500);assert.equal(route.state,'active');
  r.engine.receive(sensorReport(940,true));r.drain();assert.equal(route.state,'held');assert.equal(r.engine.controls.programming.reserved,true);assert.equal(r.engine.operating.phase,'held');
  assert.equal(r.storage.files.get('controls.json').programming.reserved,true);assert.ok(route.signals.every(n=>r.engine.signals[n].desired==='STOP'));
});
test('failed reservation writes issue no relay order and failed release retains reservation',()=>{
  const r=rig(),save=r.storage.save;r.storage.save=(n,d)=>{if(n==='controls.json')throw Error('disk full');save(n,d);};
  const before=r.commands.filter(c=>c.address===134).length;assert.throws(()=>r.engine.operating.setProgramming(true),/spara/);assert.equal(r.commands.filter(c=>c.address===134).length,before);assert.ok(r.engine.storageFault);
  const s=rig();s.engine.operating.setProgramming(true);s.drain();s.advance(200);s.engine.operating.setProgramming(false);s.drain();
  const original=s.storage.save;s.storage.save=(n,d)=>{if(n==='controls.json'&&!d.programming.reserved)throw Error('disk full');original(n,d);};
  assert.throws(()=>s.advance(200),/spara/);assert.equal(s.engine.controls.programming.reserved,true);assert.equal(s.storage.files.get('controls.json').programming.reserved,true);
});
test('two panels cannot overwrite newer line/program choices; corrupt persisted controls fail closed',()=>{
  const r=rig(),before=r.engine.operating.snapshot();r.engine.operating.checkCommand(before);r.engine.operating.blockLine('AN',true);assert.throws(()=>r.engine.operating.checkCommand(before),/ändrats/);
  for(const edit of [c=>c.lines.push('unknown'),c=>c.programming.reserved='yes',c=>{c.programming.desired=true;}]){const store=memory(),c=structuredClone(r.engine.controls);edit(c);store.files.set('controls.json',c);assert.throws(()=>new Engine(profile,{storage:store}),/ogiltiga/);}
});

test('loss of normal programming feedback stops an active affected route while keeping its lock',()=>{
  const r=rig(),route=r.engine.request('htvCu','htvSpVI');r.advance(6500);assert.equal(route.state,'active');
  r.field.setProgrammingFault(true);r.advance(8000);assert.equal(route.state,'held');assert.equal(r.engine.routes.length,1);assert.ok(route.signals.every(n=>r.engine.signals[n].desired==='STOP'));
});
test('unexpected programming in remote mode can return to confirmed normal without an authority deadlock',()=>{
  const r=rig();r.engine.setMode('remote');r.engine.receive(sensorReport(940,true));assert.equal(r.engine.controls.programming.reserved,true);
  r.engine.operating.setProgramming(false);r.drain();r.advance(200);assert.equal(r.engine.controls.programming.reserved,false);assert.equal(r.engine.controls.mode,'remote');
});
