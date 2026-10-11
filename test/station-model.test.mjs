import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildStationModel,relatedStationObjects,stationLiveValue} from '../public/station-model.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const config=read('profiles/charlottendal-network.json'),index=read('public/data/source/index.json'),panel=read('public/data/panel.json');
const build=(c=config)=>buildStationModel({config:c,index,panel});
test('inventory preserves all source records including internal namespaces and unplaced objects without commissioning hardware',()=>{
  const model=build();
  for(const source of index.records.filter(r=>['turnouts','sensors','blocks','signals'].includes(r.category)))assert.ok(model.objects.some(o=>o.sources.some(s=>s.key===source.key)),source.key);
  assert.ok(model.objects.every(o=>o.physicalVerified===false));
  const find=id=>model.objects.find(o=>o.id===id);
  assert.equal(find('turnouts:Vx124').geometry.length,0);
  assert.equal(find('turnouts:Vx124').bindings.length,0);
  assert.notEqual(find('turnouts:Vx140').sources[0].system,find('turnouts:Vxi140').sources[0].system);
  assert.match(find('turnouts:Vx140').bindingEvidence,/överensstämmer med XML/);
  assert.equal(find('turnouts:Vx140').moduleReference.channel,1);
  assert.match(find('signals:1\/1').bindingEvidence,/Provbindning/);
  assert.match(find('blocks:S140').bindingEvidence,/Provbindning/);
});
test('shared source detector remains one sensor with all block aliases, with read-only group relations',()=>{
  const model=build(),sensor=model.objects.find(o=>o.id==='sensors:slS140');
  assert.equal(model.objects.filter(o=>o.id===sensor.id).length,1);
  assert.ok(sensor.bindings.length>1);
  const related=relatedStationObjects(model,sensor.id);
  for(const b of sensor.bindings)assert.ok(related.has('blocks:'+b.block));
  const group=model.objects.find(o=>o.id==='groups:vxv140/141/142/143');assert.equal(group.rule.status,'unresolved');
  for(const name of ['Vx140','Vx141','Vx142','Vx143'])assert.ok(relatedStationObjects(model,group.id).has('turnouts:'+name));
});
test('local override is not presented as an XML-verified address and wrong source versions are rejected',()=>{
  const altered=structuredClone(config);altered.turnouts.Vx140.address=500;altered.turnouts.Vx140.provenance='Operator override; physical binding requires commissioning.';
  assert.match(build(altered).objects.find(o=>o.id==='turnouts:Vx140').bindingEvidence,/Lokal överstyrning/);
  altered.sourceHash='different';assert.throws(()=>build(altered),/källversioner/);
});
test('live indications require fresh reports, respect detector polarity and use actual lower-case signal aspects',()=>{
  const state={serverTime:10000,connection:'connected',blocks:{A:{updatedAt:9990,occupied:true}},signals:{S:{updatedAt:9990,aspect:'go'}}};
  const sensor={kind:'sensors',bindings:[{block:'A',activeMeansOccupied:false}]};
  assert.equal(stationLiveValue(sensor,state,true,7000).text,'Rapporterad inaktiv');
  const signal={kind:'signals',name:'S',bindings:[{}]};assert.equal(stationLiveValue(signal,state,true,7000).text,'Rapporterat kör');
  // Växlar och signaler gäller tills förbindelsen bryts (0.77.0); ingångarna åldras.
  state.serverTime=100000;assert.equal(stationLiveValue(signal,state,true,7000).text,'Rapporterat kör');assert.equal(stationLiveValue(sensor,state,true,7000).tone,'unknown');
  state.connectionAt=9995;assert.equal(stationLiveValue(signal,state,true,7000).tone,'unknown');
  state.connection='disconnected';assert.equal(stationLiveValue(sensor,state,true,7000).tone,'unknown');
});
