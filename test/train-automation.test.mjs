import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Engine } from '../src/engine.mjs';
import { Field } from '../src/field.mjs';
import { TrainTracker } from '../src/train-tracking.mjs';
import { TrainAutomation, throughLine, DWELL_MS } from '../src/train-automation.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'), fieldProfile=read('profiles/simulator-network.json'), panel=read('public/data/panel.json');

// Kärnan, simulatorn, spårningen och automaten i samma klocka.
function rig() {
  let now=100000;const queue=[],log=[];
  const field=new Field(fieldProfile,{now:()=>now,movementMs:100});
  const engine=new Engine(profile,{now:()=>now,send:b=>queue.push(['order',b])});
  field.on('frame',b=>queue.push(['report',b]));
  const tracker=new TrainTracker({profile,panel,now:()=>now});
  const automation=new TrainAutomation({profile,available:true,request:(a,b)=>engine.request(a,b,'build'),edgeBlock:tracker.edgeBlock,now:()=>now,log:(k,m)=>log.push(m)});
  const drain=()=>{let guard=20000;while(queue.length&&guard--){const [kind,b]=queue.shift();if(kind==='order')field.accept(b);else engine.receive(b);}};
  const step=()=>{
    tracker.observe({blocks:engine.blocks,turnouts:engine.turnouts,routes:engine.routes,connected:engine.connected});
    automation.tick({state:{...engine.snapshot(),connected:engine.connected},trains:tracker.view().trains,outgoing:{A:'An',B:'Bu',C:'Cn'}});
  };
  const advance=ms=>{for(let i=0;i<ms;i+=50){now+=50;field.tick();if(now%1000===0)field.allReports();drain();engine.tick();drain();if(now%250===0)step();}};
  engine.connection(true);field.allReports();drain();
  return {engine,field,tracker,automation,advance,log};
}

test('genomgående: från väster mot Vagnsta, från Vagnsta växelvis mot Kungsfors och Lekby',()=>{
  assert.equal(throughLine('A',0),'B');assert.equal(throughLine('C',1),'B');
  assert.deepEqual([0,1,2,3].map(n=>throughLine('B',n)),['A','C','A','C']);
});

test('automaten tar ett tåg från Kungsfors in på ett spår, låter det stå och skickar det vidare mot Vagnsta',()=>{
  const r=rig();
  r.automation.set(true);
  r.field.spawnTrain({number:'401',at:'htvAu'});
  r.advance(20000);
  const arrival=r.log.find(m=>/Automaten lägger Au → /.test(m));
  assert.ok(arrival,r.log.join(' | '));
  const parked=r.field.trains[0];
  assert.equal(parked.standing,true,'står på spåret');assert.match(parked.position,/^htvSp/);
  assert.equal(r.engine.routes.length,0,'infarten löst vid ankomst');
  r.advance(DWELL_MS+20000);
  assert.ok(r.log.some(m=>/Automaten lägger Spår .* → B[un] /.test(m)),r.log.join(' | '));
  assert.equal(r.field.trains.length,0,'tåget har lämnat mot Vagnsta');
  assert.equal(r.engine.routes.length,0);
  assert.equal(r.automation.enabled,true,'inget oväntat hände');
});

test('automaten väljer aldrig spår 6 eller 10, och lämnar över vid AIS',()=>{
  const r=rig();
  assert.ok(!r.automation.arrivals.some(x=>['htvSpVI','htvSpX'].includes(x.to)));
  assert.ok(r.automation.arrivals.length>40);
  r.automation.set(true);r.engine.allStop(true);r.advance(500);
  assert.equal(r.automation.enabled,false);assert.match(r.log.at(-1),/lämnar över: AIS/);
  const off=new TrainAutomation({profile,available:false,reason:'Bara i simulering.',request:()=>{},edgeBlock:{}});
  assert.throws(()=>off.set(true),/Bara i simulering/);
});
