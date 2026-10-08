import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSources, buildRegistry, companionCheck, crossoverProposals, detectionInventory, deviations, signalRelationCoverage, studioOverview } from '../src/studio/index.mjs';
const sources = loadSources();
const row = (rows, id) => rows.find(r => r.id === id);

test('objektregistret har stationens mängder och bara spårbarhet ur XML, inget uppmätt', () => {
  const r = buildRegistry(sources);
  assert.deepEqual(r.counts, { turnouts: 49, signals: 66, blocks: 197, routes: 340, modules: 12, measured: { field: 0, bench: 0 } });
  const vx100 = r.turnouts.find(t => t.id === 'Vx100');
  assert.deepEqual(vx100.source, { system: 'LT100', comment: 'M02-100-1', module: { name: 'M02', base: 100, channel: 1 } });
  assert.deepEqual(vx100.companions, ['Vx101']);
  assert.equal(vx100.status, 'ur XML, ej uppmätt');
  const s15 = r.signals.find(s => s.id === '1/5');
  assert.equal(s15.mastType, 'hsi_5');
  assert.deepEqual(s15.source.map(x => x.system), ['LT210', 'LT402', 'LT403']);
  assert.deepEqual([...new Set(s15.source.map(x => x.module.name))], ['M02', 'M01']);
  // Signalerna bär utgången ur XML (stopp = THROWN), de virtuella har ingen; spårledningarna bär LS-ingångarna, bänkadressen står kvar bara där källan saknar ingång.
  assert.equal(s15.loconet.order, 210); assert.equal(s15.output, 'LT210'); assert.equal(s15.status, 'ur XML, ej uppmätt');
  assert.deepEqual(r.signals.filter(s => s.virtual).map(s => s.id), ['3/1', '4/2', '6/10', '6/5', '6/6', '6/7', '7/10', '7/5', '8/10', '8/5', '9/10', '9/5', 'L1']);
  assert.ok(r.signals.every(s => s.virtual ? s.status === 'virtuell i JMRI, ingen utgång' && s.loconet.order === null : s.status === 'ur XML, ej uppmätt' && s.loconet.order === s.loconet.report));
  const sia = r.blocks.find(b => b.id === 'SIA'); assert.deepEqual(sia.loconet, { report: 90, inputs: [90, 100], logic: 'any', activeMeansOccupied: true }); assert.deepEqual(sia.sourceInputs, ['LS90', 'LS100']);
  assert.equal(r.blocks.filter(b => b.status === 'ur XML, ej uppmätt').length, 162); assert.equal(r.blocks.filter(b => b.status === 'bänkadress i simulatorn').length, 35);
  assert.equal(r.blocks.find(b => b.id === 'S155').status, 'bänkadress i simulatorn');
  assert.deepEqual(r.xmlOnlyTurnouts, ['Vx124']);
  assert.equal(r.modules.map(m => m.id).join(','), 'M00,M01,M02,M03,M04,M05,M06,M07,M08,M09,M10,M11');
});

test('spårgrafen bekräftar fem kompispar och avvisar paren i dubbelkorsväxlarna X1 och X2', () => {
  const pairs = companionCheck(sources.xml, sources.profile.coupled);
  assert.equal(pairs.length, 7);
  assert.deepEqual(pairs.filter(p => !p.ok).map(p => p.pair.join('+')), ['Vx140+Vx142', 'Vx162+Vx165']);
  const bad = pairs.find(p => p.pair[0] === 'Vx140');
  assert.equal(bad.aLeadsTo, 'Vx143'); assert.equal(bad.bLeadsTo, 'Vx141');
  assert.deepEqual(crossoverProposals(sources.xml), [
    { crossing: 'X1', turnouts: ['Vx140', 'Vx141', 'Vx142', 'Vx143'], pairs: [['Vx140', 'Vx143'], ['Vx141', 'Vx142']] },
    { crossing: 'X2', turnouts: ['Vx162', 'Vx163', 'Vx165', 'Vx166'], pairs: [['Vx162', 'Vx166'], ['Vx163', 'Vx165']] }]);
});

test('spåravkänningen läser JMRI:s regelformer med logiktypen, inte villkorstexten', () => {
  const d = detectionInventory(sources);
  assert.deepEqual(d.shapes, { single: 132, any: 20, turnoutPart: 10, noRule: 8, noSensor: 27 });
  const sic = d.sections.find(s => s.name === 'SIC');           // villkorstexten säger "R1 and R2", logiktypen är 2 = någon av
  assert.equal(sic.shape, 'any'); assert.deepEqual(sic.inputs, ['LS156', 'LS170']);
  assert.deepEqual(d.sections.find(s => s.name === 'SIA').inputs, ['LS90', 'LS100']);
  assert.equal(d.inputs.total, 184); assert.equal(d.inputs.used, 97); assert.equal(d.inputs.unbound.length, 87); assert.equal(d.inputs.withoutModule, 70);
  assert.deepEqual(d.inputs.unbound.filter(u => u.namedBlock).map(u => [u.system, u.namedBlock]), [['LS124', 'S125a']]);
  assert.deepEqual(d.undetected.noSensor, ['Slokstall1', 'Slokstall2', 'Slokstall3', 'Slokstall4', 'Slokstall5', 'Slokstall6', 'Slokstall7', 'Slokstall8', 'Slokstall9', 'SL1a', 'SL1b']);
  assert.deepEqual([...d.undetected.noRule].sort(), ['S112b', 'S155', 'S155b', 'S155c', 'S164', 'S164b', 'S171', 'S172']);
  assert.deepEqual(d.blockedByButton, ['slS1b', 'slS1c', 'slS2b', 'slS2c', 'slS3b', 'slS4b', 'slS5b']);
  assert.equal(d.inputs.shared[0].system, 'LS73'); assert.equal(d.inputs.shared[0].rules, 4);
  assert.deepEqual(d.debounce, { goingActive: 0, goingInactive: 3000 });
});

test('avvikelselistan reproducerar planens kända luckor och de nya fynden', () => {
  const rows = deviations(sources);
  const counts = Object.fromEntries(rows.map(r => [r.id, r.count]));
  assert.deepEqual(counts, { 'signal-bench': 0, 'signal-virtual': 13, 'block-bench': 35, 'turnout-unmeasured': 49, 'signal-relations': 44, 'nx-without-route': 20, 'shunt-excluded': 15,
    'manual-groups': 5, 'contradicting-rules': 4, 'yard-boundaries': 6, 'crossing-v4': 4, 'swedish-aspects': 7, 'vx95-vx96': 1, 'xml-only-turnouts': 1, 'turntable': 1,
    'programming-relay': 1, 'companion-pairs': 2, 'undetected-blocks': 19, 'unbound-inputs': 87 });
  assert.equal(row(rows, 'block-bench').note, '35 bänkadresser');
  assert.deepEqual(row(rows, 'block-bench').items.filter(n => /^S\d/.test(n)).sort(), ['S112b', 'S155', 'S155b', 'S155c', 'S164', 'S164b', 'S171', 'S172'], 'växelblock utan logixregel; S100a läser LS60 via slS100 sedan 0.72.2');
  assert.equal(row(rows, 'contradicting-rules').note, '3 huvud + 1 växling');
  assert.deepEqual(row(rows, 'yard-boundaries').items, ['Vx102', 'Vx112', 'Vx131', 'Vx132', 'Vx144', 'Vx154'], 'the pairs whose button guards replace the group rule; 103 and 164 keep their own');
  assert.deepEqual(row(rows, 'companion-pairs').items, ['Vx140 + Vx142', 'Vx162 + Vx165']);
  assert.equal(signalRelationCoverage(sources).total, 117);
  assert.equal(rows.filter(r => r.blocking).length, 6);
});

test('översikten är ren läsning och hör till driftprofilens källversion', () => {
  const o = studioOverview();
  assert.equal(o.sourceHash, sources.profile.sourceHash);
  assert.equal(o.deviations.length, 19); assert.equal(o.blocking, 5);
  assert.deepEqual(o.counts.measured, { field: 0, bench: 0 });
  assert.equal(JSON.stringify(sources.profile.coupled.Vx140), JSON.stringify(['Vx140', 'Vx142']), 'profilen ändras inte av läsningen');
});
