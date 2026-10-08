import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
async function freePort() { const s = net.createServer(); await new Promise((ok, no) => { s.once('error', no); s.listen(0, '127.0.0.1', ok); }); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
async function until(fn, timeout = 15000) { const end = Date.now() + timeout; let error; while (Date.now() < end) { try { const result = await fn(); if (result) return result; } catch (e) { error = e; } await new Promise(r => setTimeout(r, 100)); } throw error || Error('Timed out waiting for state'); }

// Tågspårningen mot simulatorn i en egen process: tågvägen Au → Spår 1c läggs i TKL, simulatorn kör tåget, och
// spårningen följer det från kanten till spåret ur de rapporter som kommer över LocoNet.
test('tågspårningen följer ett simulerat tåg från Kungsfors till spår 1c och kan få sitt nummer', { timeout: 60000 }, async () => {
  const [httpPort, simPort, wirePort] = await Promise.all([freePort(), freePort(), freePort()]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charlottendal-tracking-'));
  const env = { ...process.env, CHARLOTTENDAL_PROFILE: 'network', CHARLOTTENDAL_CONNECTION_MODE: 'simulator', CHARLOTTENDAL_AUTH_MODE: 'cloudflare', CHARLOTTENDAL_PUBLIC_ORIGIN: '',
    CHARLOTTENDAL_PORT: String(httpPort), CHARLOTTENDAL_SIM_PORT: String(simPort), CHARLOTTENDAL_WIRE_PORT: String(wirePort), CHARLOTTENDAL_STATE_DIR: dir };
  let output = ''; const children = [];
  const launch = file => { const child = spawn(process.execPath, [file], { cwd: root, env }); children.push(child); child.stdout.on('data', d => output += d); child.stderr.on('data', d => output += d); };
  const get = async () => (await fetch(`http://127.0.0.1:${httpPort}/api/state`)).json();
  const post = async (port, command, data) => { const r = await fetch(`http://127.0.0.1:${port}/api/${command}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const result = await r.json(); assert.equal(r.status, 200, JSON.stringify(result)); return result; };
  try {
    launch('src/simulator.mjs'); launch('src/server.mjs');
    await until(async () => { const s = await get(); return s.connection === 'connected' && s.blocks.S100.occupied === false; });
    assert.deepEqual((await get()).trainTracking, { enabled: true, trains: [], lines: [] });
    await post(httpPort, 'route', { from: 'htvAu', to: 'htvSpIA' });
    await until(async () => (await get()).routes.some(r => r.state === 'active'));
    await post(simPort, 'train', { id: 'htvAu--htvSpIA' });
    const seen = new Set();
    const arrived = await until(async () => { const t = (await get()).trainTracking.trains[0]; if (t?.state === 'station') seen.add(t.head); return t?.state === 'station' && t.head === 'SIA' ? t : null; }, 30000);
    for (const block of ['S95', 'S110', 'SIA']) assert.ok(seen.has(block) || arrived.blocks.includes(block), 'fronten passerade ' + block);
    assert.equal((await get()).trainTracking.trains.length, 1, 'ett tåg, inga spöktåg från de delade detektorerna');
    const named = await post(httpPort, 'tracking/name', { id: arrived.id, number: '421' });
    assert.equal(named.trains[0].number, '421'); assert.equal(named.trains[0].certain, true);
    const events = (await get()).operatingEvents.filter(e => e.kind === 'train-tracking').map(e => e.message);
    assert.ok(events.some(m => /kom in från .*\(Au\)/.test(m)), events.join(' | '));
    assert.ok(events.some(m => /Tåg 421 bekräftat av operatören/.test(m)));
  } catch (error) { error.message += '\n' + output.slice(-2000); throw error; }
  finally { await Promise.all(children.map(c => new Promise(r => { if (c.exitCode !== null) return r(); c.once('exit', r); c.kill(); }))); fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); }
});
