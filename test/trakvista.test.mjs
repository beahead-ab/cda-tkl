// Träkvista som andra station: profilen ur Bennys Trakvista.xml (LogixNG) och stationsfilen, provad i samma kärna
// och samma oberoende anläggningsmodell som Charlottendal. Inget här rör Charlottendals profil.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { decode } from '../src/protocol.mjs';
import { Topology } from '../src/topology.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const profile=read('stations/trakvista/profiles/network.json'),fieldProfile=read('stations/trakvista/profiles/field.json');
const source=read('stations/trakvista/data/operations-source.json'),panel=read('stations/trakvista/data/panel.json');
function rig(){
  let now=100000;const queue=[],commands=[];
  const field=new Field(fieldProfile,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{storage:null,now:()=>now,send:b=>{queue.push(['order',b]);commands.push(decode(b));}});
  field.on('frame',b=>queue.push(['report',b]));
  function drain(){let guard=20000;while(queue.length&&guard--){const [kind,b]=queue.shift();if(kind==='order')field.accept(b);else engine.receive(b);}assert.ok(guard>0,'återrapporterna ska lugna sig');}
  function advance(ms){for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();}}
  engine.connection(true);field.allReports();drain();
  return {engine,field,commands,drain,advance,request:(a,b)=>engine.request(a,b)};
}
test('Träkvistas källregler: 27 huvudtågvägar och 30 växeltågvägar, alla med en väg i grafen',()=>{
  assert.equal(source.format,'logixng');
  assert.equal(source.mainRoutePolicies.length,27);assert.equal(source.shuntRoutePolicies.length,30);
  assert.ok([...source.mainRoutePolicies,...source.shuntRoutePolicies].every(r=>r.status==='allowed'),'inga oklara regler');
  assert.equal(profile.routes.filter(r=>r.kind==='main').length,27);assert.equal(profile.routes.filter(r=>r.kind==='shunt').length,30);
  assert.equal(profile.excluded.length,0);
  assert.equal(Object.keys(profile.turnouts).length,13);assert.equal(Object.keys(profile.signals).length,25);
});
test('korsningsväxeln 22a/23 läggs med båda växlarna enligt JMRI:s lägen',()=>{
  const b1=profile.routes.find(r=>r.id==='htvB--htvI'),c1=profile.routes.find(r=>r.id==='htvC--htvI'),b3=profile.routes.find(r=>r.id==='htvB--htvIII');
  assert.deepEqual([b1.turnouts.Vx22a,b1.turnouts.Vx23],['C','C']);    // B–D: rakt genom
  assert.deepEqual([c1.turnouts.Vx22a,c1.turnouts.Vx23],['C','T']);    // A–D: från C mot spår I och II
  assert.deepEqual([b3.turnouts.Vx22a,b3.turnouts.Vx23],['T','C']);    // B–C: från B mot spår III
  assert.deepEqual(b1.signals,['2/2','2/4','2/6']);assert.deepEqual(c1.signals,['1/2','1/4','2/6']);
  const topology=new Topology(panel);
  assert.equal(topology.turnouts.Vx22a.block,'S22a');assert.equal(topology.turnouts.Vx23.slip,'SL2');
});
test('C-linjen är lodrät: 1/2 är infart och 1/9 utfart enligt stationens riktning',()=>{
  const inn=profile.routes.find(r=>r.id==='htvC--htvII'),out=profile.routes.find(r=>r.id==='htvII--htvC');
  assert.equal(inn.signals[0],'1/2');assert.equal(out.exitSignal,'1/9');assert.equal(out.blocks.at(-1),'SC2');
});
test('blocklistorna stämmer med Bennys tågvägstabeller utom 2/3 → 3/7, där tabellen pekar på andra sidan stationen',()=>{
  const all=[...profile.routes,...profile.routeAlternatives],sensor=x=>'tvs'+(/^\d\d$/.test(x)?x[0]+'/'+x[1]:/^\d\d\d$/.test(x)?x[0]+'/'+x.slice(1):x);
  const wrong=[];
  for(const [name,blocks] of Object.entries(source.tables)){
    const [a,b]=name.split('-'),rs=all.filter(r=>r.source.nxButtons[0]===sensor(a)&&r.source.nxButtons[1]===sensor(b));
    if(!rs.length)continue;   // 2/1 → 2/3 och 2/2 → 2/4 är inre steg i huvudtågvägarna
    if(!rs.some(r=>JSON.stringify([...r.blocks].sort())===JSON.stringify([...blocks].sort())))wrong.push(name);
  }
  assert.deepEqual(wrong,['23-37']);
});
test('alla Träkvistas tågvägar läggs, klareras och löses upp efter tågets passage',{timeout:120000},()=>{
  for(const def of profile.routes){
    const r=rig(),route=r.request(def.from,def.to);r.advance(6500);assert.equal(route.state,'active',def.label+': '+route.reason);
    for(const s of def.signals)assert.equal(r.engine.signals[s].aspect,'go',def.label+': '+s+' kör');
    r.field.startTrain(def.id);r.advance((route.passage.length+3)*850);
    assert.equal(r.field.trains.length,0,def.label+': tåget stannade');
    assert.equal(r.engine.routes.length,0,def.label+': '+route.reason);
  }
});
test('en tågväg genom korsningsväxeln spärrar den korsande vägen',()=>{
  const r=rig(),b=r.request('htvB','htvI');r.advance(6500);assert.equal(b.state,'active');
  assert.throws(()=>r.request('htvC','htvII'));
  assert.throws(()=>r.request('htvIII','htvC'));
});
test('stationsvalet: Charlottendal är standard, Träkvista väljs med CHARLOTTENDAL_STATION och okända namn vägras',async()=>{
  const {currentStation,stateDirectory,stationIds}=await import('../src/station.mjs');
  assert.ok(stationIds().includes('charlottendal')&&stationIds().includes('trakvista'));
  const cda=currentStation({}),tk=currentStation({CHARLOTTENDAL_STATION:'trakvista'});
  assert.equal(cda.builtIn,true);assert.match(cda.dataDir,/public\/data$/);
  assert.equal(tk.title,'Träkvista');assert.match(tk.dataDir,/stations\/trakvista\/data$/);assert.match(tk.profile,/stations\/trakvista\/profiles\/network\.json$/);
  assert.throws(()=>currentStation({CHARLOTTENDAL_STATION:'../profiles'}),/Okänd station/);
  assert.match(stateDirectory({},cda),/var$/);assert.match(stateDirectory({},tk),/var\/trakvista$/);
  assert.equal(stateDirectory({CHARLOTTENDAL_STATE_DIR:'/tmp/x'},tk),'/tmp/x');
});
test('panelen visar korsningsväxelns förbindelse först när båda växlarna rapporterat',async()=>{
  const {slipDisplay}=await import('../public/turnout-display.js');
  const slip=panel.slips.SL2,at=1000;
  assert.deepEqual(slipDisplay(slip,{Vx22a:{position:'C'},Vx23:{position:'C'}},{fresh:true,now:at}).active,['B','D']);
  assert.deepEqual(slipDisplay(slip,{Vx22a:{position:'C'},Vx23:{position:'T'}},{fresh:true,now:at}).active,['A','D']);
  assert.equal(slipDisplay(slip,{Vx22a:{position:'C'},Vx23:{position:'unknown',desired:'T',commandAt:at-100}},{fresh:true,now:at}).phase,'waiting');
  assert.equal(slipDisplay(slip,{Vx22a:{position:'C'},Vx23:{position:'C'}},{fresh:false,now:at}).phase,'unknown');
});
test('tågspårningen går genom korsningsväxeln bara i det läge som leder dit',async()=>{
  const {buildTrackGraph}=await import('../src/train-tracking.mjs');
  const graph=buildTrackGraph(panel,profile);
  const fromB=graph.SB1.get('S22a');assert.ok(fromB.some(c=>c.some(x=>x.turnout==='Vx23'&&x.position==='C')));
  assert.ok(graph.SC1.get('S22a').every(c=>c.some(x=>x.turnout==='Vx23'&&x.position==='T')),'från C bara med 23 avvikande');
});
test('Bennys ofyllda spår är lokala; 22a och 23 är det inte',()=>{
  assert.deepEqual(profile.panelStyle.localBlocks,['L2','L3','LS1','LS2','S10','S11','S12','S13','SSI','SSII','TP']);
  assert.ok(!profile.panelStyle.localBlocks.includes('S22a'));
  for(const n of ['Vx10','Vx11','Vx12','Vx13'])assert.equal(profile.turnouts[n].local,true);
  assert.equal(profile.turnouts.Vx22a.address,1);assert.equal(profile.turnouts.Vx23.address,2);
});
