import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Engine } from './engine.mjs';
import { Storage } from './storage.mjs';
import { LocoNetClient } from './transport.mjs';
import { createAuth } from './auth.mjs';
import { json, guard, body, staticFile } from './http.mjs';
import { loadProfile } from './profile.mjs';
import { Configuration } from './configuration.mjs';
import { TrainInformation } from './train-information.mjs';
import { PanelIndications } from './panel-indications.mjs';

const profile = loadProfile();
const port = Number(process.env.CHARLOTTENDAL_PORT || 8910), root = fileURLToPath(new URL('../public', import.meta.url));
const auth = createAuth(root, true);
const storage = new Storage(process.env.CHARLOTTENDAL_STATE_DIR || fileURLToPath(new URL('../var', import.meta.url)));
const client = new LocoNetClient({ ...profile.transport, port: Number(process.env.CHARLOTTENDAL_WIRE_PORT || profile.transport.port), silenceMs: profile.staleMs });
const engine = new Engine(profile, { storage, send: bytes => client.send(bytes) });
const configuration = new Configuration(profile, {storage,canActivate:()=>!engine.routes.length && !engine.storageFault});
const trainInformation=new TrainInformation(JSON.parse(fs.readFileSync(new URL('../public/data/train-fields.json',import.meta.url),'utf8')),profile,{storage});
const panelIndications=new PanelIndications(JSON.parse(fs.readFileSync(new URL('../public/data/indications.json',import.meta.url),'utf8')),profile);
let notes = storage.load('notes.json', {}); const streams = new Set(), trace = []; let dirty = true;
auth.on('invalidate', () => { for (const stream of streams) stream.end(); streams.clear(); });
function protect(action) { try { return action(); } catch (e) { engine.log('error', e.message); } }
engine.on('change', () => { trainInformation.observe(engine.blocks,engine.connected); dirty = true; });
client.on('connection', connected => protect(() => engine.connection(connected)));
client.on('frame', bytes => protect(() => engine.receive(bytes)));
client.on('fault', message => engine.log('transport', String(message)));
client.on('wire', event => { trace.unshift({ ...event, at: Date.now() }); trace.length = Math.min(trace.length, 100); dirty = true; });
const snapshot = () => {const state=engine.snapshot();return { ...state, panelIndications:panelIndications.snapshot(state),trace, configurationVersion:configuration.data.activeVersion,trainInformation:trainInformation.snapshot() };};
const server = http.createServer(async (req, res) => {
  try {
    guard(req, port); const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (await auth.handle(req, res, url)) return;
    const expires = await auth.authenticate(req);
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (url.pathname === '/api/state') return json(res, snapshot());
      if (url.pathname === '/api/config') return json(res, { ...profile, notes, trainFields:trainInformation.catalog(),panelIndications:panelIndications.catalog(), presentation:configuration.presentation(), fieldUrl: process.env.CHARLOTTENDAL_FIELD_URL || 'http://127.0.0.1:8911/', accountUrl: process.env.CHARLOTTENDAL_AUTH_MODE === 'password' ? '/account' : null });
      if (url.pathname === '/api/train-information') return json(res, {...trainInformation.snapshot(),...trainInformation.catalog()});
      if (url.pathname === '/api/configuration') return json(res, configuration.view());
      if (url.pathname === '/api/presentation') return json(res, configuration.presentation());
      if (url.pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Content-Type-Options': 'nosniff' });
        if (req.method === 'HEAD') return res.end();
        res.write(`data: ${JSON.stringify(snapshot())}\n\n`); streams.add(res);
        const expiry = expires ? setTimeout(() => res.end(), Math.max(1, expires - Date.now())) : null;
        req.on('close', () => { streams.delete(res); clearTimeout(expiry); }); return;
      }
      if (url.pathname.startsWith('/api/')) return json(res, { error: 'Finns inte' }, 404);
      return staticFile(res, root, decodeURIComponent(url.pathname));
    }
    const data = await body(req);
    if (url.pathname.startsWith('/api/configuration/')) {
      const command=url.pathname.slice('/api/configuration/'.length);
      if(!['save','restore','discard','activate'].includes(command)) return json(res,{error:'Okänd inställningsåtgärd'},404);
      const result=configuration[command](data); dirty=true;
      engine.log('configuration',command==='activate'?`Visningsinställningar version ${result.active.activeVersion} aktiverad.`:'Inställningsutkast '+({save:'sparat',restore:'hämtat från historiken',discard:'kastat'}[command])+'.');
      return json(res,result);
    }
    if(url.pathname.startsWith('/api/train-information/')) {
      const command=url.pathname.slice('/api/train-information/'.length);
      if(!['save','move'].includes(command)) return json(res,{error:'Okänd informationsåtgärd'},404);
      const result=trainInformation[command](data);dirty=true;
      engine.log('train-information',command==='move'?'Tågnummer flyttat manuellt mellan informationsfält.':'Tåginformation registrerad eller kontrollerad manuellt.');
      return json(res,result);
    }
    if (url.pathname === '/api/route') engine.request(data.from, data.to);
    else if (url.pathname === '/api/cancel') engine.cancel(data.id);
    else if (url.pathname === '/api/turnout') engine.manual(data.name, data.position);
    else if (url.pathname === '/api/track-block') engine.blockTrack(data.name, data.blocked);
    else if (url.pathname === '/api/all-stop') engine.allStop(data.enabled);
    else if (url.pathname === '/api/emergency-cancel') engine.emergencyCancelAll();
    else if (url.pathname === '/api/control-mode') engine.setMode(data.mode);
    else if (url.pathname === '/api/note') {
      if (typeof data.key !== 'string' || data.key.length > 120 || typeof data.note !== 'string' || data.note.length > 4000 || ['__proto__', 'constructor', 'prototype'].includes(data.key)) throw Error('Ogiltig anteckning');
      const next = { ...notes, [data.key]: data.note }; storage.save('notes.json', next); notes = next;
    } else return json(res, { error: 'Okänd manöver' }, 404);
    json(res, { ok: true, state: snapshot() });
  } catch (e) { json(res, { error: e.message }, e.status || 400); }
});
let tick, publish;
server.listen(port, '127.0.0.1', () => {
  console.log(`Charlottendal TKL: http://127.0.0.1:${port}`); client.start();
  tick = setInterval(() => protect(() => engine.tick()), 100);
  publish = setInterval(() => {
    if (!dirty) return; dirty = false; const text = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const res of streams) { if (res.writableLength > 1e6) { res.end(); streams.delete(res); } else res.write(text); }
  }, 150);
});
server.on('error', e => { console.error(e.message); process.exit(1); });
function close() {
  clearInterval(tick); clearInterval(publish);
  for (const n of Object.keys(engine.signals)) protect(() => engine.permission(n, 'STOP'));
  setTimeout(() => { client.stop(); for (const s of streams) s.end(); server.close(() => process.exit(0)); }, 250);
}
process.on('SIGINT', close); process.on('SIGTERM', close);
