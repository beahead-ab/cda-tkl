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
    if(req.url==='/v1/pair'){let body='';for await(const c of req)body+=c;const data=JSON.parse(body);assert.equal(data.device_kind,'tkl_terminal');assert.equal(data.pairing_code,'test-code');clientId=data.client_id;pairs++;return res.end(JSON.stringify({protocol_version:1,client_id:clientId,access_token:'integration-private-token'}));}
    if(req.headers.authorization!=='Bearer integration-private-token'){res.writeHead(401);return res.end('{}');}
    const common={protocol_version:1,publication_id:'pub1',active_day:'Dagl'};
    if(req.url==='/v1/tkl/context?station_id=cda')return res.end(JSON.stringify({...common,station:{id:'cda',name:'Charlottendal'},movements:{m1:{revision:1,arrival:'arrived',departure:'waiting',actualTrack:'1'}},connection_states:[]}));
    if(req.url==='/v1/display')return res.end(JSON.stringify({...common,revision:1,clock:{configured:true,time:'12:00:00',running:true,speed:4},trains:[{id:'m1',station_id:'cda',train_number:'P123',track:'1'}]}));
    res.writeHead(404);res.end('{}');});
  await new Promise(r=>gateway.listen(0,'127.0.0.1',r));const port=await freePort(),wire=await freePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-trainmeet-'));let child,output='';
  const launch=()=>{child=spawn(process.execPath,['src/server.mjs'],{cwd,env:{...process.env,CHARLOTTENDAL_AUTH_MODE:'cloudflare',CHARLOTTENDAL_PUBLIC_ORIGIN:'',CHARLOTTENDAL_PORT:String(port),CHARLOTTENDAL_WIRE_PORT:String(wire),CHARLOTTENDAL_STATE_DIR:dir,CHARLOTTENDAL_TRAINMEET_ORIGIN:''}});child.stderr.on('data',c=>{output+=c;});};
  const state=async()=>(await fetch('http://127.0.0.1:'+port+'/api/state')).json();
  const stop=async()=>{const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;};
  try{launch();const initial=await until(state);assert.equal(initial.trainMeet.status,'unconfigured');
    const configure=await fetch('http://127.0.0.1:'+port+'/api/trainmeet/configure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...initial.trainMeet,origin:'http://127.0.0.1:'+gateway.address().port})});assert.equal(configure.status,200);
    const configured=await configure.json();assert.equal(configured.status,'unpaired');assert.equal(requests.length,0);
    const response=await fetch('http://127.0.0.1:'+port+'/api/trainmeet/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...configured,stationId:'cda',code:'test-code'})});assert.equal(response.status,200);assert.ok(!(await response.text()).includes('integration-private-token'));
    let s=await state();assert.equal(s.trainMeet.context.trains[0].train_number,'P123');assert.equal(s.routes.length,0);assert.ok(Object.values(s.blocks).every(b=>b.occupied===null));assert.equal(s.clock.authority,'local');
    await stop();launch();s=await until(async()=>{const v=await state();return v.trainMeet.status==='connected'?v:null;});assert.equal(s.trainMeet.context.movements.length,1);assert.equal(pairs,1);assert.ok(requests.filter(r=>r.startsWith('POST')).every(r=>r==='POST /v1/pair'));assert.equal(output,'');
    assert.equal(fs.statSync(path.join(dir,'trainmeet.json')).mode&0o777,0o600);
  }finally{if(child?.exitCode===null)await stop();await new Promise(r=>gateway.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
