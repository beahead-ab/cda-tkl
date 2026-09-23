import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { decode, sensorReport, signalReport } from '../src/protocol.mjs';
import { RoutePolicy } from '../src/route-policy.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'), fieldProfile=read('profiles/simulator-network.json'), source=read('public/data/operations-source.json');
const mainRoutes=profile.routes.filter(r=>r.kind==='main'), shuntRoutes=profile.routes.filter(r=>r.kind==='shunt');
function rig(storage) {
  let now=100000;const queue=[],commands=[];
  const field=new Field(fieldProfile,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{storage,now:()=>now,send:b=>{queue.push(['order',b]);commands.push(decode(b));}});
  field.on('frame',b=>queue.push(['report',b]));
  function drain(){let guard=20000;while(queue.length&&guard--){const [kind,b]=queue.shift();if(kind==='order')field.accept(b);else engine.receive(b);}assert.ok(guard>0,'feedback must settle');}
  function advance(ms){for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();}}
  engine.connection(true);field.allReports();drain();
  return {engine,field,commands,drain,advance,request:(a,b)=>engine.request(a,b)};
}
test('every source main-route pair is explicitly allowed, denied or unresolved; hidden buttons remain excluded',()=>{
  assert.equal(source.groups.length,25);assert.equal(source.rules.length,1377);
  assert.equal(source.mainRoutePolicies.length,376);
  assert.deepEqual(source.disabledGroups,['IX:AUTO:0021']);
  const policy=new RoutePolicy({mainRoutePolicies:source.mainRoutePolicies});
  assert.equal(policy.allowed().length,210);
  assert.equal(mainRoutes.length,192);assert.equal(profile.excluded.filter(r=>r.from.startsWith('htv')).length,18);
  for(const pair of source.mainRoutePolicies.filter(r=>r.status!=='allowed')) assert.equal(policy.inspect(pair.fromButton,pair.toButton).allowed,false,pair.rule);
  assert.equal(Object.keys(profile.turnouts).length,49);assert.equal(Object.keys(profile.signals).length,66);
  assert.ok(profile.routes.every(r=>r.signals.length && r.source.rules.length && !r.blocks.includes('frame')));
});
test('XML signal direction takes precedence over nearby opposite-facing icons',()=>{
  const cu=profile.routes.find(r=>r.from==='htvCu'&&r.to==='htvSpIA');
  assert.deepEqual(cu.signals,['1/3','1/5']);assert.ok(cu.guardSignals.includes('U4'));
  assert.ok(!cu.blocks.includes('SU4A'),'approach before start signal is not a route block');
  const an=profile.routes.find(r=>r.from==='htvAn'&&r.to==='htvSpIIA');
  assert.deepEqual(an.signals,['2/1','2/5']);
  const through=profile.routes.find(r=>r.from==='htvSpIIA'&&r.to==='htvSpIIB');
  assert.deepEqual(through.signals,['2/7']);
});
test('independent infarts establish together, lock switches and cancel independently through wire reports',()=>{
  const r=rig(),a=r.request('htvCu','htvSpIA');r.advance(4000);
  assert.equal(a.state,'active',a.reason);
  const b=r.request('htvAn','htvSpIIA');r.advance(4000);
  assert.equal(a.state,'active',a.reason);assert.equal(b.state,'active',b.reason);
  assert.throws(()=>r.engine.manual('Vx102','T'),/låst/);
  r.request('htvAn','htvSpIIA');r.drain();r.advance(50);
  assert.deepEqual(r.engine.routes.map(x=>x.id),[a.id]);
  assert.throws(()=>r.request('htvAn','htvSpIA'),/motsägelse|spärrad/);
});
test('all 192 main routes establish and release after independent train passage', {timeout:60000},()=>{
  for(const def of mainRoutes){
    const r=rig(),route=r.request(def.from,def.to);r.advance(6500);assert.equal(route.state,'active',def.label+': '+route.reason);
    r.field.startTrain(def.id);r.advance((route.passage.length+3)*850);
    assert.equal(r.field.trains.length,0,def.label+': train stopped');
    assert.equal(r.engine.routes.length,0,def.label+': '+route.reason);
  }
});
test('plant refuses a destination past a red signal and passed signals clear behind the train',()=>{
  const r=rig(),route=r.request('htvCu','htvSpIA');r.advance(4000);
  assert.throws(()=>r.field.startTrain('htvCu--htvBu'),/1\/7.*inte kör/);
  r.field.startTrain(route.definitionId);r.advance(200);
  assert.equal(r.engine.signals['1/3'].desired,'STOP');assert.equal(r.engine.signals['1/5'].desired,'GO');
  r.advance(1800);assert.equal(r.engine.signals['1/5'].desired,'STOP');
});
test('repeated FREE does not release; ordered occupied/free passage releases only after STOP reports',()=>{
  const r=rig(),route=r.request('htvCu','htvSpIA');r.advance(4000);
  r.field.allReports();r.drain();r.advance(4000);assert.equal(r.engine.routes.length,1);assert.equal(route.state,'active');
  r.field.startTrain(route.definitionId);r.advance(15000);
  assert.equal(r.field.trains.length,0);assert.equal(r.engine.routes.length,0,route.reason);
  assert.ok(route.passage.every(p=>p.state==='clear'));
});
test('unexpected occupation order holds locks and shared detectors remain coherent',()=>{
  const r=rig(),route=r.request('htvCu','htvSpIA');r.advance(4000);
  const last=route.blocks.at(-1);r.field.setBlock(last,true);r.drain();
  assert.equal(route.state,'held');assert.equal(r.engine.routes.length,1);
  const address=profile.blocks[last].address;
  for(const [name,binding] of Object.entries(profile.blocks)) if(binding.address===address) assert.equal(r.engine.blocks[name].occupied,true);
  r.engine.receive(sensorReport(address,false));assert.equal(r.engine.routes.length,1);
});

test('all visible source shunt routes establish and release through independent field reports', {timeout:60000},()=>{
  assert.equal(source.shuntRoutePolicies.length,146);assert.equal(shuntRoutes.length,60);
  const policy=new RoutePolicy(source);
  const bad=source.shuntRoutePolicies.find(r=>r.status==='unresolved');
  assert.equal(policy.inspect(bad.fromButton,bad.toButton).allowed,false);
  for(const def of shuntRoutes){
    const r=rig(),route=r.request(def.from,def.to);r.advance(6500);assert.equal(route.state,'active',def.label+': '+route.reason);
    r.field.startTrain(def.id);r.advance((route.passage.length+3)*850);
    assert.equal(r.field.trains.length,0,def.label+': train stopped');assert.equal(r.engine.routes.length,0,def.label+': '+route.reason);
  }
});

test('administrative blocks persist independently of FREE reports and stop existing routes without releasing locks',()=>{
  const saved=new Map(),storage={load:(n,f)=>saved.has(n)?structuredClone(saved.get(n)):f,save:(n,v)=>saved.set(n,structuredClone(v)),event(){}};
  const r=rig(storage);r.engine.blockTrack('SIA',true);
  r.field.allReports();r.drain();assert.equal(r.engine.blocks.SIA.occupied,false);assert.equal(r.engine.trackBlocked('SIA'),true);
  assert.throws(()=>r.request('htvCu','htvSpIA'),/administrativt spärrat/);
  const restored=new Engine(profile,{storage});assert.equal(restored.trackBlocked('SIA'),true);
  r.engine.blockTrack('SIA',false);const route=r.request('htvCu','htvSpIA');r.advance(4000);
  r.engine.blockTrack('SIA',true);r.drain();assert.equal(route.state,'held');assert.equal(r.engine.routes.length,1);
  r.engine.blockTrack('SIA',false);r.advance(1000);assert.equal(route.state,'held');
});
test('AIS requires new STOP acknowledgements, survives restart and never resumes old routes',()=>{
  const saved=new Map(),storage={load:(n,f)=>saved.has(n)?structuredClone(saved.get(n)):f,save:(n,v)=>saved.set(n,structuredClone(v)),event(){}};
  const r=rig(storage),route=r.request('htvCu','htvSpIA');r.advance(4000);
  r.engine.allStop(true);assert.equal(route.state,'held');assert.throws(()=>r.engine.allStop(false),/återrapportera stopp/);
  assert.throws(()=>r.request('htvAn','htvSpIIA'),/AIS/);
  assert.equal(new Engine(profile,{storage}).controls.stopAll,true);
  r.drain();r.advance(1000);r.engine.allStop(false);assert.equal(route.state,'held');assert.equal(r.engine.routes.length,1);
  assert.ok(Object.values(r.engine.signals).every(s=>s.desired==='STOP'));
});

test('all 20 resolved XML manual rules move exactly the confirmed coupled group',()=>{
  const ready=profile.manualPolicies.rules.filter(p=>p.status==='ready');assert.equal(ready.length,20);
  for(const policy of ready) {
    const r=rig();assert.equal(r.engine.manualStatus(policy.names[0]).allowed,true,policy.rule);
    const before=r.commands.length;r.engine.manual(policy.names[0],'T');
    const orders=r.commands.slice(before);assert.deepEqual(orders.map(c=>c.address).sort((a,b)=>a-b),policy.names.map(n=>profile.turnouts[n].address).sort((a,b)=>a-b),policy.rule);
    r.drain();r.advance(300);for(const n of policy.names)assert.equal(r.engine.turnouts[n].position,'T',policy.rule+' '+n);
  }
});
test('unresolved manual groups and shunting permissions cannot be bypassed through individual turnout names',()=>{
  const unresolved=profile.manualPolicies.rules.filter(p=>p.status==='unresolved');assert.equal(unresolved.length,15);
  const r=rig();
  for(const policy of unresolved) for(const name of policy.names) {
    const before=r.commands.length;assert.throws(()=>r.engine.manual(name,'T'),/verifierad|saknar|Rangeröverlämningen/);assert.equal(r.commands.length,before,name);
  }
});
test('manual turnout conditions are local but still reject occupied, stale, blocked or reserved resources',()=>{
  const r=rig();r.field.setBlock('Slokstall1',true);r.drain();
  r.engine.manual('Vx100','T');r.drain();r.advance(300);assert.equal(r.engine.turnouts.Vx101.position,'T');
  r.field.setBlock('S100',true);r.drain();assert.throws(()=>r.engine.manual('Vx100','C'),/belagt/);
  r.field.setBlock('S100',false);r.drain();r.engine.blockTrack('S101',true);assert.throws(()=>r.engine.manual('Vx100','C'),/spärrat/);
  r.engine.blockTrack('S101',false);r.field.setFault('sensor','S100');r.drain();r.advance(8000);assert.throws(()=>r.engine.manual('Vx100','C'),/återrapport/);
  const second=rig(),route=second.request('htvCu','htvSpIA');second.advance(4000);
  second.engine.manual('Vx170','T');second.drain();second.advance(300);assert.equal(route.state,'active','independent route remains active');
  assert.throws(()=>second.engine.manual('Vx100','T'),/låst/);
  second.engine.hold(route,'Provad kvarstående reservation');assert.throws(()=>second.engine.manual('Vx100','T'),/låst/);
});
test('a protective signal must be stopped before local turnout movement',()=>{
  const r=rig(),policy=profile.manualPolicies.byTurnout.Vx100;assert.ok(policy.signals.length);
  const n=policy.signals[0];
  // Keep the independent plant's GO report pending STOP confirmation.
  r.engine.receive(signalReport(profile.signals[n].reportAddress,8));
  assert.throws(()=>r.engine.manual('Vx100','T'),/signal.*stopp/);
});

test('emergency cancellation stops all routes but only releases individually free and acknowledged reservations',()=>{
  const r=rig(),a=r.request('htvCu','htvSpIA'),b=r.request('htvAn','htvSpIIA');r.advance(4000);
  r.field.setBlock('SIA',true);r.drain();
  r.engine.emergencyCancelAll();
  assert.equal(r.engine.controls.stopAll,true);assert.equal(r.engine.routes.length,2,'old STOP reports cannot release after the emergency request');
  assert.ok(r.engine.routes.every(route=>route.cancelRequested));assert.throws(()=>r.engine.allStop(false),/Nödåtertagning/);
  r.drain();r.advance(200);assert.deepEqual(r.engine.routes.map(route=>route.id),[a.id]);assert.ok(!r.engine.routes.includes(b));
  assert.equal(r.engine.emergencyRemaining().length,1);
  r.field.setBlock('SIA',false);r.drain();r.advance(100);
  assert.equal(r.engine.routes.length,0);assert.ok(r.engine.controls.emergency.completedAt);assert.equal(r.engine.controls.stopAll,true);
  r.engine.allStop(false);assert.equal(r.engine.controls.stopAll,false);
});
test('emergency requests survive restart without resuming or automatically releasing restored locks',()=>{
  const saved=new Map(),storage={load:(n,f)=>saved.has(n)?structuredClone(saved.get(n)):f,save:(n,v)=>saved.set(n,structuredClone(v)),event(){}};
  const r=rig(storage),route=r.request('htvCu','htvSpIA');r.advance(4000);
  r.engine.emergencyCancelAll();
  const restarted=new Engine(profile,{storage});assert.equal(restarted.controls.stopAll,true);assert.equal(restarted.controls.version,2);
  assert.deepEqual(restarted.emergencyRemaining().map(x=>x.id),[route.id]);assert.equal(restarted.routes[0].state,'held');assert.equal(restarted.routes[0].cancelRequested,false);
  assert.throws(()=>restarted.allStop(false),/Nödåtertagning/);
});
test('emergency request while disconnected retains reservations until fresh reports arrive',()=>{
  const r=rig(),route=r.request('htvCu','htvSpIA');r.advance(4000);r.engine.connection(false);
  r.engine.emergencyCancelAll();r.advance(1000);assert.equal(r.engine.routes.length,1);assert.equal(route.cancelRequested,true);
  r.engine.connection(true);r.field.allReports();r.drain();r.advance(100);assert.equal(r.engine.routes.length,0);assert.equal(r.engine.controls.stopAll,true);
});
test('local/remote authority persists, blocks local commands and cannot change with held reservations',()=>{
  const saved=new Map(),storage={load:(n,f)=>saved.has(n)?structuredClone(saved.get(n)):f,save:(n,v)=>saved.set(n,structuredClone(v)),event(){}};
  const r=rig(storage),route=r.request('htvCu','htvSpIA');r.advance(4000);assert.throws(()=>r.engine.setMode('remote'),/tågvägslås/);
  r.engine.hold(route,'Test');assert.throws(()=>r.engine.setMode('remote'),/tågvägslås/);
  r.engine.cancel(route.id);r.drain();r.advance(100);r.engine.setMode('remote');
  assert.equal(new Engine(profile,{storage}).controls.mode,'remote');
  assert.throws(()=>r.request('htvAn','htvSpIIA'),/Fjärrläge/);assert.throws(()=>r.engine.manual('Vx170','T'),/Fjärrläge/);
  r.engine.blockTrack('SIA',true);assert.throws(()=>r.engine.blockTrack('SIA',false),/lokal/);
  r.engine.emergencyCancelAll();r.drain();r.advance(100);r.engine.allStop(false);assert.equal(r.engine.controls.mode,'remote');
  r.engine.setMode('local');r.engine.blockTrack('SIA',false);r.request('htvAn','htvSpIIA');r.advance(4000);assert.equal(r.engine.routes[0].state,'active');
});
test('legacy controls migrate without dropping AIS or blocks; invalid authority fails closed',()=>{
  const values={'controls.json':{version:1,stopAll:true,blocked:['SIA']}},storage={load:(n,f)=>structuredClone(values[n]||f),event(){}};
  const e=new Engine(profile,{storage});assert.deepEqual(e.controls,{version:2,stopAll:true,blocked:['SIA'],mode:'local',emergency:null});
  assert.equal(values['controls.json'].version,1,'read-only migration does not overwrite stored controls during startup');
  values['controls.json']={...e.controls,mode:'anything'};assert.throws(()=>new Engine(profile,{storage}),/ogiltig/);
});
test('failed emergency persistence still sends STOP and never removes a reservation',()=>{
  const r=rig(),route=r.request('htvCu','htvSpIA');r.advance(4000);
  r.engine.storage={save(){throw Error('Disk full');},event(){}};
  const before=r.commands.length;assert.throws(()=>r.engine.emergencyCancelAll(),/spara/);
  assert.equal(r.engine.routes[0].id,route.id);assert.ok(r.engine.storageFault);assert.equal(r.engine.controls.stopAll,true);
  assert.ok(r.commands.slice(before).length>=Object.keys(profile.signals).length);
  assert.ok(r.commands.slice(before).every(c=>c.position==='T'),'failure sends only stop requests');
  assert.throws(()=>r.engine.setMode('remote'),/lagring/);
});
