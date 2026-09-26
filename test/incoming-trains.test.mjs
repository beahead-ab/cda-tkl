import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {incomingFields,normalIncoming,incomingChoice,incomingAnchors} from '../public/incoming-trains.js';
import {panelLayout} from '../public/panel-layout.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
test('normal arrivals complement configured exits, with left-hand defaults and single-track D',()=>{
  assert.deepEqual(['C','A','B','D'].map(l=>normalIncoming(l)),['Cu','Au','Bn','D']);
  assert.deepEqual(['C','A','B'].map(l=>normalIncoming(l,{C:'Cu',A:'Au',B:'Bn'})),['Cn','An','Bu']);
  assert.equal(normalIncoming('C',{C:'Bu'}),null);
  assert.equal(incomingChoice('incoming:DIn').target,null);
  assert.equal(incomingChoice('block:SIA'),null);
});
test('each imported arrival has an exact track binding and only its paired alternative',()=>{
  const catalog=read('train-fields');
  assert.deepEqual(Object.values(incomingFields).sort(),catalog.fields.filter(f=>f.kind==='incoming').map(f=>f.key).sort());
  for(const key of Object.values(incomingFields)){
    const choice=incomingChoice(key);
    if(choice.target){assert.equal(incomingChoice(choice.target).target,key);assert.equal(incomingChoice(choice.target).line,choice.line);}
  }
  assert.equal(incomingChoice('incoming:AuppIn').deviating,false);
  assert.equal(incomingChoice('incoming:AnedIn').deviating,true);
});
test('incoming badges use actual route control positions on all seven tracks',()=>{
  const controls=panelLayout(read('panel')).controls,anchors=incomingAnchors(controls);
  assert.equal(anchors.length,7);
  for(const a of anchors){const c=controls.find(c=>c.sensor==='htv'+a.track);assert.equal(a.y,c.centerY-26);assert.equal(Math.abs(a.x-c.centerX),45);}
  assert.deepEqual(incomingAnchors([]),[]);
});
