import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function until(fn){const end=Date.now()+12000;while(Date.now()<end){try{const v=await fn();if(v)return v;}catch{}await new Promise(r=>setTimeout(r,80));}throw Error('Timed out');}
const stop=c=>c.exitCode===null&&c.signalCode===null?new Promise(r=>{c.once('exit',r);c.kill();}):Promise.resolve();
test('standalone kernel owns handover, rejects stale clients and spoofed ranger roles, and restores ownership after restart',{timeout:30000},async()=>{
  const [app,sim,wire]=await Promise.all([freePort(),freePort(),freePort()]);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cda-yard-'));
  const env={...process.env,CHARLOTTENDAL_PROFILE:'network',CHARLOTTENDAL_AUTH_MODE:'cloudflare',CHARLOTTENDAL_PUBLIC_ORIGIN:'',CHARLOTTENDAL_PORT:String(app),CHARLOTTENDAL_SIM_PORT:String(sim),CHARLOTTENDAL_WIRE_PORT:String(wire),CHARLOTTENDAL_STATE_DIR:dir};
  const children=[];let output='';
  const start=script=>{const c=spawn(process.execPath,[script],{cwd:root,env});children.push(c);c.stdout.on('data',d=>output+=d);c.stderr.on('data',d=>output+=d);return c;};
  const get=async()=>(await fetch(`http://127.0.0.1:${app}/api/state`)).json();
  const post=async(command,data={},expected=200)=>{const r=await fetch(`http://127.0.0.1:${app}/api/${command}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const v=await r.json();assert.equal(r.status,expected,JSON.stringify(v));return v;};
  const ready=()=>until(async()=>{const s=await get();return s.yard?.change.allowed&&s;});
  try{
    start('src/simulator.mjs');let backend=start('src/server.mjs');
    const initial=await ready();assert.equal(initial.yard.owner,'tkl');
    await post('yard-authority',{owner:'ranger'},409);
    await post('yard-authority',{owner:'ranger',...initial.operating});
    assert.equal((await get()).yard.owner,'ranger');
    await post('yard-authority',{owner:'tkl',...initial.operating},409);
    // The existing TKL HTTP endpoint cannot acquire the trusted ranger role.
    assert.match((await post('turnout',{name:'Vx114',position:'T',operator:'ranger'},400)).error,/rangerställverket/);
    await post('route',{from:'htvCu',to:'htvSpIIIA'});
    const active=await until(async()=>{const s=await get();return s.routes[0]?.state==='active'&&s;});
    assert.equal(active.yard.change.allowed,false);
    await post('yard-authority',{owner:'tkl',...active.operating},400);
    await post('panel-reset');
    const reset=await ready();assert.equal(reset.yard.owner,'ranger');
    await stop(backend);backend=start('src/server.mjs');
    const restored=await ready();assert.equal(restored.yard.owner,'ranger');
    await post('yard-authority',{owner:'tkl',...reset.operating},409);
    await post('yard-authority',{owner:'tkl',...restored.operating});
    assert.equal((await get()).yard.owner,'tkl');
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'controls.json'))).yard.owner,'tkl');
  }catch(e){e.message+='\n'+output;throw e;}finally{await Promise.all(children.map(stop));fs.rmSync(dir,{recursive:true,force:true});}
});
