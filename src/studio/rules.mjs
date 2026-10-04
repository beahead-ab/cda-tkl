// Regelspråket: sju typer. Steg 3 uttrycker det som redan finns i driftprofilen som regler
// (kompisväxlar, gränsväxlar, manuella villkor, linjespärrar och programmeringsspåret) och
// kompilerar dem tillbaka till exakt de fragment kärnan läser i dag. Ingen ny logik i kärnan.
export const RULE_TYPES = ['follow', 'forbid', 'authority', 'condition', 'detection', 'aspect', 'crossing'];
export const TYPE_LABEL = { follow: 'Följer', forbid: 'Förbjudet läge', authority: 'Manöverrätt', condition: 'Villkor', detection: 'Detektering', aspect: 'Signalbesked', crossing: 'Vägövergång' };
export const RUNS_IN = { follow: 'TKL', forbid: 'TKL', authority: 'TKL', condition: 'TKL', detection: 'TKL', aspect: 'MGP', crossing: 'TKL' };
const UNRESOLVED_REASON = 'Ingen entydig manöverregel är ansluten för växeln.';
const POS = ['C', 'T'];
const list = (xs, max = 6) => xs.length > max ? xs.slice(0, max).join(', ') + ` och ${xs.length - max} till` : xs.length > 1 ? xs.slice(0, -1).join(', ') + ' och ' + xs.at(-1) : xs.join('');

// Dagens profil uttryckt som regler. Varje regel bär det kompilatorn behöver för att återskapa fragmentet.
export function rulesFromProfile(profile) {
  const rules = [], seen = new Set();
  const manual = profile.manualPolicies?.rules || [];
  for (const group of Object.values(profile.coupled || {})) {
    if (group.length < 2) continue;
    const objects = [...group].sort(), key = objects.join('+');
    if (seen.has(key)) continue; seen.add(key);
    const button = manual.find(r => [...r.names].sort().join('+') === key);
    rules.push({ id: 'follow:' + key, type: 'follow', objects, relation: 'same', bothWays: true, runsIn: 'tkl', status: 'active',
      source: { profile: 'coupled', jmri: button?.rule || null, button: button?.button || null } });
  }
  for (const [name, b] of Object.entries(profile.yardBoundaries || {}))
    rules.push({ id: 'authority:' + name, type: 'authority', object: name, tkl: b.tklPositions, ranger: b.rangerPositions, detail: { ports: b.ports, tklLegs: b.tklLegs, yardLegs: b.yardLegs },
      runsIn: 'tkl', status: 'active', source: { profile: 'yardBoundaries', button: b.sourceButton, provenance: b.provenance } });
  for (const r of manual)
    rules.push({ id: 'condition:manual:' + r.button, type: 'condition', trigger: 'manual', objects: r.names, button: r.button,
      requires: { freeSensors: r.freeSensors, blocks: r.blocks, signals: r.signals, inactiveNX: r.inactiveNX }, runsIn: 'tkl',
      status: r.status === 'ready' ? 'active' : 'unresolved', reason: r.reason, source: { profile: 'manualPolicies.rules', jmri: r.rule } });
  for (const l of Object.values(profile.operatingControls?.lines || {}))
    rules.push({ id: 'condition:line:' + l.id, type: 'condition', trigger: 'line', object: l.id, label: l.label, button: l.button, sourceSensor: l.sourceSensor,
      requires: { blocks: l.blocks }, runsIn: 'tkl', status: 'active', source: { profile: 'operatingControls.lines', jmri: l.rule } });
  const pr = profile.operatingControls?.programming;
  if (pr) rules.push({ id: 'condition:programming', type: 'condition', trigger: 'programming', object: pr.turnout, requiredPosition: pr.requiredPosition,
    requires: { blocks: pr.blocks, clearBlocks: pr.clearBlocks }, relay: { address: pr.relayAddress, reportAddress: pr.reportAddress, sourceRelay: pr.sourceRelay, sourceReport: pr.sourceReport },
    runsIn: 'tkl', status: 'active', source: { profile: 'operatingControls.programming', jmri: pr.rule, provenance: pr.provenance } });
  return rules;
}

const isLive = r => !['proposal', 'rejected', 'unsupported'].includes(r.status);
export const supportedFollow = r => r.type === 'follow' && r.relation === 'same' && r.bothWays === true;

// Reglerna tillbaka till de fragment kärnan läser: coupled, manualPolicies, yardBoundaries och operatingControls.
export function compileRules(rules, { turnoutNames }) {
  const coupled = Object.fromEntries(turnoutNames.map(n => [n, [n]]));
  for (const r of rules.filter(r => supportedFollow(r) && isLive(r))) { const group = [...r.objects].sort(); for (const n of group) coupled[n] = group; }
  const policies = rules.filter(r => r.type === 'condition' && r.trigger === 'manual' && isLive(r)).map(r => ({ rule: r.source.jmri, button: r.button, names: r.objects,
    freeSensors: r.requires.freeSensors, blocks: r.requires.blocks, inactiveNX: r.requires.inactiveNX, signals: r.requires.signals, status: r.status === 'active' ? 'ready' : 'unresolved', reason: r.reason || '' }));
  const byTurnout = {};
  for (const p of policies) for (const n of p.names) { if (byTurnout[n]) throw Error('Två manöverregler för samma växel: ' + n); byTurnout[n] = p; }
  for (const n of turnoutNames) if (!byTurnout[n]) byTurnout[n] = { names: coupled[n] || [n], status: 'unresolved', reason: UNRESOLVED_REASON };
  const yardBoundaries = {}, boundaryOverrides = {};
  for (const r of rules.filter(r => r.type === 'authority' && isLive(r))) {
    yardBoundaries[r.object] = { tklPositions: r.tkl, rangerPositions: r.ranger, ports: r.detail.ports, tklLegs: r.detail.tklLegs, yardLegs: r.detail.yardLegs, sourceButton: r.source.button, provenance: r.source.provenance };
    const original = byTurnout[r.object], replacement = { ...original, names: [r.object], guardTurnouts: original.names, status: 'ready', reason: '', reviewedBoundary: true };
    byTurnout[r.object] = replacement; boundaryOverrides[r.object] = replacement;
  }
  const lines = {};
  for (const r of rules.filter(r => r.type === 'condition' && r.trigger === 'line' && isLive(r))) lines[r.object] = { id: r.object, label: r.label, button: r.button, rule: r.source.jmri, sourceSensor: r.sourceSensor, blocks: r.requires.blocks };
  const pr = rules.find(r => r.type === 'condition' && r.trigger === 'programming' && isLive(r));
  const programming = pr ? { rule: pr.source.jmri, relayAddress: pr.relay.address, reportAddress: pr.relay.reportAddress, sourceRelay: pr.relay.sourceRelay, sourceReport: pr.relay.sourceReport,
    turnout: pr.object, requiredPosition: pr.requiredPosition, blocks: pr.requires.blocks, clearBlocks: pr.requires.clearBlocks, provenance: pr.source.provenance } : null;
  return { coupled, manualPolicies: { rules: policies, byTurnout, ...(Object.keys(boundaryOverrides).length ? { boundaryOverrides } : {}) }, yardBoundaries, operatingControls: { lines, programming } };
}
export function profileFragments(profile) {
  return { coupled: profile.coupled, manualPolicies: profile.manualPolicies, yardBoundaries: profile.yardBoundaries, operatingControls: profile.operatingControls };
}

// Deterministisk validering: objekten finns, lägena är möjliga, ingen växel följer två grupper, inget som kärnan inte kan verkställa.
export function validateRules(rules, names) {
  const problems = [], add = (rule, problem) => problems.push({ rule: rule.id, problem });
  const has = (set, x) => set.has(x);
  const member = new Map();
  for (const r of rules) {
    if (!RULE_TYPES.includes(r.type)) { add(r, `Okänd regeltyp ${r.type}`); continue; }
    const objs = r.objects || (r.object ? [r.object] : []);
    if (r.type === 'follow') {
      if (objs.length < 2) add(r, 'En följregel behöver minst två växlar');
      for (const o of objs) if (!has(names.turnouts, o)) add(r, `Växeln ${o} finns inte`);
      if (!['same', 'opposite'].includes(r.relation)) add(r, 'relation ska vara same eller opposite');
      if (!supportedFollow(r)) add(r, 'Bara same med bothWays stöds av dagens kärna');
      if (isLive(r)) for (const o of objs) { if (member.has(o) && member.get(o) !== r.id) add(r, `${o} följer redan gruppen ${member.get(o)}`); member.set(o, r.id); }
    } else if (r.type === 'authority') {
      if (!has(names.turnouts, r.object)) add(r, `Växeln ${r.object} finns inte`);
      for (const p of [...(r.tkl || []), ...(r.ranger || [])]) if (!POS.includes(p)) add(r, `Ogiltigt läge ${p}`);
      if (!r.ranger?.length) add(r, 'Rangeraren behöver minst ett tillåtet läge');
      if (!r.detail?.ports) add(r, 'Portarna mot rangerbangården är inte kända för växeln; bara gränsväxlarna i källan kan få manöverrätt');
    } else if (r.type === 'condition') {
      if (!['manual', 'line', 'programming', 'route'].includes(r.trigger)) add(r, `Okänd utlösare ${r.trigger}`);
      if (r.trigger === 'manual' || r.trigger === 'programming') for (const o of objs) if (!has(names.turnouts, o)) add(r, `Växeln ${o} finns inte`);
      if (r.trigger === 'line' && !has(names.lines, r.object)) add(r, `Linjen ${r.object} finns inte`);
      for (const b of [...(r.requires?.blocks || []), ...(r.requires?.clearBlocks || [])]) if (!has(names.blocks, b)) add(r, `Spårledningen ${b} finns inte`);
      for (const s of r.requires?.signals || []) if (!has(names.signals, s)) add(r, `Signalen ${s} finns inte`);
      if (r.requiredPosition && !POS.includes(r.requiredPosition)) add(r, `Ogiltigt läge ${r.requiredPosition}`);
    } else if (r.type === 'forbid') {
      for (const [o, p] of Object.entries(r.positions || {})) { if (!has(names.turnouts, o)) add(r, `Växeln ${o} finns inte`); if (!POS.includes(p)) add(r, `Ogiltigt läge ${p}`); }
      if (!Object.keys(r.positions || {}).length) add(r, 'En förbjuden kombination behöver minst ett läge');
    } else add(r, `${r.type} tas in i steg 6`);
  }
  return problems;
}

// Tillbakaläsning på svenska: det här är vad som faktiskt kommer att gälla.
export function explainRule(r) {
  if (r.type === 'follow') return `${list(r.objects)} läggs alltid lika. En order till den ena går till båda, och en tågväg låser båda.`;
  if (r.type === 'authority') { const legs = r.detail?.tklLegs?.join(' och ') || '?'; return `${r.object}: TKL får lägga ${(r.tkl || []).join(' och ') || '?'}, rangeraren bara ${(r.ranger || []).join(' och ') || '?'}. I ${r.ranger?.[0] ?? '?'} är ben ${legs} mot TKL:s område frånkopplat.`; }
  if (r.type === 'condition' && r.trigger === 'manual') {
    const q = r.requires; const parts = [];
    if (q.blocks?.length) parts.push(`${list(q.blocks)} ${q.blocks.length > 1 ? 'är fria' : 'är fri'}`);
    if (q.signals?.length) parts.push(`${q.signals.length} signaler visar bekräftat stopp (${list(q.signals, 4)})`);
    if (q.inactiveNX?.length) parts.push(`${q.inactiveNX.length} tågvägar inte är lagda`);
    if (q.freeSensors?.includes('rsAckRangeFri')) parts.push('rangerbangården är återtagen till TKL');
    return `Manuell omläggning av ${list(r.objects)} kräver att ${parts.join(', att ')}.` + (r.status === 'unresolved' ? ` Olöst: ${r.reason}` : '');
  }
  if (r.type === 'condition' && r.trigger === 'line') return `Spärras ${r.label} hålls tågvägar över ${list(r.requires.blocks)} och från ${r.button} i stopp med låsen kvar, och nya avvisas. Spärren tas bara bort i lokalt läge.`;
  if (r.type === 'condition' && r.trigger === 'programming') return `Programmeringsläge kräver ${r.object} i ${r.requiredPosition}, ${list(r.requires.clearBlocks)} fritt och färska rapporter för ${list(r.requires.blocks)}. Reläet ${r.relay.sourceRelay} (adress ${r.relay.address}) och rapporten ${r.relay.sourceReport} (${r.relay.reportAddress}) måste båda bekräfta.`;
  if (r.type === 'forbid') return `Kombinationen ${Object.entries(r.positions || {}).map(([o, p]) => `${o}=${p}`).join(' och ')} får aldrig förekomma.`;
  return `${TYPE_LABEL[r.type] || r.type}: ${r.id}`;
}
export const ruleObjects = r => r.objects || (r.object ? [r.object] : []);

// Tågvägarnas växellägen är vägens växlar utvidgade med följreglerna. Det reproducerar dagens tabell exakt
// och gör det möjligt att visa vad en ändrad följregel skulle göra, utan att röra den frysta tabellen.
export function recomputeRouteTurnouts(profile, coupled) {
  const blockOf = Object.fromEntries(Object.entries(profile.turnouts).map(([n, t]) => [n, t.block]));
  return Object.fromEntries(profile.routes.map(r => {
    const out = {};
    for (const [n, pos] of Object.entries(r.turnouts)) if (r.blocks.includes(blockOf[n])) for (const m of (coupled[n] || [n])) out[m] = pos;
    return [r.id, out];
  }));
}
const sorted = m => JSON.stringify(Object.keys(m).sort().map(k => [k, m[k]]));
export function routeDiff(profile, coupled) {
  const next = recomputeRouteTurnouts(profile, coupled);
  return profile.routes.filter(r => sorted(r.turnouts) !== sorted(next[r.id])).map(r => ({ id: r.id, label: r.label, kind: r.kind, before: r.turnouts, after: next[r.id] }));
}
export function ruleRoutes(profile, r) {
  const objs = new Set(ruleObjects(r)), blocks = new Set(r.requires?.blocks || []);
  if (r.type === 'condition' && r.trigger === 'line') return profile.routes.filter(x => [x.from, x.to].includes(r.button) || x.blocks.some(b => blocks.has(b))).map(x => x.id);
  return profile.routes.filter(x => Object.keys(x.turnouts).some(t => objs.has(t)) || (blocks.size && x.blocks.some(b => blocks.has(b)))).map(x => x.id);
}

// Förslag ur spårgrafen: dubbelkorsväxlarnas par byts mot de diagonala. Blir utkast med effekt, aldrig aktivt härifrån.
export function proposeCrossoverRules(profile, rules, crossovers, companions) {
  const bad = new Set(companions.filter(c => !c.ok).map(c => [...c.pair].sort().join('+')));
  const replaces = rules.filter(r => r.type === 'follow' && bad.has([...r.objects].sort().join('+'))).map(r => r.id);
  const proposals = [];
  for (const x of crossovers) for (const pair of x.pairs) {
    const objects = [...pair].sort(), id = 'follow:' + objects.join('+');
    if (rules.some(r => r.id === id && isLive(r))) continue;
    proposals.push({ id, type: 'follow', objects, relation: 'same', bothWays: true, runsIn: 'tkl', status: 'proposal', source: { studio: 'grafkontroll', crossing: x.crossing }, replaces: replaces.filter(id => objects.some(o => id.includes(o))) });
  }
  if (!proposals.length) return { proposals, replaces, effects: { routesChanged: 0, main: 0, shunt: 0, examples: [] } };
  const next = [...rules.filter(r => !replaces.includes(r.id)), ...proposals.map(p => ({ ...p, status: 'active' }))];
  const { coupled } = compileRules(next, { turnoutNames: Object.keys(profile.turnouts) });
  const diff = routeDiff(profile, coupled);
  return { proposals, replaces, coupled, effects: { routesChanged: diff.length, main: diff.filter(d => d.kind === 'main').length, shunt: diff.filter(d => d.kind === 'shunt').length, examples: diff.slice(0, 6) } };
}

// Förbjudna kombinationer prövas av kärnan före varje order: manuell manöver och tågväg.
export function forbidReason(rules, settings) {
  for (const r of rules || []) {
    if (r.type !== 'forbid' || !isLive(r)) continue;
    const entries = Object.entries(r.positions || {});
    if (entries.length && entries.every(([o, p]) => settings[o] === p)) return `${entries.map(([o, p]) => `${o}=${p}`).join(' och ')} är en förbjuden kombination (${r.id}).`;
  }
  return null;
}

// Vilka aktiva regler en ny regel tar över: samma id, en följregel som delar växel, en manöverregel som delar växel,
// eller manöverrätten för samma växel. Det är det utkastet tar bort när regeln läggs till.
export function replacedBy(newRules, rules) {
  const out = new Set();
  for (const n of newRules) for (const r of rules || []) {
    if (r.id === n.id) { out.add(r.id); continue; }
    if (!isLive(r)) continue;
    if (n.type === 'follow' && r.type === 'follow' && r.objects.some(o => n.objects.includes(o))) out.add(r.id);
    if (n.type === 'condition' && n.trigger === 'manual' && r.type === 'condition' && r.trigger === 'manual' && r.objects.some(o => n.objects.includes(o))) out.add(r.id);
    if (n.type === 'authority' && r.type === 'authority' && r.object === n.object) out.add(r.id);
  }
  return [...out];
}
