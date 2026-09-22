import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { decode, sensorReport } from '../src/protocol.mjs';
import { RoutePolicy } from '../src/route-policy.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'), fieldProfile=read('profiles/simulator-network.json'), source=read('public/data/operations-source.json');
function rig() {
  let now=100000;const queue=[],commands=[];
  const field=new Field(fieldProfile,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{now:()=>now,send:b=>{queue.push(['order',b]);commands.push(decode(b));}});
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
  const policy=new RoutePolicy(source);
  assert.equal(policy.allowed().length,210);
  assert.equal(profile.routes.length,192);assert.equal(profile.excluded.length,18);
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
  for(const def of profile.routes){
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
