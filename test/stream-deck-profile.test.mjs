import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELS,keyCount,modelFor,validateLayout,defaultLayout,layoutPages,fits} from '../public/stream-deck-profile.js';
import {StreamDeckLayouts} from '../src/stream-deck-layout.mjs';

const pluppar=[{id:'htvAu',label:'Au',kind:'main'},{id:'htvCu',label:'Cu',kind:'main'},{id:'htvSpIb',label:'Spår 1b',kind:'main'},{id:'tvv1',label:'Signal 1/5',kind:'shunt'}];
const lines=[{id:'cda-lek',neighborId:'lek',neighborName:'Lekby',neighborCode:'LEK'}];
const ids=pluppar.map(p=>p.id);

test('models, key counts and the automatic layout as an editable starting point',()=>{
  assert.equal(keyCount('mk2'),15);assert.equal(keyCount('xl'),32);assert.equal(keyCount('mini'),6);assert.equal(keyCount('nope'),0);
  assert.equal(modelFor(5,3),'mk2');assert.equal(modelFor(8,4),'xl');assert.equal(modelFor(9,9),'');
  const layout=defaultLayout('mini',pluppar,lines);
  assert.equal(layout.model,'mini');assert.ok(layout.pages.length>=2);assert.ok(layout.pages.every(p=>p.keys.length===6));
  assert.deepEqual(layout.pages[0].keys.slice(0,5).map(k=>k.type),['system','system','system','system','system']);
  assert.deepEqual(layout.pages[0].keys[5],{type:'train',role:'departure',lineId:'cda-lek'});
  assert.equal(layout.pages.flat().length,layout.pages.length);
  assert.equal(layout.pages.flatMap(p=>p.keys).filter(k=>k?.type==='plupp').length,4);
  assert.throws(()=>defaultLayout('nope',pluppar),/modell/);
  assert.equal(Object.keys(MODELS).length,5);
});

test('validation normalises pages, names and empty keys and rejects what the installation does not have',()=>{
  const ok=validateLayout({model:'mini',pages:[{name:'  Drift ',keys:[{type:'system',id:'all-stop'},null,{type:'plupp',id:'htvAu'},{type:'train',role:'arrival',lineId:'cda-lek'},{type:'page',target:1}]},{keys:[]}]},{pluppIds:ids});
  assert.equal(ok.pages[0].name,'Drift');assert.equal(ok.pages[1].name,'Sida 2');assert.equal(ok.pages[0].keys.length,6);assert.equal(ok.pages[0].keys[5],null);assert.equal(ok.pages[1].keys.every(k=>k===null),true);
  assert.deepEqual(ok.pages[0].keys[4],{type:'page',target:1});
  for(const [layout,re] of [
    [null,/saknas/],[{model:'giant',pages:[]},/modell/],[{model:'mini',pages:[]},/1–20 sidor/],[{model:'mini',pages:[{keys:Array(7).fill(null)}]},/Sidan 1/],
    [{model:'mini',pages:[{keys:[{type:'plupp',id:'nope'}]}]},/Pluppen nope på sida 1, knapp 1 finns inte/],
    [{model:'mini',pages:[{keys:[{type:'system',id:'launch'}]}]},/Okänd driftknapp/],
    [{model:'mini',pages:[{keys:[{type:'train',role:'up',lineId:'x'}]}]},/sträckknapp/],
    [{model:'mini',pages:[{keys:[{type:'page',target:3}]}]},/sida som inte finns/],
    [{model:'mini',pages:[{keys:[{type:'rocket'}]}]},/Okänd knapptyp/],
    [{model:'mini',pages:[{keys:['x']}]},/Ogiltig knapp/]])assert.throws(()=>validateLayout(layout,{pluppIds:ids}),re);
});

test('a saved layout resolves against the panel, flags what is missing and fits only decks with enough keys',()=>{
  const layout=validateLayout({model:'mini',pages:[{name:'A',keys:[{type:'plupp',id:'htvAu'},{type:'plupp',id:'htvCu'},{type:'train',role:'departure',lineId:'cda-lek'},{type:'train',role:'arrival',lineId:'gone'},{type:'page',target:1},{type:'system',id:'cancel'}]},{name:'B',keys:[]}]},{pluppIds:ids});
  const pages=layoutPages(layout,{pluppar:pluppar.filter(p=>p.id!=='htvCu'),lines});
  assert.equal(pages.length,2);
  assert.deepEqual(pages[0].map(k=>k?.type),['plupp','missing','train','missing','page','system']);
  assert.equal(pages[0][0].label,'Au');assert.equal(pages[0][1].label,'htvCu');assert.equal(pages[0][2].neighborCode,'LEK');assert.equal(pages[0][3].title,'Sträcka saknas');
  assert.deepEqual(pages[0][4],{type:'page',target:1,title:'B'});assert.equal(pages[0][5].title,'Avbryt val');
  assert.equal(pages[1].every(k=>k===null),true);
  assert.equal(fits(layout,6),true);assert.equal(fits(layout,15),true);assert.equal(fits({model:'xl',pages:[]},15),false);assert.equal(fits(null,15),false);
});

test('the layout store keeps an active layout and a draft with revisions and survives restart',()=>{
  let saved;const storage={load:(n,d)=>structuredClone(saved??d),save:(n,v)=>{saved=structuredClone(v);}};
  const store=new StreamDeckLayouts(storage,{pluppIds:ids,now:()=>'2026-10-01T12:00:00Z'});
  assert.deepEqual(store.view(),{revision:0,active:null,draft:null,activeVersion:0,activatedAt:''});
  assert.throws(()=>store.activate({revision:0}),/inget utkast/);assert.throws(()=>store.reset({revision:0}),/gäller redan/);
  assert.throws(()=>store.save({revision:1,layout:defaultLayout('mini',pluppar)}),/ändrats/);
  assert.throws(()=>store.save({revision:0,layout:{model:'mini',pages:[{keys:[{type:'plupp',id:'nope'}]}]}}),/Pluppen nope/);
  const draft=store.save({revision:0,layout:defaultLayout('mini',pluppar,lines)});
  assert.equal(draft.revision,1);assert.equal(draft.draft.model,'mini');assert.equal(draft.active,null);
  const active=store.activate({revision:1});assert.equal(active.activeVersion,1);assert.equal(active.draft,null);assert.equal(active.active.pages[0].keys.length,6);assert.equal(active.activatedAt,'2026-10-01T12:00:00Z');
  store.save({revision:2,layout:{model:'mk2',pages:[{keys:[]}]}});assert.equal(store.view().draft.model,'mk2');
  const discarded=store.discard({revision:3});assert.equal(discarded.draft,null);assert.equal(discarded.active.model,'mini');
  const again=new StreamDeckLayouts(storage,{pluppIds:ids});assert.equal(again.view().active.model,'mini');assert.equal(again.view().revision,4);
  const reset=again.reset({revision:4});assert.equal(reset.active,null);assert.equal(reset.activeVersion,2);
  storage.save=()=>{throw Error('disk');};assert.throws(()=>again.save({revision:5,layout:defaultLayout('mini',pluppar)}),/kunde inte sparas/);assert.equal(again.view().revision,5);
  assert.throws(()=>new StreamDeckLayouts({load:()=>({revision:0,active:{model:'mini',pages:[{keys:[{type:'plupp',id:'gone'}]}]},draft:null,activeVersion:1,activatedAt:''})},{pluppIds:ids}),/Ogiltig sparad Stream Deck-layout: Pluppen gone/);
});

import {setKey,swapKeys,addPage,renamePage,removePage,changeModel,keyLabel} from '../public/stream-deck-profile.js';
test('editing helpers return new layouts and keep page targets valid',()=>{
  let layout=validateLayout({model:'mini',pages:[{name:'A',keys:[{type:'page',target:1},{type:'page',target:2},{type:'plupp',id:'htvAu'}]},{name:'B',keys:[]},{name:'C',keys:[{type:'system',id:'cancel'}]}]},{pluppIds:ids});
  const original=structuredClone(layout);
  layout=setKey(layout,1,0,{type:'train',role:'arrival',lineId:'cda-lek'});assert.equal(layout.pages[1].keys[0].role,'arrival');
  layout=swapKeys(layout,0,0,2);assert.equal(layout.pages[0].keys[0].type,'plupp');assert.equal(layout.pages[0].keys[2].type,'page');
  layout=renamePage(layout,2,'  Klarering ');assert.equal(layout.pages[2].name,'Klarering');layout=renamePage(layout,2,' ');assert.equal(layout.pages[2].name,'Sida 3');
  layout=addPage(layout,'Norr');assert.equal(layout.pages.length,4);assert.equal(layout.pages[3].name,'Norr');assert.equal(layout.pages[3].keys.length,6);
  layout=removePage(layout,1);assert.equal(layout.pages.length,3);
  assert.equal(layout.pages[0].keys[2],null,'a jump to the removed page is cleared');assert.deepEqual(layout.pages[0].keys[1],{type:'page',target:1},'later targets shift down');
  assert.throws(()=>removePage({model:'mini',pages:[{name:'A',keys:[]}]},0),/minst en sida/);
  assert.equal(changeModel(layout,'mk2').pages[0].keys.length,15);assert.equal(changeModel(changeModel(layout,'mk2'),'mini').pages[0].keys.length,6);assert.throws(()=>changeModel(layout,'nope'),/modell/);
  assert.deepEqual(original.pages[0].keys[0],{type:'page',target:1},'the original is untouched');
  assert.equal(keyLabel({type:'plupp',id:'htvAu'},{pluppar}),'Au');assert.equal(keyLabel({type:'train',role:'departure',lineId:'cda-lek'},{lines}),'→ LEK');assert.equal(keyLabel({type:'page',target:2}),'Sida → 3');assert.equal(keyLabel({type:'system',id:'all-stop'}),'Alla signaler i stopp');assert.equal(keyLabel(null),'');
  // a layout with 20 pages cannot grow
  let big={model:'mini',pages:Array.from({length:20},()=>({name:'',keys:[]}))};assert.throws(()=>addPage(big),/högst 20/);
});
