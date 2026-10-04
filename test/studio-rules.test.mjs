import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSources, studioRules, crossoverProposals, companionCheck } from '../src/studio/index.mjs';
import { rulesFromProfile, compileRules, profileFragments, validateRules, explainRule, recomputeRouteTurnouts, routeDiff, proposeCrossoverRules, RULE_TYPES } from '../src/studio/rules.mjs';
const sources = loadSources(), { profile } = sources, rules = rulesFromProfile(profile);
const names = { turnouts: new Set(Object.keys(profile.turnouts)), blocks: new Set(Object.keys(profile.blocks)), signals: new Set(Object.keys(profile.signals)), lines: new Set(Object.keys(profile.operatingControls.lines)) };
const count = (t, trig) => rules.filter(r => r.type === t && (!trig || r.trigger === trig)).length;

test('dagens profil blir 53 regler i de tre typer som finns i dag', () => {
  assert.equal(rules.length, 53);
  assert.deepEqual([count('follow'), count('authority'), count('condition', 'manual'), count('condition', 'line'), count('condition', 'programming')], [7, 3, 35, 7, 1]);
  assert.deepEqual(RULE_TYPES, ['follow', 'forbid', 'authority', 'condition', 'detection', 'aspect', 'crossing']);
  assert.equal(rules.find(r => r.id === 'follow:Vx100+Vx101').source.jmri, 'IX:AUTO:0007C1');
  assert.equal(rules.filter(r => r.status === 'unresolved').length, 5);
});

test('reglerna kompilerar tillbaka till exakt de fragment kärnan läser', () => {
  const compiled = compileRules(rules, { turnoutNames: Object.keys(profile.turnouts) });
  assert.deepEqual(compiled, profileFragments(profile));
  assert.deepEqual(validateRules(rules, names), []);
  const file = JSON.parse(fs.readFileSync(new URL('../profiles/charlottendal-rules.json', import.meta.url), 'utf8'));
  assert.equal(file.sourceHash, profile.sourceHash); assert.deepEqual(file.rules, rules);
});

test('valideringen stoppar okända objekt, dubbla följgrupper och det kärnan inte kan verkställa', () => {
  const bad = [...rules, { id: 'follow:Vx100+Vx999', type: 'follow', objects: ['Vx100', 'Vx999'], relation: 'same', bothWays: true, status: 'active' },
    { id: 'follow:Vx95+Vx96', type: 'follow', objects: ['Vx95', 'Vx96'], relation: 'opposite', bothWays: false, status: 'active' },
    { id: 'forbid:1', type: 'forbid', positions: { Vx140: 'T', Vx142: 'X' }, status: 'active' }, { id: 'aspect:1/5', type: 'aspect', object: '1/5' }];
  const problems = validateRules(bad, names).map(p => p.rule + ': ' + p.problem);
  assert.ok(problems.includes('follow:Vx100+Vx999: Växeln Vx999 finns inte'));
  assert.ok(problems.includes('follow:Vx100+Vx999: Vx100 följer redan gruppen follow:Vx100+Vx101'));
  assert.ok(problems.includes('follow:Vx95+Vx96: Bara same med bothWays stöds av dagens kärna'));
  assert.ok(problems.includes('forbid:1: Ogiltigt läge X') && !problems.some(p => p.startsWith('forbid:1: forbid prövas inte')));
  assert.ok(problems.includes('aspect:1/5: aspect tas in i steg 6'));
  assert.throws(() => compileRules([...rules, { ...rules.find(r => r.id === 'condition:manual:vxv113'), id: 'condition:manual:dubblett' }], { turnoutNames: Object.keys(profile.turnouts) }), /Två manöverregler/);
});

test('tillbakaläsningen säger på svenska vad som gäller', () => {
  assert.equal(explainRule(rules.find(r => r.id === 'follow:Vx100+Vx101')), 'Vx100 och Vx101 läggs alltid lika. En order till den ena går till båda, och en tågväg låser båda.');
  assert.match(explainRule(rules.find(r => r.id === 'authority:Vx112')), /TKL får lägga C och T, rangeraren bara T\. I T är ben B/);
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
  const s = studioRules(sources); assert.equal(s.compiledIdentical, true); assert.equal(s.rules.length, 53); assert.equal(s.proposals.length, 4); assert.equal(s.source, 'profiles/charlottendal-rules.json');
});
