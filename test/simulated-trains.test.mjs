import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { TrainSimulation } from '../src/train-simulation.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'), fieldProfile=read('profiles/simulator-network.json');
// Kärnan och simulatorn kopplade direkt, som i network.test.mjs.
function rig() {
  let now=100000;const queue=[];
  const field=new Field(fieldProfile,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{now:()=>now,send:b=>queue.push(['order',b])});
  field.on('frame',b=>queue.push(['report',b]));
  const drain=()=>{let guard=20000;while(queue.length&&guard--){const [kind,b]=queue.shift();if(kind==='order')field.accept(b);else engine.receive(b);}};
  const advance=ms=>{for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();}};
  engine.connection(true);field.allReports();drain();
  return {engine,field,advance};
}

test('ett tåg på linjen kör in när signalen visar kör, stannar på spåret, tågvägen löses upp vid ankomst och tåget kör vidare ut',()=>{
  const r=rig();
  assert.deepEqual(r.field.spawnTrain({number:'401',at:'htvAu'}),{number:'401',block:'SU2A'});
  r.advance(2000);
  assert.equal(r.field.trains[0].standing,true,'väntar vid infartssignalen utan tågväg');
  assert.equal(r.engine.blocks.SU2A.occupied,true);
  const route=r.engine.request('htvAu','htvSpIA');r.advance(7000);
  assert.ok(['active','traversing'].includes(route.state),route.reason);
  r.advance((route.passage.length+2)*900);
  const t=r.field.trains[0];
  assert.deepEqual([t.standing,t.position,t.blocks],[true,'htvSpIA',['SIA']],'står kvar på spår 1c');
  r.advance(6000);
  assert.equal(r.engine.routes.length,0,'tågvägen löst vid ankomst');
  assert.equal(r.engine.blocks.SIA.occupied,true,'spåret förblir belagt');
  assert.ok(r.engine.journal.some(e=>/tåget står på målspåret, stopp bekräftat, lås frigivna/.test(e.message)));
  assert.throws(()=>r.engine.request('htvCu','htvSpIA'),/belagt/,'ingen ny tågväg in på det belagda spåret');
  const out=profile.routes.find(x=>x.from==='htvSpIA'&&/^htv(Bu|Bn)$/.test(x.to));
  const leaving=r.engine.request(out.from,out.to);r.advance(7000);
  assert.ok(['active','traversing'].includes(leaving.state),leaving.reason);
  r.advance((leaving.passage.length+4)*900+3000);
  assert.equal(r.field.trains.length,0,'tåget lämnade anläggningen');
  assert.equal(r.engine.routes.length,0,leaving.reason);
});

test('upplösning vid ankomst väntar en stund, och aldrig när målspårets detektor också täcker en växel i vägen',()=>{
  const r=rig();r.field.spawnTrain({number:'403',at:'htvAu'});r.advance(1000);
  r.engine.request('htvAu','htvSpIA');r.advance(7000);
  for(let i=0;i<400&&!(r.field.trains[0].standing&&r.field.trains[0].position==='htvSpIA');i++)r.advance(50);
  r.advance(1000);assert.equal(r.engine.routes.length,1,'inte direkt vid ankomst');
  r.advance(4000);assert.equal(r.engine.routes.length,0,'efter en stund');
  // Spår 6: S144b delar LS158 med Vx144:s block, så kärnan kan inte se att tåget lämnat växeln.
  const s=rig();s.field.spawnTrain({number:'405',at:'htvAu'});s.advance(1000);
  const six=s.engine.request('htvAu','htvSpVI');s.advance(7000);s.advance((six.passage.length+6)*900+8000);
  assert.equal(s.field.trains[0].standing,true);
  assert.equal(s.engine.routes.length,1,'låsen ligger kvar');
});

test('simulatorn ställer bara tåg på en fri linje med giltigt nummer',()=>{
  const r=rig();r.field.spawnTrain({number:'401',at:'htvCu'});
  assert.throws(()=>r.field.spawnTrain({number:'403',at:'htvCu'}),/belagd/);
  assert.throws(()=>r.field.spawnTrain({number:'401',at:'htvAn'}),/finns redan/);
  assert.throws(()=>r.field.spawnTrain({number:'',at:'htvAn'}),/Ogiltigt/);
  assert.throws(()=>r.field.spawnTrain({number:'405',at:'htvSpIA'}),/Okänd linje/);
  assert.throws(()=>r.field.simulate({kind:'okänt'}),/Okänt/);
});

test('simulerade tåg: anmäls i linjens inkommande fält, ställs på linjen och fältet töms när tåget kommit in',async()=>{
  let now=0;const sent=[],announced=[],log=[];
  const sim=new TrainSimulation({available:true,now:()=>now,random:()=>0,send:async c=>{sent.push(c);return {};},announce:(k,v)=>announced.push([k,v]),log:(k,m)=>log.push(m)});
  const edges={Au:{name:'Kungsfors',incoming:true,block:'SU2A'},An:{name:'Kungsfors',block:'SN2A'},Bu:{name:'Vagnsta',block:'SU1A'},Bn:{name:'Vagnsta',incoming:true,block:'SN1A'},Cu:{name:'Lekby',incoming:true,block:'SU4A'},Cn:{name:'Lekby',block:'SN4A'}};
  const blocks=Object.fromEntries(['SU2A','SN2A','SU1A','SN1A','SU4A','SN4A'].map(b=>[b,{occupied:false}]));
  await sim.tick({edges,blocks});assert.equal(sent.length,0,'av från början');
  sim.set(true);now+=3000;await sim.tick({edges,blocks});
  assert.deepEqual(sent,[{kind:'spawn',number:'401',at:'htvAu'}]);
  assert.deepEqual(announced,[['incoming:AuppIn','401']]);
  assert.match(log.at(-1),/Tåg 401 anmält från Kungsfors/);
  now+=100;await sim.tick({edges,blocks});assert.equal(sent.length,1,'nästa tåg först efter intervallet');
  await sim.tick({edges,blocks,tracked:[{state:'station',number:'401',blocks:['SU2A']}]});
  assert.notDeepEqual(announced.at(-1),['incoming:AuppIn',''],'på linjen utanför infartssignalen är tåget inte inne än');
  await sim.tick({edges,blocks,tracked:[{state:'station',number:'401',blocks:['SU2A','SU2B']}]});
  assert.deepEqual(announced.at(-1),['incoming:AuppIn',''],'fältet töms när tåget syns på stationen');
  const off=new TrainSimulation({available:false,reason:'Bara i simulering.'});
  assert.throws(()=>off.set(true),/Bara i simulering/);
});
