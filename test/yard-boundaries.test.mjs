import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileYardBoundaries,boundaryCommandReason} from '../src/yard-boundaries.mjs';
import {correctPanel} from '../public/panel-corrections.js';
import {Engine} from '../src/engine.mjs';
import {Field} from '../src/field.mjs';
import {decode} from '../src/protocol.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const imported=read('public/data/panel.json'),panel=correctPanel(imported),source=read('public/data/operations-source.json');
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
const closed={Vx102:'C',Vx103:'T',Vx112:'C',Vx131:'C',Vx132:'C',Vx144:'C',Vx154:'C',Vx164:'T',Vx172:'T'};
test('every reviewed boundary has one position that keeps the yard and TKL apart in the source topology',()=>{
  const rules=compileYardBoundaries(panel,source);
  assert.deepEqual(Object.fromEntries(Object.entries(rules).map(([n,r])=>[n,r.rangerPositions[0]])),closed);
  for(const [name,rule] of Object.entries(rules))for(const position of ['C','T']){
    const legs=rule.ports[position],connected=legs.some(l=>rule.tklLegs.includes(l))&&legs.some(l=>rule.yardLegs.includes(l));
    assert.equal(boundaryCommandReason(rules,[name],position,'ranger')===null,!connected);
    assert.equal(boundaryCommandReason(rules,[name],position,'tkl'),null,'TKL may both open and close');
  }
  assert.deepEqual(profile.yardBoundaries,rules);
});
test('the reviewed 3d–172 connection is joined only where the geometry meets, and only once',()=>{
  assert.equal(imported.turnouts.TO47.cc,null);assert.equal(panel.turnouts.TO47.cc,'T26');
  assert.deepEqual([panel.segs.find(s=>s.id==='T26').c1,panel.segs.find(s=>s.id==='T26').t1],['TO47','TURNOUT_C']);
  assert.throws(()=>correctPanel(panel),/stämmer inte/,'a panel that already has it must be looked at again');
  const moved=structuredClone(imported);moved.turnouts.TO47.ccx+=10;assert.throws(()=>correctPanel(moved),/stämmer inte/);
  assert.throws(()=>compileYardBoundaries(imported,source),/anslutning/,'without the correction 172 is not a boundary');
});
test('changed XML source or turnout ports require a new boundary review',()=>{
  assert.throws(()=>compileYardBoundaries(panel,{...source,sourceHash:'different'}),/underlag/);
  for(const edit of [p=>p.turnouts.TO12.continuing=4,p=>p.turnouts.TO26.cb='T116',p=>p.turnouts.TO20.name2='Vx144',p=>p.segs.find(s=>s.id==='T117').t1='TURNOUT_C',p=>p.turnouts.TO5.ca='T14']){
    const p=structuredClone(panel);edit(p);assert.throws(()=>compileYardBoundaries(p,source),/anslutning/);
  }
});
test('TKL can command both directions individually while preserving all original group guards',()=>{
  for(const name of Object.keys(profile.yardBoundaries))for(const position of ['C','T']){
    const r=rig(),policy=profile.manualPolicies.byTurnout[name],original=profile.manualPolicies.rules.find(p=>p.button===policy.button);
    assert.deepEqual(policy.blocks,original.blocks);assert.deepEqual(policy.signals,original.signals);assert.deepEqual(policy.inactiveNX,original.inactiveNX);
    // The pairs 102/112, 131/132 and 144/154 keep the whole button's guards; 103 and 164 have their own button.
    if(policy.reviewedBoundary)assert.deepEqual(policy.guardTurnouts,original.names);else assert.deepEqual(original.names,[name]);
    const before=r.commands.length;r.engine.manual(name,position);assert.equal(r.commands.length,before+1);
    assert.equal(r.commands.at(-1).address,profile.turnouts[name].address);
    r.drain();r.advance();assert.equal(r.engine.turnouts[name].position,position);
    for(const peer of (policy.guardTurnouts||[]).filter(n=>n!==name))assert.equal(r.engine.turnouts[peer].position,'C','no guessed companion order');
  }
});
test('ranger may only lay the boundary back, with physical inversion applied once',()=>{
  for(const [name,position] of Object.entries(closed)){
    const r=rig(),other=position==='C'?'T':'C';
    r.engine.manual(name,other);r.drain();r.advance();
    const before=r.commands.length,state=structuredClone(r.engine.turnouts);
    assert.throws(()=>r.engine.manual(name,other,{operator:'ranger'}),/endast TKL/);
    assert.equal(r.commands.length,before);assert.deepEqual(r.engine.turnouts,state);
    r.engine.manual(name,position,{operator:'ranger'});
    assert.equal(r.commands.length,before+1);
    assert.equal(r.commands.at(-1).position,profile.turnouts[name].inverted?other:position,name+' electrical inversion');
    r.drain();r.advance();assert.equal(r.engine.turnouts[name].position,position);
  }
});
test('ranger restoration never overrides route locks, occupancy, unknown peers, blocks or stop',()=>{
  for(const name of Object.keys(profile.yardBoundaries))for(const change of [
    r=>{r.field.setBlock(profile.turnouts[name].block,true);r.drain();},
    r=>r.engine.blockTrack(profile.turnouts[name].block,true),
    r=>{const peer=profile.manualPolicies.byTurnout[name].guardTurnouts?.find(n=>n!==name);r.engine.turnouts[peer||name].position='unknown';},
    r=>{const peer=profile.manualPolicies.byTurnout[name].guardTurnouts?.find(n=>n!==name);r.engine.routes.push({turnouts:{[peer||name]:'C'},blocks:[]});},
    r=>{r.engine.controls.stopAll=true;},
    r=>{r.engine.connected=false;},
    r=>{r.engine.storageFault='disk full';}
  ]){
    const r=rig(),other=closed[name]==='C'?'T':'C';r.engine.manual(name,other);r.drain();r.advance();
    change(r);const before=r.commands.length;
    assert.throws(()=>r.engine.manual(name,closed[name],{operator:'ranger'}));
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
