import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSources, studioRules } from '../src/studio/index.mjs';
import { applyRules } from '../src/studio/apply.mjs';
import { runTrial } from '../src/studio/trial.mjs';
import { StudioDrafts } from '../src/studio/drafts.mjs';
import { rulesFromProfile, forbidReason } from '../src/studio/rules.mjs';
import { Storage } from '../src/storage.mjs';
import { Engine } from '../src/engine.mjs';
const sources = loadSources(), { profile } = sources, rules = rulesFromProfile(profile);
const field = JSON.parse(fs.readFileSync(new URL('../profiles/simulator-network.json', import.meta.url), 'utf8'));
const byLabel = label => profile.routes.find(r => r.label === label).id;
const proposal = studioRules(sources);
const draftRules = [...rules.filter(r => !proposal.replaces.includes(r.id)), ...proposal.proposals.map(p => ({ ...p, status: 'active' }))];

test('dagens regler tillämpade på profilen och simulatorn ändrar ingenting', () => {
  const a = applyRules(profile, rules, field);
  assert.deepEqual(a.profile.routes, profile.routes); assert.deepEqual(a.profile.routeAlternatives, profile.routeAlternatives);
  assert.deepEqual(a.profile.coupled, profile.coupled); assert.deepEqual(a.profile.operatingControls, profile.operatingControls);
  assert.deepEqual(a.field.protection, field.protection); assert.deepEqual(a.field.scenarios, field.scenarios); assert.deepEqual(a.field.coupled, field.coupled);
  assert.deepEqual(a.changes, { fragments: [], routes: [] });
  assert.deepEqual(a.profile.rules.map(r => r.id), rules.map(r => r.id));
});

test('förslaget för X1 och X2 ändrar 137 tågvägar, åtta kopplingar och simulatorns skydd, men inte profilen i minnet', () => {
  const b = applyRules(profile, draftRules, field);
  assert.equal(b.changes.routes.length, 137);
  assert.deepEqual(b.changes.fragments.filter(f => f.kind === 'coupled').map(f => f.object), ['Vx140', 'Vx141', 'Vx142', 'Vx143', 'Vx162', 'Vx163', 'Vx165', 'Vx166']);
  const au2a = b.profile.routes.find(r => r.label === 'Au → Spår 2a');
  assert.equal(au2a.turnouts.Vx142, undefined); assert.equal(au2a.turnouts.Vx143, 'T'); assert.equal(au2a.turnouts.Vx140, 'T');
  assert.notDeepEqual(b.field.protection, field.protection); assert.equal(b.field.scenarios.find(s => s.id === au2a.id).turnouts.Vx142, undefined);
  assert.deepEqual(profile.coupled.Vx140, ['Vx140', 'Vx142']); assert.equal(profile.routes.find(r => r.label === 'Au → Spår 2a').turnouts.Vx142, 'T');
});

test('simulatorprovet etablerar tågvägarna med dagens regler och med förslaget', () => {
  const ids = ['Au → Spår 2a', 'Au → Spår 1a', 'Bu → Spår 11', 'An → Spår 1a', 'Au → Spår 1c'].map(byLabel);
  const base = runTrial({ profile, field, routeIds: ids });
  assert.equal(base.ok, 5); assert.ok(base.results[0].ordered.includes('Vx142'));
  const b = applyRules(profile, draftRules, field), next = runTrial({ profile: b.profile, field: b.field, routeIds: ids });
  assert.equal(next.ok, 5, JSON.stringify(next.results.filter(r => r.result !== 'etablerad')));
  const au2a = next.results[0];
  assert.ok(au2a.ordered.includes('Vx143') && !au2a.ordered.includes('Vx142')); assert.equal(au2a.locked.Vx143, 'T');
  const au1a = next.results[1]; assert.deepEqual([au1a.locked.Vx140, au1a.locked.Vx141, au1a.locked.Vx142, au1a.locked.Vx143], ['C', 'C', 'C', 'C']);
});

test('utkastet går från förslag till prov till aktivering, och kan återställas', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-')), storage = new Storage(dir), prepared = [];
  const make = () => new StudioDrafts({ base: profile, field, rules, storage, now: () => 1234, canActivate: p => ({ allowed: true, reason: 'ok ' + p.coupled.Vx140.join('+') }),
    prepare: (p, f) => { prepared.push({ coupled: p.coupled.Vx140, fieldCoupled: f.coupled.Vx140 }); return () => prepared.push('applied'); },
    proposal: () => ({ proposals: proposal.proposals, replaces: proposal.replaces }), trial: a => runTrial({ ...a, routeIds: a.routeIds.slice(0, 4) }), sampleUnchanged: 2 });
  const d = make(); let v = d.view();
  assert.equal(v.activeVersion, 0); assert.equal(v.draft, null); assert.equal(v.versions.length, 1);
  assert.throws(() => d.create({ sessionId: 'fel', revision: 0, source: 'proposal' }), /annat fönster/);
  v = d.create({ sessionId: v.sessionId, revision: v.revision, source: 'proposal', note: 'X1 och X2 diagonalt' });
  assert.equal(v.draft.added.length, 4); assert.equal(v.draft.removed.length, 2); assert.equal(v.draft.changes.routes.count, 137); assert.equal(v.draft.problems.length, 0);
  assert.deepEqual(v.draft.activation, { allowed: false, reason: 'Prova utkastet i simulatorn först.' });
  assert.throws(() => d.create({ sessionId: v.sessionId, revision: v.revision, source: 'proposal' }), /redan ett utkast/);
  assert.throws(() => d.activate({ sessionId: v.sessionId, revision: v.revision, reason: 'För tidigt' }), /Prova utkastet/);
  v = d.test({ sessionId: v.sessionId, revision: v.revision });
  assert.equal(v.draft.trial.total, 4); assert.equal(v.draft.trial.ok, 4); assert.equal(v.draft.trial.changed, 137);
  assert.equal(v.draft.activation.allowed, true); assert.match(v.draft.activation.reason, /Vx140\+Vx143/);
  assert.throws(() => d.activate({ sessionId: v.sessionId, revision: v.revision, reason: 'ab' }), /3–500/);
  v = d.activate({ sessionId: v.sessionId, revision: v.revision, reason: 'Diagonala par bekräftade i ritningen' });
  assert.equal(v.activeVersion, 1); assert.equal(v.draft, null); assert.equal(v.versions[1].reason, 'Diagonala par bekräftade i ritningen');
  assert.deepEqual(prepared, [{ coupled: ['Vx140', 'Vx143'], fieldCoupled: ['Vx140', 'Vx143'] }, 'applied']);
  assert.deepEqual(d.apply(profile).profile.coupled.Vx142, ['Vx141', 'Vx142']);
  const again = make(); assert.equal(again.view().activeVersion, 1, 'versionen överlever omstart');
  v = again.restore({ sessionId: again.sessionId, revision: again.view().revision, version: 0 });
  assert.equal(v.draft.added.length, 2); assert.equal(v.draft.removed.length, 4); assert.equal(v.draft.note, 'Återställning av version 0');
  v = again.discard({ sessionId: again.sessionId, revision: v.revision }); assert.equal(v.draft, null);
});

test('förbjudna kombinationer stoppas av kärnan före order, och saknas de ändras ingenting', () => {
  assert.equal(forbidReason([{ id: 'forbid:x', type: 'forbid', positions: { Vx140: 'T', Vx143: 'T' }, status: 'active' }], { Vx140: 'T', Vx143: 'C' }), null);
  const p2 = structuredClone(profile);
  p2.rules = [{ id: 'forbid:diag', type: 'forbid', positions: { Vx140: 'T', Vx143: 'T' }, status: 'active' }, { id: 'forbid:140', type: 'forbid', positions: { Vx140: 'T' }, status: 'active' }];
  const e = new Engine(p2); e.connection(true);
  assert.throws(() => e.checkRoute(p2.routes.find(r => r.label === 'Au → Spår 2a')), /förbjuden kombination \(forbid:diag\)/);
  assert.throws(() => e.checkRoute(p2.routes.find(r => r.label === 'Au → Spår 1c')), /belagt eller saknar/);
  assert.throws(() => e.manual('Vx140', 'T'), /Vx140=T är en förbjuden kombination/);
  const e2 = new Engine(profile); e2.connection(true);
  assert.throws(() => e2.checkRoute(profile.routes.find(r => r.label === 'Au → Spår 2a')), /belagt eller saknar/);
});
