import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { signalLiveView } from '../public/signal-details.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url)));
const catalog=read('public/data/signal-catalog.json'),index=read('public/data/source/index.json');
const mast=name=>catalog.masts.find(m=>m.name===name);
test('signal catalog preserves all source bindings, both turnout managers and every signal relationship',()=>{
  assert.deepEqual(catalog.counts,{masts:66,virtual:11,sourceAspects:329,linkedOutputs:310,missingOutputs:19,unresolvedOutputs:0,relations:117});
  assert.equal(catalog.sourceHash,index.meta.sha256);
  const one=mast('1/5'),stop=one.aspects.find(a=>a.name==='Stop'),go=one.aspects.find(a=>a.name==='Clear 80');
  assert.equal(stop.turnoutSystem,'LT210');assert.equal(stop.turnoutState,'thrown');
  assert.equal(go.turnoutSystem,'LT210');assert.equal(go.turnoutState,'closed');assert.equal(go.sameCommandAspects.length,5);
  assert.ok(index.records.find(r=>r.key===go.turnoutKey).path.includes('/turnouts[2]/'));
  const keys=new Set(index.records.map(r=>r.key));
  for(const m of catalog.masts) {
    assert.ok(keys.has(m.sourceKey));
    for(const item of [...m.rules,...m.outgoing,...m.incoming,...m.icons])assert.ok(keys.has(item.sourceKey));
    for(const a of m.aspects)if(a.turnoutKey)assert.ok(keys.has(a.turnoutKey));
  }
  assert.equal(catalog.masts.reduce((n,m)=>n+m.outgoing.length,0),117);
});
test('empty outputs, virtual signals and unmatched appearances remain explicit without guessed bindings',()=>{
  const six=mast('6/8');assert.equal(six.aspects.filter(a=>a.outputStatus==='missing').length,5);
  assert.equal(six.aspects.find(a=>a.name==='Sh0').turnoutSystem,'LT269');
  assert.ok(six.aspects.filter(a=>a.outputStatus==='missing').every(a=>a.turnoutSystem===null));
  const virtual=mast('6/7');assert.equal(virtual.virtual,true);assert.ok(virtual.aspects.length>0);
  assert.ok(virtual.aspects.every(a=>a.origin==='type-definition'&&a.outputStatus==='virtual'&&a.turnoutSystem===null));
  for(const name of ['1/1','3/5','Xv']){assert.equal(mast(name).definitionStatus,'missing');assert.ok(mast(name).aspects.every(a=>a.image===null));}
  assert.equal(mast('1/5').aspects.find(a=>a.name==='Clear 80 Expect 40').image,null);
  assert.equal(mast('1/5').aspects.find(a=>a.name==='Clear 40').image.file,'Hsi1.gif');
  assert.equal(mast('1/5').aspects.find(a=>a.name==='Stop').image.file,'Hsi0.gif');
});
test('reference generation verifies pinned definitions and original GIF hashes and remains deterministic',()=>{
  execFileSync('python3',['scripts/make-signal-catalog.py','--check'],{cwd:root,stdio:'pipe'});
});
test('signal reference inspector distinguishes current report, request and unknown or stale state',()=>{
  const config={staleMs:7000,signals:{'1/5':{address:1501,reportAddress:1601}}};
  const state={connection:'connected',connectionAt:9000,serverTime:10000,signals:{'1/5':{updatedAt:9500,aspect:'go',desired:'STOP',code:8}}};
  assert.deepEqual(signalLiveView('1/5',config,state,true),{report:'Kör återrapporterat',permission:'Stopp begärt',raw:'8',address:'1601 (E4)'});
  // Signalens rapport åldras inte (0.77.0): den gäller tills förbindelsen bryts, och en rapport från förra förbindelsen är okänd.
  assert.equal(signalLiveView('1/5',config,{...state,serverTime:9500+60*config.staleMs},true).report,'Kör återrapporterat');
  for(const [s,online] of [[state,false],[{...state,connection:'disconnected'},true],[{...state,connectionAt:9600},true]]) {
    const view=signalLiveView('1/5',config,s,online);assert.equal(view.report,'Okänt besked');assert.equal(view.raw,'—');
  }
  const unknown=structuredClone(state);unknown.signals['1/5'].aspect='unknown';
  assert.equal(signalLiveView('1/5',config,unknown,true).raw,'—');
  assert.equal(signalLiveView('absent',config,state,true).address,'Ej inkopplad');
});
