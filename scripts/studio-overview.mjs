// Skriver ut Studios objektregister och avvikelselista för Charlottendal. Läser bara; ändrar ingenting.
import { studioOverview } from '../src/studio/index.mjs';
const o = studioOverview(), pad = (s, n) => String(s).padEnd(n);
console.log(`Charlottendal · källversion ${o.sourceHash.slice(0, 12)}`);
console.log(`${o.counts.turnouts} växlar, ${o.counts.signals} signaler, ${o.counts.blocks} spårledningar, ${o.counts.routes} tågvägar, ${o.counts.modules} moduler. Uppmätt: ${o.counts.measured}.`);
console.log('\nKompispar enligt spårgrafen');
for (const c of o.companions) console.log(`  ${pad(c.pair.join(' + '), 16)} ${c.ok ? 'hel förbindelse' : 'INGEN förbindelse: ' + c.pair[0] + ' → ' + c.aLeadsTo + ', ' + c.pair[1] + ' → ' + c.bLeadsTo}`);
for (const x of o.crossovers) console.log(`  ${x.crossing}: förslag ${x.pairs.map(p => p.join(' + ')).join(' och ')}`);
console.log(`\nSpåravkänning: ${o.detection.inputs.total} ingångar, ${o.detection.inputs.used} bundna, ${o.detection.inputs.unbound} obundna, ${o.detection.inputs.withoutModule} utan modul. ` +
  `Utan detektering: ${o.detection.undetected.noSensor.length + o.detection.undetected.noRule.length}.`);
console.log(`Signalrelationer i JMRI: ${o.signalRelations.total}, med tågväg ${o.signalRelations.matched}, utan ${o.signalRelations.unmatched}.`);
console.log(`\nAvvikelser: ${o.deviations.length} rader, ${o.blocking} blockerar driftsättning`);
for (const d of o.deviations) console.log(`  ${d.blocking ? '!' : ' '} ${pad(d.title, 48)} ${pad(d.count, 5)} ${d.resolvedBy}${d.note ? ' · ' + d.note : ''}`);
