import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {panelLayout} from '../public/panel-layout.js';
import {routePresentation,routeButtonPhase} from '../public/route-presentation.js';
const panel=JSON.parse(fs.readFileSync(new URL('../public/data/panel.json',import.meta.url)));
const config=JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal-network.json',import.meta.url)));
const {controls}=panelLayout(panel);
const route=(from,to)=>config.routes.find(r=>r.from===from&&r.to===to);
const show=r=>routePresentation(r,panel,config,controls);
test('Au to 1b includes intermediate 1c and fills only the start-button to signal interval',()=>{
 const r=route('htvAu','htvSpIB'),before=structuredClone(r),p=show(r);
 assert.deepEqual(p.members.map(m=>m.id).sort(),['htvAu','htvSpIA','htvSpIB'].sort());
 const joined=p.parts.filter(p=>p.connector);
 assert.deepEqual(joined.map(p=>[p.id,p.x1,p.x2,p.block]),[['T239',90,110,'SU2A'],['T10',110,150,'SU2A']]);
 assert.equal(p.parts.at(-1).x2,r.flow.at(-1).x2);
 assert.deepEqual(r,before,'presentation must never alter route locks or geometry');
});
test('reversed routes and right-hand entry join the right side of the endpoint dot',()=>{
 const reversed=show(route('htvSpIB','htvAu'));
 assert.equal(reversed.parts.at(-1).x2,90);assert.equal(reversed.parts.at(-1).y2,420);
 const right=show(route('htvBu','htvSpIA'));
 assert.equal(right.parts[0].x1,2040);assert.equal(right.parts[0].y1,270);
 assert.equal(right.parts.filter(p=>p.connector)[0].x2<=2040,true);
 assert(!right.members.some(m=>m.id==='htvBn'));
});
test('connectors require a continuous source track; no gap or different-block shortcut',()=>{
 const r=route('htvAu','htvSpIB');
 for(const segs of [panel.segs.filter(s=>s.id!=='T10'),panel.segs.map(s=>s.id==='T10'?{...s,b:'another-block'}:s)]){
  const p=routePresentation(r,{...panel,segs},config,controls);
  assert.equal(p.parts.some(p=>p.connector),false);
 }
 const shifted=controls.map(b=>b.sensor==='htvAu'?{...b,centerY:b.centerY+1}:b);
 assert.equal(routePresentation(r,panel,config,shifted).parts.some(p=>p.connector),false);
});
test('every main route retains all original parts and has directed continuous display distance',()=>{
 for(const r of [...config.routes,...Object.values(config.alternatives||{}).flat()].filter(r=>r.kind==='main')){
  const p=show(r);const original=p.parts.filter(p=>!p.connector);
  assert.deepEqual(original.map(({distance,...p})=>p),r.flow.map(({distance,...p})=>p),r.id);
  let distance=0;for(const part of p.parts){assert.equal(part.distance,distance);distance+=part.length;}
  for(const part of p.parts.filter(p=>p.connector)){
   assert(panel.segs.some(s=>s.id===part.id&&s.b===part.block),r.id);
   assert.equal(part.y1,part.y2,r.id);
  }
 }
});
test('partial removal drops old dots and connectors while retained sections stay lit',()=>{
 const whole=show(route('htvAu','htvSpIB'));
 const retained=show(route('htvSpIA','htvSpIB'));
 assert(whole.members.some(m=>m.id==='htvAu'));
 assert(!retained.members.some(m=>m.id==='htvAu'));
 assert.deepEqual(retained.members.map(m=>m.id).sort(),['htvSpIA','htvSpIB'].sort());
 assert.equal(retained.parts[0].x1,856);
});
test('button indications respect occupancy, held routes, connection and the advancing light front',()=>{
 const r={...route('htvAu','htvSpIB'),state:'active'},p=show(r),m=p.members.find(m=>m.id==='htvSpIA');
 const state={connection:'connected',blocks:{}};
 assert.equal(routeButtonPhase(r,m,state),'active');
 assert.equal(routeButtonPhase(r,m,{...state,blocks:{[m.parts[0].block]:{occupied:true}}}),'occupied');
 for(const phase of ['held','cancelling','setting','occupied','traversing'])assert.equal(routeButtonPhase({...r,state:phase},m,state),'held');
 assert.equal(routeButtonPhase(r,m,{...state,connection:'disconnected'}),'held');
 assert.equal(routeButtonPhase({...r,state:'establishing'},m,state,0,p.total),'held');
 assert.equal(routeButtonPhase({...r,state:'establishing'},m,state,1,p.total),'active');
});
