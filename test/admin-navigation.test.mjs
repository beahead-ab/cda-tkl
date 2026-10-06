import test from 'node:test';
import assert from 'node:assert/strict';
import {NAVIGATION_GROUPS,NAVIGATION_SECTIONS,REDIRECTS,resolveNavigation} from '../public/admin-navigation-model.js';

const registered=['#trainmeet','#tools/appearance','#tools/streamdeck','#tools/streamdeck/layout','#tools/journal',
  '#register','#register/station','#register/destinations','#register/presentation','#register/bindings','#register/object',
  '#advanced','#advanced/start','#advanced/xml','#advanced/migration','#advanced/protocol','#advanced/ai','#advanced/users','#advanced/update'];

test('Inställningar has ten entries in three groups and every tab keeps an existing address',()=>{
  // Drift is the bottom row's tab in the signal box, not a page here (docs/installningar-plan.md).
  assert.deepEqual(NAVIGATION_GROUPS.map(g=>g.label),['Träffen','Den här datorn','Anläggningen']);
  assert.deepEqual(NAVIGATION_SECTIONS.map(s=>[s.group,s.label]),[
    ['traffen','TrainMeet'],['traffen','Händelser'],
    ['datorn','Kom igång'],['datorn','Utseende och ljud'],['datorn','Stream Deck'],['datorn','Banan (LocoNet)'],['datorn','AI-tjänst'],['datorn','Användare'],['datorn','Uppdatering'],
    ['anlaggningen','Anläggning']]);
  // A group's entries stand together, so the rail shows each heading once.
  const order=NAVIGATION_SECTIONS.map(s=>s.group);assert.deepEqual([...new Set(order)],NAVIGATION_GROUPS.map(g=>g.key));
  assert.ok(order.every((g,i)=>!i||g===order[i-1]||!order.slice(0,i).includes(g)));
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
  assert.equal(titles.get('#tools/appearance'),'Utseende och ljud');
  assert.equal(titles.get('#tools/journal'),'Händelser');
  assert.equal(titles.get('#register/destinations'),'Orter och telefonnummer');
  assert.equal(titles.get('#advanced/protocol'),'Protokollinspelning');
  assert.equal(resolveNavigation('#advanced/protocol').section.label,'Banan (LocoNet)');
  assert.equal(resolveNavigation('#advanced/update').section.label,'Uppdatering');
  assert.equal(resolveNavigation('#advanced/xml').section.label,'Anläggning');
  // The register pages must not share one title, and no address is left in the old Drift group.
  assert.equal(resolveNavigation('#tools/operations/blocks').section,null);
  assert.equal(new Set(registered.filter(h=>h.startsWith('#register')).map(h=>titles.get(h))).size,5);
});

test('TrainMeet carries its status, the local timetable is gone; object pages fall back to the register',()=>{
  const trainmeet=resolveNavigation('#trainmeet');
  assert.equal(trainmeet.section.hash,'#trainmeet');assert.deepEqual(trainmeet.section.tabs,[]);
  assert.equal(trainmeet.section.status,'menu-trainmeet-status');assert.equal(trainmeet.title,'TrainMeet');
  assert.equal(resolveNavigation('#import/upload').section,null,'no page of the local timetable is left');
  const object=resolveNavigation('#register/object');
  assert.equal(object.section.hash,'#register');assert.equal(object.tab.hash,'#register');assert.equal(object.exact,false);
  assert.equal(object.title,'Anläggningsregister');
  const deep=resolveNavigation('#register/bindings?x=1');
  assert.equal(deep.tab.hash,'#register/bindings');assert.equal(deep.exact,true);
});

test('the panel and unknown addresses never activate a section',()=>{
  for(const hash of ['#panel','',undefined,null]){const r=resolveNavigation(hash);assert.equal(r.section,null);assert.equal(r.title,'Ställverk');}
  for(const hash of ['#tools','#tools/zoom','#unknown/page','#registerx']){const r=resolveNavigation(hash);assert.equal(r.section,null);assert.equal(r.title,'Inställningar');}
});

test('pages that only led on to others open their first real page',()=>{
  assert.deepEqual(REDIRECTS,{'#advanced':'#register','#tools':'#tools/appearance'});
  for(const to of Object.values(REDIRECTS))assert.ok(resolveNavigation(to).section);
});
