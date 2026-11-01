// Inventering av en stations underlag för de två ställverksvyerna (#115): signaltyper och symboler, riktning mot
// tågvägarna, slutpunkter, start-/målbindningar, delbesked och växlar. Läser bara stationens filer; ändrar ingenting,
// skickar inga order och lägger inga nya bindningar. Listan visar vad som behöver kompletteras innan 85-vyn kan göras
// mer förebildstrogen eller få nya manöverytor.
//
//   node scripts/panel-view-inventory.mjs                # alla stationer i paketet
//   node scripts/panel-view-inventory.mjs trakvista      # en station
//   node scripts/panel-view-inventory.mjs --json
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { currentStation, stationIds } from '../src/station.mjs';
import { modernSignalKind, modernSignalView, signalRotation } from '../public/panel-symbols.js';
import { signalRouteControls } from '../public/signal-route-controls.js';

// Stopplyktor (tänd/släckt) har ingen triangel eller vinkel och behåller originalbilden i båda vyerna.
const LAMPS = new Set(['sly_2', 'ssi_2']);
// Ungefärlig mitt i signalbilden från dess övre vänstra hörn. Kontrollen väljer bara närmaste del av samma tågväg,
// och resultatet är detsamma för rimliga förskjutningar.
const ICON_CENTER = [9, 14];
// En signal längre bort än så från tågvägen den begränsar redovisas: bilden kan sitta vid fel spår.
const FAR = 60;

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function readStationFiles(id) {
  const station = currentStation({ CHARLOTTENDAL_STATION: id });
  return { station, panel: read(station.dataDir + '/panel.json'), profile: read(station.profile),
    endpoints: read(station.dataDir + '/signal-endpoints.json'), registry: read(station.dataDir + '/source/signals.json') };
}

const sortBy = (list, key = x => x) => [...list].sort((a, b) => String(key(a)).localeCompare(String(key(b)), 'sv', { numeric: true }));
function distanceTo(point, f) {
  const vx = f.x2 - f.x1, vy = f.y2 - f.y1, l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((point[0] - f.x1) * vx + (point[1] - f.y1) * vy) / l2));
  return Math.hypot(f.x1 + t * vx - point[0], f.y1 + t * vy - point[1]);
}

export function panelViewInventory({ panel, profile, endpoints = { endpoints: [] }, registry = { signals: [] } }) {
  const micons = panel.micons.filter(m => m.mast), byMast = new Map(micons.map(m => [m.mast, m]));
  const source = new Map(registry.signals.map(s => [s.id, s]));
  const kindOf = type => modernSignalKind(type) || (LAMPS.has(type) ? 'lamp' : 'other');

  // Signaler: vilken symbol 85-vyn ritar, och vad som saknas för den.
  const byKind = { main: [], dwarf: [], combined: [], lamp: [], other: [] };
  for (const m of micons) byKind[kindOf(m.type)].push(m.mast);
  const signals = {
    total: micons.length,
    byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, sortBy(v)])),
    other: sortBy(micons.filter(m => kindOf(m.type) === 'other').map(m => ({ mast: m.mast, type: m.type })), x => x.mast),
    noRotation: sortBy(micons.filter(m => signalRotation(m.deg) === null).map(m => m.mast)),
    unbound: sortBy(micons.filter(m => !profile.signals[m.mast]).map(m => m.mast)),
    notDrawn: sortBy(Object.keys(profile.signals).filter(n => !byMast.has(n))),
    virtual: sortBy(Object.entries(profile.signals).filter(([, b]) => b.virtual).map(([n]) => n)),
    // Panelens bildtyp ska vara densamma som källans masttyp; annars väljs fel symbol.
    typeMismatch: sortBy(micons.filter(m => source.has(m.mast) && source.get(m.mast).type !== m.type)
      .map(m => ({ mast: m.mast, panel: m.type, source: source.get(m.mast).type })), x => x.mast),
    // Dvärg- och kombinationssignaler har fler besked i källan än tvålägesrapporten kan skilja.
    partial: sortBy(micons.filter(m => ['dwarf', 'combined'].includes(kindOf(m.type)) && profile.signals[m.mast] && !profile.signals[m.mast].virtual)
      .map(m => ({ mast: m.mast, type: m.type, aspects: source.get(m.mast)?.aspects || [] })), x => x.mast)
  };

  // Riktning: symbolen ska peka i färdriktningen för varje tågväg som går förbi den, på närmaste del av vägen.
  const passages = new Map(), wrong = [], far = [];
  for (const r of profile.routes) for (const b of r.boundaries || []) {
    const m = byMast.get(b.mast), rotation = m && signalRotation(m.deg);
    if (rotation === null || rotation === undefined) continue;
    const scale = Number.isFinite(m.scale) && m.scale > 0 ? m.scale : 1, at = [m.x + ICON_CENTER[0] * scale, m.y + ICON_CENTER[1] * scale];
    const parts = (r.flow || []).filter(f => Math.hypot(f.x2 - f.x1, f.y2 - f.y1) > 0);
    if (!parts.length) continue;
    const nearest = parts.reduce((a, f) => distanceTo(at, f) < distanceTo(at, a) ? f : a);
    const a = rotation * Math.PI / 180, length = Math.hypot(nearest.x2 - nearest.x1, nearest.y2 - nearest.y1);
    const along = ((nearest.x2 - nearest.x1) * Math.cos(a) + (nearest.y2 - nearest.y1) * Math.sin(a)) / length;
    passages.set(b.mast, (passages.get(b.mast) || 0) + 1);
    if (along <= 0.5) wrong.push({ mast: b.mast, route: r.id });
    const distance = Math.round(distanceTo(at, nearest));
    if (distance > FAR) far.push({ mast: b.mast, route: r.id, distance });
  }
  const direction = { passages: [...passages.values()].reduce((a, n) => a + n, 0), signals: passages.size,
    wrong: sortBy(wrong, x => x.mast + ' ' + x.route), far: sortBy(far, x => x.mast + ' ' + x.route),
    unchecked: sortBy(micons.filter(m => !passages.has(m.mast)).map(m => m.mast)) };

  const sensors = new Map(), ambiguous = new Set();
  for (const b of [...(endpoints.endpoints || []), ...profile.routes.flatMap(r => r.boundaries || [])]) {
    if (!b.sensor || !b.mast) continue;
    if (sensors.has(b.sensor) && sensors.get(b.sensor) !== b.mast) ambiguous.add(b.sensor);
    sensors.set(b.sensor, b.mast);
  }

  // Slutpunkt: röd kontur kräver en entydig bindning från vägens sista NX-sensor till en mast. Samma regel som vyn.
  // En utfart slutar vid sin egen utfartssignal, som vägen ställer i kör: tåget lämnar stationen och slutpunkten
  // ligger utanför den. Det är ingen brist.
  const main = profile.routes.filter(r => r.kind === 'main');
  const shown = r => micons.some(m => modernSignalKind(m.type) && modernSignalView({ type: m.type, name: m.mast, configured: true, connected: true,
    signal: { aspect: 'stop', updatedAt: 1 }, routes: [{ ...r, state: 'active', signals: [] }], sourceEndpoints: endpoints }).tone === 'endpoint');
  // En väg mot en stopplykta har sin slutpunkt där, men lyktan har ingen 85-symbol att färga.
  const endpointRows = { shown: [], exit: [], lamp: [], missing: [] };
  for (const r of main) {
    const end = r.source?.nxButtons?.[1], mast = end && !ambiguous.has(end) ? sensors.get(end) : undefined;
    endpointRows[shown(r) ? 'shown' : mast && r.signals?.includes(mast) ? 'exit' : LAMPS.has(byMast.get(mast)?.type) ? 'lamp' : 'missing'].push(r.id);
  }

  // Start: en framtida huvudtågvägsstart på triangeln kräver entydig mast för vägens första NX-sensor. Inventeras bara.
  const startMast = r => { const s = r.source?.nxButtons?.[0]; return s && !ambiguous.has(s) ? sensors.get(s) : undefined; };
  const startUnmapped = sortBy(main.filter(r => !startMast(r) || r.signals?.[0] !== startMast(r)).map(r => r.id));
  const startButtons = new Map();
  for (const r of main) { const mast = startMast(r); if (mast && r.signals?.[0] === mast) (startButtons.get(mast) || startButtons.set(mast, new Set()).get(mast)).add(r.from); }

  // Växeltågväg genom klick på signalen (signal-route-controls.js): vilka vägar det gäller i dag, och vilka som saknas.
  const controls = signalRouteControls(profile, registry, endpoints), shunt = profile.routes.filter(r => r.kind === 'shunt');
  const clickable = r => controls.starts.has(r.from) && controls.targets(r.from).has(r.to);
  const typeAt = sensor => byMast.get(ambiguous.has(sensor) ? undefined : sensors.get(sensor))?.type || 'okänd';
  const startType = r => typeAt(r.source?.nxButtons?.[0]), endType = r => typeAt(r.source?.nxButtons?.[1]);
  const clickStarts = new Set(shunt.filter(clickable).map(startType)), clickEnds = new Set(shunt.filter(clickable).map(endType));
  // Varför en växeltågväg saknar klick: huvudsignaler visar inget växlingsbesked (avsiktligt), en signaltyp som ingen
  // väg kan klickas från eller till (typen saknas i signal-route-controls.js), eller en tvetydig knapp.
  const shuntReasons = { mainSignal: [], startType: {}, endType: {}, ambiguous: [] };
  for (const r of shunt.filter(r => !clickable(r))) {
    const from = startType(r), to = endType(r);
    if (modernSignalKind(from) === 'main') shuntReasons.mainSignal.push(r.id);
    else if (!clickStarts.has(from)) (shuntReasons.startType[from] ||= []).push(r.id);
    else if (!clickEnds.has(to)) (shuntReasons.endType[to] ||= []).push(r.id);
    else shuntReasons.ambiguous.push(r.id);
  }

  // Växlar och korsningsväxlar: varje del ska ha en egen bindning, så en korsningsväxel inte blir en enkelväxel.
  const turnouts = Object.values(panel.turnouts || {}), slips = Object.values(panel.slips || {});
  const drawn = new Set([...turnouts.map(t => t.name), ...slips.flatMap(s => [s.name, s.name2])].filter(Boolean));
  const slipRows = sortBy(slips.map(s => ({ type: s.type, names: [s.name, s.name2].filter(Boolean),
    unbound: [s.name, s.name2].filter(n => n && !profile.turnouts[n]) })), x => x.names[0]);
  const turnoutsView = { turnouts: turnouts.length, slips: slipRows,
    unbound: sortBy([...drawn].filter(n => !profile.turnouts[n])),
    notDrawn: sortBy(Object.keys(profile.turnouts).filter(n => !drawn.has(n))),
    local: sortBy(Object.entries(profile.turnouts).filter(([, b]) => b.local).map(([n]) => n)),
    singleBranchSlips: slipRows.filter(s => s.names.length < 2).map(s => s.names[0]) };

  const sortedTypes = rows => Object.fromEntries(sortBy(Object.keys(rows)).map(k => [k, sortBy(rows[k])]));
  return { signals, direction,
    endpoints: { mainRoutes: main.length, shown: endpointRows.shown.length, exits: sortBy(endpointRows.exit),
      lamps: sortBy(endpointRows.lamp), missing: sortBy(endpointRows.missing) },
    mainStart: { mainRoutes: main.length, mapped: main.length - startUnmapped.length, unmapped: startUnmapped, signals: startButtons.size,
      ambiguousSensors: sortBy([...ambiguous]) },
    shuntClick: { shuntRoutes: shunt.length, withClick: shunt.filter(clickable).length, signals: controls.buttons.size,
      fromMainSignal: sortBy(shuntReasons.mainSignal), startTypeWithoutClick: sortedTypes(shuntReasons.startType),
      endTypeWithoutClick: sortedTypes(shuntReasons.endType), ambiguous: sortBy(shuntReasons.ambiguous) },
    turnouts: turnoutsView };
}

const list = (items, max = 12) => items.length ? items.slice(0, max).join(', ') + (items.length > max ? ` … (+${items.length - max})` : '') : 'inga';
export function formatInventory(title, inv) {
  const s = inv.signals, k = s.byKind, d = inv.direction, t = inv.turnouts, out = [];
  out.push(`${title}: ${s.total} signaler i panelen`);
  out.push(`  Symbol i 85-vyn: ${k.main.length} huvudsignaler (triangel), ${k.dwarf.length} dvärgsignaler (vinkel), ${k.combined.length} kombinerade, ` +
    `${k.lamp.length} stopplyktor och ${k.other.length} övriga med originalbild.`);
  if (s.other.length) out.push(`  Utan 85-symbol: ${list(s.other.map(x => x.mast + ' (' + x.type + ')'))}`);
  if (s.noRotation.length) out.push(`  Utan rotation (ingen 85-symbol): ${list(s.noRotation)}`);
  if (s.typeMismatch.length) out.push(`  Annan typ i panelen än i källan: ${list(s.typeMismatch.map(x => `${x.mast} (${x.panel} / ${x.source})`))}`);
  if (s.unbound.length || s.notDrawn.length) out.push(`  Utan driftbindning: ${list(s.unbound)}. I profilen men inte i panelen: ${list(s.notDrawn)}.`);
  out.push(`  Virtuella signaler (ingen egen återrapport): ${list(s.virtual)}`);
  out.push(`  Delbesked som inte kan visas (tvålägesrapport): ${s.partial.length} dvärg-/kombinationssignaler, till exempel ` +
    `${list(s.partial.slice(0, 3).map(x => x.mast + ' [' + x.aspects.join(', ') + ']'), 3)}`);
  out.push(`  Riktning: ${d.signals} signaler i ${d.passages} tågvägspassager; ${d.wrong.length} pekar mot färdriktningen` +
    (d.wrong.length ? ` (${list(d.wrong.map(x => x.mast + ' i ' + x.route))})` : '') + `. Ingen tågväg: ${list(d.unchecked)}.`);
  if (d.far.length) out.push(`  Långt från sin tågväg (> ${FAR} px): ${list(d.far.map(x => `${x.mast} i ${x.route} (${x.distance})`))}`);
  out.push(`  Slutpunkt med röd kontur: ${inv.endpoints.shown} av ${inv.endpoints.mainRoutes} huvudtågvägar; ${inv.endpoints.exits.length} utfarter slutar ` +
    `vid sin egen utfartssignal i kör. Mot stopplykta utan 85-symbol: ${list(inv.endpoints.lamps)}. Saknas: ${list(inv.endpoints.missing)}`);
  out.push(`  Entydig startsignal för huvudtågväg: ${inv.mainStart.mapped} av ${inv.mainStart.mainRoutes} vägar, ${inv.mainStart.signals} signaler. ` +
    `Saknas: ${list(inv.mainStart.unmapped)}. Inte en manöverbindning; kräver manuell verifiering.`);
  const c = inv.shuntClick;
  out.push(`  Växeltågväg genom signalklick: ${c.withClick} av ${c.shuntRoutes} vägar (${c.signals} signaler). Utan klick: ` +
    `${c.fromMainSignal.length} från huvudsignal (avsiktligt), ${c.ambiguous.length} med tvetydig knapp` +
    Object.entries(c.startTypeWithoutClick).map(([type, ids]) => `, ${ids.length} från typen ${type} som saknar klickstöd`).join('') +
    Object.entries(c.endTypeWithoutClick).map(([type, ids]) => `, ${ids.length} till typen ${type} som saknar klickstöd`).join('') + '.');
  out.push(`  Växlar: ${t.turnouts} enkelväxlar och ${t.slips.length} korsningsväxlar` +
    (t.slips.length ? ` (${t.slips.map(x => x.names.join('/') + ' ' + x.type).join(', ')})` : '') +
    `. Utan driftbindning: ${list(t.unbound)}. Lokalt manövrerade: ${list(t.local)}.`);
  if (t.notDrawn.length) out.push(`  Växlar i profilen som inte ritas: ${list(t.notDrawn)}`);
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const args = process.argv.slice(2), json = args.includes('--json'), wanted = args.filter(a => !a.startsWith('--'));
  const ids = wanted.length ? wanted : stationIds();
  const result = ids.map(id => { const files = readStationFiles(id); return { id, title: files.station.title, inventory: panelViewInventory(files) }; });
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(result.map(r => formatInventory(r.title, r.inventory)).join('\n\n'));
}
