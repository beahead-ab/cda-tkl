import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('..',import.meta.url));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function until(fn){for(let i=0;i<150;i++){try{const r=await fn();if(r)return r;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error('TrainMeet integration timed out');}
test('TKL process pairs and reads TrainMeet, keeps tokens private, survives restart and never sends field orders from timetable data',{timeout:20000},async()=>{
  let clientId,pairs=0,requests=[];const gateway=http.createServer(async(req,res)=>{requests.push(req.method+' '+req.url);res.setHeader('Content-Type','application/json');
    if(req.url==='/v1/pair'){let body='';for await(const c of req)body+=c;const data=JSON.parse(body);assert.equal(data.device_kind,'tkl_terminal');assert.equal(data.client_id,'cda-tkl-demo');assert.equal(data.display_name,'cda-tkl-demo');assert.equal(data.pairing_code,'test-code');clientId=data.client_id;pairs++;return res.end(JSON.stringify({protocol_version:1,client_id:clientId,access_token:'integration-private-token'}));}
    if(req.headers.authorization!=='Bearer integration-private-token'){res.writeHead(401);return res.end('{}');}
    const common={protocol_version:1,publication_id:'pub1',active_day:'Dagl'};
    if(req.url==='/v1/tkl/context?station_id=cda')return res.end(JSON.stringify({...common,station:{id:'cda',name:'Charlottendal'},movements:{m1:{revision:1,arrival:'arrived',departure:'waiting',actualTrack:'track1'}},connection_states:[]}));
    if(req.url==='/v1/timetable?station_id=cda')return res.end(JSON.stringify({schema_version:3,publication_id:'pub1',active_day:'Dagl',stations:[{id:'cda'}],tracks:[{id:'track1',station_id:'cda',display_label:'1a'}],trains:[{id:'m1',station_id:'cda',train_number:'P123',track_id:'track1',arrival_time:'11:55',departure_time:'12:05',note:'Testtidtabell'}]}));
    if(req.url==='/v1/display')return res.end(JSON.stringify({...common,stations:[{id:'cda',name:'Charlottendal'},{id:'lek',name:'Lekby'}],revision:1,clock:{configured:true,time:'12:00:00',running:true,speed:4},trains:[{id:'m1',station_id:'cda',train_number:'P123',track:'1'}]}));
    res.writeHead(404);res.end('{}');});
  await new Promise(r=>gateway.listen(0,'127.0.0.1',r));const port=await freePort(),wire=await freePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-trainmeet-'));let child,output='';
  const launch=()=>{child=spawn(process.execPath,['src/server.mjs'],{cwd,env:{...process.env,CHARLOTTENDAL_AUTH_MODE:'cloudflare',CHARLOTTENDAL_PUBLIC_ORIGIN:'',CHARLOTTENDAL_PORT:String(port),CHARLOTTENDAL_WIRE_PORT:String(wire),CHARLOTTENDAL_STATE_DIR:dir,CHARLOTTENDAL_TRAINMEET_ORIGIN:''}});child.stderr.on('data',c=>{output+=c;});};
  const state=async()=>(await fetch('http://127.0.0.1:'+port+'/api/state')).json();
  const stop=async()=>{const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;};
  try{launch();const initial=await until(state);assert.equal(initial.trainMeet.status,'unconfigured');assert.equal(initial.trainMeet.clientId,'cda-tkl');
    const configure=await fetch('http://127.0.0.1:'+port+'/api/trainmeet/configure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...initial.trainMeet,origin:'http://127.0.0.1:'+gateway.address().port,clientId:'cda-tkl-demo'})});assert.equal(configure.status,200);
    const configured=await configure.json();assert.equal(configured.status,'unpaired');assert.equal(requests.length,0);
    const response=await fetch('http://127.0.0.1:'+port+'/api/trainmeet/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...configured,stationId:'cda',code:'test-code'})});assert.equal(response.status,200);assert.ok(!(await response.text()).includes('integration-private-token'));
    let s=await state();assert.equal(s.trainMeet.context.trains[0].train_number,'P123');assert.equal(s.trainMeet.context.trains[0].departure_time,'12:05');assert.equal(s.trainMeet.context.tracks[0].label,'1a');assert.ok(requests.includes('GET /v1/timetable?station_id=cda'));assert.equal(s.routes.length,0);assert.ok(Object.values(s.blocks).every(b=>b.occupied===null));assert.equal(s.clock.authority,'local');
    const entry={...s.destinations.entries[0],source:'trainmeet',stationId:'lek',phone:'123'};
    const saved=await fetch('http://127.0.0.1:'+port+'/api/destinations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:s.destinations.revision,entry})});assert.equal(saved.status,200);
    assert.deepEqual((await state()).destinations.entries[0],entry);
    await stop();launch();s=await until(async()=>{const v=await state();return v.trainMeet.status==='connected'?v:null;});assert.equal(s.trainMeet.context.movements.length,1);assert.equal(s.trainMeet.clientId,'cda-tkl-demo');assert.equal(pairs,1);assert.equal(s.destinations.entries[0].phone,'123');assert.equal(s.destinations.entries[0].stationId,'lek');assert.ok(requests.filter(r=>r.startsWith('POST')).every(r=>r==='POST /v1/pair'));assert.equal(output,'');
    assert.equal(fs.statSync(path.join(dir,'trainmeet.json')).mode&0o777,0o600);
  }finally{if(child?.exitCode===null)await stop();await new Promise(r=>gateway.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});

test('TKL process drives shifts, clearances and movement declarations through TrainMeet and journals accepted steps',{timeout:20000},async()=>{
  const posts=[];let shift=null,lineState={id:'cda-lek',state:'free',from_station_id:null,to_station_id:null,train_number:null};
  const gateway=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');let body='';for await(const c of req)body+=c;const data=body?JSON.parse(body):null;
    if(req.url==='/v1/pair')return res.end(JSON.stringify({protocol_version:1,client_id:data.client_id,access_token:'integration-private-token'}));
    if(req.headers.authorization!=='Bearer integration-private-token'){res.writeHead(401);return res.end('{}');}
    const common={protocol_version:1,publication_id:'pub1',active_day:'Dagl'};
    if(req.url==='/v1/tkl/context?station_id=cda')return res.end(JSON.stringify({...common,station:{id:'cda',name:'Charlottendal'},shift,previous_shift:null,movements:{},connection_states:[lineState]}));
    if(req.url==='/v1/timetable?station_id=cda')return res.end(JSON.stringify({schema_version:3,publication_id:'pub1',active_day:'Dagl',stations:[{id:'cda'}],tracks:[{id:'track1',station_id:'cda',display_label:'1a'}],trains:[{id:'m1',station_id:'cda',train_number:'3581',track_id:'track1',departure_time:'12:05'}]}));
    if(req.url==='/v1/display')return res.end(JSON.stringify({...common,stations:[{id:'cda',name:'Charlottendal'},{id:'lek',name:'Lekby'}],connections:[{id:'cda-lek',station_a_id:'cda',station_b_id:'lek',track_type:'double'}],revision:1,clock:{configured:true,time:'12:00:00',running:true,speed:4},trains:[{id:'m1',station_id:'cda',train_number:'3581',track:'1a',departure_time:'12:05'}]}));
    if(req.method==='POST'){posts.push({url:req.url,body:data});
      if(req.url==='/v1/tkl/shift/start'){shift={shift_id:'s1',operator_name:data.operator_name,terminal_name:data.terminal_name,status:'active',started_at:'2026-09-30T06:00:00'};return res.end(JSON.stringify({shift}));}
      if(req.url==='/v1/tkl/clearance'){if(data.action==='request'&&lineState.state!=='free'){res.writeHead(409);return res.end(JSON.stringify({error:'tkl_clearance_action_rejected',message:'Sträckan är redan upptagen'}));}lineState={...lineState,state:data.action==='request'?'requested':lineState.state,from_station_id:'cda',to_station_id:'lek',train_number:data.train_number};return res.end(JSON.stringify({action:data.action,connection:lineState,revision:2}));}
      if(req.url==='/v1/tkl/movement')return res.end(JSON.stringify({movement:{}}));
    }
    res.writeHead(404);res.end('{}');});
  await new Promise(r=>gateway.listen(0,'127.0.0.1',r));const port=await freePort(),wire=await freePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-trainmeet-'));
  const child=spawn(process.execPath,['src/server.mjs'],{cwd,env:{...process.env,CHARLOTTENDAL_AUTH_MODE:'cloudflare',CHARLOTTENDAL_PUBLIC_ORIGIN:'',CHARLOTTENDAL_PORT:String(port),CHARLOTTENDAL_WIRE_PORT:String(wire),CHARLOTTENDAL_STATE_DIR:dir,CHARLOTTENDAL_TRAINMEET_ORIGIN:''}});
  const state=async()=>(await fetch('http://127.0.0.1:'+port+'/api/state')).json();
  const call=async(name,payload)=>{const r=await fetch('http://127.0.0.1:'+port+'/api/trainmeet/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()};};
  try{
    const initial=await until(state);
    const configured=(await call('configure',{...initial.trainMeet,origin:'http://127.0.0.1:'+gateway.address().port})).body;
    const paired=(await call('pair',{...configured,stationId:'cda',code:'test-code'})).body;
    assert.deepEqual(paired.context.lines.map(l=>[l.neighborName,l.state,l.actions]),[['Lekby','free',['request']]]);
    assert.equal((await call('launch',{})).status,404);
    const early=await call('clearance',{...paired,connectionId:'cda-lek',action:'request',trainNumber:'3581'});assert.equal(early.status,409);assert.match(early.body.error,/trafikpasset/);assert.equal(posts.length,0);
    const started=await call('shift-start',{...paired,operatorName:'Casper'});assert.equal(started.status,200);assert.equal(started.body.context.shift.operatorName,'Casper');
    assert.deepEqual(posts.at(-1),{url:'/v1/tkl/shift/start',body:{station_id:'cda',operator_name:'Casper',terminal_name:'cda-tkl',take_over:false}});
    const requested=await call('clearance',{...started.body,connectionId:'cda-lek',action:'request',trainNumber:'3581'});assert.equal(requested.status,200);
    assert.deepEqual(posts.at(-1),{url:'/v1/tkl/clearance',body:{station_id:'cda',connection_id:'cda-lek',action:'request',train_number:'3581'}});
    assert.deepEqual(requested.body.context.lines[0].actions,['cancel']);assert.equal(requested.body.context.lines[0].direction,'out');
    const refused=await call('clearance',{...requested.body,connectionId:'cda-lek',action:'request',trainNumber:'3581'});assert.equal(refused.status,409);assert.equal(refused.body.error,'Sträckan är redan upptagen');
    const moved=await call('movement',{...requested.body,movementId:'m1',departure:'positioned'});assert.equal(moved.status,200);
    assert.deepEqual(posts.at(-1),{url:'/v1/tkl/movement',body:{station_id:'cda',movement_id:'m1',departure:'positioned',arrival:'none',event_type:'tkl_positioned',actual_track:'track1'}});
    const s=await state();const journal=JSON.stringify(s.events??s.journal??[]);
    for(const text of ['Trafikpass startat av Casper','Klarering begärd · tåg 3581 · Lekby','Tåg 3581: uppställt anmält'])assert.ok(journal.includes(text),'journal: '+text);
    assert.equal(s.routes.length,0);assert.ok(Object.values(s.blocks).every(b=>b.occupied===null),'no field state touched by clearances');
  }finally{const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;await new Promise(r=>gateway.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
