import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSources } from '../src/studio/sources.mjs';
import { rulesFromProfile } from '../src/studio/rules.mjs';
import { StudioAssistant, toRules, decorateProposals, assistantContext, nameSets } from '../src/studio/assistant.mjs';
import { StudioReview, reviewItems, CARD_TYPES } from '../src/studio/review.mjs';
import { StudioDrafts } from '../src/studio/drafts.mjs';
import { Storage } from '../src/storage.mjs';
const sources = loadSources(), { profile, xml } = sources, rules = rulesFromProfile(profile), names = nameSets(profile);
const field = JSON.parse(fs.readFileSync(new URL('../profiles/simulator-network.json', import.meta.url), 'utf8'));
const message = (obj, extra = {}) => ({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: JSON.stringify(obj) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 80, cache_read_input_tokens: 1000 }, ...extra });
const fakeFetch = (answer, calls = [], status = 200) => async (url, init) => { const body = JSON.parse(init.body); calls.push({ url: String(url), headers: new Headers(init.headers), body }); return new Response(JSON.stringify(typeof answer === 'function' ? answer(body) : answer), { status, headers: { 'content-type': 'application/json' } }); };
const card = (type, objects, extra = {}) => ({ type, objects, relation: 'same', bothWays: true, tkl: [], ranger: [], positions: [], requires: { blocks: [], signals: [] }, note: '', ...extra });
const tempStorage = () => new Storage(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-ai-')));

test('AI:ns kort blir regelspråket, ersätter det som gäller och valideras av TKL', () => {
  const made = toRules([card('follow', ['Vx143', 'Vx140']), card('forbid', [], { positions: [{ object: 'Vx140', position: 'T' }, { object: 'Vx143', position: 'C' }] }),
    card('condition', ['Vx140', 'Vx141'], { requires: { blocks: ['S140', 'S141'], signals: ['1/5'] } }), card('authority', ['Vx112'], { tkl: ['C', 'T'], ranger: ['T'] }), card('follow', ['Vx100', 'Vx999'])], { origin: 'chatt', text: 'prov', activeRules: rules });
  assert.deepEqual(made.map(r => r.id), ['follow:Vx140+Vx143', 'forbid:Vx140=T+Vx143=C', 'condition:manual:Vx140/Vx141', 'authority:Vx112', 'follow:Vx100+Vx999']);
  assert.deepEqual(made[1].positions, { Vx140: 'T', Vx143: 'C' }); assert.deepEqual(made[2].requires, { freeSensors: [], blocks: ['S140', 'S141'], signals: ['1/5'], inactiveNX: [] });
  assert.ok(made[3].detail.ports, 'manöverrätten tar portarna från dagens regel'); assert.equal(made[0].source.studio, 'chatt');
  const d = decorateProposals(made, { profile, activeRules: rules, names });
  assert.deepEqual(d.rules[0].replaces, ['follow:Vx140+Vx142']); assert.deepEqual(d.rules[2].replaces, ['condition:manual:vxv140/141/142/143']); assert.deepEqual(d.rules[3].replaces, ['authority:Vx112']);
  assert.deepEqual(d.rules[0].problems, []); assert.match(d.rules[0].explain, /läggs alltid lika/); assert.ok(d.rules[0].routes.length > 50);
  assert.deepEqual(d.rules[4].problems, ['Växeln Vx999 finns inte']);
  assert.ok(d.replaces.includes('follow:Vx140+Vx142') && d.replaces.includes('follow:Vx100+Vx101'));
  const bare = decorateProposals(toRules([card('authority', ['Vx100'], { tkl: ['C'], ranger: ['C'] })], { activeRules: rules }), { profile, activeRules: rules, names });
  assert.ok(bare.rules[0].problems.some(p => /Portarna/.test(p)));
  const ctx = assistantContext({ profile, xml }, rules, ['Vx140', 'S140', '1/5', 'Vx999']);
  assert.deepEqual(ctx.selection.map(s => s.object), ['Vx140', 'S140', '1/5']); assert.equal(ctx.selection[0].divergingLeadsTo, 'Vx143'); assert.deepEqual(ctx.selection[0].group, ['Vx140', 'Vx142']);
  assert.ok(ctx.existingRules.some(r => r.id === 'follow:Vx140+Vx142')); assert.equal(ctx.names.turnouts.length, 49);
});

test('chatten frågar Claude med nyckeln på servern, enligt schemat, och läser tillbaka regeln själv', async () => {
  const calls = [], ai = new StudioAssistant({ key: 'test-key', fetcher: fakeFetch(message({ message: 'Vx140 och Vx143 läggs lika.', objects: ['Vx140', 'Vx143'], questions: [], rules: [card('follow', ['Vx140', 'Vx143'])] }), calls) });
  assert.equal(ai.configured, true); assert.equal(ai.view().model, 'claude-opus-5-5');
  const r = await ai.propose({ text: 'Vx140 och Vx143 ska alltid ligga lika', objects: ['Vx140'] }, { profile, xml, activeRules: rules, names });
  assert.equal(calls.length, 1); const { body, headers } = calls[0];
  assert.equal(headers.get('x-api-key'), 'test-key'); assert.match(calls[0].url, /\/v1\/messages(\?beta=true)?$/);
  assert.equal(body.model, 'claude-opus-5-5'); assert.equal(body.output_config.format.type, 'json_schema'); assert.equal(body.output_config.effort, 'high'); assert.deepEqual(body.thinking, { type: 'adaptive' });
  assert.equal(body.fallbacks, 'default'); assert.equal(body.tool_choice, undefined); assert.ok(headers.get('anthropic-beta').includes('server-side-fallback-2026-07-01'));
  assert.ok(body.system[0].text.includes('Vx140') && body.system[0].text.includes('SIA')); assert.deepEqual(body.system[0].cache_control, { type: 'ephemeral' });
  const input = JSON.parse(body.messages[0].content); assert.equal(input.text, 'Vx140 och Vx143 ska alltid ligga lika'); assert.equal(input.selection[0].divergingLeadsTo, 'Vx143'); assert.ok(input.existingRules.some(x => x.id === 'follow:Vx140+Vx142'));
  assert.equal(r.message, 'Vx140 och Vx143 läggs lika.'); assert.deepEqual(r.objects, ['Vx140', 'Vx143']); assert.equal(r.rules.length, 1);
  assert.equal(r.rules[0].id, 'follow:Vx140+Vx143'); assert.match(r.rules[0].explain, /Vx140 och Vx143 läggs alltid lika/); assert.deepEqual(r.rules[0].problems, []); assert.deepEqual(r.replaces, ['follow:Vx140+Vx142']);
  assert.deepEqual(r.usage, { input: 1200, output: 80, cached: 1000 }); assert.equal(r.model, 'claude-opus-5-5');
  await assert.rejects(ai.propose({ text: 'ab' }, { profile, xml, activeRules: rules, names }), e => e.status === 400 && /3–2000/.test(e.message));
});

test('utan nyckel är chatten inte ansluten; vägran och API-fel blir svenska meddelanden', async () => {
  const off = new StudioAssistant({ key: '' }); assert.equal(off.configured, false);
  await assert.rejects(off.propose({ text: 'Vx100 och Vx101' }, { profile, xml, activeRules: rules, names }), e => e.status === 503 && /inte ansluten/.test(e.message));
  const refusing = new StudioAssistant({ key: 'k', fetcher: fakeFetch(message({}, { stop_reason: 'refusal', content: [] })) });
  await assert.rejects(refusing.propose({ text: 'Vx100 och Vx101 lika' }, { profile, xml, activeRules: rules, names }), e => e.status === 502 && /avböjde/.test(e.message));
  const unauthorized = new StudioAssistant({ key: 'k', fetcher: fakeFetch({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, [], 401) });
  await assert.rejects(unauthorized.propose({ text: 'Vx100 och Vx101 lika' }, { profile, xml, activeRules: rules, names }), e => e.status === 502 && /nyckel eller behörighet/.test(e.message));
  const bad = new StudioAssistant({ key: 'k', fetcher: fakeFetch({ type: 'error', error: { type: 'invalid_request_error', message: 'bad schema' } }, [], 400) });
  await assert.rejects(bad.propose({ text: 'Vx100 och Vx101 lika' }, { profile, xml, activeRules: rules, names }), e => e.status === 502 && /fel 400/.test(e.message));
  const garbled = new StudioAssistant({ key: 'k', fetcher: fakeFetch(message({}, { content: [{ type: 'text', text: '{not json' }] })) });
  await assert.rejects(garbled.propose({ text: 'Vx100 och Vx101 lika' }, { profile, xml, activeRules: rules, names }), /oläsbart/);
});

test('genomgången utan nyckel ger de deterministiska korten ur källorna', async () => {
  const items = reviewItems(sources, rules);
  const count = t => items.filter(i => i.type === t).length;
  assert.deepEqual([count('förslag'), count('saknas'), count('beslut'), count('underlag')], [7, 3, 5, 5]);
  const x1 = items.find(i => i.id === 'x-X1'); assert.equal(x1.action, 'draft'); assert.deepEqual(x1.rules.map(r => r.id), ['follow:Vx140+Vx143', 'follow:Vx141+Vx142']); assert.deepEqual(x1.rules.flatMap(r => r.problems), []); assert.deepEqual(x1.replaces, ['follow:Vx140+Vx142']);
  assert.match(x1.text, /137 tågvägar/); assert.equal(items.find(i => i.id === 'manual-groups').related.length, 5); assert.equal(items.find(i => i.id === 'crossings').count, 4);
  assert.ok(items.every(i => CARD_TYPES.includes(i.type) && i.title && i.text));
  const storage = tempStorage(), review = new StudioReview({ sources, assistant: new StudioAssistant({ key: '' }), storage, activeRules: () => rules, baseProfile: () => profile, now: () => 777 });
  assert.equal(review.view().last, null); assert.equal(review.view().assistant.configured, false);
  const v = await review.run();
  assert.equal(v.last.mode, 'deterministisk'); assert.equal(v.running, false); assert.equal(v.last.at, 777); assert.equal(v.last.cards.length, 20); assert.deepEqual(v.last.counts, { förslag: 7, saknas: 3, beslut: 5, underlag: 5 });
  assert.equal(storage.load('studio-review.json', null).cards.length, 20);
  assert.equal(new StudioReview({ sources, assistant: new StudioAssistant({ key: '' }), storage, activeRules: () => rules, baseProfile: () => profile }).view().last.at, 777, 'senaste genomgången läses in vid start');
});

test('genomgången med AI ordnar korten, bedömer dem och validerar extra förslag', async () => {
  const calls = [];
  const answer = body => { const input = JSON.parse(body.messages[0].content); assert.equal(input.cards.length, 20); assert.ok(input.plant.rules.length >= 53); assert.equal(input.plant.unmatchedSignalRelations.length, 44);
    return message({ summary: 'Börja med dubbelkorsväxlarna.', cards: [{ id: 'manual-groups', type: 'saknas', priority: 2, assessment: 'Gruppen vxv140 löses av X1-förslaget först.' }, { id: 'x-X1', type: 'förslag', priority: 1, assessment: 'Ritningen är entydig.' }, { id: 'turntable', type: 'beslut', priority: 3, assessment: 'Byter typ.' }, { id: 'finns-inte', type: 'beslut', priority: 1, assessment: 'x' }],
      extra: [{ title: 'Vx100 och Vx999', type: 'förslag', text: 'Prov', objects: ['Vx100', 'Vx999'], rules: [card('follow', ['Vx100', 'Vx999'])] }, { title: 'Bara text', type: 'nonsens', text: 'Utan regel', objects: [], rules: [] }] }); };
  const review = new StudioReview({ sources, assistant: new StudioAssistant({ key: 'k', fetcher: fakeFetch(answer, calls) }), storage: tempStorage(), activeRules: () => rules, baseProfile: () => profile });
  const v = await review.run(); const last = v.last;
  assert.equal(last.mode, 'ai'); assert.equal(last.model, 'claude-opus-5-5'); assert.equal(last.summary, 'Börja med dubbelkorsväxlarna.'); assert.equal(calls[0].body.output_config.format.schema.properties.extra.items.properties.rules.items.properties.type.enum.length, 4);
  assert.deepEqual(last.cards.slice(0, 3).map(c => c.id), ['x-X1', 'manual-groups', 'turntable']); assert.equal(last.cards[0].assessment, 'Ritningen är entydig.'); assert.equal(last.cards[2].type, 'beslut'); assert.equal(last.cards[2].typeFromSources, 'underlag');
  const extra = last.cards.filter(c => c.origin === 'ai'); assert.equal(extra.length, 2); assert.equal(extra[0].id, 'ai:1'); assert.deepEqual(extra[0].objects, ['Vx100']); assert.equal(extra[0].action, 'draft');
  assert.deepEqual(extra[0].rules[0].problems, ['Växeln Vx999 finns inte']); assert.equal(extra[1].type, 'underlag'); assert.equal(extra[1].action, 'none');
  assert.equal(last.cards.length, 22); assert.deepEqual(last.counts, { förslag: 7 + 1, saknas: 3, beslut: 5 + 1, underlag: 5 - 1 + 1 });
  assert.ok(last.cards.filter(c => c.priority === null).every((c, i, a) => i === 0 || a[i - 1].id !== c.id), 'oprioriterade kort behåller källornas ordning');
});

test('ett utkast ur chatten lägger nya regler ovanpå de aktiva, minus dem de ersätter', () => {
  const d = new StudioDrafts({ base: profile, field, rules, storage: tempStorage(), now: () => 1 });
  let v = d.view();
  const made = toRules([card('follow', ['Vx140', 'Vx143'])], { origin: 'chatt', text: 'lika', activeRules: rules });
  assert.throws(() => d.create({ sessionId: v.sessionId, revision: v.revision, add: [] }), /Inga regler/);
  assert.throws(() => d.create({ sessionId: v.sessionId, revision: v.revision, add: [{ type: 'follow' }] }), /Ogiltigt regelkort/);
  v = d.create({ sessionId: v.sessionId, revision: v.revision, add: made, replaces: ['follow:Vx140+Vx142'], note: 'Chatt: lika' });
  assert.equal(v.draft.rules, rules.length); assert.deepEqual(v.draft.added.map(r => r.id), ['follow:Vx140+Vx143']); assert.deepEqual(v.draft.removed.map(r => r.id), ['follow:Vx140+Vx142']);
  assert.equal(v.draft.added[0].status, 'active'); assert.equal(v.draft.added[0].source.studio, 'chatt'); assert.deepEqual(v.draft.problems, []); assert.ok(v.draft.changes.routes.count > 0);
});
