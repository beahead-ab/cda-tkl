import test from 'node:test';
import assert from 'node:assert/strict';
import {trackRestrictions,restrictionMarkers} from '../public/track-restrictions.js';
const config={blocks:{a:{address:1},alias:{address:1},b:{address:2},c:{address:3}},turnouts:{Vx:{block:'c'}},operatingControls:{programming:{blocks:['b'],turnout:'Vx'}}};
test('display restrictions cover aliases, line reservations and programming without modifying occupancy',()=>{
 const state={controls:{blocked:['a']},blocks:{a:{occupied:true}},operating:{lines:[{label:'L',blocks:['alias','b'],blocked:true}],programming:{reserved:true}}};
 const before=JSON.stringify(state),r=trackRestrictions(config,state);
 assert.deepEqual(r.get(1),['Administrativ spårspärr','Linjespärr · L']);
 assert.deepEqual(r.get(2),['Linjespärr · L','Programmeringsspärr']);
 assert.deepEqual(r.get(3),['Programmeringsspärr']);assert.equal(JSON.stringify(state),before);
 state.controls.blocked=[];state.operating.lines[0].blocked=false;state.operating.programming.reserved=false;
 assert.equal(trackRestrictions(config,state).size,0);assert.equal(state.blocks.a.occupied,true);
 assert.equal(trackRestrictions(config,undefined).size,0);
});
test('one marker per detector prefers the longest visible rail, with turnout fallback',()=>{
 const panel={segs:[{b:'a',x1:0,y1:0,x2:20,y2:0},{b:'alias',x1:30,y1:0,x2:100,y2:0},{b:'a',x1:0,y1:0,x2:200,y2:0,hide:true},{b:'b',x1:0,y1:900,x2:200,y2:900}],turnouts:{Vx:{block:'c',cx:0,cy:10,ax:0,ay:30,bx:30,by:10,ccx:10,ccy:20}}};
 const markers=restrictionMarkers(panel,config);
 assert.equal(markers.length,2);assert.deepEqual(markers.map(m=>m.address),[1,3]);
 assert.equal(markers[0].x,65);assert.equal(markers[0].block,'alias');assert.equal(markers[1].x,15);
});
