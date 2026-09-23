import fs from 'node:fs';
import { Topology } from '../src/topology.mjs';
import { RoutePolicy, signalPlan, attachSourceEndpoints, searchSourceRoute } from '../src/route-policy.mjs';
import { compileManualPolicies } from '../src/manual-policy.mjs';
const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url)));
const write = (file, data) => {
  const target = new URL('../' + file, import.meta.url), content = JSON.stringify(data, null, 2) + '\n';
  if (process.argv.includes('--check')) { if (fs.readFileSync(target, 'utf8') !== content) throw Error('Generated profile is stale: ' + file); }
  else fs.writeFileSync(target, content);
};
const panel = read('public/data/panel.json'), admin = read('public/data/admin.json'), source = read('public/data/operations-source.json');
const topology = new Topology(panel), policy = new RoutePolicy(source), routes = [], excluded = [];
attachSourceEndpoints(topology, source);
for (const button of panel.sicons.filter(b => b.sensor.startsWith('tvv') && !b.hidden)) {
  const endpoint = topology.buttons[button.sensor.replace('tvv','tvs')];
  if (endpoint) topology.buttons[button.sensor] = {...endpoint,label:button.sensor.slice(3)};
}
// IS266 is a source-defined main-route control with 18 allowed pairs but no
// panel icon. Give it a catalog representation, never a guessed map endpoint.
// Each route still follows its own explicit source NX endpoints below.
const routeButtons={...topology.buttons};
const trackSix=source.sensors.find(s=>s.name==='htvSpVI');
if(trackSix?.system!=='IS266'||panel.sicons.some(b=>b.sensor==='htvSpVI')) throw Error('Spår6-källknappen har ändrats; granska katalogersättningen.');
routeButtons.htvSpVI={label:'Spår 6',sourceSensor:trackSix.system,presentation:'catalog'};
// Explicitly reviewed pairs only. Hidden/missing source icons are represented
// in the catalog; neither source visibility nor map geometry is rewritten.
const catalogReview=read('profiles/shunt-catalog-review.json');
if(catalogReview.sourceHash!==source.sourceHash) throw Error('Växeltågvägarnas källunderlag har ändrats; ny granskning krävs.');
for(const [id,system] of Object.entries(catalogReview.controls)) {
  if(routeButtons[id] || source.sensors.find(s=>s.name===id)?.system!==system) throw Error('Ändrad källkontroll: '+id);
  routeButtons[id]={label:id.slice(3),sourceSensor:system,presentation:'catalog'};
}
for (const pair of policy.allowed()) {
  const kind = pair.from.startsWith('tvv') ? 'shunt' : 'main';
  const decision = policy.inspect(pair.from, pair.to);
  const provenance = { rules: decision.rules.map(r => r.rule), nxButtons: decision.nxButtons };
  const path = searchSourceRoute(topology,...decision.nxButtons);
  if (!path) { excluded.push({ ...pair, ...provenance, reason: 'Ingen sammanhängande väg mellan synliga knappar i den importerade grafen.' }); continue; }
  const plan = signalPlan(topology, source, path);
  if (!plan.signals.length || plan.boundaries[0]?.sensor !== decision.nxButtons[0]) {
    excluded.push({ ...pair, ...provenance, signals: plan.signals, reason: 'Signalriktning/start stämmer inte entydigt med XML-regelns NX-start.' }); continue;
  }
  const target = decision.nxButtons[1];
  const targetMast = source.anchors.flatMap(a => ['eastbound','westbound'].map(d => a[d+'sensor'] === target ? a[d+'signalmast'] : null)).find(Boolean)
    || source.turnoutEnds.find(e => e.sensor === target)?.mast;
  if(kind==='shunt' && !targetMast) {
    excluded.push({...pair,...provenance,reason:'Målet saknar identifierad signalgräns; särskilda växlingsvillkor krävs.'}); continue;
  }
  if (targetMast && !plan.guardSignals.includes(targetMast)) {
    excluded.push({ ...pair, ...provenance, signals: plan.signals, reason: 'Målets signalgräns kan inte bekräftas från vald grafväg.' }); continue;
  }
  if(!routeButtons[pair.from] || !routeButtons[pair.to]) { excluded.push({...pair,...provenance,reason:'Knappen saknar granskad representation i operatörspanelen.'}); continue; }
  if(kind==='shunt' && [pair.from,pair.to].some(id=>routeButtons[id].presentation==='catalog')) {
    const reviewed=catalogReview.routes.find(r=>r.from===pair.from && r.to===pair.to);
    if(!reviewed) { excluded.push({...pair,...provenance,reason:'Listvalet saknar granskad källregel.'}); continue; }
    if(JSON.stringify(reviewed.rules)!==JSON.stringify(provenance.rules) || JSON.stringify(reviewed.nxButtons)!==JSON.stringify(decision.nxButtons) || JSON.stringify(reviewed.signals)!==JSON.stringify(plan.signals) || reviewed.target!==targetMast) throw Error('Ändrad granskad växeltågväg: '+pair.from+' → '+pair.to);
  }
  const sensors = [...plan.boundaries.map(b => b.sensor), target];
  // A source NX pair can span intermediate signals. Keep that complete
  // identity as well as adjacent signal pairs for source locks and coverage.
  const requestedNxIds=source.nxPairs.filter(p=>p.fromSensor===decision.nxButtons[0] && p.toSensor===decision.nxButtons[1]).map(p=>p.id);
  const nxIds = [...new Set([...requestedNxIds,...sensors.slice(0,-1).flatMap((s,i) => source.nxPairs.filter(p => p.fromSensor===s && p.toSensor===sensors[i+1]).map(p=>p.id))])];
  provenance.requestedNxIds=requestedNxIds;
  const label = routeButtons[pair.from].label + ' → ' + routeButtons[pair.to].label;
  routes.push({ id: pair.from+'--'+pair.to, ...pair, label, kind, source: provenance, nxIds,
    blocks: path.blocks, turnouts: path.settings, crossings: path.crossings, segments: path.used,
    flow: path.flow, signals: plan.signals, guardSignals: plan.guardSignals, boundaries: plan.boundaries,
    path: path.path, autoRelease: true });
}
for(const reviewed of catalogReview.routes) if(!routes.some(r=>r.from===reviewed.from && r.to===reviewed.to)) throw Error('Granskad växeltågväg kunde inte anslutas: '+reviewed.from+' → '+reviewed.to);
const names = Object.keys(topology.turnouts).sort();
const turnouts = Object.fromEntries(names.map(name => {
  const item = admin.turnouts.find(t => t.id===name && /^LT\d+$/.test(t.sys));
  if (!item) throw Error('Missing source turnout address: '+name);
  return [name, { address: Number(item.sys.slice(2)), inverted: item.inverted==='true', source:item.sys,
    block: topology.turnouts[name].block, provenance:'JMRI source address; hardware feedback not measured' }];
}));
const sensors = [...new Set(panel.lblocks.filter(b=>b.user!=='frame').map(b=>b.sensor || '@'+b.user))].sort();
const blocks = Object.fromEntries(panel.lblocks.filter(b=>b.user!=='frame').map(b=>[b.user,{
  address: 3001+sensors.indexOf(b.sensor || '@'+b.user), activeMeansOccupied:true, sourceSensor:b.sensor || null,
  provenance:'Bench detector binding. Shared source sensors share one address; not a commissioned physical mapping.'
}]));
for (const r of routes) for (const b of r.blocks) if (!blocks[b]) throw Error('Unbound block '+b);
for (const route of routes) {
  const addresses = [...new Set(route.blocks.map(b => blocks[b].address))];
  route.signalEntries = route.boundaries.map(boundary => {
    const part = route.path[boundary.index];
    const block = part.kind === 'segment' ? topology.segments[part.id].b : topology.turnouts[part.name].block;
    const index = addresses.indexOf(blocks[block]?.address);
    if (index < 0) throw Error(`Missing passage boundary: ${route.id} ${boundary.mast}`);
    return { signal:boundary.mast, index };
  });
}
const signals = Object.fromEntries(panel.micons.map(m=>m.mast).sort().map((name,i)=>[name,{
  address:1501+i,reportAddress:1501+i,stopCodes:[0],goCodes:[8,18],sourceType:panel.micons.find(m=>m.mast===name).type,
  provenance:'Explicit bench binding with provisional Signal10-CZ codes. Swedish aspect mapping not commissioned.'
}]));
const coupled = Object.fromEntries(names.map(name=>[name,Object.keys(topology.expand({[name]:'C'})).sort()]));
const protection=Object.fromEntries(Object.keys(signals).map(name=>[name,{alternatives:[]}]));
for (const route of routes) for (let i=0;i<route.boundaries.length;i++) {
  const boundary=route.boundaries[i], next=route.boundaries[i+1];
  const section=route.path.slice(boundary.index,next?.index ?? route.path.length);
  const sectionBlocks=[...new Set(section.flatMap(p=>p.kind==='segment'?[topology.segments[p.id].b]:[topology.turnouts[p.name].block]).filter(Boolean))];
  const settings={};
  for (const p of section) if(p.kind==='turnout') settings[p.name]=route.turnouts[p.name];
  const option={blocks:sectionBlocks,turnouts:topology.expand(settings),nextSignal:next?.mast || null};
  const list=protection[boundary.mast].alternatives;
  if(!list.some(o=>JSON.stringify(o)===JSON.stringify(option))) list.push(option);
}
const manualPolicies=compileManualPolicies(source,{turnouts,blocks,coupled,protection});
const profile={id:'charlottendal-network-v1',title:'Charlottendal',commissioned:false,sourceHash:source.sourceHash,
  description:'Utökad anläggningsmodell med källstyrda tågvägsval och signalriktningar. Fysiska MGP-bindningar återstår att verifiera.',
  transport:{host:'127.0.0.1',port:8912},staleMs:7000,commandTimeoutMs:6000,signalStepMs:300,
  turnouts,blocks,signals,routes,coupled,manualPolicies,buttons:Object.fromEntries(Object.entries(routeButtons).map(([id,b])=>[id,{label:b.label,segment:b.segment,...(b.presentation?{presentation:b.presentation,sourceSensor:b.sourceSensor}:{})}])),
  sourcePolicy:[...source.mainRoutePolicies,...source.shuntRoutePolicies],excluded,releasePolicy:'whole-route-after-ordered-passage-and-stop-feedback'};
const simulator={id:'charlottendal-independent-network-field',turnouts,blocks,signals,coupled,protection,
  scenarios:routes.map(r=>({id:r.id,label:r.label,blocks:r.blocks,signal:r.signals[0],signals:r.signals,signalEntries:r.signalEntries,turnouts:r.turnouts})),
  note:'Independent plant model. Only LocoNet bytes are received from TKL. Static scenarios are not TKL runtime state.'};
write('profiles/charlottendal-network.json',profile); write('profiles/simulator-network.json',simulator);
write('public/data/route-coverage.json',{sourceHash:source.sourceHash,allowedRules:policy.allowed().length,routes:routes.map(r=>({id:r.id,kind:r.kind,from:r.from,to:r.to,label:r.label,source:r.source,signals:r.signals,nxIds:r.nxIds})),excluded,
  nx:source.nxPairs.map(nx=>({...nx,routes:routes.filter(r=>r.nxIds.includes(nx.id)).map(r=>r.id),sourceRules:source.shuntRoutePolicies.filter(r=>r.nxIds.includes(nx.id)).map(r=>r.rule)}))});
console.log(JSON.stringify({routes:routes.length,excluded:excluded.length,turnouts:names.length,blocks:Object.keys(blocks).length,signals:Object.keys(signals).length,excludedReasons:excluded.reduce((a,e)=>(a[e.reason]=(a[e.reason]||0)+1,a),{})},null,2));
