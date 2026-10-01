import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPages,pluppSpec,systemSpec,splitLabel,signature,SYSTEM_KEYS,COLORS} from '../public/stream-deck-layout.js';

const pluppar=[...['Spår 2c','Cu','Spår 11','Au','D','Spår 1b','Bn','An','Spår 12','Cn','Bu','Spår 1a','Spår 5b','Spår 2b','Spår 1c'].map(label=>({id:'m-'+label,label,kind:'main'})),{id:'tvv1',label:'Signal 1/5',kind:'shunt'}];

test('pages start with the operating keys, list lines before tracks and shunt pluppar last, and cover every plupp once',()=>{
  const pages=buildPages(pluppar,15);
  assert.equal(pages.length,2);
  assert.deepEqual(pages[0].slice(0,5).map(k=>k.id),SYSTEM_KEYS.map(k=>k.id));
  assert.deepEqual(pages[0].slice(5).map(k=>k.label),['An','Au','Bn','Bu','Cn','Cu','D','Spår 1a','Spår 1b','Spår 1c']);
  assert.equal(pages[1][0].id,'page');
  assert.deepEqual(pages[1].slice(1).map(k=>k.label),['Spår 2b','Spår 2c','Spår 5b','Spår 11','Spår 12','Signal 1/5']);
  const all=pages.flat().filter(k=>k.type==='plupp').map(k=>k.id);
  assert.equal(new Set(all).size,pluppar.length);assert.equal(all.length,pluppar.length);
  assert.equal(buildPages(pluppar,32).length,1);assert.equal(buildPages([],6).length,1);
  assert.ok(buildPages(pluppar,6).every(p=>p.length<=6));
});

test('plupp appearance mirrors the track plan classes',()=>{
  const key={id:'m-Au',label:'Au',kind:'main'};
  assert.equal(pluppSpec(key,new Set(),'').fill,COLORS.free);
  assert.equal(pluppSpec(key,new Set(['in-route']),'active').fill,COLORS.route);
  assert.equal(pluppSpec(key,new Set(['in-route']),'held').fill,COLORS.held);
  assert.equal(pluppSpec(key,new Set(['in-route']),'occupied').fill,COLORS.occupied);
  assert.equal(pluppSpec(key,new Set(['route-choice-start']),'').ring,COLORS.choice);
  assert.equal(pluppSpec(key,new Set(['route-destination']),'').ring,COLORS.destination);
  assert.equal(pluppSpec(key,new Set(['choice-disabled']),'').dim,true);
  assert.equal(pluppSpec(key,new Set(['route-preparing']),'').blink,true);
  assert.equal(pluppSpec(key,new Set(['line-is-blocked']),'').blocked,true);
  assert.equal(pluppSpec({...key,kind:'shunt'},new Set(),'').caption,'växeltågväg');
  assert.deepEqual(pluppSpec({id:'x',label:'Spår 2c',kind:'main'},new Set(),'').lines,['Spår','2c']);
});

test('operating keys show their state and the blink phase only changes blinking keys',()=>{
  const key=id=>SYSTEM_KEYS.find(k=>k.id===id);
  assert.equal(systemSpec(key('all-stop'),{stopAll:true}).fill,COLORS.occupied);
  assert.equal(systemSpec(key('all-stop'),{stopAll:false}).fill,'');
  assert.equal(systemSpec(key('reset-ais'),{stopAll:false}).dim,true);
  assert.equal(systemSpec(key('cancel'),{chosen:false}).dim,true);
  assert.equal(systemSpec(key('cancel'),{chosen:true}).dim,false);
  assert.deepEqual(systemSpec(key('page'),{page:1,pages:3}).lines,['Sida','2 / 3']);
  assert.equal(systemSpec(key('page'),{page:0,pages:1}).dim,true);
  assert.equal(systemSpec(key('panel-reset'),{remote:true}).dim,true);
  const steady=pluppSpec({id:'a',label:'Au',kind:'main'},new Set(),''),blinking=pluppSpec({id:'a',label:'Au',kind:'main'},new Set(['route-preparing']),'');
  assert.equal(signature(steady,true),signature(steady,false));assert.notEqual(signature(blinking,true),signature(blinking,false));
  assert.deepEqual(splitLabel('Linjer och programmeringsspår'),['Linjer och','programmeringsspår']);
});
