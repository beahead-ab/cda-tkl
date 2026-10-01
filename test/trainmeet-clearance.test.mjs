import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainMeet,lineActions,CLEARANCE_ACTIONS} from '../src/trainmeet.mjs';
import {lineStatus,needsAttention} from '../public/clearance-text.js';

function rig(){
  let saved,now=100000;const calls=[],responses={};
  const storage={load:(n,d)=>structuredClone(saved??d),save:(n,d)=>{saved=structuredClone(d);}};
  const train={id:'m1',station_id:'cda',train_number:'3581',track:'3',arrival_time:'05:00',departure_time:'05:05'};
  const display={protocol_version:1,publication_id:'pub',active_day:'Dagl',revision:3,meet:{name:'Grimslöv 2027'},clock:{time:'08:43:27',speed:4,running:true,configured:true},
    stations:[{id:'cda',name:'Charlottendal'},{id:'lek',name:'Lekby'},{id:'vag',name:'Vagnsta'},{id:'x',name:'X'},{id:'y',name:'Y'}],
    connections:[{id:'cda-lek',station_a_id:'cda',station_b_id:'lek',track_type:'double'},{id:'vag-cda',station_a_id:'vag',station_b_id:'cda',track_type:'single'},{id:'x-y',station_a_id:'x',station_b_id:'y',track_type:'double'}],
    trains:[train,{id:'m2',station_id:'lek',train_number:'9'}]};
  const context={protocol_version:1,publication_id:'pub',active_day:'Dagl',station:{id:'cda',name:'Charlottendal'},movements:{},shift:null,previous_shift:null,
    connection_states:[{id:'cda-lek',state:'free',from_station_id:null,to_station_id:null,train_number:null},{id:'vag-cda',state:'requested',from_station_id:'vag',to_station_id:'cda',train_number:'3581'},{id:'x-y',state:'occupied',from_station_id:'x',to_station_id:'y',train_number:'1'}]};
  const timetable={schema_version:3,publication_id:'pub',active_day:'Dagl',stations:[{id:'cda',name:'Charlottendal'}],tracks:[{id:'t3',station_id:'cda',display_label:'3',operating_point_id:null}],trains:[{...train,track_id:'t3'}]};
  const fetcher=async(url,options={})=>{const path=new URL(url).pathname;calls.push({path,method:options.method||'GET',body:options.body?JSON.parse(options.body):null});
    if(responses[path]){const r=responses[path];return new Response(JSON.stringify(r.body),{status:r.status});}
    const data=path==='/v1/pair'?{protocol_version:1,client_id:'cda-tkl',access_token:'TOKEN'}:path==='/v1/tkl/context'?context:path==='/v1/timetable'?timetable:path==='/v1/display'?display:{ok:true};
    return new Response(JSON.stringify(data),{status:200});};
  const service=new TrainMeet({origin:'https://trainmeet.example',storage,fetcher,now:()=>now});
  const journal=[];service.on('journal',text=>journal.push(text));
  return {service,calls,context,display,responses,journal,storage,fetcher,now:n=>{now=n;},posts:()=>calls.filter(c=>c.method==='POST'&&c.path!=='/v1/pair')};
}
const pair=r=>r.service.pair({...r.service.view(),stationId:'cda',code:'458982'});
const shift={shift_id:'s1',operator_name:'Casper',terminal_name:'cda-tkl',status:'active',started_at:'2026-09-30T06:00:00',ended_at:null,handover_note:null,updated_at:'2026-09-30T06:00:00'};

test('lines join the catalogue with live state: neighbour names, direction and the actions this station may take',async()=>{
  const r=rig();await pair(r);const lines=r.service.view().context.lines;
  assert.deepEqual(lines.map(l=>[l.id,l.neighborName,l.trackType,l.state,l.direction,l.trainNumber,l.actions]),[
    ['cda-lek','Lekby','double','free','','',['request']],
    ['vag-cda','Vagnsta','single','requested','in','3581',['accept','reject']]]);
  assert.equal(r.service.view().context.connections.length,3,'the raw state list is still exposed');
  assert.equal(r.service.view().contract,'TrainMeet HTTP v1 · TKL-terminal');
  for(const [state,direction,expected] of [['free','',['request']],['requested','out',['cancel']],['requested','in',['accept','reject']],['reserved','out',['depart','cancel']],['reserved','in',[]],['occupied','in',['arrive']],['occupied','out',[]],['unknown','',[]]])assert.deepEqual(lineActions(state,direction),expected,state+'/'+direction);
  assert.deepEqual(CLEARANCE_ACTIONS,['request','accept','reject','cancel','depart','arrive']);
  // A line whose state the server no longer reports is shown as unknown, never as free.
  r.context.connection_states=r.context.connection_states.filter(c=>c.id!=='cda-lek');
  await r.service.refresh();assert.equal(r.service.view().context.lines[0].state,'unknown');assert.deepEqual(r.service.view().context.lines[0].actions,[]);
});

test('clearance steps are posted only for own lines during a shift; refusals keep the server wording and re-read the context',async()=>{
  const r=rig();await pair(r);
  await assert.rejects(()=>r.service.clearance({...r.service.view(),connectionId:'vag-cda',action:'accept'}),/tas i tjänst/);
  r.context.shift=shift;await r.service.refresh();
  await assert.rejects(()=>r.service.clearance({...r.service.view(),connectionId:'x-y',action:'arrive'}),/hör inte till stationen/);
  await assert.rejects(()=>r.service.clearance({...r.service.view(),connectionId:'cda-lek',action:'request',trainNumber:'P12'}),/tågnumret med siffror/);
  await assert.rejects(()=>r.service.clearance({...r.service.view(),connectionId:'cda-lek',action:'launch'}),/Okänd klareringsåtgärd/);
  await assert.rejects(()=>r.service.clearance({sessionId:'other',revision:0,connectionId:'cda-lek',action:'request',trainNumber:'3581'}),/ändrats/);
  assert.equal(r.posts().length,0);
  r.context.connection_states[1]={id:'vag-cda',state:'reserved',from_station_id:'vag',to_station_id:'cda',train_number:'3581'};
  const accepted=await r.service.clearance({...r.service.view(),connectionId:'vag-cda',action:'accept',trainNumber:''});
  assert.deepEqual(r.posts().at(-1),{path:'/v1/tkl/clearance',method:'POST',body:{station_id:'cda',connection_id:'vag-cda',action:'accept',train_number:''}});
  assert.equal(accepted.context.lines[1].state,'reserved');assert.deepEqual(accepted.context.lines[1].actions,[]);
  const before=r.calls.length;
  r.responses['/v1/tkl/clearance']={status:409,body:{error:'tkl_clearance_action_rejected',message:'Sträckan är redan upptagen'}};
  await assert.rejects(()=>r.service.clearance({...r.service.view(),connectionId:'cda-lek',action:'request',trainNumber:'3581'}),e=>e.message==='Sträckan är redan upptagen'&&e.status===409);
  assert.ok(r.calls.slice(before).some(c=>c.path==='/v1/tkl/context'),'the context is read back after a refusal');
  assert.equal(r.service.view().status,'connected');assert.equal(r.service.view().error,'');
  r.responses['/v1/tkl/clearance']={status:500,body:{message:'internal'}};
  await assert.rejects(()=>r.service.clearance({...r.service.view(),connectionId:'cda-lek',action:'request',trainNumber:'3581'}),/svarade med fel 500/);
  delete r.responses['/v1/tkl/clearance'];
  await r.service.clearance({...r.service.view(),connectionId:'cda-lek',action:'request',trainNumber:'3581'});
  assert.deepEqual(r.posts().at(-1).body,{station_id:'cda',connection_id:'cda-lek',action:'request',train_number:'3581'});
  assert.deepEqual(r.journal,['Klarering godkänd · tåg 3581 · Vagnsta.','Klarering begärd · tåg 3581 · Lekby.']);
});

test('an action waits for a poll in flight instead of interleaving with it',async()=>{
  const r=rig();await pair(r);r.context.shift=shift;
  r.now(200000);const poll=r.service.refresh();
  assert.equal(r.service.view().busy,true);
  const action=r.service.clearance({...r.service.view(),connectionId:'vag-cda',action:'reject'});
  await poll;await action;
  const order=r.calls.map(c=>c.method+' '+c.path);
  assert.ok(order.lastIndexOf('GET /v1/tkl/context')>order.indexOf('POST /v1/tkl/clearance'),'context re-read after the action');
  assert.ok(order.indexOf('POST /v1/tkl/clearance')>order.indexOf('GET /v1/display'),'the poll finished first');
  assert.equal(r.service.view().busy,false);
});

test('line wording follows state and direction; only incoming requests demand attention',()=>{
  const base={neighborName:'Lekby',trainNumber:'3581'};
  assert.equal(lineStatus({...base,state:'free',direction:''}),'Fri');
  assert.equal(lineStatus({...base,state:'requested',direction:'in'}),'Förfrågan från Lekby · tåg 3581');
  assert.equal(lineStatus({...base,state:'requested',direction:'out'}),'Begärd av oss · tåg 3581 mot Lekby');
  assert.equal(lineStatus({...base,state:'reserved',direction:'out'}),'Klart · tåg 3581 får avgå mot Lekby');
  assert.equal(lineStatus({...base,state:'occupied',direction:'in'}),'tåg 3581 på väg från Lekby · bekräfta mottaget vid ankomst');
  assert.equal(lineStatus({...base,state:'unknown',direction:''}),'Okänt läge');
  assert.equal(needsAttention({state:'requested',direction:'in'}),true);
  assert.equal(needsAttention({state:'requested',direction:'out'}),false);
  assert.equal(needsAttention({state:'occupied',direction:'in'}),false);
});

import {movementStatus,movementActions,movementDone} from '../public/clearance-text.js';
test('movement declarations send unchanged fields with their current values and follow the TMBox order',async()=>{
  const r=rig();await pair(r);
  await assert.rejects(()=>r.service.movement({...r.service.view(),movementId:'m1',departure:'positioned'}),/tas i tjänst/);
  r.context.shift=shift;await r.service.refresh();
  await assert.rejects(()=>r.service.movement({...r.service.view(),movementId:'',departure:'positioned'}),/vilken tågrörelse/);
  await assert.rejects(()=>r.service.movement({...r.service.view(),movementId:'m1',departure:'flying'}),/Okänt avgångsläge/);
  await assert.rejects(()=>r.service.movement({...r.service.view(),movementId:'m1',arrival:'gone'}),/Okänt ankomstläge/);
  await assert.rejects(()=>r.service.movement({...r.service.view(),movementId:'m1'}),/Ingen ändring/);
  await assert.rejects(()=>r.service.movement({...r.service.view(),movementId:'m9',departure:'positioned'}),/finns inte på stationen/);
  assert.equal(r.posts().length,0);
  r.context.movements={m1:{revision:1,arrival:'approaching',departure:'none',actualTrack:'t3',crewReady:false,operatorNote:'Kort'}};
  await r.service.refresh();
  assert.deepEqual(r.service.view().context.movements,[{id:'m1',revision:1,arrival:'approaching',departure:'none',track:'t3',crewReady:false,note:'Kort'}]);
  await r.service.movement({...r.service.view(),movementId:'m1',departure:'positioned'});
  assert.deepEqual(r.posts().at(-1).body,{station_id:'cda',movement_id:'m1',departure:'positioned',arrival:'approaching',event_type:'tkl_positioned',actual_track:'t3'});
  await r.service.movement({...r.service.view(),movementId:'m1',arrival:'arrived',actualTrack:' 4 '});
  assert.deepEqual(r.posts().at(-1).body,{station_id:'cda',movement_id:'m1',departure:'none',arrival:'arrived',event_type:'tkl_arrived',actual_track:'4'});
  assert.deepEqual(r.journal,['Tåg 3581: uppställt anmält hos TrainMeet.','Tåg 3581: ankommit anmält hos TrainMeet.']);
  const stop={arrival_time:'05:00',departure_time:'05:05'},departureOnly={departure_time:'05:05'},arrivalOnly={arrival_time:'05:00'};
  assert.deepEqual(movementActions(undefined,stop).map(a=>a.label),['Närmar sig']);
  assert.deepEqual(movementActions({arrival:'approaching'},stop).map(a=>a.label),['Ankommit']);
  assert.deepEqual(movementActions({arrival:'arrived',departure:'none'},stop).map(a=>a.label),['Uppställt']);
  assert.deepEqual(movementActions({arrival:'arrived',departure:'positioned'},stop).map(a=>a.label),['Förare på plats']);
  assert.deepEqual(movementActions({arrival:'arrived',departure:'ready'},stop),[]);
  assert.deepEqual(movementActions(undefined,departureOnly).map(a=>a.label),['Uppställt']);
  assert.deepEqual(movementActions({arrival:'arrived'},arrivalOnly),[]);
  assert.equal(movementStatus({arrival:'arrived',departure:'ready'},stop),'Ankommit · Redo · begär klarering på sträckan');
  assert.equal(movementStatus(undefined,departureOnly),'Ej uppställt');
  assert.equal(movementDone({arrival:'arrived',departure:'departed'},stop),true);
  assert.equal(movementDone({arrival:'arrived'},stop),false);
  assert.equal(movementDone({arrival:'arrived'},arrivalOnly),true);
});

test('pairing puts the station in service and keeps it, at most once a minute and never taking over; the name renames our own shift; disconnect closes it',async()=>{
  const r=rig();assert.equal(r.service.view().operatorName,'');await pair(r);
  const starts=()=>r.posts().filter(p=>p.path==='/v1/tkl/shift/start');
  r.responses['/v1/tkl/shift/start']={status:200,body:{shift}};
  r.now(150000);await r.service.refresh();
  assert.deepEqual(starts().map(p=>p.body),[{station_id:'cda',operator_name:'cda-tkl',terminal_name:'cda-tkl',take_over:false}],'the TKL id names the station until an operator chooses a name');
  r.now(180000);await r.service.refresh();assert.equal(starts().length,1,'no retry within a minute');
  r.now(220000);await r.service.refresh();assert.equal(starts().length,2);
  r.context.shift={...shift,operator_name:'cda-tkl',terminal_name:'cda-tkl'};r.now(300000);await r.service.refresh();assert.equal(starts().length,2,'nothing to do once the station is manned');
  assert.ok(r.journal.includes('Stationen i tjänst hos TrainMeet som cda-tkl.'));
  await assert.rejects(()=>r.service.setOperatorName({sessionId:'x',revision:0,operatorName:'Casper'}),/ändrats/);
  await assert.rejects(()=>r.service.setOperatorName({...r.service.view(),operatorName:'x'.repeat(81)}),/80 tecken/);
  const named=await r.service.setOperatorName({...r.service.view(),operatorName:' Casper '});
  assert.equal(named.operatorName,'Casper');assert.equal(r.storage.load('trainmeet.json',{}).operatorName,'Casper');
  assert.deepEqual(starts().at(-1).body,{station_id:'cda',operator_name:'Casper',terminal_name:'cda-tkl',take_over:true},'our own shift is renamed by taking it over');
  r.context.shift={...shift,operator_name:'Webb',terminal_name:'browser-tkl'};await r.service.refresh();const before=starts().length;
  await r.service.setOperatorName({...r.service.view(),operatorName:'Anna'});assert.equal(starts().length,before,'another terminal\x27s shift is never taken over by a rename');
  r.context.shift=null;r.responses['/v1/tkl/shift/start']={status:409,body:{error:'tkl_unavailable',message:'TKL-driftlagret är inte tillgängligt'}};
  r.now(400000);await r.service.refresh();assert.equal(r.service.view().serviceError,'TKL-driftlagret är inte tillgängligt');assert.equal(r.service.view().status,'connected');
  const again=new TrainMeet({origin:'https://trainmeet.example',storage:r.storage,fetcher:r.fetcher,now:()=>500000});
  assert.equal(again.view().operatorName,'Anna');assert.equal(again.view().paired,true);
  r.context.shift={...shift,operator_name:'Anna',terminal_name:'cda-tkl'};await r.service.refresh();r.responses['/v1/tkl/shift/finish']={status:200,body:{}};
  await r.service.disconnect(r.service.view());
  assert.deepEqual(r.posts().at(-1),{path:'/v1/tkl/shift/finish',method:'POST',body:{station_id:'cda',shift_id:'s1',status:'closed',note:''}});
  assert.equal(r.service.view().paired,false);assert.ok(r.journal.includes('Stationen ur tjänst hos TrainMeet (frånkopplad).'));
});
test('an older file with the TMBox-mode setting keeps its operator name',()=>{
  const legacy={version:1,clientId:'cda-tkl',stationId:'cda',token:'t',origin:'https://trainmeet.example',autoShift:{enabled:false,operatorName:'Casper'}};
  const service=new TrainMeet({storage:{load:()=>structuredClone(legacy),save(){}}});
  assert.equal(service.view().operatorName,'Casper');assert.equal(service.view().paired,true);assert.ok(!('autoShift' in service.data));
});

test('the station list comes from the public display without credentials and is validated',async()=>{
  const r=rig();
  const list=await r.service.stations();
  assert.deepEqual(list,{origin:'https://trainmeet.example',meet:'Grimslöv 2027',stations:[{id:'cda',name:'Charlottendal',code:''},{id:'lek',name:'Lekby',code:''},{id:'vag',name:'Vagnsta',code:''},{id:'x',name:'X',code:''},{id:'y',name:'Y',code:''}]});
  assert.ok(r.calls.every(c=>!c.body),'no pairing happened');assert.equal(r.calls.at(-1).path,'/v1/display');
  r.display.stations=[{id:'cda',name:{bad:true}}];await assert.rejects(()=>r.service.stations(),/stationslista/);
  const unconfigured=new TrainMeet({storage:{load:(n,d)=>structuredClone(d),save(){}}});await assert.rejects(()=>unconfigured.stations(),/inte angiven/);
});
