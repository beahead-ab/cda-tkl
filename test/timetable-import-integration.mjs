import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('..',import.meta.url));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function until(fn){for(let i=0;i<150;i++){try{const v=await fn();if(v)return v;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error('Import integration timed out');}
test('process imports files, edits and activates reviewed rows, selects sources and restores state without field orders',{timeout:20000},async()=>{
  const port=await freePort(),wire=await freePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-import-test-'));let child,output='';
  const launch=(key='test-only')=>{child=spawn(process.execPath,['--import','./test/fixtures/timetable-ai-mock.mjs','src/server.mjs'],{cwd,env:{...process.env,CHARLOTTENDAL_AUTH_MODE:'cloudflare',CHARLOTTENDAL_PUBLIC_ORIGIN:'',CHARLOTTENDAL_PORT:String(port),CHARLOTTENDAL_WIRE_PORT:String(wire),CHARLOTTENDAL_STATE_DIR:dir,OPENAI_API_KEY:key,CHARLOTTENDAL_TRAINMEET_ORIGIN:''}});child.stderr.on('data',c=>{output+=c;});};
  const request=(url,data)=>fetch('http://127.0.0.1:'+port+url,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:undefined);
  const view=async()=>(await request('/api/timetable-import')).json();
  const stop=async()=>{const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done;};
  try{
    launch();let v=await until(view);assert.equal(v.active,null);
    const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(70000)]).toString('base64');
    const r=await request('/api/timetable-import/begin',{sessionId:v.sessionId,revision:v.revision,stationHint:'Charlottendal',files:[{name:'panel.png',mime:'image/png',data:png},{name:'dag.pdf',mime:'application/pdf',data:Buffer.from('%PDF-1.4\nTest').toString('base64')}]});assert.equal(r.status,202);
    v=await until(async()=>{const n=await view();return n.draft?.status==='review'?n:null;});assert.equal(v.draft.rows.length,2);assert.equal(v.active,null);assert.ok(!JSON.stringify(v).includes(png));assert.ok(!JSON.stringify(v).includes('test-only'));
    const source=await request('/api/timetable-import/source/'+v.draft.id+'/2');assert.equal(source.headers.get('content-type'),'application/pdf');assert.ok(source.headers.get('content-disposition').startsWith('attachment'));assert.ok((await source.text()).startsWith('%PDF-'));
    const rows=structuredClone(v.draft.rows);rows[1].track='2';let response=await request('/api/timetable-import/save',{sessionId:v.sessionId,revision:v.revision,title:'Granskad provtidtabell',rows});assert.equal(response.status,200);v=await response.json();
    response=await request('/api/timetable-import/activate',{sessionId:v.sessionId,revision:v.revision,reviewed:true});assert.equal(response.status,200);v=await response.json();assert.equal(v.source,'import');assert.equal(v.active.rows[1].track,'2');
    const state=await(await request('/api/state')).json();assert.equal(state.routes.length,0);assert.ok(Object.values(state.blocks).every(b=>b.occupied===null));assert.equal(state.trainMeet.status,'unconfigured');assert.equal(state.clock.authority,'local');
    await stop();launch('');v=await until(view);assert.equal(v.active.title,'Granskad provtidtabell');assert.equal(v.source,'import');
    response=await request('/api/timetable-import/select',{sessionId:v.sessionId,revision:v.revision,source:'trainmeet'});assert.equal(response.status,200);v=await response.json();assert.equal(v.source,'trainmeet');assert.equal(v.active.rows.length,2);assert.equal(fs.statSync(path.join(dir,'timetable-import.json')).mode&0o777,0o600);assert.equal(output,'');
    assert.equal(v.aiConfigured,false);
    response=await request('/api/timetable-import/manual',{sessionId:v.sessionId,revision:v.revision});assert.equal(response.status,200);v=await response.json();
    assert.equal(v.active.title,'Granskad provtidtabell');const manualRows=structuredClone(v.draft.rows);Object.assign(manualRows[0],{trainNumber:'M42',day:'Dagl',departure:'13:10',track:'1a'});
    response=await request('/api/timetable-import/save',{sessionId:v.sessionId,revision:v.revision,title:'Manuellt skapad',rows:manualRows});assert.equal(response.status,200);v=await response.json();
    response=await request('/api/timetable-import/activate',{sessionId:v.sessionId,revision:v.revision,reviewed:true});assert.equal(response.status,200);v=await response.json();assert.equal(v.active.kind,'manual');assert.equal(v.source,'import');
    await stop();launch('');v=await until(view);assert.equal(v.active.rows[0].trainNumber,'M42');
    response=await request('/api/timetable-import/edit',{sessionId:v.sessionId,revision:v.revision});assert.equal(response.status,200);v=await response.json();
    response=await request('/api/timetable-import/append',{sessionId:v.sessionId,revision:v.revision});assert.equal(response.status,200);v=await response.json();assert.equal(v.draft.rows.length,2);assert.equal(v.active.rows.length,1);
    const manualState=await(await request('/api/state')).json();assert.equal(manualState.routes.length,0);assert.ok(Object.values(manualState.blocks).every(b=>b.occupied===null));assert.equal(manualState.clock.authority,'local');assert.equal(manualState.trainMeet.status,'unconfigured');assert.equal(output,'');
  }finally{if(child?.exitCode===null)await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
