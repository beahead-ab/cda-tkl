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
const positions=(engine,names)=>Object.fromEntries(Object.keys(names).map(n=>[n,engine.turnouts[n].position]));
const group=id=>profile.rangerRequests.find(g=>g.id===id);
const kinds=engine=>engine.journal.map(e=>e.kind);

test('the profile carries the ranger\'s own area and the request groups decided with the layout owner',()=>{
  assert.deepEqual(profile.yardArea.turnouts,['Vx111','Vx114','Vx115','Vx118','Vx119','Vx127','Vx128','Vx130','Vx133','Vx150','Vx155']);
  assert.deepEqual(profile.yardArea.boundaries,['Vx102','Vx103','Vx112','Vx131','Vx132','Vx144','Vx154','Vx164']);
  for(const block of ['S103b','SG51','SG52','SG53','SG54','SLI','SLII','SLIII','SVI','SIIID','S164b',...Array.from({length:9},(_,i)=>'Slokstall'+(i+1))])assert.ok(profile.yardArea.blocks.includes(block),block);
  for(const block of ['SIIIA','SIVA','SVA','S112b','S103a','S113a','S164'])assert.ok(!profile.yardArea.blocks.includes(block)||block==='S164','spår 11–13 and the legs towards TKL are not the ranger\'s: '+block);
  assert.deepEqual(profile.rangerRequests.map(g=>[g.id,g.out,g.back]),[
    ['left-11',{Vx103:'C',Vx112:'T',Vx113:'T',Vx102:'C'},{Vx103:'T',Vx112:'C'}],
    ['left-12',{Vx103:'C',Vx112:'T',Vx113:'C',Vx116:'T',Vx102:'C'},{Vx103:'T',Vx112:'C'}],
    ['left-13',{Vx103:'C',Vx112:'T',Vx113:'C',Vx116:'C',Vx102:'C'},{Vx103:'T',Vx112:'C'}],
    ['right-11',{Vx132:'T',Vx131:'T',Vx126:'C',Vx123:'C'},{Vx132:'C',Vx131:'C'}],
    ['right-12',{Vx132:'T',Vx131:'T',Vx126:'C',Vx123:'T'},{Vx132:'C',Vx131:'C'}],
    ['right-13',{Vx132:'T',Vx131:'T',Vx126:'T'},{Vx132:'C',Vx131:'C'}],
    ['six-154',{Vx133:'C',Vx144:'T',Vx154:'T'},{Vx144:'C',Vx154:'C'}],
    ['3d-left',{Vx164:'C',Vx153:'C',Vx161:'C'},{Vx164:'T',Vx153:'T'}]]);
  // Every group's out positions are its own shunt route's, so the move is one the source allows.
  for(const g of profile.rangerRequests){const route=profile.routes.find(r=>r.id===g.route);assert.equal(route.kind,'shunt');for(const [n,p] of Object.entries(route.turnouts))assert.equal(g.out[n],p,g.id+' '+n);}
});
test('a route over the group answers the ranger at once; no request reaches TKL',()=>{
  const r=rig();
  const route=r.engine.request('htvCu','htvSpIIIA');r.advance(6500);assert.equal(route.state,'active',route.reason);
  const status=r.engine.yard.requestStatus('left-11');
  assert.equal(status.allowed,false);assert.match(status.reason,/Går inte att lägga: tågväg Cu → Spår 11 ligger över Vx1/);
  assert.throws(()=>r.engine.yard.request('left-11'),/tågväg Cu → Spår 11/);
  assert.equal(r.engine.yard.requests.length,0);assert.ok(!kinds(r.engine).includes('ranger-request'));
  assert.equal(r.engine.yard.requestStatus('right-11').allowed,true,'the other side is free');
  assert.equal(r.engine.yard.snapshot().groups.find(g=>g.id==='left-11').can.allowed,false);
});
test('TKL approves: the group is laid and locked, routes over it wait, and the ranger lays it back',()=>{
  const r=rig(),g=group('right-11');
  const request=r.engine.yard.request('right-11');
  assert.equal(request.state,'open');assert.equal(r.storage.files.get('controls.json').yard.requests[0].id,request.id);
  assert.equal(r.engine.yard.snapshot().groups.find(x=>x.id==='right-11').state,'open');
  assert.equal(kinds(r.engine)[0],'ranger-request');
  const laid=r.engine.yard.answer(request.id,true);assert.equal(laid.state,'laid');
  r.drain();r.advance(500);
  assert.deepEqual(positions(r.engine,g.out),g.out);
  assert.equal(r.storage.files.get('controls.json').yard.fingerprint,r.engine.fingerprint);
  assert.throws(()=>r.engine.manual('Vx131','C'),/Höger 11 ligger ute för rangeraren/);
  assert.throws(()=>r.engine.manual('Vx132','C',{operator:'ranger'}),/Lägg tillbaka/);
  assert.throws(()=>r.engine.request('htvBu','htvSpIIIA'),/Höger 11 ligger ute/);
  assert.throws(()=>r.engine.yard.request('right-12'),/Höger 11 ligger ute/);
  assert.throws(()=>r.engine.yard.request('right-11'),/ligger redan ute/);
  assert.equal(r.engine.yard.request('left-11').state,'open','the other side can still be requested');
  const before=r.commands.length;
  r.engine.yard.return(laid.id,'ranger');
  assert.equal(r.commands.length,before+2,'132 and 131 are ordered back; 126 and 123 stay');
  r.drain();r.advance(500);
  assert.deepEqual(positions(r.engine,g.back),g.back);
  assert.equal(r.engine.yard.requests.length,1);assert.equal(kinds(r.engine)[0],'ranger-returned');
  r.engine.yard.answer(r.engine.yard.requests[0].id,false);assert.equal(r.engine.yard.requests.length,0);
  const route=r.engine.request('htvBu','htvSpIIIA');r.advance(6500);assert.equal(route.state,'active',route.reason);
});
test('TKL denies or withdraws; a route laid while a request waits answers it for TKL',()=>{
  const r=rig();
  const first=r.engine.yard.request('left-11');r.engine.yard.answer(first.id,false);
  assert.equal(r.engine.yard.requests.length,0);assert.equal(kinds(r.engine)[0],'ranger-denied');
  assert.throws(()=>r.engine.yard.answer(first.id,true),/finns inte längre/);
  const second=r.engine.yard.request('left-11');
  const route=r.engine.request('htvCu','htvSpIIIA');r.advance(200);
  assert.equal(r.engine.yard.requests.length,0,'the open request is answered when the route takes its turnouts');
  assert.match(r.engine.journal.find(e=>e.kind==='ranger-denied').message,/kan inte läggas: tågväg Cu → Spår 11 ligger/);
  assert.equal(route.state==='held',false);
  r.engine.cancel(route.id);r.drain();r.advance(500);assert.equal(r.engine.routes.length,0);
  const third=r.engine.yard.request('six-154');r.engine.yard.answer(third.id,true);r.drain();r.advance(500);
  assert.deepEqual(positions(r.engine,group('six-154').out),group('six-154').out);
  r.engine.yard.return(third.id,'tkl');r.drain();r.advance(500);
  assert.equal(kinds(r.engine)[0],'ranger-withdrawn');assert.deepEqual(positions(r.engine,group('six-154').back),group('six-154').back);
  assert.notEqual(second.id,third.id);
});
test('a laid group survives restart and connection loss; a changed profile or old handover state does not start',()=>{
  const r=rig();const request=r.engine.yard.request('3d-left');r.engine.yard.answer(request.id,true);r.drain();r.advance(500);
  r.engine.connection(false);assert.equal(r.engine.yard.requests[0].state,'laid');
  const restarted=new Engine(profile,{storage:r.storage});assert.equal(restarted.yard.requests[0].id,request.id);assert.equal(restarted.yard.requests[0].state,'laid');
  const changed=structuredClone(profile);changed.yardArea.turnouts.pop();assert.throws(()=>new Engine(changed,{storage:r.storage}),/ändrats medan en rangerbegäran/);
  const old=memory();old.save('controls.json',{version:3,stopAll:false,blocked:[],mode:'local',emergency:null,lines:[],programming:{reserved:false,desired:false},yard:{owner:'tkl',fingerprint:'x'}});
  assert.deepEqual(new Engine(profile,{storage:old}).yard.requests,[]);
  old.save('controls.json',{...old.load('controls.json'),yard:{owner:'ranger',fingerprint:'x'}});
  assert.throws(()=>new Engine(profile,{storage:old}),/äldre version/);
});
test('the ranger lays own turnouts freely, boundaries only back, and never TKL\'s; failed storage keeps no request',()=>{
  const r=rig();
  r.engine.manual('Vx114','T',{operator:'ranger'});r.drain();r.advance(300);assert.equal(r.engine.turnouts.Vx114.position,'T');
  assert.throws(()=>r.engine.manual('Vx112','T',{operator:'ranger'}),/endast TKL får öppna/);
  r.engine.manual('Vx112','C',{operator:'ranger'});r.drain();r.advance(300);
  assert.throws(()=>r.engine.manual('Vx113','T',{operator:'ranger'}),/inte ansluten/);
  assert.throws(()=>r.engine.manual('Vx120','T',{operator:'ranger'}),/inte ansluten/);
  r.engine.manual('Vx112','T');r.drain();r.advance(300);assert.equal(r.engine.turnouts.Vx112.position,'T','TKL may open');
  const x=rig();x.storage.save=()=>{throw Error('disk full');};
  assert.throws(()=>x.engine.yard.request('right-11'),/spara/);assert.equal(x.engine.yard.requests.length,0);assert.ok(x.engine.storageFault);
  for(const change of [e=>{e.connected=false;},e=>{e.controls.stopAll=true;},e=>{e.controls.mode='remote';},e=>{e.field.setBlock('S131',true);e.drain();}]){
    const y=rig();change(Object.assign(y.engine,{field:y.field,drain:y.drain}));
    assert.equal(y.engine.yard.requestStatus('right-11').allowed,false);
  }
});
test('the ranger lays shunt routes inside the area and over a laid group, takes back only its own, never a main route',()=>{
  const r=rig();
  assert.throws(()=>r.engine.request('htvCu','htvSpIIIA',null,{operator:'ranger'}),/bara växeltågvägar/);
  assert.throws(()=>r.engine.request('tvv6/6','tvv3/10',null,{operator:'ranger'}),/kräver begäran Höger 11/);
  assert.throws(()=>r.engine.request('tvv2/5','tvv3/5',null,{operator:'ranger'}),/utanför rangerarens område/);
  const inside=r.engine.request('tvv6/6','tvv7/10',null,{operator:'ranger'});r.advance(6500);assert.equal(inside.state,'active',inside.reason);assert.equal(inside.operator,'ranger');
  assert.deepEqual(r.engine.routeTargets('tvv6/6','shunt','ranger').map(t=>t.id).sort(),['tvv7/10'],'only the laid route to take back while it lies');
  r.engine.cancel(inside.id,{operator:'ranger'});
  r.drain();r.advance(500);assert.equal(r.engine.routes.length,0);
  const tkl=r.engine.request('tvv6/6','tvv8/10');r.advance(6500);assert.equal(tkl.state,'active',tkl.reason);
  assert.throws(()=>r.engine.cancel(tkl.id,{operator:'ranger'}),/TKL:s/);
  assert.throws(()=>r.engine.request('tvv6/6','tvv8/10',null,{operator:'ranger'}),/TKL:s/);
  r.engine.cancel(tkl.id);r.drain();r.advance(500);
  const request=r.engine.yard.request('right-11');r.engine.yard.answer(request.id,true);r.drain();r.advance(500);
  assert.ok(r.engine.routeTargets('tvv6/6','shunt','ranger').some(t=>t.id==='tvv3/10'),'the group lying out opens the route to 11');
  const over=r.engine.request('tvv6/6','tvv3/10',null,{operator:'ranger'});r.advance(6500);assert.equal(over.state,'active',over.reason);
  assert.throws(()=>r.engine.yard.return(request.id,'ranger'),/Återta tågväg/);
  r.engine.cancel(over.id,{operator:'ranger'});r.drain();r.advance(500);
  r.engine.yard.return(request.id,'ranger');r.drain();r.advance(500);assert.equal(r.engine.yard.requests.length,0);
  const open=r.engine.yard.request('left-11');r.engine.yard.return(open.id,'ranger');
  assert.equal(r.engine.yard.requests.length,0);assert.match(r.engine.journal[0].message,/återkallad av rangeraren/);
  assert.equal(r.engine.snapshot().manualRanger.Vx114.allowed,true);assert.equal('Vx120' in r.engine.snapshot().manualRanger,false);
});
