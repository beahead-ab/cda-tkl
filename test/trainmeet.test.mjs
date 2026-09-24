import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainMeet} from '../src/trainmeet.mjs';
function rig(){let saved,now=100000;const calls=[],storage={load:(n,d)=>structuredClone(saved??d),save:(n,d)=>{saved=structuredClone(d);}};
  const context={protocol_version:1,publication_id:'meet-v1',active_day:'Dagl',station:{id:'cda',name:'Charlottendal'},movements:{m1:{revision:1,arrival:'WAITING',departure:'READY',actualTrack:'track1'}},connection_states:[{id:'line1',state:'free'}]};
  const display={protocol_version:1,publication_id:'meet-v1',active_day:'Dagl',revision:10,meet:{name:'Höstträffen'},clock:{time:'12:15:00',speed:4,running:true,configured:true},trains:[{id:'m1',station_id:'cda',train_number:'P123',track:'1',arrival_time:'12:20',departure_time:'12:22'},{id:'m2',station_id:'other',train_number:'P124'}],connection:{pairing_code:'NEVER EXPOSE'}};
  let error=false;const fetcher=async(url,options)=>{calls.push({url,options});if(error)throw Error('Network failure with secret metadata');const data=url.endsWith('/v1/pair')?{protocol_version:1,client_id:JSON.parse(options.body).client_id,access_token:'PRIVATE-TOKEN'}:url.includes('/v1/tkl/context?')?context:display;return new Response(JSON.stringify(data),{status:200});};
  const service=new TrainMeet({origin:'https://trainmeet.example',storage,fetcher,now:()=>now});
  return {service,storage,calls,context,display,now:n=>{now=n;},fail:()=>{error=true;},saved:()=>saved,fetcher};
}
const pair=r=>r.service.pair({...r.service.view(),stationId:'cda',code:'PAIRING'});
test('normal v1 pairing keeps credentials server-side and reads exact station contract without writing movements',async()=>{const r=rig();await pair(r);assert.equal(r.service.view().status,'connected');assert.equal(r.service.view().context.trains.length,1);assert.equal(r.service.view().context.movements[0].track,'track1');assert.equal(r.saved().token,'PRIVATE-TOKEN');assert.ok(!JSON.stringify(r.service.view()).includes('PRIVATE'));assert.ok(!JSON.stringify(r.service.view()).includes('NEVER'));assert.ok(!JSON.stringify(r.saved()).includes('PAIRING'));assert.equal(r.calls[0].options.method,'POST');assert.ok(r.calls.slice(1).every(c=>c.options.method==='GET'));assert.ok(r.calls.every(c=>c.options.redirect==='error'));assert.equal(r.calls[1].options.headers.Authorization,'Bearer PRIVATE-TOKEN');});
test('duplicate snapshots replace by identity; reconnect never accumulates movements or fabricates field reports',async()=>{const r=rig();await pair(r);await r.service.refresh();await r.service.refresh();assert.equal(r.service.view().context.trains.length,1);assert.equal(r.service.view().context.movements.length,1);assert.ok(r.calls.filter(c=>c.options.method==='POST').every(c=>c.url.endsWith('/v1/pair')));assert.ok(!Object.hasOwn(r.service.view(),'blocks'));assert.ok(!Object.hasOwn(r.service.view(),'signals'));});
test('old revisions, wrong station/publication/day and invalid clocks preserve last good context as stale',async()=>{for(const corrupt of [r=>{r.display.revision=9;},r=>{r.context.station.id='other';},r=>{r.display.active_day='Dag2';},r=>{r.display.publication_id='other';},r=>{r.display.clock.time='99:00:00';},r=>{r.context.movements.m1.revision=0;},r=>{r.display.trains.push({...r.display.trains[0]});}]){const r=rig();await pair(r);const previous=structuredClone(r.service.view().context);corrupt(r);await r.service.refresh();assert.equal(r.service.view().stale,true);assert.deepEqual(r.service.view().context,previous);}});
test('timeout/network failure marks old data and restart requires a fresh snapshot',async()=>{const r=rig();await pair(r);r.now(116000);assert.equal(r.service.view().stale,true);r.fail();await r.service.refresh();assert.equal(r.service.view().status,'disconnected');assert.ok(!r.service.view().error.includes('secret'));const next=new TrainMeet({origin:'https://trainmeet.example',storage:r.storage,fetcher:r.fetcher});assert.equal(next.view().context,null);assert.equal(next.view().stale,true);});
test('stale sessions and busy pairing are refused; failed durable save never replaces existing credentials',async()=>{const r=rig(),old=r.service.view();await pair(r);await assert.rejects(()=>r.service.pair({...old,stationId:'cda',code:'A'}),/ändrats/);r.storage.save=()=>{throw Error('disk full with secret');};await assert.rejects(()=>pair(r),/kunde inte anslutas/);assert.equal(r.service.data.token,'PRIVATE-TOKEN');assert.equal(r.service.view().context.station.id,'cda');assert.equal(r.service.view().stale,true);});
test('credentials never move to another origin, insecure remote URL is refused and disconnect persists locally',async()=>{const r=rig();await pair(r);assert.throws(()=>new TrainMeet({origin:'https://different.example',storage:r.storage}),/adressen har ändrats/);assert.throws(()=>new TrainMeet({origin:'http://192.168.1.2',storage:r.storage}),/HTTPS/);r.service.disconnect(r.service.view());assert.equal(r.saved().token,'');assert.equal(r.service.view().context,null);assert.equal(r.service.view().status,'unpaired');});
test('response size is bounded before parsing',async()=>{const r=rig();r.service.fetcher=async()=>new Response('{}',{headers:{'content-length':'2000001'}});await assert.rejects(()=>pair(r),/för stort/);assert.equal(r.saved(),undefined);});
test('operator-selected origin persists without sending a request or copying credentials',()=>{
  const r=rig(),service=new TrainMeet({storage:r.storage,fetcher:r.fetcher});
  assert.equal(service.view().origin,'');assert.equal(service.view().originLocked,false);
  service.configure({...service.view(),origin:'http://localhost:8787/'});
  assert.equal(service.view().origin,'http://localhost:8787');assert.equal(service.view().status,'unpaired');assert.equal(r.calls.length,0);
  const restarted=new TrainMeet({storage:r.storage,fetcher:r.fetcher});
  assert.equal(restarted.view().origin,'http://localhost:8787');assert.equal(restarted.view().paired,false);
  assert.equal(restarted.data.clientId,service.data.clientId);
});
test('changing origin requires disconnect and cannot redirect the existing token',async()=>{
  const r=rig(),service=new TrainMeet({storage:r.storage,fetcher:r.fetcher});
  service.configure({...service.view(),origin:'https://trainmeet.example'});
  await service.pair({...service.view(),stationId:'cda',code:'PAIRING'});
  assert.throws(()=>service.configure({...service.view(),origin:'https://different.example'}),/Koppla från/);
  assert.equal(service.view().origin,'https://trainmeet.example');assert.equal(r.saved().token,'PRIVATE-TOKEN');
  service.disconnect(service.view());service.configure({...service.view(),origin:'https://different.example'});
  assert.equal(service.data.token,'');assert.equal(service.view().context,null);assert.equal(service.view().stationId,'');
  assert.ok(r.calls.every(c=>c.url.startsWith('https://trainmeet.example/')));
});
test('stale, busy and installation-locked origin changes are refused',()=>{
  const r=rig();assert.throws(()=>r.service.configure({...r.service.view(),origin:'https://different.example'}),/fast TrainMeet/);
  const service=new TrainMeet({storage:r.storage}),old=service.view();
  service.configure({...old,origin:'https://trainmeet.example'});
  assert.throws(()=>service.configure({...old,origin:'https://different.example'}),/ändrats/);
  service.busy=true;assert.throws(()=>service.configure({...service.view(),origin:''}),/pågår/);
});
test('origin validation rejects unsafe or ambiguous destinations without saving them',()=>{
  for(const origin of ['http://192.168.1.2:8787','http://trainmeet.local:8787','https://name:password@trainmeet.example','https://trainmeet.example/path','https://trainmeet.example?token=x','https://trainmeet.example/#secret','file:///tmp/trainmeet',null,'not an address']){
    const r=rig(),service=new TrainMeet({storage:r.storage});
    assert.throws(()=>service.configure({...service.view(),origin}));assert.equal(r.saved(),undefined);assert.equal(service.view().origin,'');
  }
});
test('failed origin save preserves the old connection settings and revision',()=>{
  const r=rig(),service=new TrainMeet({storage:r.storage});service.configure({...service.view(),origin:'http://127.0.0.1:8787'});
  const old=service.view();r.storage.save=()=>{throw Error('disk path should not leak');};
  assert.throws(()=>service.configure({...service.view(),origin:'https://different.example'}),/tidigare inställningen/);
  assert.deepEqual(service.view(),old);assert.equal(r.saved().origin,old.origin);
});
