import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TrainInformation } from '../src/train-information.mjs';
import { Storage } from '../src/storage.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/data/train-fields.json',import.meta.url)));
const profile={blocks:{SIA:{address:1},SIIA:{address:2},SN2A:{address:3}}};
function rig(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tkl-train-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const storage=new Storage(dir),options={storage,sessionId:'session-a',now:()=>12345},book=new TrainInformation(catalog,profile,options);
  const blocks={SIA:{occupied:false},SIIA:{occupied:false},SN2A:{occupied:false}};book.observe(blocks,true);
  return {book,storage,options,blocks};
}
function request(book,keys) {return {sessionId:book.sessionId,revision:book.data.revision,epochs:Object.fromEntries(keys.map(k=>[k,book.epochs[k]||0]))};}
const save=(book,key,value)=>book.save({...request(book,[key]),key,value});
test('source catalog keeps all block fields, seven incoming memories and duplicate original anchors',()=>{
  assert.equal(catalog.fields.filter(f=>f.kind==='block').length,197);assert.equal(catalog.fields.filter(f=>f.kind==='incoming').length,7);
  assert.equal(catalog.anchors.length,44);assert.equal(new Set(catalog.anchors.map(a=>a.key)).size,43);
  assert.deepEqual(catalog.anchors.filter(a=>a.duplicate).map(a=>[a.block,a.x,a.y]),[['SN2A',40,422],['SN2A',40,472]]);
  assert.equal(catalog.anchors.filter(a=>a.sourceHidden).length,38);
  assert.equal(catalog.fields.find(f=>f.name==='AuppIn').sourceSystem,'IM:AUTO:0166');
  const result=spawnSync(process.execPath,['scripts/make-train-fields.mjs','--check'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
test('manual registration and atomic transfer survive restart without claiming verified train position',t=>{
  const {book,options,blocks}=rig(t),original=structuredClone(blocks),profileBefore=structuredClone(profile);
  save(book,'incoming:CuppIn','P421');
  const moved=book.move({...request(book,['incoming:CuppIn','block:SIA']),from:'incoming:CuppIn',to:'block:SIA'});
  assert.equal(moved.entries['incoming:CuppIn'],undefined);assert.equal(moved.entries['block:SIA'].value,'P421');assert.equal(moved.entries['block:SIA'].source,'manual');assert.equal(moved.entries['block:SIA'].needsReview,false);
  const restarted=new TrainInformation(catalog,profile,{...options,sessionId:'session-b'});restarted.observe(blocks,true);
  assert.equal(restarted.snapshot().entries['block:SIA'].needsReview,true);assert.equal(restarted.data.revision,2);
  save(restarted,'block:SIA','P421');assert.equal(restarted.snapshot().entries['block:SIA'].needsReview,false);
  assert.equal(restarted.data.history.at(-1).kind,'confirm');assert.deepEqual(blocks,original);assert.deepEqual(profile,profileBefore);
});
test('occupied/free reports and connection loss require review without automatically moving or deleting a number',t=>{
  const {book,blocks}=rig(t);save(book,'block:SIA','421');
  book.observe(blocks,true);assert.equal(book.snapshot().entries['block:SIA'].needsReview,false);
  blocks.SIA.occupied=true;book.observe(blocks,true);assert.equal(book.snapshot().entries['block:SIA'].needsReview,true);
  blocks.SIA.occupied=false;book.observe(blocks,true);assert.equal(book.snapshot().entries['block:SIA'].needsReview,true);
  save(book,'block:SIA','421');book.observe(blocks,false);book.observe(blocks,true);assert.equal(book.snapshot().entries['block:SIA'].needsReview,true);
  book.observe(blocks,false);save(book,'block:SIA','421');assert.equal(book.snapshot().entries['block:SIA'].needsReview,true);
  assert.equal(book.data.entries['block:SIA'].value,'421');assert.equal(Object.keys(book.data.entries).length,1);
});
test('stale revisions, server sessions and changed occupancy cannot overwrite more recent information',t=>{
  const {book,blocks}=rig(t),old=request(book,['block:SIA']);save(book,'block:SIIA','222');
  assert.throws(()=>book.save({...old,key:'block:SIA',value:'111'}),e=>e.status===409);
  const latest=request(book,['block:SIA']);blocks.SIA.occupied=true;book.observe(blocks,true);
  assert.throws(()=>book.save({...latest,key:'block:SIA',value:'111'}),e=>e.status===409);
  assert.throws(()=>book.save({...request(book,['block:SIA']),sessionId:'older-server',key:'block:SIA',value:'111'}),e=>e.status===409);
  assert.equal(book.data.entries['block:SIA'],undefined);
});
test('transfers refuse occupied information fields and duplicate numbers remain explicit',t=>{
  const {book}=rig(t);save(book,'block:SIA','421');save(book,'block:SIIA','421');
  assert.equal(book.snapshot().entries['block:SIA'].duplicate,true);
  assert.throws(()=>book.move({...request(book,['block:SIA','block:SIIA']),from:'block:SIA',to:'block:SIIA'}),e=>e.status===409);
  save(book,'block:SIIA','');assert.equal(book.snapshot().entries['block:SIA'].duplicate,false);
  book.move({...request(book,['block:SIA','block:SIIA']),from:'block:SIA',to:'block:SIIA'});
  assert.equal(book.data.entries['block:SIA'],undefined);assert.equal(book.data.entries['block:SIIA'].value,'421');
});
test('failed durable writes preserve both ends of a move and every previous revision',t=>{
  const {book,storage,options}=rig(t);save(book,'incoming:AuppIn','P421');const before=structuredClone(book.data);
  storage.save=()=>{throw Error('Disk full');};
  assert.throws(()=>book.move({...request(book,['incoming:AuppIn','block:SIA']),from:'incoming:AuppIn',to:'block:SIA'}),/Disk full/);
  assert.throws(()=>save(book,'incoming:AuppIn',''),/Disk full/);assert.deepEqual(book.data,before);
  assert.deepEqual(new TrainInformation(catalog,profile,options).data,before);
});
test('unknown keys, forged sources, malformed values and corrupt saved records are rejected',t=>{
  const {book,storage,options}=rig(t);
  for(const value of ['X'.repeat(25),'<script>','421\n22',null])assert.throws(()=>save(book,'block:SIA',value));
  assert.throws(()=>save(book,'__proto__','421'));assert.throws(()=>book.save({...request(book,['block:SIA']),key:'block:SIA',value:'421',source:'MGP'}));
  save(book,'block:SIA','421');const saved=structuredClone(book.data);saved.entries['block:SIA'].source='MGP';storage.save('train-information.json',saved);assert.throws(()=>new TrainInformation(catalog,profile,options),/ogiltig/);
  saved.entries['block:SIA'].source='manual';saved.history=[null];storage.save('train-information.json',saved);assert.throws(()=>new TrainInformation(catalog,profile,options),/historik/);
});
