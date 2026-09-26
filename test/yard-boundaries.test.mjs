import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileYardBoundaries,boundaryCommandReason} from '../src/yard-boundaries.mjs';
import {Engine} from '../src/engine.mjs';
import {Field} from '../src/field.mjs';
import {decode} from '../src/protocol.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const panel=read('public/data/panel.json'),source=read('public/data/operations-source.json');
const profile=read('profiles/charlottendal-network.json'),plant=read('profiles/simulator-network.json');
function rig(){
  let now=100000;const queue=[],commands=[];
  const field=new Field(plant,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{now:()=>now,send:b=>{commands.push(decode(b));queue.push(['order',b]);}});
  field.on('frame',b=>queue.push(['report',b]));
  const drain=()=>{let guard=20000;while(queue.length&&guard--){const [k,b]=queue.shift();if(k==='order')field.accept(b);else engine.receive(b);}assert.ok(guard>0);};
  const advance=()=>{now+=200;field.tick();drain();engine.tick();drain();};
  engine.connection(true);field.allReports();drain();
  return {engine,field,commands,drain,advance};
}
test('all three reviewed boundary settings disconnect the yard from TKL in the source topology',()=>{
  const rules=compileYardBoundaries(panel,source);
  assert.deepEqual(Object.fromEntries(Object.entries(rules).map(([n,r])=>[n,r.rangerPositions])),{Vx112:['T'],Vx131:['T'],Vx154:['C']});
  for(const [name,rule] of Object.entries(rules))for(const position of ['C','T']){
    const legs=rule.ports[position],connected=legs.some(l=>rule.tklLegs.includes(l))&&legs.some(l=>rule.yardLegs.includes(l));
    assert.equal(boundaryCommandReason(rules,[name],position,'ranger')===null,!connected);
    assert.equal(boundaryCommandReason(rules,[name],position,'tkl'),null,'TKL may both open and close');
  }
  assert.deepEqual(profile.yardBoundaries,rules);
});
test('changed XML source or turnout ports require a new boundary review',()=>{
  assert.throws(()=>compileYardBoundaries(panel,{...source,sourceHash:'different'}),/underlag/);
  for(const edit of [p=>p.turnouts.TO12.continuing=4,p=>p.turnouts.TO26.cb='T116',p=>p.turnouts.TO20.name2='Vx144',p=>p.segs.find(s=>s.id==='T117').t1='TURNOUT_C']){
    const p=structuredClone(panel);edit(p);assert.throws(()=>compileYardBoundaries(p,source),/anslutning/);
  }
});
test('TKL can command both directions individually while preserving all original group guards',()=>{
  for(const name of Object.keys(profile.yardBoundaries))for(const position of ['C','T']){
    const r=rig(),policy=profile.manualPolicies.byTurnout[name],original=profile.manualPolicies.rules.find(p=>p.button===policy.button);
    assert.deepEqual(policy.blocks,original.blocks);assert.deepEqual(policy.signals,original.signals);assert.deepEqual(policy.inactiveNX,original.inactiveNX);assert.deepEqual(policy.guardTurnouts,original.names);
    const before=r.commands.length;r.engine.manual(name,position);assert.equal(r.commands.length,before+1);
    assert.equal(r.commands.at(-1).address,profile.turnouts[name].address);
    r.drain();r.advance();assert.equal(r.engine.turnouts[name].position,position);
    for(const peer of policy.guardTurnouts.filter(n=>n!==name))assert.equal(r.engine.turnouts[peer].position,'C','no guessed companion order');
  }
});
test('ranger may only restore the boundary, with physical inversion applied once',()=>{
  for(const [name,position] of [['Vx112','T'],['Vx131','T'],['Vx154','C']]){
    const r=rig(),other=position==='C'?'T':'C';
    r.engine.manual(name,other);r.drain();r.advance();r.engine.yard.setOwner('ranger');
    const before=r.commands.length,state=structuredClone(r.engine.turnouts);
    assert.throws(()=>r.engine.manual(name,other,{operator:'ranger'}),/endast TKL/);
    assert.equal(r.commands.length,before);assert.deepEqual(r.engine.turnouts,state);
    r.engine.manual(name,position,{operator:'ranger'});
    assert.equal(r.commands.length,before+1);
    assert.equal(r.commands.at(-1).position,name==='Vx131'?'C':position,'131 is electrically inverted');
    r.drain();r.advance();assert.equal(r.engine.turnouts[name].position,position);
  }
});
test('ranger restoration never overrides route locks, occupancy, unknown peers, blocks or stop',()=>{
  for(const name of Object.keys(profile.yardBoundaries))for(const change of [
    r=>{r.field.setBlock(profile.turnouts[name].block,true);r.drain();},
    r=>r.engine.blockTrack(profile.turnouts[name].block,true),
    r=>{const peer=profile.manualPolicies.byTurnout[name].guardTurnouts.find(n=>n!==name);r.engine.turnouts[peer].position='unknown';},
    r=>{const peer=profile.manualPolicies.byTurnout[name].guardTurnouts.find(n=>n!==name);r.engine.routes.push({turnouts:{[peer]:'C'},blocks:[]});},
    r=>{r.engine.controls.stopAll=true;},
    r=>{r.engine.connected=false;},
    r=>{r.engine.storageFault='disk full';}
  ]){
    const r=rig();r.engine.yard.setOwner('ranger');change(r);const before=r.commands.length;
    assert.throws(()=>r.engine.manual(name,profile.yardBoundaries[name].rangerPositions[0],{operator:'ranger'}));
    assert.equal(r.commands.length,before);
  }
});
test('unknown operators, unconnected yard points and mixed groups fail before any order',()=>{
  const r=rig(),before=r.commands.length;
  assert.throws(()=>r.engine.manual('Vx112','T',{operator:'unknown'}),/behörighet/);
  assert.throws(()=>r.engine.manual('Vx170','C',{operator:'ranger'}),/inte ansluten/);
  assert.ok(boundaryCommandReason(profile.yardBoundaries,['Vx112','Vx154'],'T','ranger'));
  assert.ok(boundaryCommandReason(profile.yardBoundaries,[],'T','ranger'));
  assert.equal(r.commands.length,before);
});
