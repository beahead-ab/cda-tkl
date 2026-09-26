import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Engine} from '../src/engine.mjs';
import {Field} from '../src/field.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'),plant=read('profiles/simulator-network.json');
function memory(){const files=new Map();return {files,load:(n,d)=>structuredClone(files.get(n)||d),save:(n,d)=>files.set(n,structuredClone(d)),event:()=>{}};}
function rig(storage=memory()){
  let now=100000;const queue=[],commands=[];
  const field=new Field(plant,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{storage,now:()=>now,send:b=>{commands.push(b);queue.push(['order',b]);}});
  field.on('frame',b=>queue.push(['report',b]));
  const drain=()=>{let guard=20000;while(queue.length&&guard--){const [k,b]=queue.shift();if(k==='order')field.accept(b);else engine.receive(b);}assert.ok(guard>0);};
  const advance=ms=>{for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();}};
  engine.connection(true);field.allReports();drain();return {engine,field,commands,storage,drain,advance};
}
test('handover changes durable software authority without any fictional field report or order',()=>{
  const r=rig(),before=structuredClone({blocks:r.engine.blocks,points:r.engine.turnouts,signals:r.engine.signals}),commands=r.commands.length,revision=r.engine.operating.snapshot();
  r.field.setBlock('SG51',true);r.drain();before.blocks=structuredClone(r.engine.blocks);
  r.engine.yard.setOwner('ranger');assert.equal(r.storage.files.get('controls.json').yard.owner,'ranger');
  assert.equal(r.commands.length,commands);assert.deepEqual({blocks:r.engine.blocks,points:r.engine.turnouts,signals:r.engine.signals},before);
  assert.throws(()=>r.engine.operating.checkCommand(revision),/ändrats/);
  assert.throws(()=>r.engine.manual('Vx114','T'),/rangerställverket/);
  r.engine.manual('Vx114','T',{operator:'ranger'});r.drain();r.advance(200);
  assert.equal(r.engine.turnouts.Vx114.position,'T');
  r.engine.yard.setOwner('tkl');r.engine.manual('Vx114','C');r.drain();r.advance(200);
  assert.equal(r.engine.turnouts.Vx114.position,'C');assert.equal(r.engine.blocks.SG51.occupied,true);
  assert.throws(()=>r.engine.manual('Vx114','T',{operator:'ranger'}),/inte överlämnad/);
});
test('TKL retains access to each of 11–13 from both sides; ranger cannot break these route locks',()=>{
  for(const target of ['htvSpIIIA','htvSpIVA','htvSpVA'])for(const from of ['htvCu','htvBu'])for(const outbound of [false,true]){
    const r=rig();r.engine.yard.setOwner('ranger');
    const route=r.engine.request(...(outbound?[target,from]:[from,target]));r.advance(6500);assert.equal(route.state,'active',route.reason);
    const locked=Object.keys(route.turnouts).find(n=>profile.yardArea.turnouts.includes(n));assert.ok(locked);
    const before=r.commands.length;assert.throws(()=>r.engine.manual(locked,'T',{operator:'ranger'}),/låst|spåravsnitt/);assert.equal(r.commands.length,before);
    assert.throws(()=>r.engine.yard.setOwner('tkl'),/tågvägar/);assert.equal(r.engine.yard.delegated,true);
    r.engine.cancel(route.id);r.drain();r.advance(200);assert.equal(r.engine.routes.length,0);
    r.engine.yard.setOwner('tkl');assert.equal(r.engine.yard.delegated,false);
  }
});
test('delegation blocks internal shunting but leaves external traffic eligible',()=>{
  const r=rig();r.engine.yard.setOwner('ranger');
  assert.throws(()=>r.engine.request('tvv3/5','tvv6/9'),/överlämnad/);
  const route=r.engine.request('htvCu','htvSpIA');r.advance(6500);assert.equal(route.state,'active',route.reason);
  for(const boundary of ['Vx112','Vx131','Vx154'])assert.ok(!profile.yardArea.turnouts.includes(boundary));
  for(const block of ['SG51','SG52','SG53','SG54','SLI','SLII','SLIII','SVI',...Array.from({length:9},(_,i)=>'Slokstall'+(i+1))])assert.ok(profile.yardArea.blocks.includes(block),block);
  assert.ok(!profile.yardArea.blocks.includes('SIA'));
});
test('restart, connection changes and panel reset retain delegation; changed profiles cannot inherit it',()=>{
  const r=rig();r.engine.yard.setOwner('ranger');r.engine.connection(false);assert.equal(r.engine.yard.delegated,true);
  const restarted=new Engine(profile,{storage:r.storage});assert.equal(restarted.yard.delegated,true);assert.equal(restarted.yard.changeStatus().allowed,false);
  const changed=structuredClone(profile);changed.yardArea.turnouts.pop();assert.throws(()=>new Engine(changed,{storage:r.storage}),/Profilen har ändrats/);
  r.engine.connection(true);r.field.allReports();r.drain();r.engine.resetPanel();r.drain();r.advance(1000);assert.equal(r.engine.yard.delegated,true);
});
test('failed persistence cannot announce transfer; missing reports and reservations prohibit transfer',()=>{
  const r=rig();r.storage.save=()=>{throw Error('disk full');};assert.throws(()=>r.engine.yard.setOwner('ranger'),/spara/);assert.equal(r.engine.yard.delegated,false);assert.ok(r.engine.storageFault);
  for(const change of [x=>{x.engine.connected=false;},x=>{x.engine.turnouts.Vx112.position='unknown';},x=>{x.engine.blocks.SG51.updatedAt=0;},x=>{x.engine.signals[profile.yardArea.signals[0]].aspect='go';},x=>{x.engine.controls.programming.reserved=true;},x=>{x.engine.permission(profile.yardArea.signals[0],'STOP');},x=>{x.engine.turnouts.Vx112.desired='T';},x=>{x.engine.manual('Vx114','T');}]){
    const x=rig();change(x);assert.throws(()=>x.engine.yard.setOwner('ranger'));assert.equal(x.engine.yard.delegated,false);
  }
  const x=rig();x.engine.yard.setOwner('ranger');assert.throws(()=>x.engine.operating.setProgramming(true),/rangerbangården/);
});
