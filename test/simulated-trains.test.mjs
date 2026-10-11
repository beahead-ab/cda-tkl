import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { TrafficTrains } from '../src/traffic-trains.mjs';
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

test('simulatorn ställer bara tåg på en fri linje eller ett fritt spår, med giltigt nummer',()=>{
  const r=rig();r.field.spawnTrain({number:'401',at:'htvCu'});
  assert.throws(()=>r.field.spawnTrain({number:'403',at:'htvCu'}),/belagd/);
  assert.throws(()=>r.field.spawnTrain({number:'401',at:'htvAn'}),/finns redan/);
  assert.throws(()=>r.field.spawnTrain({number:'',at:'htvAn'}),/Ogiltigt/);
  // Sedan 0.79.0 kan ett tåg ställas på ett spår på stationen (trafikspelets uppställda tåg); en okänd knapp nekas.
  assert.throws(()=>r.field.spawnTrain({number:'405',at:'htvFinnsInte'}),/Okänt spår/);
  assert.throws(()=>r.field.spawnTrain({number:'405',at:{}}),/Okänd linje/);
  assert.throws(()=>r.field.simulate({kind:'okänt'}),/Okänt/);
});

// Trafikspelets tåg (0.79.0): när LocoNet inte är ansluten ställer TKL tågen från TrainMeet-servern på banan. Ett tåg som
// grannstationen sänt på linjen hit ställs utanför infartssignalen; ett tåg anmält uppställt ställs på sitt spår.
test('trafikspelets tåg: på linjen hit ställs vid infarten, uppställda på sitt spår, och aldrig två gånger',async()=>{
  let now=0;const sent=[],log=[],expected=[];
  const tt=new TrafficTrains({available:true,now:()=>now,send:async c=>{sent.push(c);return {};},log:(k,m)=>log.push(m)});
  const edges={Au:{name:'Kungsfors',stationId:'kfs',incoming:true,block:'SU2A'},An:{name:'Kungsfors',stationId:'kfs',block:'SN2A'},Bn:{name:'Vagnsta',stationId:'vag',incoming:true,block:'SN1A'}};
  const tracks={'1c':{button:'htvSpIA',block:'SIA'},'2b':{button:'htvSpIIB',block:'SIIB'}};
  const blocks=Object.fromEntries(['SU2A','SN2A','SN1A','SIA','SIIB'].map(b=>[b,{occupied:false}]));
  const context={lines:[{id:'cda-kfs',neighborId:'kfs',neighborName:'Kungsfors',state:'occupied',direction:'in',trainNumber:'421'},{id:'cda-vag',neighborId:'vag',neighborName:'Vagnsta',state:'reserved',direction:'in',trainNumber:'318'}],
    trains:[{id:'m1',train_number:'3581',track:'1c'}],tracks:[{id:'t1',label:'1c'}],movements:[{id:'m1',departure:'positioned',track:'t1'}]};
  const tick=(more={})=>tt.tick({context,edges,tracks,blocks,expect:(b,n)=>expected.push([b,n]),...more});
  await tick();assert.deepEqual(sent,[{kind:'spawn',number:'421',at:'htvAu'}],'belagd sträcka mot stationen: tåget står vid infarten');
  assert.match(log.at(-1),/Tåg 421 på linjen från Kungsfors/);
  await tick();assert.deepEqual(sent.at(-1),{kind:'spawn',number:'3581',at:'htvSpIA'},'uppställt på spår 1c');assert.deepEqual(expected,[['SIA','3581']],'spårningen får numret');
  await tick();assert.equal(sent.length,2,'en klarerad (reserverad) sträcka har inget tåg på linjen än, och inget ställs ut två gånger');
  // Ett tåg som redan syns ställs inte ut; ett belagt spår väntar.
  const again=new TrafficTrains({available:true,now:()=>now,send:async c=>{sent.push(c);return {};}});
  await again.tick({context,edges,tracks,blocks:{...blocks,SU2A:{occupied:true}},tracked:[{number:'3581'}]});assert.equal(sent.length,2);
  // Med LocoNet ansluten gör TKL ingenting.
  const off=new TrafficTrains({available:false,send:async c=>{sent.push(c);}});await off.tick({context,edges,tracks,blocks});assert.equal(sent.length,2);
  // Ett misslyckat utställande försöks igen efter en stund; "finns redan" räknas som på plats.
  let fail='Linjen är belagd.';const retry=new TrafficTrains({available:true,now:()=>now,send:async()=>{if(fail)throw Error(fail);}});
  const ctx={lines:[context.lines[0]]};await retry.tick({context:ctx,edges,tracks,blocks});assert.match(retry.error,/Linjen är belagd/);
  fail='';now+=1000;await retry.tick({context:ctx,edges,tracks,blocks});assert.equal(retry.view().placed.length,0,'väntar');
  now+=5000;await retry.tick({context:ctx,edges,tracks,blocks});assert.deepEqual(retry.view().placed,['line:cda-kfs:421']);
  // När sträckan inte längre är belagd glöms tåget, så att samma nummer kan komma igen senare.
  await retry.tick({context:{lines:[]},edges,tracks,blocks});assert.deepEqual(retry.view().placed,[]);
});

test('simulatorn ställer ett uppställt tåg på ett spår på stationen, och det kör ut när tågvägen är lagd',()=>{
  const r=rig();
  assert.deepEqual(r.field.spawnTrain({number:'3581',at:'htvSpIA'}),{number:'3581',block:'SIA'});
  assert.throws(()=>r.field.spawnTrain({number:'3582',at:'htvSpIA'}),/Spåret är belagt/);
  assert.throws(()=>r.field.spawnTrain({number:'3583',at:'htvD'}),/Okänd linje/);
  r.advance(2000);assert.equal(r.engine.blocks.SIA.occupied,true);assert.equal(r.field.trains[0].standing,true);
  const out=profile.routes.find(x=>x.from==='htvSpIA'&&/^htv(Bu|Bn)$/.test(x.to));
  const route=r.engine.request(out.from,out.to);r.advance(7000);assert.ok(['active','traversing'].includes(route.state),route.reason);
  r.advance((route.passage.length+3)*900);
  assert.equal(r.field.trains.length,0,'tåget lämnade anläggningen på linjen');
});
