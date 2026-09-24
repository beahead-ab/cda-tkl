import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PanelIndications} from '../src/panel-indications.mjs';
import {Engine} from '../src/engine.mjs';
import {Field} from '../src/field.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const source=read('public/data/indications.json'),profile=read('profiles/charlottendal-network.json');
const model=new PanelIndications(source,profile);
const ready=()=>({connection:'connected',storageFault:null,serverTime:100000,routes:[],blocks:Object.fromEntries(Object.keys(profile.blocks).map(n=>[n,{occupied:false,updatedAt:100000}]))});
test('all four source OR rules, 80 NX conditions, 13 sensors and internal lamps are preserved',()=>{
  assert.equal(source.indicators.length,4);assert.deepEqual(source.indicators.map(i=>i.conditions.length),[33,35,19,6]);
  assert.equal(source.indicators.flatMap(i=>i.conditions).filter(c=>c.kind==='nx').length,80);
  assert.equal(source.indicators.flatMap(i=>i.conditions).filter(c=>c.kind==='sensor').length,13);
  assert.deepEqual(model.definitions.map(d=>d.conditions.filter(c=>c.connected).length),[33,35,19,2]);
  assert.deepEqual(source.indicators.map(i=>Object.values(i.lamps).map(l=>l.sourceSystem)),[['IS251','IS252'],['IS253','IS254'],['IS255','IS256'],['IS257','IS258']]);
  execFileSync(process.execPath,['scripts/make-indications.mjs','--check'],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
  assert.throws(()=>new PanelIndications(source,{...profile,sourceHash:'different'}),/källa/);
});
test('each source sensor alone satisfies OR, including aliases and stale AND text in V3/V4',()=>{
  for(const def of model.definitions)for(const condition of def.conditions.filter(c=>c.kind==='sensor')) {
    const state=ready();for(const name of condition.blocks)state.blocks[name].occupied=true;
    const before=JSON.stringify(state),result=model.snapshot(state)[def.name];
    assert.equal(result.value,true,def.name+' '+condition.id);assert.equal(result.derived,true);
    assert.equal(JSON.stringify(state),before,'inspection must never mutate plant state or reservations');
  }
});
test('each covered NX contributes only after clear; establishing, held and cancelling remain unknown',()=>{
  for(const def of model.definitions)for(const condition of def.conditions.filter(c=>c.kind==='nx'&&c.connected)) {
    for(const phase of ['active','traversing','setting','establishing','clearing','held','cancelling']) {
      const state=ready();state.routes=[{nxIds:[condition.id],state:phase}];
      assert.equal(model.snapshot(state)[def.name].value,['active','traversing'].includes(phase)?true:null,def.name+' '+condition.label+' '+phase);
    }
  }
  const state=ready(),result=model.snapshot(state);
  assert.deepEqual(['V1','V2','V3'].map(n=>result[n].value),[false,false,false]);
});
test('V4 never treats four unconnected NX as inactive, even after its detector clears',()=>{
  const state=ready();let result=model.snapshot(state).V4;
  assert.equal(result.value,null);assert.equal(result.known,2);assert.equal(result.total,6);assert.equal(result.complete,false);
  state.blocks.SLI.occupied=true;result=model.snapshot(state).V4;
  assert.equal(result.value,true);assert.equal(result.complete,false);
  state.blocks.SLI.occupied=false;assert.equal(model.snapshot(state).V4.value,null);
  state.routes=[{state:'active',nxIds:[source.indicators[3].conditions[0].id]}];
  assert.equal(model.snapshot(state).V4.value,null,'an unconfigured NX cannot be supplied by a forged reservation');
});
test('disconnection, stale and inconsistent sensor aliases do not produce an inactive indication',()=>{
  const state=ready();state.blocks.S100.occupied=true;
  state.blocks.S100.updatedAt=state.serverTime-profile.staleMs-1;assert.equal(model.snapshot(state).V1.value,null);
  state.blocks.S100.updatedAt=state.serverTime+1;assert.equal(model.snapshot(state).V1.value,null);
  state.blocks.S100={occupied:false,updatedAt:100000};state.blocks.S103.occupied=true;
  assert.equal(model.snapshot(state).V1.value,null,'one alias disagreeing with its shared report is unknown');
  for(const condition of model.definitions[0].conditions.filter(c=>c.kind==='sensor'))for(const name of condition.blocks)state.blocks[name].occupied=true;
  state.connection='disconnected';assert.ok(Object.values(model.snapshot(state)).every(s=>s.value===null&&s.known===0));
  state.connection='connected';state.storageFault='disk';assert.ok(Object.values(model.snapshot(state)).every(s=>s.value===null));
  const inverted=structuredClone(profile);inverted.blocks.S100.activeMeansOccupied=false;
  const inverse=new PanelIndications(source,inverted);assert.equal(inverse.snapshot(ready()).V1.value,true,'SENSOR_ACTIVE follows reported polarity, not occupation label');
});
test('indications follow an actual wire-driven route without issuing commands or releasing held locks',()=>{
  let now=100000;const queue=[],commands=[],field=new Field(read('profiles/simulator-network.json'),{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{now:()=>now,send:b=>{queue.push(['out',b]);commands.push(b);}});
  field.on('frame',b=>queue.push(['in',b]));
  const drain=()=>{let remaining=20000;while(queue.length&&remaining--){const [dir,b]=queue.shift();if(dir==='out')field.accept(b);else engine.receive(b);}assert.ok(remaining>0);};
  const advance=ms=>{for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();}};
  engine.connection(true);field.allReports();drain();
  const route=engine.request('htvCu','htvSpIA');assert.equal(model.snapshot(engine.snapshot()).V1.warning.value,true);advance(6500);assert.equal(route.state,'active');
  const output=model.snapshot(engine.snapshot());assert.equal(output.V1.value,true);
  engine.hold(route,'test held');const before=commands.length;
  assert.equal(model.snapshot(engine.snapshot()).V1.value,null);assert.equal(model.snapshot(engine.snapshot()).V1.warning.value,true);assert.equal(commands.length,before);assert.equal(engine.routes.length,1);
  engine.cancel(route.id);drain();advance(100);assert.equal(engine.routes.length,0);assert.equal(model.snapshot(engine.snapshot()).V1.value,false);assert.equal(model.snapshot(engine.snapshot()).V1.warning.value,false);
  engine.connection(false);assert.ok(Object.values(model.snapshot(engine.snapshot())).every(s=>s.value===null));
});
