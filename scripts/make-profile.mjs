import fs from 'node:fs';
import { Topology } from '../src/topology.mjs';
const panel = JSON.parse(fs.readFileSync(new URL('../public/data/panel.json', import.meta.url)));
const admin = JSON.parse(fs.readFileSync(new URL('../public/data/admin.json', import.meta.url)));
const topology = new Topology(panel);
const definitions = [
  { id: '2b-2c', from: 'htvSpIIB', to: 'htvSpIIA', signals: ['2/8'] },
  { id: '2c-2b', from: 'htvSpIIA', to: 'htvSpIIB', signals: ['2/7'] },
  { id: '12-5b', from: 'htvSpIVA', to: 'htvSpVB', signals: ['4/5'] },
  { id: 'cu-2b', from: 'htvCu', to: 'htvSpIIB', signals: ['1/5', '2/7'] }
];
const routes = definitions.map(d => {
  const path = topology.search(d.from, d.to);
  if (!path) throw Error('Ingen väg: ' + d.id);
  return { ...d, label: topology.buttons[d.from].label + ' → ' + topology.buttons[d.to].label,
    blocks: path.blocks, turnouts: path.settings, crossings: path.crossings, segments: path.used, flow: path.flow };
});
const names = [...new Set(routes.flatMap(r => Object.keys(r.turnouts)))];
const turnouts = Object.fromEntries(names.map(name => {
  const d = admin.turnouts.find(t => t.id === name && /^LT\d+$/.test(t.sys));
  if (!d) throw Error('Saknad källadress ' + name);
  return [name, { address: +d.sys.slice(2), inverted: d.inverted === 'true', source: d.sys, block: topology.turnouts[name].block, provenance: 'JMRI source; electrical behavior not measured' }];
}));
const blocks = Object.fromEntries([...new Set([...routes.flatMap(r => r.blocks),...Object.values(turnouts).map(t=>t.block)])].map((name, i) => [name, {
  address: 3001 + i, activeMeansOccupied: true, sourceSensor: panel.lblocks.find(b => b.user === name)?.sensor || null,
  provenance: 'Explicit bench address. Internal/derived source sensor is NOT claimed to be a physical LS address.'
}]));
const signals = Object.fromEntries([...new Set(routes.flatMap(r => r.signals))].map((name, i) => [name, {
  address: 1501 + i, reportAddress: 1501 + i, stopCodes: [0], goCodes: [8, 18],
  sourceType: panel.micons.find(m => m.mast === name)?.type,
  provenance: 'Bench address and provisional Signal10-CZ E4 mapping; Swedish aspect codes NOT verified'
}]));
const coupled = Object.fromEntries(names.map(name => [name, Object.keys(topology.expand({ [name]: 'C' })).filter(n => names.includes(n))]));
const profile = { id: 'charlottendal-etapp1', title: 'Charlottendal · etapp 1', commissioned: false,
  description: 'Avgränsad utvecklingsprofil. Källgeometri och växeladresser från JMRI; sensor- och signaladresser är separata provadresser. Ingen fysisk anslutning verifierad.',
  transport: { host: '127.0.0.1', port: 8912 }, staleMs: 40000, interrogateMs: 15000, interrogateStepMs: 1000, commandTimeoutMs: 6000, signalStepMs: 300,
  turnouts, blocks, signals, routes, coupled };
const protection = {};
for (const name of Object.keys(signals)) {
  const r = routes.filter(r => r.signals.includes(name)).sort((a, b) => a.blocks.length - b.blocks.length)[0];
  protection[name] = { blocks: r.blocks, turnouts: r.turnouts };
}
const simulator = { id: 'charlottendal-field-model', turnouts, blocks, signals, protection, coupled,
  scenarios: routes.map(r => ({ id: r.id, label: r.label, blocks: r.blocks, signal: r.signals[0] })),
  note: 'Independent process and state. Receives only LocoNet commands. Scenarios are static track movements, never TKL runtime state.' };
fs.writeFileSync(new URL('../profiles/charlottendal.json', import.meta.url), JSON.stringify(profile, null, 2) + '\n');
fs.writeFileSync(new URL('../profiles/simulator.json', import.meta.url), JSON.stringify(simulator, null, 2) + '\n');
console.log(routes.map(r => `${r.id}: ${r.blocks.join(', ')}; ${JSON.stringify(r.turnouts)}; signals ${r.signals}`).join('\n'));
