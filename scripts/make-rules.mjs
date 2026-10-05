// Skriver profiles/charlottendal-rules.json: dagens driftprofil uttryckt i regelspråket, och beviset att
// reglerna kompilerar tillbaka till exakt samma fragment. --check läser bara och faller om filen är inaktuell.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { rulesFromProfile, compileRules, profileFragments, compiledFragments, validateRules } from '../src/studio/rules.mjs';
const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const profile = read('profiles/charlottendal-network.json');
const indications = read('public/data/indications.json'), rules = rulesFromProfile(profile, { indications });
const compiled = compileRules(rules, { turnoutNames: Object.keys(profile.turnouts) });
assert.deepEqual(compiledFragments(compiled), profileFragments(profile), 'Reglerna ger inte samma fragment som profilen');
assert.deepEqual(compiled.indicators, indications.indicators, 'Vägövergångsreglerna ger inte samma indikeringar som katalogen');
assert.deepEqual([compiled.blocks, compiled.signals, compiled.indications], [{}, {}, null], 'Dagens regler äger inga bindningar; de ligger i driftbindningarna');
const names = { turnouts: new Set(Object.keys(profile.turnouts)), blocks: new Set(Object.keys(profile.blocks)), signals: new Set(Object.keys(profile.signals)), lines: new Set(Object.keys(profile.operatingControls.lines)) };
const problems = validateRules(rules, names);
if (problems.length) throw Error('Reglerna validerar inte: ' + JSON.stringify(problems.slice(0, 3)));
const doc = { id: 'charlottendal-rules-v1', profile: profile.id, sourceHash: profile.sourceHash, generatedFrom: 'profiles/charlottendal-network.json', note: 'Dagens beteende som regler. Kompilerar till profilens coupled, manualPolicies, yardBoundaries och operatingControls utan skillnad; signalbesked och vägövergångar är härledda och ägs av driftbindningarna respektive indikeringskatalogen.', rules };
const target = new URL('../profiles/charlottendal-rules.json', import.meta.url), content = JSON.stringify(doc, null, 2) + '\n';
if (process.argv.includes('--check')) { if (fs.readFileSync(target, 'utf8') !== content) throw Error('Regelfilen är inaktuell; kör node scripts/make-rules.mjs'); }
else fs.writeFileSync(target, content);
console.log(`${rules.length} regler: ${Object.entries(rules.reduce((a, r) => (a[r.type + (r.trigger ? '/' + r.trigger : '')] = (a[r.type + (r.trigger ? '/' + r.trigger : '')] || 0) + 1, a), {})).map(([k, v]) => `${k} ${v}`).join(', ')}. Kompilering mot profilen: identisk.`);
