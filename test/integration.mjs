import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
async function freePort() { const s = net.createServer(); await new Promise((ok, no) => { s.once('error', no); s.listen(0, '127.0.0.1', ok); }); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
async function until(fn, timeout = 10000) { const end = Date.now() + timeout; let error; while (Date.now() < end) { try { const result = await fn(); if (result) return result; } catch (e) { error = e; } await new Promise(r => setTimeout(r, 100)); } throw error || Error('Timed out waiting for state'); }
test('separate processes exchange LocoNet, reject conflicts, persist locks and recover safely', { timeout: 40000 }, async () => {
  const [httpPort, simPort, wirePort] = await Promise.all([freePort(), freePort(), freePort()]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charlottendal-integration-'));
  const children = []; let output = '';
  const env = { ...process.env, CHARLOTTENDAL_AUTH_MODE: 'cloudflare', CHARLOTTENDAL_PORT: String(httpPort), CHARLOTTENDAL_SIM_PORT: String(simPort), CHARLOTTENDAL_WIRE_PORT: String(wirePort), CHARLOTTENDAL_STATE_DIR: dir,
    CHARLOTTENDAL_PUBLIC_ORIGIN: '', CHARLOTTENDAL_FIELD_URL: '/anlaggning/', CHARLOTTENDAL_TKL_URL: '/' };
  const launch = file => { const c = spawn(process.execPath, [file], { cwd: root, env }); c.stdout.on('data', d => output += d); c.stderr.on('data', d => output += d); children.push(c); return c; };
  const get = async (port, url = '/api/state') => { const r = await fetch(`http://127.0.0.1:${port}${url}`); assert.equal(r.status, 200); return r.json(); };
  const post = async (port, url, data, expected = 200, headers = {}) => { const r = await fetch(`http://127.0.0.1:${port}/api/${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) }); assert.equal(r.status, expected); return r.json(); };
  try {
    launch('src/simulator.mjs'); let backend = launch('src/server.mjs');
    await until(async () => { const s = await get(httpPort); return s.connection === 'connected' && s.blocks.S121.occupied === false; });
    assert.equal((await get(httpPort, '/api/config')).fieldUrl, '/anlaggning/');
    assert.equal((await get(simPort, '/api/config')).tklUrl, '/');
    const head = await fetch(`http://127.0.0.1:${httpPort}/api/events`, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
    assert.equal(head.status, 200);
    await post(httpPort, 'route', { from: 'htvSpIIB', to: 'htvSpIIA' }, 400, { Origin: 'https://untrusted.invalid' });
    await post(httpPort, 'route', { from: 'htvSpIIB', to: 'htvSpIIA' });
    await until(async () => (await get(httpPort)).routes[0]?.state === 'active');
    await post(httpPort, 'turnout', { name: 'Vx121', position: 'T' }, 400);
    await post(httpPort, 'route', { from: 'htvSpIIA', to: 'htvSpIIB' }, 400);
    await post(httpPort, 'note', { key: 'signals:0', note: 'Integrationstest åäö <text>' });
    backend.kill('SIGTERM'); await new Promise(r => backend.once('exit', r)); backend = launch('src/server.mjs');
    await until(async () => { const s = await get(httpPort); return s.connection === 'connected' && s.signals['2/8'].aspect === 'stop' && s.routes[0]?.state === 'held'; });
    assert.equal((await get(httpPort, '/api/config')).notes['signals:0'], 'Integrationstest åäö <text>');
    let s = await get(httpPort); await post(httpPort, 'cancel', { id: s.routes[0].id }); await until(async () => !(await get(httpPort)).routes.length);
    await post(httpPort, 'route', { from: 'htvCu', to: 'htvSpIIB' }); await until(async () => (await get(httpPort)).routes[0]?.state === 'active');
    s = await get(httpPort); const go = s.events.filter(e => e.kind === 'permission' && e.message.includes('körmedgivande')).map(e => e.message);
    assert.ok(go[0].includes('1/5')); assert.ok(go[1].includes('2/7'));
    await post(simPort, 'block', { name: 'S100', occupied: true }); await until(async () => (await get(httpPort)).routes[0]?.state === 'occupied');
    s = await get(httpPort); await post(httpPort, 'cancel', { id: s.routes[0].id }); assert.equal((await get(httpPort)).routes.length, 1);
    await post(simPort, 'block', { name: 'S100', occupied: false }); await until(async () => !(await get(httpPort)).routes.length);
    await post(simPort, 'link', { connected: false }); await until(async () => (await get(httpPort)).connection === 'disconnected');
    assert.equal((await get(httpPort)).blocks.S100.occupied, null);
    await post(simPort, 'link', { connected: true }); await until(async () => (await get(httpPort)).blocks.S100.occupied === false);
  } catch (e) { e.message += '\nChild output: ' + output; throw e; }
  finally { await Promise.all(children.filter(c => c.exitCode === null).map(c => new Promise(r => { c.once('exit', r); c.kill('SIGTERM'); }))); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('both public servers protect pages and controls even when the edge is bypassed', { timeout: 15000 }, async () => {
  const [httpPort, simPort, wirePort] = await Promise.all([freePort(), freePort(), freePort()]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charlottendal-auth-'));
  const env = { ...process.env, CHARLOTTENDAL_AUTH_MODE: 'cloudflare', CHARLOTTENDAL_PORT: String(httpPort), CHARLOTTENDAL_SIM_PORT: String(simPort),
    CHARLOTTENDAL_WIRE_PORT: String(wirePort), CHARLOTTENDAL_STATE_DIR: dir,
    CHARLOTTENDAL_PUBLIC_ORIGIN: 'https://cda-tkl.trainmeet.app',
    CHARLOTTENDAL_ACCESS_ISSUER: 'https://test-team.cloudflareaccess.com',
    CHARLOTTENDAL_ACCESS_AUD: 'test-application', CHARLOTTENDAL_ACCESS_EMAIL: 'operator@example.test' };
  let output = '';
  const children = ['src/simulator.mjs', 'src/server.mjs'].map(file => {
    const child = spawn(process.execPath, [file], { cwd: root, env });
    child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
    return child;
  });
  // Native HTTP preserves the Host header; fetch may replace it with the URL host.
  const send = (url, options = {}) => new Promise((resolve, reject) => {
    const req = http.request(url, options, res => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); });
    req.on('error', reject); req.setTimeout(2000, () => req.destroy(Error('Request timeout')));
    req.end(options.body);
  });
  try {
    for (const port of [httpPort, simPort]) {
      const url = `http://127.0.0.1:${port}`;
      const headers = { Host: 'cda-tkl.trainmeet.app' };
      await until(async () => (await send(url, { headers })).status === 403);
      for (const resource of ['/', '/api/config', '/api/state', '/app.css', '/data/source/index.json', '/data/source/Cda60.xml']) {
        assert.equal((await send(url + resource, { headers })).status, 403);
        assert.equal((await send(url + resource, { headers: { ...headers, 'cf-access-jwt-assertion': 'forged' } })).status, 403);
      }
      assert.equal((await send(url + '/api/route', { method: 'POST', headers: { ...headers, Origin: env.CHARLOTTENDAL_PUBLIC_ORIGIN, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    }
  } catch (e) { e.message += '\nChild output: ' + output; throw e; } finally {
    await Promise.all(children.filter(c => c.exitCode === null).map(c => new Promise(r => { c.once('exit', r); c.kill('SIGTERM'); })));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
