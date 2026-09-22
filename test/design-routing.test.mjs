import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Topology } from '../src/topology.mjs';

const panel = JSON.parse(fs.readFileSync(new URL('../public/data/panel.json', import.meta.url)));
const topology = new Topology(panel);

test('Claude Design reference: Lekby and Kungsfors nedspår coexist in the source graph', () => {
  const lekby = topology.search('htvCu', 'htvSpIA');
  assert.ok(lekby);
  assert.equal(lekby.settings.Vx100, 'C');
  assert.equal(lekby.settings.Vx110, 'C');
  const kungsfors = topology.search('htvAn', 'htvSpIIA', {
    blocked: new Set(lekby.blocks), locks: lekby.settings, crossings: new Set(lekby.crossings)
  });
  assert.ok(kungsfors);
  assert.equal(kungsfors.settings.Vx96, 'T');
  for (const name of ['Vx101', 'Vx102', 'Vx117']) assert.equal(kungsfors.settings[name], 'C');
  assert.ok(!kungsfors.blocks.some(b => lekby.blocks.includes(b)));
  for (const [name, position] of Object.entries(kungsfors.settings)) {
    if (name in lekby.settings) assert.equal(position, lekby.settings[name]);
  }
});

test('route flow contains only the passed turnout legs and uses their real lengths', () => {
  const route = topology.search('htvSpIIB','htvSpIIA');
  assert.deepEqual(route.flow.filter(f => f.id.startsWith('VX:')).map(f => f.id), [
    'VX:Vx121:B','VX:Vx121:A','VX:Vx122:B','VX:Vx122:A'
  ]);
  assert.ok(Math.abs(route.cost - route.flow.reduce((n,f)=>n+f.length,0)) < 1e-9);
  assert.equal(topology.search('htvSpIIB','htvSpIIA',{blocked:new Set(['SIIB'])}),null);
});
