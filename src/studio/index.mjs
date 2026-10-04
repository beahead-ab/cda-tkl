// Studio, steg 1: objektregister och avvikelselista. Läser källorna och räknar; ändrar ingenting.
import { loadSources } from './sources.mjs';
import { buildRegistry } from './registry.mjs';
import { companionCheck, crossoverProposals } from './graph.mjs';
import { detectionInventory } from './detection.mjs';
import { deviations, signalRelationCoverage } from './deviations.mjs';
export { loadSources, buildRegistry, companionCheck, crossoverProposals, detectionInventory, deviations, signalRelationCoverage };

export function studioOverview(sources = loadSources()) {
  const registry = buildRegistry(sources), det = detectionInventory(sources), rows = deviations(sources);
  return {
    sourceHash: sources.profile.sourceHash, counts: registry.counts,
    modules: registry.modules.map(m => ({ id: m.id, refs: m.refs, outputs: m.outputs, inputs: m.inputs, turnouts: m.turnouts.length, signals: m.signals.length, status: m.status })),
    companions: companionCheck(sources.xml, sources.profile.coupled), crossovers: crossoverProposals(sources.xml),
    detection: { shapes: det.shapes, inputs: { total: det.inputs.total, used: det.inputs.used, unbound: det.inputs.unbound.length, withoutModule: det.inputs.withoutModule, shared: det.inputs.shared.length },
      undetected: det.undetected, blockedByButton: det.blockedByButton },
    signalRelations: (r => ({ total: r.total, matched: r.matched.length, unmatched: r.unmatched.length }))(signalRelationCoverage(sources)),
    deviations: rows, blocking: rows.filter(r => r.blocking && r.count > 0).length };
}

// Hela lasten för Studio-sidan: översikten plus objekten, spåravkänningens sektioner och signalrelationerna utan tågväg.
export function studioData(sources = loadSources()) {
  const registry = buildRegistry(sources), det = detectionInventory(sources), rel = signalRelationCoverage(sources);
  return { ...studioOverview(sources), objects: { turnouts: registry.turnouts, signals: registry.signals, blocks: registry.blocks, modules: registry.modules },
    detection: { ...studioOverview(sources).detection, sections: det.sections, unboundInputs: det.inputs.unbound, sharedInputs: det.inputs.shared },
    signalRelations: { total: rel.total, matched: rel.matched.length, unmatched: rel.unmatched } };
}
