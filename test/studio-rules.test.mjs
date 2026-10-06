import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSources, studioRules, crossoverProposals, companionCheck } from '../src/studio/index.mjs';
import { rulesFromProfile, compileRules, profileFragments, compiledFragments, validateRules, explainRule, recomputeRouteTurnouts, routeDiff, proposeCrossoverRules, proposeDetectionRules, RULE_TYPES } from '../src/studio/rules.mjs';
const sources = loadSources(), { profile } = sources, rules = rulesFromProfile(profile, { indications: sources.indications });
const names = { turnouts: new Set(Object.keys(profile.turnouts)), blocks: new Set(Object.keys(profile.blocks)), signals: new Set(Object.keys(profile.signals)), lines: new Set(Object.keys(profile.operatingControls.lines)) };
const count = (t, trig) => rules.filter(r => r.type === t && (!trig || r.trigger === trig)).length;

test('dagens profil blir 69 regler: de tre typer kärnan verkställer plus härledda signalbesked och vägövergångar', () => {
  assert.equal(rules.length, 69);
  assert.deepEqual([count('follow'), count('authority'), count('condition', 'manual'), count('condition', 'line'), count('condition', 'programming'), count('aspect'), count('crossing'), count('detection')], [7, 8, 35, 7, 1, 7, 4, 0]);
  assert.ok(rules.filter(r => r.type === 'aspect').every(r => r.owner === 'bindings' && r.status === 'unresolved' && r.signals.length));
  assert.deepEqual(rules.find(r => r.id === 'crossing:V4').blocks, ['SLI', 'SLII']); assert.equal(rules.find(r => r.id === 'crossing:V1').conditions.length, sources.indications.indicators[0].conditions.length);
  assert.deepEqual(RULE_TYPES, ['follow', 'forbid', 'authority', 'condition', 'detection', 'aspect', 'crossing']);
  assert.equal(rules.find(r => r.id === 'follow:Vx100+Vx101').source.jmri, 'IX:AUTO:0007C1');
  assert.equal(rules.filter(r => r.status === 'unresolved').length, 5 + 7 + 4);
});

test('reglerna kompilerar tillbaka till exakt de fragment kärnan läser', () => {
  const compiled = compileRules(rules, { turnoutNames: Object.keys(profile.turnouts) });
  assert.deepEqual(compiledFragments(compiled), profileFragments(profile));
  assert.deepEqual(compiled.indicators, sources.indications.indicators, 'vägövergångsreglerna ger katalogens indikeringar');
  assert.deepEqual([compiled.blocks, compiled.signals, compiled.indications], [{}, {}, null], 'inget regelägt i dag');
  assert.deepEqual(validateRules(rules, names), []);
  const file = JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal-rules.json', import.meta.url), 'utf8'));
  assert.equal(file.sourceHash, profile.sourceHash); assert.deepEqual(file.rules, rules);
});

test('valideringen stoppar okända objekt, dubbla följgrupper och det kärnan inte kan verkställa', () => {
  const bad = [...rules, { id: 'follow:Vx100+Vx999', type: 'follow', objects: ['Vx100', 'Vx999'], relation: 'same', bothWays: true, status: 'active' },
    { id: 'follow:Vx95+Vx96', type: 'follow', objects: ['Vx95', 'Vx96'], relation: 'opposite', bothWays: false, status: 'active' },
    { id: 'forbid:1', type: 'forbid', positions: { Vx140: 'T', Vx142: 'X' }, status: 'active' }, { id: 'aspect:1/5', type: 'aspect', object: '1/5', signals: ['1/5', 'X9'], stopCodes: [0, 200], goCodes: [0], status: 'active' },
    { id: 'detection:S999', type: 'detection', object: 'S999', logic: 'both', inputs: [{ system: 'LS9', address: 9000 }], status: 'active' }, { id: 'detection:SIA', type: 'detection', object: 'SIA', logic: 'any', inputs: [], status: 'active' }, { id: 'detection:SIA2', type: 'detection', object: 'SIA', logic: 'any', inputs: [{ system: 'LS90', address: 90 }], status: 'active' },
    { id: 'crossing:V9', type: 'crossing', object: 'V9', logic: 'any', conditions: [], status: 'active' }];
  const problems = validateRules(bad, names).map(p => p.rule + ': ' + p.problem);
  assert.ok(problems.includes('follow:Vx100+Vx999: Växeln Vx999 finns inte'));
  assert.ok(problems.includes('follow:Vx100+Vx999: Vx100 följer redan gruppen follow:Vx100+Vx101'));
  assert.ok(problems.includes('follow:Vx95+Vx96: Bara same med bothWays stöds av dagens kärna'));
  assert.ok(problems.includes('forbid:1: Ogiltigt läge X') && !problems.some(p => p.startsWith('forbid:1: forbid prövas inte')));
  assert.ok(problems.includes('aspect:1/5: Signalen X9 finns inte') && problems.includes('aspect:1/5: Beskedskoder ska vara 0–127') && problems.includes('aspect:1/5: Samma kod kan inte betyda både stopp och kör'));
  assert.ok(problems.includes('detection:S999: Spårledningen S999 finns inte') && problems.includes('detection:S999: logic ska vara any eller all') && problems.includes('detection:S999: Ingången LS9 saknar adress 1–4096'));
  assert.ok(problems.includes('detection:SIA: En detekteringsregel behöver minst en ingång') && problems.includes('detection:SIA2: SIA har redan en detekteringsregel'));
  assert.ok(problems.includes('crossing:V9: Vägövergången behöver minst ett villkor') && problems.includes('crossing:V9: Vägövergången saknar indikeringsunderlag'));
  assert.throws(() => compileRules([...rules, { ...rules.find(r => r.id === 'condition:manual:vxv113'), id: 'condition:manual:dubblett' }], { turnoutNames: Object.keys(profile.turnouts) }), /Två manöverregler/);
});

test('tillbakaläsningen säger på svenska vad som gäller', () => {
  assert.equal(explainRule(rules.find(r => r.id === 'follow:Vx100+Vx101')), 'Vx100 och Vx101 läggs alltid lika. En order till den ena går till båda, och en tågväg låser båda.');
  assert.match(explainRule(rules.find(r => r.id === 'authority:Vx112')), /TKL får lägga C och T, rangeraren bara C\. I C är ben A och B/);
  assert.match(explainRule(rules.find(r => r.id === 'condition:manual:vxv102/112')), /^Manuell omläggning av Vx102 och Vx112 kräver att S102, S112 och S112a är fria.*Olöst: Knappgruppens/);
  assert.match(explainRule(rules.find(r => r.id === 'condition:line:AN')), /^Spärras A nedspår hålls tågvägar över SN2A och från htvAn/);
  assert.match(explainRule(rules.find(r => r.id === 'condition:programming')), /Vx133 i C, S133 fritt.*LT134 \(adress 134\).*LS940 \(940\)/);
});

test('tågvägarnas växellägen är vägens växlar utvidgade med följreglerna, exakt som tabellen', () => {
  const next = recomputeRouteTurnouts(profile, profile.coupled);
  for (const r of profile.routes) assert.deepEqual(next[r.id], r.turnouts, r.id);
  assert.equal(routeDiff(profile, profile.coupled).length, 0);
});

test('förslaget för X1 och X2 byter paren och visar effekten utan att röra tabellen', () => {
  const p = proposeCrossoverRules(profile, rules, crossoverProposals(sources.xml), companionCheck(sources.xml, profile.coupled));
  assert.deepEqual(p.proposals.map(r => r.id), ['follow:Vx140+Vx143', 'follow:Vx141+Vx142', 'follow:Vx162+Vx166', 'follow:Vx163+Vx165']);
  assert.deepEqual(p.replaces, ['follow:Vx140+Vx142', 'follow:Vx162+Vx165']);
  assert.ok(p.proposals.every(r => r.status === 'proposal'));
  assert.deepEqual(p.coupled.Vx140, ['Vx140', 'Vx143']); assert.deepEqual(p.coupled.Vx142, ['Vx141', 'Vx142']);
  assert.deepEqual([p.effects.routesChanged, p.effects.main, p.effects.shunt], [137, 104, 33]);
  const au2a = routeDiff(profile, p.coupled).find(d => d.label === 'Au → Spår 2a');
  assert.equal(au2a.before.Vx142, 'T'); assert.equal(au2a.after.Vx142, undefined); assert.equal(au2a.after.Vx143, 'T');
  const au1a = routeDiff(profile, p.coupled).find(d => d.label === 'Au → Spår 1a');
  assert.deepEqual(Object.fromEntries(Object.entries(au1a.after).filter(([k]) => /Vx14/.test(k))), { Vx140: 'C', Vx141: 'C', Vx142: 'C', Vx143: 'C' });
  assert.deepEqual(profile.coupled.Vx140, ['Vx140', 'Vx142'], 'profilen är orörd');
  const s = studioRules(sources); assert.equal(s.compiledIdentical, true); assert.equal(s.rules.length, 69); assert.equal(s.proposals.length, 4); assert.equal(s.detectionProposals.length, 0, 'profilen bär redan källans ingångar'); assert.equal(s.source, 'profiles/charlottendal-rules.json');
});

test('detekteringsregler ur XML: förslag per spårledning, flera ingångar i kärnan och i simulatorn', async () => {
  const { detectionInventory } = await import('../src/studio/index.mjs');
  const { applyRules } = await import('../src/studio/apply.mjs');
  const { Engine } = await import('../src/engine.mjs');
  const { Field } = await import('../src/field.mjs');
  const { sensorReport, decode } = await import('../src/protocol.mjs');
  const { toRules } = await import('../src/studio/assistant.mjs');
  const field = JSON.parse(fs.readFileSync(new URL('../profiles/simulator-network.json', import.meta.url), 'utf8'));
  assert.equal(proposeDetectionRules(detectionInventory(sources).sections, rules).length, 0, 'profilen bär redan källans LS-ingångar, så inget föreslås');
  // En spårledning som fortfarande har bänkadress får sitt förslag ur källan.
  const unbound = structuredClone(profile); unbound.blocks.SIA = { address: 3093, activeMeansOccupied: true, sourceSensor: 'slS1a', provenance: 'Bench detector binding.' };
  const proposals = proposeDetectionRules(detectionInventory({ ...sources, profile: unbound }).sections, rules);
  assert.equal(proposals.length, 1, 'en per spårledning utan källans ingångar');
  const sia = proposals.find(p => p.object === 'SIA');
  assert.deepEqual(sia.inputs.map(i => [i.system, i.address]), [['LS90', 90], ['LS100', 100]]); assert.equal(sia.logic, 'any'); assert.equal(sia.owner, 'rule'); assert.equal(sia.status, 'proposal');
  assert.deepEqual(validateRules([...rules, ...proposals.map(p => ({ ...p, status: 'active' }))], names), []);
  assert.match(explainRule(sia), /SIA är belagd när någon av LS90 \(adress 90\) och LS100 \(adress 100\) är aktiv/);
  const all = { ...sia, status: 'active', logic: 'all' }, applied = applyRules(unbound, [...rules, { ...sia, status: 'active' }], field);
  assert.deepEqual(applied.profile.blocks.SIA.inputs, [{ address: 90, activeMeansOccupied: true }, { address: 100, activeMeansOccupied: true }]); assert.equal(applied.profile.blocks.SIA.address, 90); assert.equal(applied.profile.blocks.SIA.logic, 'any');
  assert.equal(applied.field.blocks.SIA.address, 90); assert.deepEqual(applied.changes.fragments.filter(f => f.kind === 'detection'), [{ kind: 'detection', object: 'SIA', before: '3093', after: '90|100' }]);
  assert.equal(unbound.blocks.SIA.address, 3093, 'profilen i minnet är orörd');
  const e = new Engine(applied.profile); e.connection(true);
  e.receive(sensorReport(90, true)); assert.equal(e.blocks.SIA.occupied, true, 'någon av: en aktiv ingång räcker');
  e.receive(sensorReport(100, false)); assert.equal(e.blocks.SIA.occupied, true); e.receive(sensorReport(90, false)); assert.equal(e.blocks.SIA.occupied, false);
  const e2 = new Engine(applyRules(unbound, [...rules, all], field).profile); e2.connection(true);
  e2.receive(sensorReport(90, true)); assert.equal(e2.blocks.SIA.occupied, null, 'alla av: okänd tills båda rapporterat'); e2.receive(sensorReport(100, true)); assert.equal(e2.blocks.SIA.occupied, true); e2.receive(sensorReport(100, false)); assert.equal(e2.blocks.SIA.occupied, false);
  const f = new Field(applied.field), frames = []; f.on('frame', b => frames.push(b)); f.setBlock('SIA', true);
  assert.deepEqual(frames.map(b => JSON.stringify(decode(b))), [JSON.stringify({ kind: 'sensor', address: 90, active: true }), JSON.stringify({ kind: 'sensor', address: 100, active: true })]);
  const chat = toRules([{ type: 'detection', objects: ['S121'], inputs: ['LS121', 'LS122'], logic: 'all' }], { activeRules: rules });
  assert.equal(chat[0].id, 'detection:S121'); assert.deepEqual(chat[0].inputs.map(i => i.address), [121, 122]); assert.equal(chat[0].logic, 'all'); assert.deepEqual(validateRules([...rules, chat[0]], names), []);
});
