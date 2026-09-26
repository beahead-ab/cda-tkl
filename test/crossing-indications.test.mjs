import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crosses, crossingGeometry} from '../src/crossing-indications.mjs';
import {PanelIndications} from '../src/panel-indications.mjs';
const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url)));
const profile = read('profiles/charlottendal-network.json'), source = read('public/data/indications.json');
const model = new PanelIndications(source, profile);
const ready = () => ({connection: 'connected', storageFault: null, serverTime: 100000, routes: [],
  blocks: Object.fromEntries(Object.keys(profile.blocks).map(name => [name, {occupied: false, updatedAt: 100000}]))});
const groups = {V1: ['S100', 'S101', 'S103'], V2: ['S120', 'S121', 'S125', 'S126', 'S130'], V3: ['S165a', 'S166a', 'SIIID']};

test('crossing geometry uses finite strokes, including reversed coordinates and endpoints', () => {
  const road = {x1: 10, y1: 20, x2: 10, y2: 0};
  assert.equal(crosses(road, {x1: 0, y1: 10, x2: 20, y2: 10}), true);
  assert.equal(crosses(road, {x1: 0, y1: 10, x2: 10, y2: 10}), true);
  assert.equal(crosses(road, {x1: 0, y1: 30, x2: 20, y2: 30}), false);
  assert.equal(crosses(road, {x1: 11, y1: 10, x2: 20, y2: 10}), false);
  assert.equal(crosses(road, {x1: 9, y1: 0, x2: 9, y2: 20}), false);
});

test('V1–V3 cover the actual tracks and turnout legs, excluding the road forks; V4 stays unchanged', () => {
  const panel = read('public/data/panel.json');
  for (const [name, blocks] of Object.entries(groups)) {
    assert.deepEqual(crossingGeometry(panel, name).blocks, blocks);
    assert.deepEqual(source.indicators.find(i => i.name === name).crossing, crossingGeometry(panel, name));
    assert.ok(blocks.every(n => profile.blocks[n]));
  }
  assert.equal(crossingGeometry(panel, 'V4'), null);
  assert.equal(model.snapshot(ready()).V4.warning, undefined);
  assert.equal(model.snapshot(ready()).V4.value, null);
});

test('each occupied crossing block warns by itself; free or unrelated tracks stay dark', () => {
  assert.deepEqual(Object.keys(groups).map(name => model.snapshot(ready())[name].warning.value), [false, false, false]);
  for (const block of Object.keys(profile.blocks)) {
    const state = ready(); state.blocks[block].occupied = true;
    const before = JSON.stringify(state), result = model.snapshot(state);
    for (const [name, blocks] of Object.entries(groups)) assert.equal(result[name].warning.value, blocks.includes(block), name + ' / ' + block);
    assert.equal(JSON.stringify(state), before);
  }
  for (const [name, block] of [['V2', 'S121'], ['V3', 'S165a'], ['V3', 'S166a']]) {
    const state = ready(); state.blocks[block].occupied = true;
    assert.equal(model.snapshot(state)[name].value, false, 'original XML projection remains available');
    assert.equal(model.snapshot(state)[name].warning.value, true, 'drawn crossing still warns');
  }
});

test('warning follows accepted route reservations from setting through held/cancelling until release', () => {
  const phases = ['setting', 'establishing', 'clearing', 'active', 'traversing', 'held', 'cancelling'];
  for (const def of model.definitions.filter(d => d.crossing)) {
    for (const id of def.crossing.routeIds) for (const phase of phases) {
      const state = ready(); state.routes = [{definitionId: id, id: 'reservation', label: id, state: phase}];
      assert.equal(model.snapshot(state)[def.name].warning.value, true, def.name + ' / ' + id + ' / ' + phase);
    }
    const unrelated = profile.routes.find(r => !def.crossing.routeIds.includes(r.id));
    const state = ready(); state.routes = [{definitionId: unrelated.id, label: unrelated.label, state: 'active'}];
    assert.equal(model.snapshot(state)[def.name].warning.value, false);
  }
});

test('one remaining reservation or occupied crossing block keeps the warning on', () => {
  const state = ready(), def = model.definitions.find(d => d.name === 'V1');
  state.routes = def.crossing.routeIds.slice(0, 2).map(id => ({definitionId: id, label: id, state: 'active'}));
  assert.equal(model.snapshot(state).V1.warning.value, true);
  state.routes.pop(); assert.equal(model.snapshot(state).V1.warning.value, true);
  state.blocks.S100.occupied = true; state.routes = [];
  assert.equal(model.snapshot(state).V1.warning.value, true);
  state.blocks.S100.occupied = false; assert.equal(model.snapshot(state).V1.warning.value, false);
});

test('missing, old, future and disconnected reports are unknown, never an idle indication', () => {
  for (const invalid of [null, {occupied: null, updatedAt: 100000}, {occupied: false, updatedAt: 0},
    {occupied: false, updatedAt: 100000 - profile.staleMs - 1}, {occupied: false, updatedAt: 100001}]) {
    const state = ready(); state.blocks.S121 = invalid;
    assert.equal(model.snapshot(state).V2.warning.value, null);
    state.blocks.S120.occupied = true;
    assert.equal(model.snapshot(state).V2.warning.value, true, 'another known warning still applies');
    assert.equal(model.snapshot(state).V2.warning.complete, false);
  }
  for (const fault of ['disconnected', 'storage']) {
    const state = ready(); state.blocks.S100.occupied = true;
    if (fault === 'disconnected') state.connection = 'disconnected'; else state.storageFault = 'disk';
    for (const name of Object.keys(groups)) {
      assert.equal(model.snapshot(state)[name].warning.value, null);
      assert.equal(model.snapshot(state)[name].warning.known, 0);
    }
  }
});

test('warning uses occupation after binding polarity has been resolved, not raw sensor ACTIVE', () => {
  const inverted = structuredClone(profile); inverted.blocks.S100.activeMeansOccupied = false;
  const opposite = new PanelIndications(source, inverted), state = ready();
  assert.equal(opposite.snapshot(state).V1.warning.value, false);
  state.blocks.S100.occupied = true;
  assert.equal(opposite.snapshot(state).V1.warning.value, true);
});

test('alternative reservations warn for their actual geometry, not the preferred catalog path',()=>{
  const state=ready();
  const route=profile.routeAlternatives.find(r=>r.id==='htvBu--htvSpIIB');
  state.routes=[{...route,definitionId:route.id,state:'setting'}];
  for(const def of model.definitions.filter(d=>d.crossing)){
    assert.equal(model.snapshot(state)[def.name].warning.value,route.flow.some(part=>crosses(def.crossing.line,part)));
  }
  // An explicitly supplied path wins even if its catalog identity normally crosses.
  state.routes=[{definitionId:profile.routes.find(r=>model.definitions.find(d=>d.name==='V3').crossing.routeIds.includes(r.id)).id,flow:[],label:'annan väg'}];
  assert.equal(model.snapshot(state).V3.warning.value,false);
});
