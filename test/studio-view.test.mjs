import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSources, studioData } from '../src/studio/index.mjs';
import { buildStudioModel, relationsFor, rowsFor, cellsFor, columnsFor, walkOrder, parseHash, planGeometry, deviationObjects, SETS } from '../public/studio-model.js';
const sources = loadSources(), studio = studioData(sources);
const model = buildStudioModel({ profile: sources.profile, panel: sources.panel, studio });

test('lasten till Studio-sidan bär objekten, sektionerna och relationerna utan tågväg', () => {
  assert.equal(studio.objects.turnouts.length, 49); assert.equal(studio.objects.signals.length, 66); assert.equal(studio.objects.blocks.length, 197); assert.equal(studio.objects.modules.length, 12);
  assert.equal(studio.detection.sections.length, 197); assert.equal(studio.signalRelations.unmatched.length, 44);
  const sia = studio.detection.sections.find(s => s.name === 'SIA');
  assert.deepEqual(sia.inputDetails, [{ system: 'LS90', user: 'Sp04-90', module: 'M04' }, { system: 'LS100', user: 'Sp05-100', module: 'M05' }]);
});

test('modellen i webbläsaren räknar relationerna ur samma last', () => {
  assert.equal(model.objects.size, 49 + 66 + 197 + 340 + 12 + 18 + 69 + 4);
  assert.equal(relationsFor(model, 'Vx100').rules.sort().join(','), 'condition:manual:vxv100/101,follow:Vx100+Vx101');
  assert.ok(rowsFor(model, 'regler', 'Vx140').some(r => r.id === 'follow:Vx140+Vx143'));
  const vx100 = relationsFor(model, 'Vx100');
  assert.equal(vx100.routes.length, 132); assert.ok(vx100.turnouts.includes('Vx101')); assert.deepEqual(vx100.modules, ['M02']);
  const s15 = relationsFor(model, '1/5');
  assert.equal(model.objects.get('1/5').routes.length, 35); assert.equal(model.objects.get('1/5').guards.length, 38); assert.deepEqual(s15.modules, ['M02', 'M01']);
  assert.equal(relationsFor(model, 'SIA').routes.length, 29); assert.deepEqual(relationsFor(model, 'SIA').modules, ['M04', 'M05']);
  const x1 = model.deviations.find(d => d.code === 'companion-pairs');
  assert.deepEqual(x1.objects, ['Vx140', 'Vx142', 'Vx162', 'Vx165']);
  assert.ok(relationsFor(model, 'Vx140').deviations.includes('avv:companion-pairs'));
  assert.deepEqual(deviationObjects({ items: ['tvs1/1 → tvs1/5', 'Vx140 + Vx142', 'S155'] }), ['Vx140', 'Vx142', 'S155']);
});

test('Data-vyns projektioner filtreras genom relationerna och har kolumner för varje mängd', () => {
  for (const s of SETS) { assert.ok(columnsFor(s.id).length >= 5, s.id); assert.ok(rowsFor(model, s.id).length > 0, s.id); }
  assert.equal(rowsFor(model, 'tagvagar', 'Vx100').length, 132);
  assert.equal(rowsFor(model, 'vaxlar', 'htvAu--htvSpIA').map(t => t.id).sort().join(','), 'Vx100,Vx101,Vx110,Vx117,Vx95');
  assert.equal(rowsFor(model, 'moduler', 'M02').length, 1); assert.ok(rowsFor(model, 'vaxlar', 'M02').some(t => t.id === 'Vx100'));
  const row = cellsFor(model, 'vaxlar', model.objects.get('Vx100'));
  assert.equal(row.module, 'M02 · 1'); assert.equal(row.companion, 'Vx101'); assert.equal(row.routes, '132');
  assert.equal(cellsFor(model, 'sparledningar', model.objects.get('S155')).status, 'Ingen detektering');
  assert.equal(cellsFor(model, 'tagvagar', model.objects.get('htvAu--htvSpIA')).turnouts, '95 T 100 C 101 C 110 C 117 C');
});

test('gå igenom går från vänster till höger genom 115 objekt och djuplänken läses', () => {
  const order = walkOrder(sources.panel);
  assert.equal(order.length, 115); assert.ok(order.indexOf('Vx95') < order.indexOf('Vx100')); assert.ok(order.indexOf('Vx100') < order.indexOf('Vx140'));
  assert.deepEqual(parseHash('#data?set=tagvagar,signaler&objekt=Vx100'), { tab: 'data', view: '', sets: ['tagvagar', 'signaler'], object: 'Vx100' });
  assert.deepEqual(parseHash(''), { tab: 'konfigurera', view: '', sets: [], object: null });
  assert.equal(parseHash('#konfigurera/regler').view, 'regler');
  assert.equal(parseHash('#nonsense?set=fel').tab, 'konfigurera');
});

test('planen ritas ur geometrin utan ramen och markerar odetekterade spår', () => {
  const geo = planGeometry(sources.panel, new Set(['S155', 'Slokstall1']));
  assert.ok(geo.segments.length > 200 && !geo.segments.some(s => s.block === 'frame' || s.block === 'friline'));
  assert.equal(geo.turnouts.length, 49); assert.equal(geo.signals.length, 66);
  assert.ok(geo.segments.some(s => s.block === 'Slokstall1' && s.undetected)); assert.ok(geo.turnouts.find(t => t.name === 'Vx155').undetected);
  assert.ok(geo.blockLabels.some(b => b.block === 'SIA'));
});

test('sidan laddar bara egna filer, så den går under serverns CSP', () => {
  const html = fs.readFileSync(new URL('../public/studio.html', import.meta.url), 'utf8');
  for (const url of [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])) assert.ok(url.startsWith('/') || url.startsWith('#'), url);
  assert.ok(!/<script(?![^>]*src=)/.test(html), 'inga inline-skript');
});
