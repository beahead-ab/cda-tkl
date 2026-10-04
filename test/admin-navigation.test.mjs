import test from 'node:test';
import assert from 'node:assert/strict';
import {NAVIGATION_SECTIONS,resolveNavigation} from '../public/admin-navigation-model.js';

const registered=['#tools/operations','#tools/operations/routes','#tools/operations/clearance','#tools/operations/blocks','#tools/operations/lines','#tools/operations/trains','#tools/operations/clock','#tools/operations/authority',
  '#trainmeet','#import','#import/upload','#import/edit','#tools/appearance','#tools/streamdeck','#tools/streamdeck/layout','#tools/journal',
  '#register','#register/station','#register/destinations','#register/presentation','#register/bindings','#register/object',
  '#advanced','#advanced/xml','#advanced/migration','#advanced/protocol'];

test('the rail has seven entries in the agreed order and every tab keeps an existing address',()=>{
  assert.deepEqual(NAVIGATION_SECTIONS.map(s=>s.label),['Drift','Tidtabeller','Händelser','Utseende','Stream Deck','Anläggning','Avancerat']);
  for(const section of NAVIGATION_SECTIONS){
    for(const tab of section.tabs){
      if(tab.external){assert.ok(['field-link','studio-link'].includes(tab.external));if(tab.href)assert.equal(tab.href,'/studio.html');continue;}
      const allowed=[section.hash,...(section.members||[])];
      assert.ok(allowed.some(base=>tab.hash===base||tab.hash.startsWith(base+'/')),`${tab.hash} belongs to ${section.hash}`);
      assert.ok(registered.includes(tab.hash),`${tab.hash} is a registered workspace`);
    }
  }
  const ids=NAVIGATION_SECTIONS.map(s=>s.id);
  assert.equal(new Set(ids).size,ids.length);
});

test('every registered address resolves to one section with a page title of its own',()=>{
  const titles=new Map();
  for(const hash of registered){
    const r=resolveNavigation(hash);
    assert.ok(r.section,`${hash} has a section`);
    assert.ok(r.title&&!r.title.includes('·'),`${hash} has a plain title`);
    titles.set(hash,r.title);
  }
  assert.equal(titles.get('#tools/operations'),'Driftverktyg');
  assert.equal(titles.get('#tools/operations/routes'),'Tågvägar');
  assert.equal(titles.get('#tools/operations/authority'),'Lokal- och fjärrläge');
  assert.equal(titles.get('#tools/appearance'),'Utseende och ljud');
  assert.equal(titles.get('#tools/journal'),'Händelser');
  assert.equal(titles.get('#import/upload'),'Importera tidtabell');
  assert.equal(titles.get('#import/edit'),'Redigera tidtabell');
  assert.equal(titles.get('#register/destinations'),'Orter och telefonnummer');
  assert.equal(titles.get('#advanced/protocol'),'Protokollinspelning');
  // The six operating tools and the four register pages must no longer share one title.
  assert.equal(new Set(registered.filter(h=>h.startsWith('#tools/operations')).map(h=>titles.get(h))).size,8);
  assert.equal(new Set(registered.filter(h=>h.startsWith('#register')).map(h=>titles.get(h))).size,5);
});

test('TrainMeet lives under Tidtabeller and object pages fall back to the register landing',()=>{
  const trainmeet=resolveNavigation('#trainmeet');
  assert.equal(trainmeet.section.hash,'#import');assert.equal(trainmeet.tab.label,'TrainMeet');assert.equal(trainmeet.exact,true);
  assert.equal(trainmeet.tab.status,'menu-trainmeet-status');
  const object=resolveNavigation('#register/object');
  assert.equal(object.section.hash,'#register');assert.equal(object.tab.hash,'#register');assert.equal(object.exact,false);
  assert.equal(object.title,'Anläggningsregister');
  const deep=resolveNavigation('#import/upload?x=1');
  assert.equal(deep.tab.hash,'#import/upload');assert.equal(deep.exact,true);
});

test('the panel and unknown addresses never activate a section',()=>{
  for(const hash of ['#panel','',undefined,null]){const r=resolveNavigation(hash);assert.equal(r.section,null);assert.equal(r.title,'Ställverk');}
  for(const hash of ['#tools','#tools/zoom','#unknown/page','#registerx']){const r=resolveNavigation(hash);assert.equal(r.section,null);assert.equal(r.title,'Administration');}
});
