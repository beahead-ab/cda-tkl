import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initializePassword } from '../src/password-auth.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
const stop = child => child.exitCode === null && child.signalCode === null ? new Promise(resolve => { child.once('exit', resolve); child.kill(); }) : Promise.resolve();

test('password login protects both processes, requires change, revokes sessions and throttles guesses', { timeout: 40000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cda-password-'));
  const file = path.join(dir, 'auth.json'), initial = 'temporary-test-only', changed = 'test42';
  const ports = await Promise.all([freePort(), freePort(), freePort()]);
  const env = { ...process.env, CHARLOTTENDAL_AUTH_MODE: 'password', CHARLOTTENDAL_AUTH_FILE: file,
    CHARLOTTENDAL_PUBLIC_ORIGIN: 'https://cda-tkl.trainmeet.app', CHARLOTTENDAL_STATE_DIR: path.join(dir, 'state'),
    CHARLOTTENDAL_PORT: String(ports[0]), CHARLOTTENDAL_SIM_PORT: String(ports[1]), CHARLOTTENDAL_WIRE_PORT: String(ports[2]) };
  let children = [], output = '';
  const launch = script => {
    const child = spawn(process.execPath, [script], { cwd: root, env }); children.push(child);
    child.stdout.on('data', d => output += d); child.stderr.on('data', d => output += d); return child;
  };
  const request = (port, resource, data, cookie, origin = env.CHARLOTTENDAL_PUBLIC_ORIGIN) => new Promise((resolve, reject) => {
    const headers = { Host: 'cda-tkl.trainmeet.app' };
    if (cookie) headers.Cookie = cookie;
    if (data !== undefined) { headers['Content-Type'] = 'application/json'; if (origin) headers.Origin = origin; }
    const req = http.request({ hostname: '127.0.0.1', port, path: resource, method: data === undefined ? 'GET' : 'POST', headers }, res => {
      let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject); req.setTimeout(5000, () => req.destroy(Error('timeout'))); req.end(data === undefined ? undefined : JSON.stringify(data));
  });
  const ready = async port => {
    for (let n = 0; n < 100; n++) {
      try { if ((await request(port, '/api/state')).status === 401) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    } throw Error('Startup failed');
  };
  try {
    await initializePassword(file, initial);
    await assert.rejects(initializePassword(file, 'cannot overwrite this password'));
    assert.equal(fs.statSync(file).mode & 0o777, 0o640);
    assert.ok(!fs.readFileSync(file, 'utf8').includes(initial));
    launch('src/simulator.mjs'); let backend = launch('src/server.mjs');
    await Promise.all(ports.slice(0, 2).map(ready));
    for (const port of ports.slice(0, 2)) {
      assert.equal((await request(port, '/')).headers.location, '/login');
      for (const resource of ['/data/source/index.json','/data/source/tree.json','/data/source/Cda60.xml','/data/signal-catalog.json']) assert.equal((await request(port,resource)).headers.location,'/login');
      assert.equal((await request(port, '/api/state')).status, 401);
      assert.equal((await request(port, '/api/block', {})).status, 401);
    }
    assert.equal((await request(ports[0], '/login')).status, 200);
    assert.equal((await request(ports[0], '/auth.js')).status, 200);
    for(const resource of ['/api/recordings','/api/recordings/00000000-0000-0000-0000-000000000000/download','/api/timetable-import','/api/timetable-import/source/00000000-0000-0000-0000-000000000000/1'])assert.equal((await request(ports[0],resource)).status,401);
    for(const command of ['start','stop'])assert.equal((await request(ports[0],'/api/recordings/'+command,{})).status,401);
    for(const command of ['programming','line-block','clock','timetable-import/begin','timetable-import/save','timetable-import/activate','timetable-import/discard','timetable-import/select','trainmeet/configure','trainmeet/pair','trainmeet/refresh','trainmeet/disconnect','bindings/save','bindings/activate','train-information/follow','train-information/unfollow'])assert.equal((await request(ports[0],'/api/'+command,{})).status,401);
    const login = () => request(ports[0], '/api/auth/login', { password: initial });
    assert.equal((await request(ports[0], '/api/auth/login', { password: 'wrong' })).status, 401);
    assert.equal((await request(ports[0], '/api/auth/login', { password: initial }, null, null)).status, 403);
    const pending = await login(); assert.equal(pending.status, 200);
    assert.equal(JSON.parse(pending.body).mustChange, true);
    const setCookie = pending.headers['set-cookie'][0], oldCookie = setCookie.split(';')[0];
    assert.match(setCookie, /^__Host-cda_session=/); assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict/);
    for (const port of ports.slice(0, 2)) assert.equal((await request(port, '/api/state', undefined, oldCookie)).status, 428);
    assert.equal((await request(ports[0], '/api/auth/password', { currentPassword: initial, newPassword: 'short' }, oldCookie)).status, 400);
    assert.equal((await request(ports[0], '/api/auth/password', { currentPassword: 'wrong', newPassword: changed }, oldCookie)).status, 401);
    const update = await request(ports[0], '/api/auth/password', { currentPassword: initial, newPassword: changed }, oldCookie);
    assert.equal(update.status, 200); assert.equal(JSON.parse(update.body).mustChange, false);
    const cookie = update.headers['set-cookie'][0].split(';')[0];
    for (const port of ports.slice(0, 2)) {
      assert.equal((await request(port, '/api/state', undefined, oldCookie)).status, 401);
      assert.equal((await request(port, '/api/state', undefined, cookie)).status, 200);
      assert.equal((await request(port, '/api/block', {}, cookie, null)).status, 403);
      assert.equal((await request(port, '/api/block', {}, cookie, 'https://evil.invalid')).status, 400);
    }
    const source = await request(ports[0], '/data/source/index.json', undefined, cookie);
    assert.equal(source.status, 200); assert.equal(JSON.parse(source.body).meta.attributeCount,96142);
    const signals = await request(ports[0], '/data/signal-catalog.json', undefined, cookie);
    assert.equal(signals.status, 200); assert.equal(JSON.parse(signals.body).counts.sourceAspects,329);
    const recorder=await request(ports[0],'/api/recordings',undefined,cookie);
    assert.equal(recorder.status,200);
    const recordingSession=JSON.parse(recorder.body).sessionId;
    assert.equal((await request(ports[0],'/api/recordings/start',{sessionId:recordingSession},cookie,'https://evil.invalid')).status,400);
    assert.equal((await request(ports[0],'/api/recordings/start',{sessionId:recordingSession},cookie,null)).status,403);
    for(let n=0;n<100;n++){
      const state=JSON.parse((await request(ports[0],'/api/state',undefined,cookie)).body);
      if(state.connection==='connected')break;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    const started=await request(ports[0],'/api/recordings/start',{sessionId:recordingSession,label:'Behörighetsprov'},cookie);
    assert.equal(started.status,200);const captureId=JSON.parse(started.body).active.id;
    assert.equal((await login()).status, 401);
    await stop(backend); backend = launch('src/server.mjs'); await ready(ports[0]);
    assert.equal((await request(ports[0], '/api/state', undefined, cookie)).status, 200);
    const capture=await request(ports[0],'/api/recordings/'+captureId+'/download',undefined,cookie);
    assert.equal(capture.status,200);assert.equal(JSON.parse(capture.body).reason,'server-shutdown');
    assert.equal(JSON.parse((await request(ports[0],'/api/recordings',undefined,cookie)).body).history.length,1);
    assert.equal((await request(ports[0],'/api/recordings/stop',{sessionId:recordingSession,id:captureId},cookie)).status,409);
    assert.equal((await request(ports[0], '/api/auth/logout', {}, cookie)).status, 200);
    assert.equal((await request(ports[0],'/api/recordings/'+captureId+'/download',undefined,cookie)).status,401);
    for (const port of ports.slice(0, 2)) assert.equal((await request(port, '/api/state', undefined, cookie)).status, 401);
    for (let i = 0; i < 4; i++) assert.equal((await login()).status, 401);
    assert.equal((await login()).status, 429);
    await stop(backend); launch('src/server.mjs'); await ready(ports[0]);
    assert.equal((await login()).status, 429);
    const stored = JSON.parse(fs.readFileSync(file)); stored.attempts = [];
    fs.writeFileSync(file, JSON.stringify(stored));
    const later = await request(ports[0], '/api/auth/login', { password: changed }); assert.equal(later.status, 200);
    const laterCookie = later.headers['set-cookie'][0].split(';')[0];
    const expired = JSON.parse(fs.readFileSync(file)); expired.sessions.forEach(s => s.expires = 0); fs.writeFileSync(file, JSON.stringify(expired));
    for (const port of ports.slice(0, 2)) assert.equal((await request(port, '/api/state', undefined, laterCookie)).status, 401);
  } catch (e) { e.message += '\n' + output; throw e; }
  finally { await Promise.all(children.map(stop)); fs.rmSync(dir, { recursive: true, force: true }); }
});
