import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { decode, sensorReport, signalReport, switchOrder } from '../src/protocol.mjs';
import { RoutePolicy } from '../src/route-policy.mjs';
import { splitRouteAt } from '../src/route-sections.mjs';
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
test('every source main-route pair is explicitly allowed, denied or unresolved; Spår6 uses an explicit source catalog control',()=>{
  assert.equal(source.groups.length,25);assert.equal(source.rules.length,1377);
  assert.equal(source.mainRoutePolicies.length,376);
  assert.deepEqual(source.disabledGroups,['IX:AUTO:0021']);
  const policy=new RoutePolicy({mainRoutePolicies:source.mainRoutePolicies});
  assert.equal(policy.allowed().length,210);
  assert.equal(mainRoutes.length,210);assert.equal(profile.excluded.filter(r=>r.from.startsWith('htv')).length,0);
  assert.deepEqual(profile.buttons.htvSpVI,{label:'Spår 6',sourceSensor:'IS266',presentation:'catalog'});
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
test('a composed route retains the complete source NX identity alongside intermediate signal pairs',()=>{
  const nx='IN:39525608-38c1-4fcb-a4e4-d58cf419e20c'; // XML 3/5 → 6/9
  for(const id of ['htvSpIIIA--htvSpVI','tvv3/5--tvv6/9']) {
    const def=profile.routes.find(r=>r.id===id);
    assert.deepEqual(def.signals,['3/5','6/7']);assert.ok(def.nxIds.includes(nx));
    assert.deepEqual(def.source.requestedNxIds,[nx]);assert.ok(def.nxIds.length>1,'intermediate NX identities are also retained');
    const r=rig(),route=r.request(def.from,def.to);r.advance(6500);assert.equal(route.state,'active');assert.ok(route.nxIds.includes(nx));
    r.engine.hold(route,'Held reservation keeps its source identity');assert.ok(route.nxIds.includes(nx));
  }
  for(const def of shuntRoutes) {
    const sourceRule=source.shuntRoutePolicies.find(r=>r.rule===def.source.rules[0]);
    assert.ok(sourceRule.nxIds.every(id=>def.nxIds.includes(id)),def.id);
  }
  const coverage=read('public/data/route-coverage.json');
  assert.ok(coverage.nx.find(n=>n.id===nx).routes.includes('tvv3/5--tvv6/9'));
  assert.equal(coverage.nx.filter(n=>n.routes.length).length,133);
});
test('Spår6 catalog routes keep their distinct source NX boundaries and protect both directions',()=>{
  const six=mainRoutes.filter(r=>r.from==='htvSpVI'||r.to==='htvSpVI');assert.equal(six.length,18);
  const cu=six.find(r=>r.from==='htvCu'),bu=six.find(r=>r.from==='htvBu'),out=six.find(r=>r.from==='htvSpVI'&&r.to==='htvCu');
  assert.deepEqual(cu.source.nxButtons,['tvs1/3','tvs6/9']);assert.deepEqual(cu.signals,['1/3','1/5','5/5','6/7']);assert.ok(cu.guardSignals.includes('6/9'));
  assert.deepEqual(bu.source.nxButtons,['tvs1/2','tvs6/8']);assert.deepEqual(bu.signals,['1/2','1/4','3/6','6/6']);assert.ok(bu.guardSignals.includes('6/8'));
  assert.deepEqual(out.source.nxButtons,['tvs6/8','tvsU4']);assert.equal(out.signals[0],'6/8');assert.equal(out.signals.at(-1),'U4');assert.ok(out.blocks.includes('SU4A'));assert.ok(!out.guardSignals.includes('U4'));
  for(const def of six) {
    const r=rig();r.field.setBlock(def.blocks[0],true);r.drain();
    assert.throws(()=>r.request(def.from,def.to),/belagt|okänt/);assert.equal(r.engine.routes.length,0);
  }
  const r=rig(),route=r.request('htvCu','htvSpVI');r.advance(6500);assert.equal(route.state,'active',route.reason);
  assert.equal(r.engine.signals['6/9'].desired,'STOP');const before=r.commands.length;
  assert.throws(()=>r.request('htvBu','htvSpVI'),/stopp|låst|konflikt|reserver/);
  assert.equal(r.commands.length,before);assert.equal(r.engine.routes.length,1);assert.equal(route.state,'active');
  r.field.setBlock('SVI',true);r.drain();assert.equal(route.state,'held');
  r.request('htvCu','htvSpVI');r.drain();r.advance(200);assert.equal(r.engine.routes.length,1);
  r.field.setBlock('SVI',false);r.drain();r.advance(200);assert.equal(r.engine.routes.length,0);
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
test('all 210 main routes establish and release after independent train passage', {timeout:120000},()=>{
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

test('all 130 reviewed source shunt routes establish and release through independent field reports', {timeout:120000},()=>{
  assert.equal(source.shuntRoutePolicies.length,146);assert.equal(shuntRoutes.length,130);
  const policy=new RoutePolicy(source);
  const bad=source.shuntRoutePolicies.find(r=>r.status==='unresolved');
  assert.equal(policy.inspect(bad.fromButton,bad.toButton).allowed,false);
  for(const def of shuntRoutes){
    const r=rig(),route=r.request(def.from,def.to);r.advance(6500);assert.equal(route.state,'active',def.label+': '+route.reason);
    r.field.startTrain(def.id);r.advance((route.passage.length+3)*850);
    assert.equal(r.field.trains.length,0,def.label+': train stopped');assert.equal(r.engine.routes.length,0,def.label+': '+route.reason);
  }
});

test('catalog shunt routes retain reviewed source boundaries and refuse occupied, blocked and unresolved cases',()=>{
  const review=read('profiles/shunt-catalog-review.json');
  assert.equal(review.routes.length,70);assert.equal(Object.keys(review.controls).length,30);
  for(const [id,sourceSensor] of Object.entries(review.controls)) assert.deepEqual(profile.buttons[id],{label:id.slice(3),sourceSensor,presentation:'catalog'});
  for(const item of review.routes) {
    const def=shuntRoutes.find(r=>r.from===item.from&&r.to===item.to);
    assert.deepEqual(def.source.nxButtons,item.nxButtons);assert.deepEqual(def.signals,item.signals);
    assert.ok(def.guardSignals.includes(item.target));assert.equal(def.boundaries[0].sensor,item.nxButtons[0]);
    const r=rig();r.field.setBlock(def.blocks[0],true);r.drain();const before=r.commands.length;
    assert.throws(()=>r.request(def.from,def.to),/belagt|okänt/,def.id);assert.equal(r.commands.length,before);assert.equal(r.engine.routes.length,0);
    r.field.setBlock(def.blocks[0],false);r.drain();r.engine.blockTrack(def.blocks[0],true);
    assert.throws(()=>r.request(def.from,def.to),/spärrat/,def.id);assert.equal(r.engine.routes.length,0);
  }
  assert.equal(profile.excluded.length,15);
  const r=rig(),before=r.commands.length;
  for(const excluded of profile.excluded) assert.throws(()=>r.request(excluded.from,excluded.to));
  assert.equal(r.commands.length,before);assert.equal(r.engine.routes.length,0);
});

test('catalog shunt lock and STOP conditions survive conflicts, cancellation and lost connection',()=>{
  const r=rig(),route=r.request('tvv6/8','tvv3/10');r.advance(6500);assert.equal(route.state,'active');
  assert.equal(r.engine.signals['3/10'].desired,'STOP');
  const before=r.commands.length;assert.throws(()=>r.request('htvCu','htvSpVI'),/stopp|låst|konflikt|reserver/);assert.equal(r.commands.length,before);
  const block=route.blocks.at(-1);r.field.setBlock(block,true);r.drain();
  r.request('tvv6/8','tvv3/10');r.drain();r.advance(100);assert.equal(r.engine.routes.length,1);
  r.engine.connection(false);assert.equal(route.state,'cancelling');assert.equal(r.engine.routes.length,1);
  r.field.setBlock(block,false); // new reports are processed only after reconnect below
  const reconnected=r.commands.length;r.engine.connection(true);assert.equal(r.engine.routes.length,1);
  r.field.allReports();r.drain();r.advance(300);assert.equal(r.engine.routes.length,0);
  const signalAddresses=new Set(Object.values(profile.signals).map(s=>s.address));
  assert.ok(r.commands.length>reconnected);
  assert.ok(r.commands.slice(reconnected).every(c=>c.kind==='order'&&signalAddresses.has(c.address)&&c.position==='T'));
  const refused=rig();refused.field.setFault('signal','6/8');refused.drain();
  const denied=refused.request('tvv6/8','tvv3/10');refused.advance(10000);
  assert.equal(denied.state,'held');assert.equal(refused.engine.routes.length,1);assert.equal(refused.engine.signals['6/8'].desired,'STOP');
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

test('all 30 resolved manual rules move exactly the confirmed coupled group',()=>{
  const ready=profile.manualPolicies.rules.filter(p=>p.status==='ready');assert.equal(ready.length,30);
  for(const policy of ready) {
    const r=rig();assert.equal(r.engine.manualStatus(policy.names[0]).allowed,true,policy.rule);
    const before=r.commands.length;r.engine.manual(policy.names[0],'T');
    const orders=r.commands.slice(before);assert.deepEqual(orders.map(c=>c.address).sort((a,b)=>a-b),policy.names.map(n=>profile.turnouts[n].address).sort((a,b)=>a-b),policy.rule);
    r.drain();r.advance(300);for(const n of policy.names)assert.equal(r.engine.turnouts[n].position,'T',policy.rule+' '+n);
  }
});
test('unresolved groups remain blocked except for explicitly reviewed boundary replacements',()=>{
  const unresolved=profile.manualPolicies.rules.filter(p=>p.status==='unresolved');assert.equal(unresolved.length,5);
  const r=rig();
  for(const policy of unresolved) for(const name of policy.names) {
    if(profile.manualPolicies.boundaryOverrides?.[name])continue;
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
  const restarted=new Engine(profile,{storage});assert.equal(restarted.controls.stopAll,true);assert.equal(restarted.controls.version,3);
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
  const e=new Engine(profile,{storage});assert.deepEqual(e.controls,{version:3,stopAll:true,blocked:['SIA'],mode:'local',emergency:null,lines:[],programming:{reserved:false,desired:false},yard:{requests:[]}});
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

// The crossover on the Lekby side: each half must protect its companion,
// including when only one half is physically traversed by the chosen route.
test('Vx100/Vx101 manual movement works from either half in both directions',()=>{
  for(const selected of ['Vx100','Vx101']) {
    const r=rig();
    for(const position of ['T','C']) {
      const before=r.commands.length;r.engine.manual(selected,position);
      const sent=r.commands.slice(before);
      assert.deepEqual(sent.map(c=>[c.address,c.position]).sort((a,b)=>a[0]-b[0]),[[100,position],[101,position]]);
      assert.equal(r.engine.turnouts.Vx100.position,'unknown');
      assert.equal(r.engine.turnouts.Vx101.position,'unknown','sending a command is not confirmation');
      r.drain();r.advance(300);
      for(const name of ['Vx100','Vx101']) {
        assert.equal(r.field.turnouts[name].position,position,selected+' must command the independent field companion');
        assert.equal(r.engine.turnouts[name].position,position,selected+' must receive each companion report');
      }
    }
  }
});
test('every network route reserves the complete source-linked companion group',()=>{
  for(const route of profile.routes)for(const [name,position] of Object.entries(route.turnouts)) {
    for(const peer of profile.coupled[name]||[name])assert.equal(route.turnouts[peer],position,route.id+' must reserve '+peer+' together with '+name);
  }
});
test('a route along one track locks the off-path crossover companion without a partial command',()=>{
  const r=rig(),route=r.request('htvCu','htvSpIA');r.advance(4000);
  assert.equal(route.state,'active');
  assert.ok(!route.flow.some(p=>p.id.startsWith('VX:Vx101:')),'Vx101 is the companion on the other track');
  assert.equal(route.turnouts.Vx100,'C');assert.equal(route.turnouts.Vx101,'C');
  for(const selected of ['Vx100','Vx101']) {
    const before=r.commands.length;
    assert.throws(()=>r.engine.manual(selected,'T'),/låst/);
    assert.equal(r.commands.length,before,'the whole group must be refused before either half moves');
  }
  assert.equal(r.field.turnouts.Vx100.position,'C');assert.equal(r.field.turnouts.Vx101.position,'C');
});
test('missing crossover companion feedback prevents GO and retains locks after recovery',()=>{
  const r=rig();r.field.setFault('turnout','Vx101');r.drain();
  const route=r.request('htvAu','htvSpIIIA');r.drain();r.advance(profile.commandTimeoutMs+1000);
  assert.equal(route.turnouts.Vx100,'T');assert.equal(route.turnouts.Vx101,'T');
  assert.equal(r.field.turnouts.Vx100.position,'T');assert.equal(r.engine.turnouts.Vx101.position,'unknown');
  assert.equal(route.state,'held');assert.equal(r.engine.routes.length,1);
  const signalAddresses=new Set(Object.values(profile.signals).map(s=>s.address));
  assert.ok(!r.commands.some(c=>signalAddresses.has(c.address)&&c.position==='C'),'no signal may receive GO when one half is unconfirmed');
  assert.throws(()=>r.engine.manual('Vx100','C'),/låst/);
  r.field.setFault('turnout','');r.drain();r.advance(1000);
  assert.equal(r.engine.turnouts.Vx101.position,'T');assert.equal(route.state,'held','a late report must not resume the route');
  r.engine.cancel(route.id);r.drain();r.advance(300);assert.equal(r.engine.routes.length,0);
});
test('unexpected movement of the off-path companion stops the protected route',()=>{
  const r=rig(),route=r.request('htvCu','htvSpIA');r.advance(4000);
  assert.equal(route.state,'active');
  // A field-side order represents another controller or a wrong physical state.
  r.field.accept(switchOrder(profile.turnouts.Vx101.address,'T'));r.drain();r.advance(300);
  assert.equal(route.state,'held');assert.equal(r.engine.routes.length,1);
  assert.ok(route.signals.every(name=>r.engine.signals[name].desired==='STOP'));
  assert.equal(r.engine.turnouts.Vx100.position,'C');assert.equal(r.engine.turnouts.Vx101.position,'T');
  const before=r.commands.length;assert.throws(()=>r.engine.manual('Vx100','T'),/låst/);assert.equal(r.commands.length,before);
});
test('route creation cannot move an occupied crossover companion on the other track',()=>{
  const r=rig();r.engine.manual('Vx100','T');r.drain();r.advance(300);
  r.field.setBlock('S101',true);r.drain();
  const before=r.commands.length;
  assert.throws(()=>r.request('htvCu','htvSpIA'),/Vx101|S101/);
  assert.equal(r.commands.length,before,'reject the whole request before any field order');
  assert.equal(r.engine.routes.length,0);
  assert.equal(r.field.turnouts.Vx100.position,'T');assert.equal(r.field.turnouts.Vx101.position,'T');
});
test('an occupied off-path companion already confirmed in the required position receives no order',()=>{
  const r=rig();r.field.setBlock('S101',true);r.drain();const before=r.commands.length;
  const route=r.request('htvCu','htvSpIA');r.drain();r.advance(4000);
  assert.equal(route.state,'active',route.reason);
  assert.ok(!r.commands.slice(before).some(c=>c.address===profile.turnouts.Vx101.address));
  assert.ok(!route.blocks.includes('S101'),'companion protection must not become a fictitious passage detector');
  assert.equal(route.turnouts.Vx101,'C');
});
test('occupancy during off-path companion movement holds the route without any GO permission',()=>{
  const r=rig();r.engine.manual('Vx100','T');r.drain();r.advance(300);
  const before=r.commands.length,route=r.request('htvCu','htvSpIA');r.drain();
  assert.equal(r.engine.turnouts.Vx101.position,'unknown');
  r.field.setBlock('S101',true);r.drain();r.advance(4000);
  assert.equal(route.state,'held');assert.match(route.reason,/Vx101|S101/);assert.equal(r.engine.routes.length,1);
  const signalAddresses=new Set(Object.values(profile.signals).map(s=>s.address));
  assert.ok(!r.commands.slice(before).some(c=>signalAddresses.has(c.address)&&c.position==='C'));
});
test('unknown or administratively blocked companion detection prevents the whole route movement',()=>{
  for(const fault of ['unknown','blocked']) {
    const r=rig();r.engine.manual('Vx100','T');r.drain();r.advance(300);
    if(fault==='unknown'){r.field.setFault('sensor','S101');r.drain();r.advance(profile.staleMs+1000);}
    else r.engine.blockTrack('S101',true);
    const before=r.commands.length;
    assert.throws(()=>r.request('htvCu','htvSpIA'),/Vx101|S101/);
    assert.equal(r.commands.length,before,fault+' must refuse before any turnout or signal command');assert.equal(r.engine.routes.length,0);
  }
});
test('compatible routes share a pending companion order without restarting either turnout',()=>{
  const r=rig();r.engine.manual('Vx100','T');r.drain();r.advance(300);const before=r.commands.length;
  const a=r.request('htvCu','htvSpIA'),b=r.request('htvAn','htvSpIIA');
  for(const name of ['Vx100','Vx101'])assert.equal(r.commands.slice(before).filter(c=>c.address===profile.turnouts[name].address).length,1,name+' receives only the first route order');
  r.drain();r.advance(4000);assert.equal(a.state,'active',a.reason);assert.equal(b.state,'active',b.reason);
});

for(const order of [0,1])test(`late crossover leaves the lower left arrival to the yard available, order ${order}`,()=>{
  const r=rig(),pairs=[['htvCu','htvSpIIA'],['htvCn','htvSpIIIA']];if(order)pairs.reverse();
  const a=r.request(...pairs[0]);r.advance(6500);assert.equal(a.state,'active',a.reason);
  const b=r.request(...pairs[1]);r.advance(6500);assert.equal(b.state,'active',b.reason);assert.equal(a.state,'active',a.reason);
  const through=r.engine.routes.find(x=>x.definitionId==='htvCu--htvSpIIA');
  assert.equal(through.turnouts.Vx100,'C');assert.equal(through.turnouts.Vx101,'C');
  assert.equal(through.turnouts.Vx110,'T');assert.equal(through.turnouts.Vx117,'T');assert.equal(through.turnouts.Vx102,undefined);
  for(const route of [a,b])r.field.startTrain(route.definitionId);
  r.advance(30000);assert.equal(r.engine.routes.length,0);assert.equal(r.field.trains.length,0);
});

for(const pairs of [
 [['htvAu','htvSpIC'],['htvSpIC','htvBu']],
 [['htvCu','htvSpIA'],['htvSpIA','htvSpIB'],['htvSpIB','htvSpIC'],['htvSpIC','htvBu']],
 [['htvBn','htvSpIIC'],['htvSpIIC','htvSpIIB'],['htvSpIIB','htvSpIIA'],['htvSpIIA','htvCn']]
])for(const reverse of [false,true])test(`continuous routes keep every previous section active: ${pairs[0][0]}, reverse build ${reverse}`,()=>{
 const r=rig(),established=[];
 for(const pair of reverse?[...pairs].reverse():pairs){
  const route=r.request(...pair);established.push(route);r.advance(6500);
  for(const previous of established)assert.equal(previous.state,'active',previous.label+': '+previous.reason);
 }
 assert.equal(r.engine.routes.length,pairs.length);
 for(const route of established)for(const name of route.signals)assert.equal(r.engine.signals[name].desired,'GO');
});

test('continuation does not waive an opposing guard or an unreserved GO report',()=>{
 const r=rig(),first=r.request('htvAu','htvSpIC');r.advance(6500);
 const target=profile.routes.find(x=>x.from==='htvSpIC'&&x.to==='htvBu').signals[0];
 r.engine.receive(signalReport(profile.signals[target].reportAddress,8));
 assert.equal(first.state,'held');assert.ok(first.signals.every(n=>r.engine.signals[n].desired==='STOP'));
});
test('failure in a continuation retains its reservations and removes upstream authority',()=>{
 const r=rig(),first=r.request('htvAu','htvSpIC');r.advance(6500);
 const next=r.request('htvSpIC','htvBu');r.advance(6500);
 r.field.setFault('signal',next.signals[0]);r.drain();r.advance(500);
 assert.equal(next.state,'held');assert.equal(r.engine.routes.length,2);
 // The upstream route may remain clear to a confirmed STOP boundary, but can
 // never use this failed route as authority for a GO destination signal.
 const boundary=next.signals[0];assert.equal(r.engine.signals[boundary].desired,'STOP');
 r.engine.signals[boundary].aspect='go';r.engine.tick();assert.equal(first.state,'held');
});
test('a train traverses four joined sections without holding or losing the earlier reservations',()=>{
 const r=rig(),pairs=[['htvCu','htvSpIA'],['htvSpIA','htvSpIB'],['htvSpIB','htvSpIC'],['htvSpIC','htvBu']];
 for(const pair of pairs){r.request(...pair);r.advance(6500);}
 r.field.startTrain('htvCu--htvBu');r.advance(60000);
 assert.equal(r.field.trains.length,0);assert.equal(r.engine.routes.length,0,JSON.stringify(r.engine.routes.map(x=>({label:x.label,state:x.state,reason:x.reason}))));
 assert.ok(!r.engine.events.some(e=>e.kind==='route-held'));
});

for(const removeFirst of [false,true])test(`cancelling one joined section preserves the other: remove upstream ${removeFirst}`,()=>{
 const r=rig(),a=r.request('htvAu','htvSpIC');r.advance(6500);const b=r.request('htvSpIC','htvBu');r.advance(6500);
 r.engine.cancel(removeFirst?a.id:b.id);r.drain();r.advance(1000);
 assert.equal(r.engine.routes.length,1);assert.equal(r.engine.routes[0].id,removeFirst?b.id:a.id);assert.equal(r.engine.routes[0].state,'active');
});

test('every available source join works for main and shunt controls, independent of panel location',{timeout:120000},()=>{
 const examples=new Map();
 const overlaps=(a,b)=>a.some(x=>b.includes(x));
 for(const a of profile.routes)for(const b of profile.routes){
  const end=a.source.nxButtons[1];
  if(a.kind!==b.kind||end!==b.source.nxButtons[0]||b.boundaries[0]?.sensor!==end)continue;
  if(overlaps(a.blocks.map(n=>profile.blocks[n].address),b.blocks.map(n=>profile.blocks[n].address))||overlaps(a.crossings,b.crossings)||overlaps(a.signals,b.signals))continue;
  if(Object.entries(a.turnouts).some(([n,p])=>b.turnouts[n]&&b.turnouts[n]!==p))continue;
  if(b.signals.some(n=>a.guardSignals.includes(n)&&n!==b.signals[0])||a.signals.some(n=>b.guardSignals.includes(n)))continue;
  examples.set(a.kind+':'+end,[a,b]);
 }
 assert.ok(examples.size>=10,'exercise distinct join locations, not just the reported example');
 for(const [key,defs]of examples){
  const r=rig();const a=r.request(defs[0].from,defs[0].to);r.advance(6500);assert.equal(a.state,'active',key+': '+a.reason);
  const b=r.request(defs[1].from,defs[1].to);r.advance(6500);
  assert.equal(a.state,'active',key+': '+a.reason);assert.equal(b.state,'active',key+': '+b.reason);
 }
});

for(const occupied of [false,true])test(`original start and final end cancel the entire extended route, occupied ${occupied}`,()=>{
 const r=rig(),a=r.request('htvCu','htvSpIA');r.advance(6500);
 const b=r.request('htvSpIA','htvSpIB');r.advance(6500);
 const c=r.request('htvSpIB','htvSpIC');r.advance(6500);
 const independent=r.request('htvCn','htvSpIIIA');r.advance(6500);
 if(occupied){r.field.setBlock(a.blocks[0],true);r.drain();}
 const before=r.commands.length;
 r.request('htvCu','htvSpIC');
 assert.ok([a,b,c].every(x=>x.cancelRequested),'all parts marked before field acknowledgement');
 assert.ok(r.commands.slice(before).every(c=>c.position==='T'),'cancellation must not establish the longer catalog route');
 r.drain();r.advance(1000);
 assert.equal(independent.state,'active');assert.ok(r.engine.routes.includes(independent));
 if(occupied){assert.ok(r.engine.routes.includes(a));r.field.setBlock(a.blocks[0],false);r.drain();r.advance(1000);}
 assert.deepEqual(r.engine.routes.map(x=>x.id),[independent.id]);
});

test('every connected line exit clears its outward signal only with the line detector reserved and free',()=>{
  const exits={htvBu:'U1',htvBn:'N1',htvAu:'U2',htvAn:'N2',htvCu:'U4',htvCn:'N4'};
  for(const [button,signal] of Object.entries(exits)){
    const defs=mainRoutes.filter(r=>r.to===button);
    assert(defs.length);
    const line=Object.values(profile.operatingControls.lines).find(l=>l.button===button);
    for(const def of defs){
      assert.equal(def.exitSignal,signal);assert.equal(def.signals.at(-1),signal);
      assert(!def.guardSignals.includes(signal));assert(def.blocks.includes(line.blocks[0]));
      assert.equal(def.signalEntries.at(-1).signal,signal);
      assert.equal(fieldProfile.protection[signal].alternatives.length,1);
      assert.deepEqual(fieldProfile.protection[signal].alternatives[0].blocks,line.blocks);
    }
    const def=defs.sort((a,b)=>a.blocks.length-b.blocks.length)[0];
    const r=rig();r.field.setBlock(line.blocks[0],true);r.drain();
    assert.throws(()=>r.request(def.from,def.to),/belagt/);
    assert.equal(r.engine.routes.length,0);
    r.field.setBlock(line.blocks[0],false);r.drain();
    const active=r.request(def.from,def.to);r.advance(6500);
    assert.equal(active.state,'active',active.reason);assert.equal(r.engine.signals[signal].aspect,'go');
    for(const guard of def.guardSignals)assert.equal(r.engine.signals[guard].aspect,'stop');
    r.request(def.from,def.to);r.drain();r.advance(300);
    assert.equal(r.engine.routes.length,0);assert.equal(r.engine.signals[signal].aspect,'stop');
    const fault=rig();fault.field.setFault('signal',signal);fault.drain();
    const failed=fault.request(def.from,def.to);fault.advance(10000);
    assert.notEqual(failed.state,'active');assert.equal(fault.engine.signals[signal].aspect,'stop');
    assert.equal(fault.engine.signals[def.signals[0]].aspect,'stop');
  }
  assert(shuntRoutes.every(r=>!r.exitSignal),'Shunting targets remain STOP boundaries');
  assert(mainRoutes.filter(r=>!Object.keys(exits).includes(r.to)).every(r=>!r.exitSignal));
});

test('Vagnsta can enter track 2b via the eastern crossover while Kungsfors holds track 1a',()=>{
  const r=rig();r.engine.operating.blockLine('AN',true);r.engine.operating.blockLine('BN',true);
  const green=r.request('htvAu','htvSpIC');r.advance(6500);
  assert.equal(green.state,'active',green.reason);
  const retained=structuredClone(green);
  const incoming=r.request('htvBu','htvSpIIB');
  assert.ok(incoming.variantId);assert.equal(incoming.turnouts.Vx165,'T');
  assert.ok(!incoming.blocks.some(n=>green.blocks.some(b=>profile.blocks[b].address===profile.blocks[n].address)));
  r.advance(6500);assert.equal(incoming.state,'active',incoming.reason);assert.equal(green.state,'active',green.reason);
  assert.deepEqual(green.blocks,retained.blocks);assert.deepEqual(green.turnouts,retained.turnouts);
  r.field.startTrain(incoming.definitionId);r.advance((incoming.passage.length+3)*850);
  assert.deepEqual(r.engine.routes.map(x=>x.id),[green.id]);assert.equal(green.state,'active');
});

test('all compiled alternatives establish, carry trains and release with independent field feedback',{timeout:120000},()=>{
  for(const alternative of profile.routeAlternatives){
    const r=rig();
    // Prefer this compiled candidate in the test, without bypassing live guards.
    r.engine.profile={...profile,routes:profile.routes.map(d=>d.id===alternative.id?alternative:d),routeAlternatives:[]};
    const route=r.request(alternative.from,alternative.to);r.advance(6500);
    assert.equal(route.state,'active',alternative.variantId+': '+route.reason);
    r.field.startTrain(route.definitionId);r.advance((route.passage.length+3)*850);
    assert.equal(r.engine.routes.length,0,alternative.variantId+': '+route.reason);
  }
});

test('blocked or occupied fallback refuses without orders or changes to the existing route',()=>{
  for(const blocked of [false,true]){
    const r=rig(),green=r.request('htvAu','htvSpIC');r.advance(6500);
    const alternative=profile.routeAlternatives.find(d=>d.id==='htvBu--htvSpIIB');
    const block=alternative.blocks.find(n=>!green.blocks.some(b=>profile.blocks[b].address===profile.blocks[n].address));
    if(blocked)r.engine.controls.blocked.push(block);else {r.field.setBlock(block,true);r.drain();}
    const before=r.commands.length;
    assert.throws(()=>r.request('htvBu','htvSpIIB'),/belagt|spärrat|reserverad/);
    assert.equal(r.commands.length,before);assert.deepEqual(r.engine.routes.map(x=>x.id),[green.id]);
    assert.equal(green.state,'active');
  }
});

test('alternative reservations persist their actual path and cancel by the original endpoint pair',()=>{
  const saved=new Map(),storage={load:(name,fallback)=>saved.get(name)||fallback,save:(name,data)=>saved.set(name,structuredClone(data)),event:()=>{}};
  const r=rig(storage);r.request('htvAu','htvSpIC');r.advance(6500);
  const alternative=r.request('htvBu','htvSpIIB');r.advance(6500);
  const restarted=new Engine(profile,{storage});
  const held=restarted.routes.find(x=>x.id===alternative.id);
  assert.equal(held.state,'held');assert.equal(held.variantId,alternative.variantId);assert.deepEqual(held.turnouts,alternative.turnouts);assert.deepEqual(held.blocks,alternative.blocks);
  r.request('htvBu','htvSpIIB');r.advance(1000);
  assert.equal(r.engine.routes.length,1);assert.equal(r.engine.routes[0].from,'htvAu');
});

for(const [from,to,kept] of [
 ['htvAu','htvSpIA',[['htvSpIA','htvSpIC']]],
 ['htvSpIB','htvSpIC',[['htvAu','htvSpIB']]],
 ['htvSpIA','htvSpIB',[['htvAu','htvSpIA'],['htvSpIB','htvSpIC']]],
])test(`partial cancellation inside one long route ${from} to ${to}`,()=>{
 const r=rig(),whole=r.request('htvAu','htvSpIC');r.advance(6500);
 const continuation=r.request('htvSpIC','htvBu');r.advance(6500);
 assert.equal(whole.state,'active');const before=r.commands.length;
 r.request(from,to);r.drain();r.advance(1000);
 assert.ok(r.commands.slice(before).every(c=>c.position==='T'),'only STOP orders, no turnout movement or new GO');
 assert.deepEqual(r.engine.routes.filter(x=>x.id!==continuation.id).map(x=>[x.from,x.to]),kept);
 assert.ok(r.engine.routes.every(x=>x.state==='active'),JSON.stringify(r.engine.routes.map(x=>({label:x.label,state:x.state,reason:x.reason}))));
 assert.equal(continuation.state,'active');
});

test('partial cancellation refuses occupied or stale long routes without changing reservations',()=>{
 for(const mode of ['occupied','stale','preparing']){
  const r=rig(),whole=r.request('htvAu','htvSpIC');if(mode!=='preparing')r.advance(6500);
  if(mode==='occupied'){r.field.setBlock(whole.blocks[0],true);r.drain();}
  if(mode==='stale')r.engine.blocks[whole.blocks[0]].updatedAt=0;
  const before=r.commands.length;
  assert.throws(()=>r.request('htvAu','htvSpIA'),/Delåtertagning/);
  assert.deepEqual(r.engine.routes.map(x=>x.id),[whole.id]);assert.equal(r.commands.length,before);
 }
});

test('partial cancellation saves the exact remaining locks and restores them held on restart',()=>{
 const saved=new Map(),storage={load:(k,d)=>structuredClone(saved.get(k)||d),save:(k,v)=>saved.set(k,structuredClone(v)),event:()=>{}};
 const r=rig(storage);r.request('htvAu','htvSpIC');r.advance(6500);
 r.request('htvAu','htvSpIA');r.drain();r.advance(1000);
 const remaining=r.engine.routes[0],restored=new Engine(profile,{storage});
 assert.equal(remaining.from,'htvSpIA');assert.equal(restored.routes.length,1);
 assert.deepEqual(restored.routes[0].blocks,remaining.blocks);assert.deepEqual(restored.routes[0].turnouts,remaining.turnouts);
 assert.equal(restored.routes[0].state,'held');
});

test('failed split persistence preserves the original whole reservation and stops signals',()=>{
 let fail=false;const storage={load:(k,d)=>d,save:()=>{if(fail)throw Error('disk full');},event:()=>{}};
 const r=rig(storage),whole=r.request('htvAu','htvSpIC');r.advance(6500);fail=true;
 assert.throws(()=>r.request('htvAu','htvSpIA'),/spara lås/);
 assert.deepEqual(r.engine.routes.map(x=>x.id),[whole.id]);assert.equal(whole.state,'held');
 assert.ok(whole.signals.every(n=>r.engine.signals[n].desired==='STOP'));
});

test('partial cancellation works at reviewed boundaries in both directions for main and shunt routes',{timeout:120000},()=>{
 const examples=new Map();
 for(const def of profile.routes)for(const button of Object.keys(profile.buttons)){
  const parts=splitRouteAt(profile,def,button);if(!parts)continue;
  const direction=Math.sign(def.flow.at(-1).x2-def.flow[0].x1);
  examples.set(def.kind+':'+button+':'+direction,{def,parts});
 }
 assert.ok(examples.size>=10);assert.ok([...examples.values()].some(x=>x.def.kind==='shunt'));
 for(const [key,{def,parts}]of examples){
  const r=rig(),whole=r.request(def.from,def.to);r.advance(6500);assert.equal(whole.state,'active',key);
  r.request(parts[0].from,parts[0].to);r.drain();r.advance(1000);
  assert.equal(r.engine.routes.length,1,key);assert.equal(r.engine.routes[0].definitionId,parts[1].id,key);
  assert.equal(r.engine.routes[0].state,'active',key+': '+r.engine.routes[0].reason);
 }
});

test('partial cancellation across joined reservations keeps both unselected outer sections',()=>{
 const r=rig();r.request('htvAu','htvSpIB');r.advance(6500);r.request('htvSpIB','htvBu');r.advance(6500);
 r.request('htvSpIA','htvSpIC');r.drain();r.advance(1000);
 assert.deepEqual(r.engine.routes.map(x=>[x.from,x.to]),[['htvAu','htvSpIA'],['htvSpIC','htvBu']]);
 assert.ok(r.engine.routes.every(x=>x.state==='active'));
});

test('split reservation retains all locks until new STOP feedback and occupancy clearance',()=>{
 const r=rig(),whole=r.request('htvAu','htvSpIC');r.advance(6500);
 r.request('htvAu','htvSpIA');
 assert.equal(r.engine.routes.length,2,'no replies yet');
 assert.deepEqual(new Set(r.engine.routes.flatMap(x=>x.blocks)),new Set(whole.blocks));
 const stopping=r.engine.routes.find(x=>x.cancelRequested),remaining=r.engine.routes.find(x=>!x.cancelRequested);
 r.field.setBlock(stopping.blocks[0],true);r.drain();r.advance(1000);
 assert.ok(r.engine.routes.includes(stopping));assert.equal(remaining.state,'active');
 r.field.setBlock(stopping.blocks[0],false);r.drain();r.advance(1000);
 assert.deepEqual(r.engine.routes,[remaining]);
});

test('an alternative path is split only where both reviewed parts match that actual path',()=>{
 const r=rig();r.request('htvAu','htvSpIC');r.advance(6500);
 const alt=r.request('htvBu','htvSpIIA');r.advance(6500);assert(alt.variantId);assert.equal(alt.state,'active');
 const parts=splitRouteAt(profile,alt,'htvSpIIB');assert(parts);
 r.request(parts[0].from,parts[0].to);r.drain();r.advance(1000);
 const remaining=r.engine.routes.find(x=>x.from==='htvSpIIB');assert(remaining);assert.equal(remaining.state,'active');
 assert.deepEqual(remaining.flow,parts[1].flow);
 assert.ok(r.engine.routes.every(x=>x.state==='active'));
});

test('route target preview is read-only and follows live occupancy and locks',()=>{
 const r=rig(),before=JSON.stringify(r.engine.snapshot()),commands=r.commands.length;
 const targets=()=>r.engine.routeTargets('htvAu','main');
 assert.ok(targets().some(x=>x.id==='htvSpIC'&&x.action==='build'));
 assert.equal(JSON.stringify(r.engine.snapshot()),before);assert.equal(r.commands.length,commands);
 const def=profile.routes.find(x=>x.from==='htvAu'&&x.to==='htvSpIC');
 r.field.setBlock(def.blocks.at(-1),true);r.drain();
 assert.ok(!targets().some(x=>x.id==='htvSpIC'));
 r.field.setBlock(def.blocks.at(-1),false);r.drain();
 assert.ok(targets().some(x=>x.id==='htvSpIC'));
 r.engine.connection(false);assert.deepEqual(targets(),[]);
});
test('route target preview preserves full and partial cancellation targets without splitting live routes',()=>{
 const r=rig(),whole=r.request('htvAu','htvSpIC');r.advance(6500);
 r.request('htvSpIC','htvBu');r.advance(6500);
 const before=JSON.stringify(r.engine.snapshot()),commands=r.commands.length;
 const targets=r.engine.routeTargets('htvAu','main');
 for(const id of ['htvSpIA','htvSpIB','htvSpIC','htvBu'])assert.ok(targets.some(x=>x.id===id&&x.action==='cancel'),id);
 assert.equal(JSON.stringify(r.engine.snapshot()),before);assert.equal(r.commands.length,commands);
 assert.equal(r.engine.routes[0],whole);
 assert.ok(r.engine.routeTargets('htvSpIA','main').some(x=>x.id==='htvSpIB'&&x.action==='cancel'));
});
test('route target preview includes a free alternative and rejects disabled or mixed kinds',()=>{
 const r=rig();r.request('htvAu','htvSpIC');r.advance(6500);
 assert.ok(r.engine.routeTargets('htvBu','main').some(x=>x.id==='htvSpIIA'));
 assert.deepEqual(r.engine.routeTargets('htvBu','shunt'),[]);
 assert.deepEqual(r.engine.routeTargets('missing','main'),[]);
 const shunt=shuntRoutes.find(d=>{try{r.engine.planRequest(d.from,d.to);return true;}catch{return false;}});assert(shunt);
 assert.ok(r.engine.routeTargets(shunt.from,'shunt').every(x=>x.id.startsWith('tvv')));
 const local=structuredClone(profile),engine=new Engine(local);
 const def=local.routes.find(x=>x.from==='htvBu'&&x.to==='htvSpIIA');def.adminDisabled=true;
 engine.connected=r.engine.connected;engine.connectionAt=r.engine.connectionAt;engine.now=r.engine.now;
 engine.blocks=r.engine.blocks;engine.signals=r.engine.signals;engine.turnouts=r.engine.turnouts;
 assert.ok(!engine.routeTargets('htvBu','main').some(x=>x.id==='htvSpIIA'));
});
