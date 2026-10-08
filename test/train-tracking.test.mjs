import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TrainTracker,buildTrackGraph,GRACE_MS} from '../src/train-tracking.mjs';
const panel=JSON.parse(fs.readFileSync(new URL('../public/data/panel.json',import.meta.url)));
const profile=JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal-network.json',import.meta.url)));

// Som kärnan: en spårledning är belagd när någon av dess ingångar är det, och alla block på samma adress följer med.
function field(p=profile){
  const active=new Set();
  const blocks=()=>Object.fromEntries(Object.entries(p.blocks).map(([n,b])=>[n,{occupied:(b.inputs||[b]).some(i=>active.has(i.address))}]));
  return {active,blocks,set:(name,on)=>{for(const i of p.blocks[name].inputs||[p.blocks[name]])on?active.add(i.address):active.delete(i.address);}};
}
const positions=turnouts=>Object.fromEntries(Object.keys(profile.turnouts).map(n=>[n,{position:turnouts[n]||'C'}]));
function rig({lines=[],edgeInfo={},book={}}={}){
  let now=1000;const log=[];
  const tracker=new TrainTracker({profile,panel,now:()=>now,log:(k,m)=>log.push(m)});
  const f=field();let turnouts=positions({}),routes=[];
  const tick=(ms=300)=>{now+=ms;tracker.observe({blocks:f.blocks(),turnouts,routes,connected:true,book,lines,edgeInfo});};
  return {tracker,f,log,tick,route:r=>{turnouts=positions(r.turnouts);routes=[{...r,state:'active'}];},clear:()=>{routes=[];}};
}
// Ett tåg kör längs en tågväg som simulatorn gör: ett block (en adress) i taget, två belagda åt gången.
function drive(t,r){
  const seen=new Set(),steps=r.blocks.filter(n=>{const a=profile.blocks[n].address;if(seen.has(a))return false;seen.add(a);return true;});
  steps.forEach((b,i)=>{t.f.set(b,true);if(i>=2)t.f.set(steps[i-2],false);t.tick();t.tick(GRACE_MS);});
  return steps;
}

test('spårgrafen: växlarna avgör vilka block som hänger ihop, korsningarna går rakt över',()=>{
  const g=buildTrackGraph(panel,profile);
  assert.deepEqual(g.S100.get('S100a'),[[{turnout:'Vx100',position:'C'}]]);
  assert.deepEqual(g.S100.get('S100b'),[[{turnout:'Vx100',position:'T'}]]);
  assert.deepEqual(g.S113.get('S113b'),[[{turnout:'Vx113',position:'T'}]]);
  assert.deepEqual(g.SU2B.get('SU2A'),[[]]);
  assert.ok(g.S140c.has('S143c'),'korsningen X1 förbinder 140 och 143');
});

test('ett tåg från Kungsfors får numret från TrainMeet och följer tågvägen, inte de andra blocken på LS60',()=>{
  const r=profile.routes.find(x=>x.id==='htvAu--htvSpIA');
  const t=rig({lines:[{id:'l1',neighborId:'kun',neighborName:'Kungsfors',direction:'in',state:'occupied',trainNumber:'421'}],edgeInfo:{Au:{name:'Kungsfors',stationId:'kun',incoming:true}}});
  t.route(r);
  t.tick();assert.equal(t.tracker.view().lines[0].number,'421','på väg in syns vid kanten innan tåget är här');
  const steps=drive(t,r);
  const [train]=t.tracker.view().trains;
  assert.equal(train.number,'421');assert.equal(train.certain,true);
  assert.equal(train.head,steps.at(-1));assert.equal(train.route,r.label);
  assert.ok(!t.tracker.trains[0].body.includes('S100b'),'S100b delar LS60 men ligger åt fel håll');
  assert.equal(t.tracker.view().trains.length,1,'ingen spöktåg av de delade detektorerna');
  assert.equal(t.tracker.view().lines.length,0,'inte längre på linjen');
  assert.match(t.log[0],/Tåg 421 kom in från Kungsfors \(Au\)/);
});

test('vid spår 11–13: nio block på LS72, tåget tar bara det block växlarna leder till',()=>{
  const r=profile.routes.find(x=>x.blocks.includes('S113b')&&x.blocks.includes('S112')&&/^htv[AC]/.test(x.from));
  assert.ok(r,'en tågväg in till spår 11 över 112 och 113');
  const t=rig();t.route(r);drive(t,r);
  const body=t.tracker.trains.flatMap(x=>x.body);
  for(const other of ['S116','S116a','S116c','S113c'])assert.ok(!body.includes(other),other+' hör till samma detektor men inte till vägen');
  assert.equal(t.tracker.view().trains.length,1);
});

test('ett tåg som lämnar vid kanten visas på linjen; ett okänt tåg får ?-nummer som operatören rättar',()=>{
  const r=profile.routes.find(x=>x.to==='htvBu'&&x.blocks.length>3);
  const t=rig({edgeInfo:{Bu:{name:'Vagnsta',stationId:'vag'}}});t.route(r);
  const steps=drive(t,r);
  const train=t.tracker.view().trains[0];
  assert.equal(train.certain,false);assert.match(train.label,/^\?\d+$/);
  t.tracker.name(train.id,'P7');
  assert.equal(t.tracker.view().trains[0].number,'P7');
  for(const b of steps)t.f.set(b,false);t.tick();t.tick(GRACE_MS+10);
  const line=t.tracker.view().lines[0];
  assert.deepEqual([line.number,line.direction,line.edge,line.neighbor],['P7','out','Bu','Vagnsta']);
  assert.equal(t.tracker.view().trains.length,0);
});

test('ett kort glapp frigör inget; ett tåg som försvinner inne på stationen står kvar som senast sett',()=>{
  const t=rig();t.f.set('S131',true);t.tick();
  const id=t.tracker.view().trains[0].id;
  t.f.set('S131',false);t.tick(500);t.f.set('S131',true);t.tick(500);
  assert.equal(t.tracker.view().trains[0].id,id,'glappet under GRACE_MS ändrar ingenting');
  t.f.set('S131',false);t.tick();t.tick(GRACE_MS+10);
  assert.equal(t.tracker.view().trains[0].state,'ghost');
  t.f.set('S131',true);t.tick();
  assert.deepEqual([t.tracker.view().trains.length,t.tracker.view().trains[0].id,t.tracker.view().trains[0].state,t.tracker.view().trains[0].certain],[1,id,'station',false],'samma tåg igen, men osäkert');
});

test('ett block utan ingång är en brygga: tåget passerar det utan rapport',()=>{
  // En liten anläggning: A – B (utan ingång) – C.
  const p={blocks:{A:{address:1,activeMeansOccupied:true},B:{address:3001,activeMeansOccupied:true},C:{address:3,activeMeansOccupied:true}},routes:[]};
  const seg=(id,b,c1,c2)=>({id,b,x1:0,y1:10,x2:10,y2:10,c1,t1:'POS_POINT',c2,t2:'POS_POINT'});
  const pan={segs:[seg('T1','A','E1','P1'),seg('T2','B','P1','P2'),seg('T3','C','P2','E2')],turnouts:{},xings:{},sicons:[],labels:[]};
  let now=0;const tracker=new TrainTracker({profile:p,panel:pan,now:()=>now});
  const f=field(p),tick=(ms=300)=>{now+=ms;tracker.observe({blocks:f.blocks(),turnouts:{},routes:[],connected:true});};
  f.set('A',true);tick();f.set('C',true);tick();
  assert.deepEqual(tracker.trains[0].body,['A','B','C']);
  f.set('A',false);tick();tick(GRACE_MS+10);
  assert.deepEqual(tracker.trains[0].body,['C'],'svansen och bryggan bakom släpps');
  assert.equal(tracker.view().trains.length,1);
});

test('operatörens nummer på ett block gäller; avstängd utanför simulering',()=>{
  const book={'block:S131':{value:'G55',updatedAt:5}};
  const t=rig({book});t.f.set('S131',true);t.tick();
  assert.equal(t.tracker.view().trains[0].number,'G55');
  const off=new TrainTracker({profile,panel,enabled:false,reason:'Bara i simulering.'});
  assert.equal(off.observe({blocks:{},turnouts:{},connected:true}),false);
  assert.deepEqual(off.view(),{enabled:false,reason:'Bara i simulering.',trains:[],lines:[]});
});

test('en anmälan som kommer efter tåget ger det okända tåget numret',()=>{
  const book={};const t=rig({book});
  t.f.set('SU2A',true);t.tick();
  assert.equal(t.tracker.view().trains[0].certain,false);
  book['incoming:AuppIn']={value:'401',updatedAt:9};t.tick();
  const train=t.tracker.view().trains[0];
  assert.deepEqual([train.number,train.certain,train.source],['401',true,'inkommande fält']);
});
