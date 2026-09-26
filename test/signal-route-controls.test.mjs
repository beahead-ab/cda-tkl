import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {signalRouteControls,signalImage} from '../public/signal-route-controls.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url)));
const profile=read('profiles/charlottendal-network.json'), registry=read('public/data/source/signals.json'), source=read('public/data/operations-source.json'), endpoints=read('public/data/signal-endpoints.json');

test('signal clicks bind only reviewed shunt pairs and exact source mast directions',()=>{
  const c=signalRouteControls(profile,registry,endpoints);
  assert.equal(c.routes.length,101);
  const mast=sensor=>source.anchors.flatMap(a=>['eastbound','westbound'].filter(d=>a[d+'sensor']===sensor).map(d=>a[d+'signalmast'])).find(Boolean)||source.turnoutEnds.find(e=>e.sensor===sensor)?.mast;
  for(const r of c.routes){
    assert.equal(r.fromSignal,mast(r.source.nxButtons[0]));
    assert.equal(r.toSignal,mast(r.source.nxButtons[1]));
    assert.equal(r.kind,'shunt');assert(profile.routes.some(p=>p.id===r.id));
    assert(r.guardSignals.includes(r.toSignal));
  }
  assert.equal(c.buttons.has('1/1'),false); // Main signal with no shunt indication.
  assert.equal(c.buttons.get('IIIev'),'tvvIIIev'); // Terminal STOP guard is a selectable destination.
  assert(c.buttons.has('6/7')); // Virtual dwarf inherits its source signal type.
  assert(!c.routes.some(r=>r.from==='tvv2/2'&&r.to==='tvv2/4')); // Unresolved source pair.
});

test('missing, conflicting or unsupported source data never creates a signal control',()=>{
  let p=structuredClone(profile);
  p.routes.push({kind:'main',boundaries:[{sensor:'tvs3/6',mast:'wrong'}]});
  assert(!signalRouteControls(p,registry,endpoints).buttons.has('3/6'));
  p=structuredClone(profile);p.routes=p.routes.filter(r=>r.from!=='tvv3/6'&&r.to!=='tvv3/6');
  assert(!signalRouteControls(p,registry,endpoints).buttons.has('3/6'));
  const reg=structuredClone(registry);reg.signals.find(s=>s.id==='3/6').aspects=['Stop'];
  const stopOnly=signalRouteControls(profile,reg,endpoints);
  assert(!stopOnly.starts.has('tvv3/6')); // STOP-only signals may be ends, never starts.
});

test('targets include only direct shunt choices and existing connected chain ends',()=>{
  const c=signalRouteControls(profile,registry,endpoints);
  const pair=c.routes.flatMap(a=>c.routes.filter(b=>a.to===b.from&&a.source.nxButtons[1]===b.source.nxButtons[0]&&!c.targets(a.from).has(b.to)&&a.from!==b.to).map(b=>[a,b]))[0];
  assert(pair,'Fixture has a chain beyond a direct pair');
  const [a,b]=pair;
  assert(!c.targets(a.from).has(b.to));
  assert(c.targets(a.from,[a,b]).has(b.to));
  assert(!c.targets(a.from,[a,{...b,kind:'main'}]).has(b.to));
  assert(!c.targets(a.from,[a,{...b,source:{nxButtons:['other','end']}}]).has(b.to));
  assert.deepEqual(c.targets(a.from,[a,b,a,b]),c.targets(a.from,[a,b]));
});

test('selection cannot display a proceed aspect; reported shunt go uses the dwarf image',()=>{
  for(const type of ['dvsi_4','hdvsi_8','hsi_3+dvsi']){
    assert.equal(signalImage(type,'stop',true),0);
    assert.equal(signalImage(type,'unknown',true),2);
  }
  assert.equal(signalImage('hdvsi_8','go',true),3);
  assert.equal(signalImage('hsi_3+dvsi','go',true),3);
  assert.equal(signalImage('hdvsi_8','go',false),1);
  assert.equal(signalImage('dvsi_4','go',true),1);
});


test('terminal and main signals are selectable ends but cannot originate shunting routes',()=>{
 const c=signalRouteControls(profile,registry,endpoints);
 for(const [start,mast] of [['tvv9/10','IIIev'],['tvv6/11','IIIdo'],['tvv1/4','Xv'],['tvv3/11','N1'],['tvv4/10','1/12']]){
  const id=c.buttons.get(mast);assert(id,mast);assert(c.targets(start).has(id),start+' → '+mast);
  assert(!c.starts.has(id),mast+' cannot initiate a shunt order');
  const route=c.routes.find(r=>r.from===start&&r.to===id);
  assert(route.guardSignals.includes(mast));assert(!route.signals.includes(mast),'destination receives no GO');
 }
});
test('terminal source binding must be explicit, unambiguous and protected by the reviewed route',()=>{
 const missing={endpoints:endpoints.endpoints.filter(e=>e.sensor!=='tvsIIIev')};
 assert(!signalRouteControls(profile,registry,missing).buttons.has('IIIev'));
 const conflict={endpoints:[...endpoints.endpoints,{sensor:'tvsIIIev',mast:'IIIdo'}]};
 assert(!signalRouteControls(profile,registry,conflict).buttons.has('IIIev'));
 const p=structuredClone(profile);
 for(const r of p.routes)r.guardSignals=r.guardSignals.filter(n=>n!=='IIIev');
 assert(!signalRouteControls(p,registry,endpoints).buttons.has('IIIev'));
 assert.equal(endpoints.sourceHash,source.sourceHash);
});
